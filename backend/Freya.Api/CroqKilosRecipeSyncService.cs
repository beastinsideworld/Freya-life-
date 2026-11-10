using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Freya.Domain.Entities;
using Freya.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Freya.Api;

public sealed class CroqKilosRecipeSyncService
{
    private const string CroqMarkerPrefix = "croq-kilos:";
    private static readonly Uri CroqBase = new("https://api.croq-kilos.com/");

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CroqKilosRecipeSyncService> _logger;

    private readonly object _gate = new();
    private CroqKilosSyncStatus _status = new();

    public CroqKilosRecipeSyncService(
        IHttpClientFactory httpClientFactory,
        IServiceScopeFactory scopeFactory,
        ILogger<CroqKilosRecipeSyncService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public CroqKilosSyncStatus GetStatus()
    {
        lock (_gate)
        {
            return new CroqKilosSyncStatus
            {
                Running = _status.Running,
                UserId = _status.UserId,
                IdFrom = _status.IdFrom,
                IdTo = _status.IdTo,
                CurrentId = _status.CurrentId,
                Imported = _status.Imported,
                Skipped = _status.Skipped,
                Failed = _status.Failed,
                Errors = _status.Errors.ToList(),
                StartedAt = _status.StartedAt,
                FinishedAt = _status.FinishedAt
            };
        }
    }

    public bool TryStart(string userId, CroqKilosSyncRequest request, out string? error)
    {
        error = null;
        if (string.IsNullOrWhiteSpace(request.BearerToken))
        {
            error = "Le bearer token Croq-Kilos est requis.";
            return false;
        }

        if (request.IdFrom > request.IdTo)
        {
            error = "idFrom doit être inférieur ou égal à idTo.";
            return false;
        }

        var count = request.IdTo - request.IdFrom + 1;
        if (count > 2000)
        {
            error = "Plage trop large (maximum 2000 recettes par synchronisation).";
            return false;
        }

        lock (_gate)
        {
            if (_status.Running)
            {
                error = "Une synchronisation Croq-Kilos est déjà en cours.";
                return false;
            }

            _status = new CroqKilosSyncStatus
            {
                Running = true,
                UserId = userId,
                IdFrom = request.IdFrom,
                IdTo = request.IdTo,
                CurrentId = request.IdFrom,
                StartedAt = DateTimeOffset.UtcNow
            };
        }

        _ = Task.Run(() => RunSyncAsync(userId, request));
        return true;
    }

    private async Task RunSyncAsync(string userId, CroqKilosSyncRequest request)
    {
        var client = _httpClientFactory.CreateClient("CroqKilos");
        var token = request.BearerToken.Trim();
        if (!token.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            token = "Bearer " + token;
        }

        try
        {
            for (var id = request.IdFrom; id <= request.IdTo; id++)
            {
                UpdateCurrentId(id);

                try
                {
                    using var httpRequest = new HttpRequestMessage(HttpMethod.Get, $"recipes/{id}");
                    httpRequest.Headers.Authorization = AuthenticationHeaderValue.Parse(token);

                    using var response = await client.SendAsync(httpRequest);
                    if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                    {
                        IncrementSkipped();
                        _logger.LogInformation("Croq-Kilos recette {RecipeId} introuvable, ignorée.", id);
                    }
                    else if (!response.IsSuccessStatusCode)
                    {
                        var body = await response.Content.ReadAsStringAsync();
                        RegisterError(id, $"HTTP {(int)response.StatusCode}: {Truncate(body, 200)}");
                    }
                    else
                    {
                        var body = await response.Content.ReadAsStringAsync();
                        using var document = JsonDocument.Parse(body);
                        var croq = ParseCroq(document.RootElement);

                        if (string.IsNullOrWhiteSpace(croq.Title))
                        {
                            RegisterError(id, "JSON invalide ou titre manquant.");
                        }
                        else
                        {
                            var imported = await ImportRecipeAsync(userId, id, croq, request.Overwrite);
                            if (imported)
                            {
                                IncrementImported();
                            }
                            else
                            {
                                IncrementSkipped();
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    RegisterError(id, ex.Message);
                    _logger.LogWarning(ex, "Erreur lors de l'import Croq-Kilos {RecipeId}", id);
                }

                if (id < request.IdTo)
                {
                    await Task.Delay(TimeSpan.FromSeconds(5));
                }
            }
        }
        finally
        {
            lock (_gate)
            {
                _status.Running = false;
                _status.FinishedAt = DateTimeOffset.UtcNow;
            }
        }
    }

    private async Task<bool> ImportRecipeAsync(string userId, int croqId, CroqParsed croq, bool overwrite)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FreyaDbContext>();
        var marker = $"{CroqMarkerPrefix}{croqId}";

        var existing = await db.Recipes
            .FirstOrDefaultAsync(r => r.UserId == userId && r.Categories.Contains(marker));

        if (existing is not null && !overwrite)
        {
            return false;
        }

        var entity = existing ?? new Recipe
        {
            Id = Guid.NewGuid(),
            UserId = userId
        };

        entity.Title = croq.Title!.Trim();
        entity.DurationMin = croq.TotalCookingTime ?? croq.PreparationTime + croq.CookingTime;
        if (entity.DurationMin <= 0)
        {
            entity.DurationMin = 20;
        }

        entity.Difficulty = MapDifficulty(croq.Level);
        entity.Categories = BuildCategories(croq, marker);
        entity.ImageUrl = croq.ImageUrl;
        entity.Instructions = BuildInstructions(croq);
        entity.Ingredients = BuildIngredientsJson(croq);
        entity.Kcal = croq.Kcal;

        if (existing is null)
        {
            db.Recipes.Add(entity);
        }

        await db.SaveChangesAsync();
        return true;
    }

    private static string MapDifficulty(string? level)
    {
        if (string.IsNullOrWhiteSpace(level))
        {
            return "Facile";
        }

        return level.Trim().ToUpperInvariant() switch
        {
            "FACILE" => "Facile",
            "MOYEN" => "Moyen",
            "DIFFICILE" => "Difficile",
            _ => char.ToUpper(level[0]) + level[1..].ToLower()
        };
    }

    private static string BuildCategories(CroqParsed croq, string marker)
    {
        var parts = croq.Categories
            .Concat(croq.Labels)
            .Where(part => !string.IsNullOrWhiteSpace(part))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        parts.Add(marker);
        return string.Join("; ", parts);
    }

    private static string? BuildInstructions(CroqParsed croq)
    {
        var parts = new List<string>();
        var stepsText = HtmlToPlainText(croq.Steps);
        var noteText = HtmlToPlainText(croq.Note);

        if (!string.IsNullOrWhiteSpace(stepsText))
        {
            parts.Add(stepsText);
        }

        if (!string.IsNullOrWhiteSpace(noteText))
        {
            parts.Add("Notes :\n" + noteText);
        }

        if (croq.Seasons.Count > 0)
        {
            parts.Add("Saisons : " + string.Join(", ", croq.Seasons));
        }

        if (croq.Equipments.Count > 0)
        {
            parts.Add("Matériel : " + string.Join(", ", croq.Equipments));
        }

        return parts.Count == 0 ? null : string.Join("\n\n", parts);
    }

    private static string? BuildIngredientsJson(CroqParsed croq)
    {
        if (croq.Ingredients.Count == 0)
        {
            return null;
        }

        var payload = new StoredRecipeIngredients
        {
            Servings = croq.Servings,
            Items = croq.Ingredients
                .OrderBy(item => item.Position ?? int.MaxValue)
                .Select(item => new FreyaIngredientJson
                {
                    Id = Guid.NewGuid().ToString("N"),
                    Name = item.Name,
                    Quantity = FormatQuantity(item.Quantity),
                    Unit = MapUnit(item.Unit)
                })
                .ToList()
        };

        return JsonSerializer.Serialize(payload, IngredientJsonOptions.Default);
    }

    private static CroqParsed ParseCroq(JsonElement root)
    {
        if (root.ValueKind != JsonValueKind.Object)
        {
            return new CroqParsed();
        }

        var ingredients = ReadIngredientList(Find(root, "recipeIngredients") ?? Find(root, "ingredients"));
        return new CroqParsed
        {
            Title = ReadText(Find(root, "title")),
            Kcal = ReadInt(Find(root, "kcal")) ?? ReadInt(Find(root, "calories")),
            PreparationTime = ReadInt(Find(root, "preparationTime")) ?? 0,
            CookingTime = ReadInt(Find(root, "cookingTime")) ?? 0,
            TotalCookingTime = ReadInt(Find(root, "totalCookingTime")),
            Servings = Math.Max(1, ReadInt(Find(root, "personNumber"))
                ?? ReadInt(Find(root, "portion"))
                ?? ReadInt(Find(root, "servings"))
                ?? 1),
            Steps = ReadText(Find(root, "steps")),
            Note = ReadText(Find(root, "note")),
            Level = ReadTitle(Find(root, "level")),
            ImageUrl = ReadImageUrl(Find(root, "picture")),
            Categories = ReadTitles(Find(root, "categories"))
                .Concat(ReadTitles(Find(root, "publicCategory")))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList(),
            Labels = ReadTitles(Find(root, "nutritionLabels")).Distinct(StringComparer.OrdinalIgnoreCase).ToList(),
            Seasons = ReadTitles(Find(root, "seasons")).Distinct(StringComparer.OrdinalIgnoreCase).ToList(),
            Equipments = ReadTitles(Find(root, "equipments")).Distinct(StringComparer.OrdinalIgnoreCase).ToList(),
            Ingredients = ingredients
        };
    }

    private static List<CroqParsedIngredient> ReadIngredientList(JsonElement? source)
    {
        var array = AsArray(source);
        if (array is null)
        {
            return [];
        }

        var items = new List<CroqParsedIngredient>();
        foreach (var entry in array.Value.EnumerateArray())
        {
            if (entry.ValueKind == JsonValueKind.String)
            {
                var label = CleanLabel(entry.GetString());
                if (label is not null)
                {
                    items.Add(new CroqParsedIngredient { Name = label, Quantity = 1 });
                }

                continue;
            }

            if (entry.ValueKind != JsonValueKind.Object)
            {
                continue;
            }

            var ingredient = Find(entry, "ingredient");
            var name = ReadTitle(ingredient)
                ?? ReadText(Find(entry, "title"))
                ?? ReadText(Find(entry, "name"))
                ?? CleanLabel(ingredient?.ValueKind == JsonValueKind.String ? ingredient.Value.GetString() : null);

            if (string.IsNullOrWhiteSpace(name))
            {
                continue;
            }

            items.Add(new CroqParsedIngredient
            {
                Name = name.Trim(),
                Quantity = ReadDecimal(Find(entry, "quantity"))
                    ?? ReadDecimal(Find(entry, "amount"))
                    ?? ReadDecimal(Find(ingredient, "quantity")),
                Unit = ReadText(Find(ingredient, "unit"))
                    ?? ReadText(Find(entry, "unit"))
                    ?? ReadTitle(Find(entry, "unit")),
                Position = ReadInt(Find(entry, "position"))
            });
        }

        return items;
    }

    private static JsonElement? AsArray(JsonElement? source)
    {
        if (source is null)
        {
            return null;
        }

        if (source.Value.ValueKind == JsonValueKind.Array)
        {
            return source;
        }

        if (source.Value.ValueKind == JsonValueKind.Object)
        {
            return Find(source, "hydra:member") ?? Find(source, "member") ?? Find(source, "items");
        }

        return null;
    }

    private static IEnumerable<string> ReadTitles(JsonElement? source)
    {
        if (source is null)
        {
            yield break;
        }

        var value = source.Value;
        switch (value.ValueKind)
        {
            case JsonValueKind.String:
                var label = CleanLabel(value.GetString());
                if (label is not null)
                {
                    yield return label;
                }

                break;
            case JsonValueKind.Object:
                var title = ReadText(Find(value, "title"))
                    ?? ReadText(Find(value, "name"))
                    ?? ReadText(Find(value, "label"));
                if (!string.IsNullOrWhiteSpace(title))
                {
                    yield return title.Trim();
                }

                break;
            case JsonValueKind.Array:
                foreach (var item in value.EnumerateArray())
                {
                    foreach (var nested in ReadTitles(item))
                    {
                        yield return nested;
                    }
                }

                break;
        }
    }

    private static string? ReadTitle(JsonElement? source) => ReadTitles(source).FirstOrDefault();

    private static string? ReadImageUrl(JsonElement? source)
    {
        if (source is null)
        {
            return null;
        }

        string? path = source.Value.ValueKind == JsonValueKind.String
            ? source.Value.GetString()
            : ReadText(Find(source, "largeWebp"))
                ?? ReadText(Find(source, "mediumWebp"))
                ?? ReadText(Find(source, "fullWebp"))
                ?? ReadText(Find(source, "large"))
                ?? ReadText(Find(source, "medium"))
                ?? ReadText(Find(source, "webPath"))
                ?? ReadText(Find(source, "thumbnail"));

        if (string.IsNullOrWhiteSpace(path))
        {
            return null;
        }

        if (path.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            return path;
        }

        return new Uri(CroqBase, path.TrimStart('/')).ToString();
    }

    private static JsonElement? Find(JsonElement? source, string name)
    {
        if (source is null || source.Value.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        foreach (var property in source.Value.EnumerateObject())
        {
            if (string.Equals(property.Name, name, StringComparison.OrdinalIgnoreCase))
            {
                return property.Value;
            }
        }

        return null;
    }

    private static string? ReadText(JsonElement? source)
    {
        if (source is null)
        {
            return null;
        }

        return source.Value.ValueKind switch
        {
            JsonValueKind.String => BlankToNull(source.Value.GetString()),
            JsonValueKind.Number => source.Value.GetRawText(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            _ => null
        };
    }

    private static int? ReadInt(JsonElement? source)
    {
        var number = ReadDecimal(source);
        return number is null ? null : (int)Math.Round(number.Value, MidpointRounding.AwayFromZero);
    }

    private static decimal? ReadDecimal(JsonElement? source)
    {
        if (source is null)
        {
            return null;
        }

        var value = source.Value;
        if (value.ValueKind == JsonValueKind.Number && value.TryGetDecimal(out var number))
        {
            return number;
        }

        if (value.ValueKind != JsonValueKind.String)
        {
            return null;
        }

        return FlexibleNullableDecimalConverter.ParseDecimalText(value.GetString());
    }

    private static string? CleanLabel(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        if (trimmed.StartsWith('/') || trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            || trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return trimmed;
    }

    private static string? BlankToNull(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string FormatQuantity(decimal? quantity)
    {
        if (quantity is null)
        {
            return "1";
        }

        return quantity.Value.ToString("0.##", CultureInfo.InvariantCulture);
    }

    private static string MapUnit(string? unitCode)
    {
        if (string.IsNullOrWhiteSpace(unitCode))
        {
            return "pièce";
        }

        return unitCode.Trim() switch
        {
            "0" => "pincée",
            "1" => "g",
            "2" => "ml",
            "3" => "cl",
            "4" => "cc",
            var other => other
        };
    }

    private static string HtmlToPlainText(string? html)
    {
        if (string.IsNullOrWhiteSpace(html))
        {
            return string.Empty;
        }

        var withBreaks = Regex.Replace(html, @"<br\s*/?>", "\n", RegexOptions.IgnoreCase);
        withBreaks = Regex.Replace(withBreaks, @"</p>\s*<p>", "\n", RegexOptions.IgnoreCase);
        var noTags = Regex.Replace(withBreaks, "<[^>]+>", string.Empty);
        return System.Net.WebUtility.HtmlDecode(noTags).Trim();
    }

    private void UpdateCurrentId(int id)
    {
        lock (_gate)
        {
            _status.CurrentId = id;
        }
    }

    private void IncrementImported()
    {
        lock (_gate)
        {
            _status.Imported++;
        }
    }

    private void IncrementSkipped()
    {
        lock (_gate)
        {
            _status.Skipped++;
        }
    }

    private void RegisterError(int id, string message)
    {
        lock (_gate)
        {
            _status.Failed++;
            if (_status.Errors.Count < 50)
            {
                _status.Errors.Add($"#{id}: {message}");
            }
        }
    }

    private static string Truncate(string value, int max)
        => value.Length <= max ? value : value[..max] + "…";
}

public sealed record CroqKilosSyncRequest(
    int IdFrom,
    int IdTo,
    string BearerToken,
    bool Overwrite = false);

public sealed class CroqKilosSyncStatus
{
    public bool Running { get; set; }
    public string? UserId { get; set; }
    public int IdFrom { get; set; }
    public int IdTo { get; set; }
    public int? CurrentId { get; set; }
    public int Imported { get; set; }
    public int Skipped { get; set; }
    public int Failed { get; set; }
    public List<string> Errors { get; set; } = [];
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? FinishedAt { get; set; }
}

internal sealed class CroqParsed
{
    public string? Title { get; init; }
    public int? Kcal { get; init; }
    public int PreparationTime { get; init; }
    public int CookingTime { get; init; }
    public int? TotalCookingTime { get; init; }
    public int Servings { get; init; } = 1;
    public string? Steps { get; init; }
    public string? Note { get; init; }
    public string? Level { get; init; }
    public string? ImageUrl { get; init; }
    public List<string> Categories { get; init; } = [];
    public List<string> Labels { get; init; } = [];
    public List<string> Seasons { get; init; } = [];
    public List<string> Equipments { get; init; } = [];
    public List<CroqParsedIngredient> Ingredients { get; init; } = [];
}

internal sealed class CroqParsedIngredient
{
    public string Name { get; init; } = string.Empty;
    public decimal? Quantity { get; init; }
    public string? Unit { get; init; }
    public int? Position { get; init; }
}

internal sealed class StoredRecipeIngredients
{
    public int Servings { get; set; } = 1;
    public List<FreyaIngredientJson> Items { get; set; } = [];
}

internal sealed class FreyaIngredientJson
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Quantity { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
}

internal static class IngredientJsonOptions
{
    public static readonly JsonSerializerOptions Default = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };
}

internal static class CroqJsonOptions
{
    public static readonly JsonSerializerOptions Default = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString,
        Converters =
        {
            new FlexibleNullableIntConverter(),
            new FlexibleNullableDecimalConverter(),
            new FlexibleStringConverter(),
            new CroqLevelConverter(),
            new CroqCategoryConverter(),
            new CroqMediaConverter()
        }
    };
}

/// <summary>
/// Croq-Kilos envoie parfois un entier, un décimal, une durée "00:45:00" ou du texte.
/// </summary>
internal sealed class FlexibleNullableIntConverter : JsonConverter<int?>
{
    public override int? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        switch (reader.TokenType)
        {
            case JsonTokenType.Null:
                return null;
            case JsonTokenType.Number:
                if (reader.TryGetInt32(out var whole))
                {
                    return whole;
                }

                if (reader.TryGetDecimal(out var number))
                {
                    return (int)Math.Round(number, MidpointRounding.AwayFromZero);
                }

                return null;
            case JsonTokenType.String:
                return ParseIntText(reader.GetString());
            default:
                reader.Skip();
                return null;
        }
    }

    public override void Write(Utf8JsonWriter writer, int? value, JsonSerializerOptions options)
    {
        if (value is null)
        {
            writer.WriteNullValue();
            return;
        }

        writer.WriteNumberValue(value.Value);
    }

    internal static int? ParseIntText(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        var trimmed = text.Trim();
        if (int.TryParse(trimmed, NumberStyles.Integer, CultureInfo.InvariantCulture, out var whole))
        {
            return whole;
        }

        if (decimal.TryParse(trimmed, NumberStyles.Number, CultureInfo.InvariantCulture, out var number))
        {
            return (int)Math.Round(number, MidpointRounding.AwayFromZero);
        }

        if (TimeSpan.TryParse(trimmed, CultureInfo.InvariantCulture, out var duration))
        {
            return (int)Math.Round(duration.TotalMinutes, MidpointRounding.AwayFromZero);
        }

        var match = Regex.Match(trimmed, @"-?\d+(?:[.,]\d+)?");
        if (match.Success
            && decimal.TryParse(match.Value.Replace(',', '.'), NumberStyles.Number, CultureInfo.InvariantCulture, out var extracted))
        {
            return (int)Math.Round(extracted, MidpointRounding.AwayFromZero);
        }

        return null;
    }
}

internal sealed class FlexibleNullableDecimalConverter : JsonConverter<decimal?>
{
    public override decimal? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        switch (reader.TokenType)
        {
            case JsonTokenType.Null:
                return null;
            case JsonTokenType.Number:
                return reader.TryGetDecimal(out var number) ? number : null;
            case JsonTokenType.String:
                return ParseDecimalText(reader.GetString());
            default:
                reader.Skip();
                return null;
        }
    }

    public override void Write(Utf8JsonWriter writer, decimal? value, JsonSerializerOptions options)
    {
        if (value is null)
        {
            writer.WriteNullValue();
            return;
        }

        writer.WriteNumberValue(value.Value);
    }

    internal static decimal? ParseDecimalText(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        var trimmed = text.Trim().Replace(',', '.');
        if (decimal.TryParse(trimmed, NumberStyles.Number, CultureInfo.InvariantCulture, out var number))
        {
            return number;
        }

        var fraction = trimmed.Split('/', 2, StringSplitOptions.TrimEntries);
        if (fraction.Length == 2
            && decimal.TryParse(fraction[0], NumberStyles.Number, CultureInfo.InvariantCulture, out var numerator)
            && decimal.TryParse(fraction[1], NumberStyles.Number, CultureInfo.InvariantCulture, out var denominator)
            && denominator != 0)
        {
            return numerator / denominator;
        }

        var match = Regex.Match(trimmed, @"-?\d+(?:[.,]\d+)?");
        if (match.Success
            && decimal.TryParse(match.Value.Replace(',', '.'), NumberStyles.Number, CultureInfo.InvariantCulture, out var extracted))
        {
            return extracted;
        }

        return null;
    }
}

internal sealed class FlexibleStringConverter : JsonConverter<string>
{
    public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        switch (reader.TokenType)
        {
            case JsonTokenType.Null:
                return null;
            case JsonTokenType.String:
                return reader.GetString();
            case JsonTokenType.Number:
                if (reader.TryGetInt64(out var whole))
                {
                    return whole.ToString(CultureInfo.InvariantCulture);
                }

                return reader.TryGetDecimal(out var number)
                    ? number.ToString(CultureInfo.InvariantCulture)
                    : null;
            case JsonTokenType.True:
                return "true";
            case JsonTokenType.False:
                return "false";
            default:
                reader.Skip();
                return null;
        }
    }

    public override void Write(Utf8JsonWriter writer, string value, JsonSerializerOptions options)
        => writer.WriteStringValue(value);
}

internal sealed class CroqLevelConverter : JsonConverter<CroqKilosLevelDto?>
{
    public override CroqKilosLevelDto? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null)
        {
            return null;
        }

        if (reader.TokenType == JsonTokenType.String)
        {
            return new CroqKilosLevelDto { Title = reader.GetString() };
        }

        if (reader.TokenType != JsonTokenType.StartObject)
        {
            reader.Skip();
            return null;
        }

        string? title = null;
        while (reader.Read() && reader.TokenType != JsonTokenType.EndObject)
        {
            if (reader.TokenType != JsonTokenType.PropertyName)
            {
                reader.Skip();
                continue;
            }

            var name = reader.GetString();
            if (!reader.Read())
            {
                break;
            }

            if (string.Equals(name, "title", StringComparison.OrdinalIgnoreCase) && reader.TokenType == JsonTokenType.String)
            {
                title = reader.GetString();
            }
            else
            {
                reader.Skip();
            }
        }

        return new CroqKilosLevelDto { Title = title };
    }

    public override void Write(Utf8JsonWriter writer, CroqKilosLevelDto? value, JsonSerializerOptions options)
    {
        if (value is null)
        {
            writer.WriteNullValue();
            return;
        }

        writer.WriteStartObject();
        writer.WriteString("title", value.Title);
        writer.WriteEndObject();
    }
}

internal sealed class CroqCategoryConverter : JsonConverter<CroqKilosCategoryDto>
{
    public override CroqKilosCategoryDto Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.String)
        {
            return new CroqKilosCategoryDto { Title = reader.GetString() };
        }

        if (reader.TokenType != JsonTokenType.StartObject)
        {
            reader.Skip();
            return new CroqKilosCategoryDto();
        }

        string? title = null;
        while (reader.Read() && reader.TokenType != JsonTokenType.EndObject)
        {
            if (reader.TokenType != JsonTokenType.PropertyName)
            {
                reader.Skip();
                continue;
            }

            var name = reader.GetString();
            if (!reader.Read())
            {
                break;
            }

            if (string.Equals(name, "title", StringComparison.OrdinalIgnoreCase)
                || string.Equals(name, "name", StringComparison.OrdinalIgnoreCase))
            {
                title = reader.TokenType == JsonTokenType.String ? reader.GetString() : null;
                if (reader.TokenType != JsonTokenType.String)
                {
                    reader.Skip();
                }
            }
            else
            {
                reader.Skip();
            }
        }

        return new CroqKilosCategoryDto { Title = title };
    }

    public override void Write(Utf8JsonWriter writer, CroqKilosCategoryDto value, JsonSerializerOptions options)
    {
        writer.WriteStartObject();
        writer.WriteString("title", value.Title);
        writer.WriteEndObject();
    }
}

internal sealed class CroqMediaConverter : JsonConverter<CroqKilosMediaDto?>
{
    public override CroqKilosMediaDto? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null)
        {
            return null;
        }

        if (reader.TokenType == JsonTokenType.String)
        {
            return new CroqKilosMediaDto { WebPath = reader.GetString() };
        }

        if (reader.TokenType != JsonTokenType.StartObject)
        {
            reader.Skip();
            return null;
        }

        var media = new CroqKilosMediaDto();
        while (reader.Read() && reader.TokenType != JsonTokenType.EndObject)
        {
            if (reader.TokenType != JsonTokenType.PropertyName)
            {
                reader.Skip();
                continue;
            }

            var name = reader.GetString();
            if (!reader.Read())
            {
                break;
            }

            var value = reader.TokenType == JsonTokenType.String ? reader.GetString() : null;
            if (reader.TokenType != JsonTokenType.String && reader.TokenType != JsonTokenType.Null)
            {
                reader.Skip();
            }

            if (string.IsNullOrEmpty(value))
            {
                continue;
            }

            if (string.Equals(name, "webPath", StringComparison.OrdinalIgnoreCase))
            {
                media.WebPath = value;
            }
            else if (string.Equals(name, "medium", StringComparison.OrdinalIgnoreCase))
            {
                media.Medium = value;
            }
            else if (string.Equals(name, "mediumWebp", StringComparison.OrdinalIgnoreCase))
            {
                media.MediumWebp = value;
            }
            else if (string.Equals(name, "large", StringComparison.OrdinalIgnoreCase))
            {
                media.Large = value;
            }
            else if (string.Equals(name, "largeWebp", StringComparison.OrdinalIgnoreCase))
            {
                media.LargeWebp = value;
            }
        }

        return media;
    }

    public override void Write(Utf8JsonWriter writer, CroqKilosMediaDto? value, JsonSerializerOptions options)
    {
        if (value is null)
        {
            writer.WriteNullValue();
            return;
        }

        writer.WriteStartObject();
        writer.WriteString("webPath", value.WebPath);
        writer.WriteString("medium", value.Medium);
        writer.WriteString("mediumWebp", value.MediumWebp);
        writer.WriteString("large", value.Large);
        writer.WriteString("largeWebp", value.LargeWebp);
        writer.WriteEndObject();
    }
}

internal sealed class CroqKilosRecipeDto
{
    public int Id { get; set; }
    public string? Title { get; set; }
    public int? Calories { get; set; }
    public int? Kcal { get; set; }
    public int? PreparationTime { get; set; }
    public int? CookingTime { get; set; }
    public int? TotalCookingTime { get; set; }
    public string? Steps { get; set; }
    public string? Note { get; set; }
    public CroqKilosMediaDto? Picture { get; set; }
    public List<CroqKilosCategoryDto>? Categories { get; set; }
    public List<CroqKilosRecipeIngredientDto>? RecipeIngredients { get; set; }
    public CroqKilosLevelDto? Level { get; set; }
}

internal sealed class CroqKilosMediaDto
{
    public string? WebPath { get; set; }
    public string? Medium { get; set; }
    public string? MediumWebp { get; set; }
    public string? Large { get; set; }
    public string? LargeWebp { get; set; }
}

internal sealed class CroqKilosCategoryDto
{
    public string? Title { get; set; }
}

internal sealed class CroqKilosLevelDto
{
    public string? Title { get; set; }
}

internal sealed class CroqKilosRecipeIngredientDto
{
    public int? Position { get; set; }
    public decimal? Quantity { get; set; }
    public CroqKilosIngredientDto? Ingredient { get; set; }
}

internal sealed class CroqKilosIngredientDto
{
    public string? Title { get; set; }
    public string? Unit { get; set; }
}
