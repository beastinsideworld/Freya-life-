using System.Text;
using System.Text.Json;
using Freya.Application.Auth;
using Freya.Application.Common;
using Freya.Application.Dashboard;
using Freya.Application.Events;
using Freya.Application.Budget;
using Freya.Application.Families;
using Freya.Application.Social;
using Freya.Domain.Entities;
using Freya.Domain.Enums;
using Freya.Infrastructure;
using Freya.Infrastructure.Auth;
using Freya.Infrastructure.Identity;
using Freya.Infrastructure.Persistence;
using Freya.Api;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Freya API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Bearer. Exemple : Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var jwtKey = builder.Configuration["Jwt:Key"] ?? "FreyaDevSecretKey_ChangeMe_AtLeast32Chars!";
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "Freya",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "Freya",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddHttpClient("CroqKilos", client =>
{
    client.BaseAddress = new Uri("https://api.croq-kilos.com/");
    client.DefaultRequestHeaders.Accept.ParseAdd("application/json");
    client.Timeout = TimeSpan.FromSeconds(60);
});
builder.Services.AddSingleton<CroqKilosRecipeSyncService>();

var corsOrigins = (builder.Configuration["CORS_ORIGINS"] ?? string.Empty)
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    .Where(o => o.Length > 0)
    .Concat([
        "http://localhost:4200",
        "http://127.0.0.1:4200",
        "https://beastinsideworld.github.io"
    ])
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

builder.Services.AddCors(options =>
{
    options.AddPolicy("FreyaCors", policy =>
        policy.WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<FreyaDbContext>();
    var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DatabaseBootstrap");

    await SqliteToSqlServerMigrator.TryMigrateAsync(db, builder.Configuration, logger);
    await db.Database.EnsureCreatedAsync();
    await PublishCatalogRecipesAsync(db);
    await EnsureFriendCodesAsync(db, users);
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("FreyaCors");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

var api = app.MapGroup("/api/v1");

api.MapPost("/auth/register", async (
    RegisterRequest request,
    UserManager<AppUser> users,
    JwtTokenService tokens) =>
{
    if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
    {
        return Results.BadRequest(new { message = "Email et mot de passe requis." });
    }

    var user = new AppUser
    {
        UserName = request.Email.Trim(),
        Email = request.Email.Trim(),
        DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? request.Email.Split('@')[0] : request.DisplayName.Trim(),
        FriendCode = await NextFriendCodeAsync(users)
    };

    var result = await users.CreateAsync(user, request.Password);
    if (!result.Succeeded)
    {
        return Results.BadRequest(new { message = string.Join(" ", result.Errors.Select(e => e.Description)) });
    }

    var token = tokens.CreateToken(user);
    return Results.Ok(new AuthResponse(token, user.Email!, user.DisplayName, user.Id, user.FriendCode, user.AvatarUrl));
});

api.MapPost("/auth/login", async (
    LoginRequest request,
    UserManager<AppUser> users,
    JwtTokenService tokens) =>
{
    var user = await users.FindByEmailAsync(request.Email.Trim());
    if (user is null || !await users.CheckPasswordAsync(user, request.Password))
    {
        return Results.Unauthorized();
    }

    if (user.FriendCode <= 0)
    {
        user.FriendCode = await NextFriendCodeAsync(users);
        await users.UpdateAsync(user);
    }

    var token = tokens.CreateToken(user);
    return Results.Ok(new AuthResponse(token, user.Email!, user.DisplayName, user.Id, user.FriendCode, user.AvatarUrl));
});

api.MapGet("/auth/me", async (ICurrentUser current, UserManager<AppUser> users) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var user = await users.FindByIdAsync(current.UserId);
    if (user is null)
    {
        return Results.Unauthorized();
    }

    if (user.FriendCode <= 0)
    {
        user.FriendCode = await NextFriendCodeAsync(users);
        await users.UpdateAsync(user);
    }

    return Results.Ok(new UserProfileDto(user.Id, user.Email!, user.DisplayName, user.FriendCode, user.AvatarUrl));
}).RequireAuthorization();

api.MapPatch("/auth/me", async (UpdateProfileRequest request, ICurrentUser current, UserManager<AppUser> users) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var user = await users.FindByIdAsync(current.UserId);
    if (user is null)
    {
        return Results.Unauthorized();
    }

    if (request.AvatarUrl is not null)
    {
        var avatar = request.AvatarUrl.Trim();
        if (avatar.Length == 0)
        {
            user.AvatarUrl = null;
        }
        else if (!avatar.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
        {
            return Results.BadRequest(new { message = "Image de profil invalide." });
        }
        else if (avatar.Length > 8_000_000)
        {
            return Results.BadRequest(new { message = "Image trop lourde (max ~6 Mo compressés)." });
        }
        else
        {
            user.AvatarUrl = avatar;
        }
    }

    if (user.FriendCode <= 0)
    {
        user.FriendCode = await NextFriendCodeAsync(users);
    }

    await users.UpdateAsync(user);
    return Results.Ok(new UserProfileDto(user.Id, user.Email!, user.DisplayName, user.FriendCode, user.AvatarUrl));
}).RequireAuthorization();

api.MapGet("/dashboard/today", async (ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var today = DateOnly.FromDateTime(DateTime.Now);
    var events = await db.Events
        .Where(e => e.UserId == current.UserId && e.Date <= today && (e.EndDate ?? e.Date) >= today)
        .OrderBy(e => e.StartTime)
        .Select(e => new EventDto(e.Id, e.Title, e.Date, e.EndDate, e.StartTime, e.EndTime, e.AllDay, e.Kind, e.Category))
        .ToListAsync();

    var meals = await db.MealSlots
        .Where(m => m.UserId == current.UserId && m.Date == today)
        .OrderBy(m => m.Slot)
        .Select(m => new MealTodayDto(m.Id, m.Slot.ToString(), m.Title, m.Done, m.ImageUrl, m.Kcal))
        .ToListAsync();

    var dto = new DashboardTodayDto(
        today,
        DateTime.Now.ToString("HH:mm"),
        12,
        events,
        meals);

    return Results.Ok(dto);
}).RequireAuthorization();

api.MapGet("/events", async (DateOnly? from, DateOnly? to, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var start = from ?? DateOnly.FromDateTime(DateTime.Today.AddDays(-(int)DateTime.Today.DayOfWeek + 1));
    var end = to ?? start.AddDays(6);

    var events = await db.Events
        .Where(e => e.UserId == current.UserId && e.Date <= end && (e.EndDate ?? e.Date) >= start)
        .OrderBy(e => e.Date).ThenBy(e => e.StartTime)
        .Select(e => new EventDto(e.Id, e.Title, e.Date, e.EndDate, e.StartTime, e.EndTime, e.AllDay, e.Kind, e.Category))
        .ToListAsync();

    return Results.Ok(events);
}).RequireAuthorization();

api.MapPost("/events", async (CreateEventRequest request, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    if (string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest(new { message = "Indique un nom et une date." });
    }

    var endDate = request.EndDate ?? request.Date;
    if (endDate < request.Date)
    {
        return Results.BadRequest(new { message = "La date de fin doit être après la date de début." });
    }

    var allDay = request.AllDay;
    var startTime = allDay ? TimeOnly.MinValue : (request.StartTime ?? new TimeOnly(9, 0));
    var endTime = allDay
        ? new TimeOnly(23, 59)
        : (request.EndTime ?? startTime.AddMinutes(45));

    if (!allDay && endDate == request.Date && endTime < startTime)
    {
        return Results.BadRequest(new { message = "L’heure de fin doit être après l’heure de début." });
    }

    var entity = new CalendarEvent
    {
        Id = Guid.NewGuid(),
        UserId = current.UserId,
        Title = request.Title.Trim(),
        Date = request.Date,
        EndDate = endDate,
        StartTime = startTime,
        EndTime = endTime,
        AllDay = allDay,
        Kind = request.Kind,
        Category = request.Category
    };

    db.Events.Add(entity);
    await db.SaveChangesAsync();

    return Results.Created($"/api/v1/events/{entity.Id}",
        new EventDto(entity.Id, entity.Title, entity.Date, entity.EndDate, entity.StartTime, entity.EndTime, entity.AllDay, entity.Kind, entity.Category));
}).RequireAuthorization();

api.MapPut("/events/{id:guid}", async (Guid id, UpdateEventRequest request, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var entity = await db.Events.FirstOrDefaultAsync(e => e.Id == id && e.UserId == current.UserId);
    if (entity is null)
    {
        return Results.NotFound();
    }

    var endDate = request.EndDate ?? request.Date;
    if (endDate < request.Date)
    {
        return Results.BadRequest(new { message = "La date de fin doit être après la date de début." });
    }

    var allDay = request.AllDay;
    var startTime = allDay ? TimeOnly.MinValue : (request.StartTime ?? new TimeOnly(9, 0));
    var endTime = allDay
        ? new TimeOnly(23, 59)
        : (request.EndTime ?? startTime.AddMinutes(45));

    if (!allDay && endDate == request.Date && endTime < startTime)
    {
        return Results.BadRequest(new { message = "L’heure de fin doit être après l’heure de début." });
    }

    entity.Title = request.Title.Trim();
    entity.Date = request.Date;
    entity.EndDate = endDate;
    entity.StartTime = startTime;
    entity.EndTime = endTime;
    entity.AllDay = allDay;
    entity.Kind = request.Kind;
    entity.Category = request.Category;
    await db.SaveChangesAsync();

    return Results.Ok(new EventDto(entity.Id, entity.Title, entity.Date, entity.EndDate, entity.StartTime, entity.EndTime, entity.AllDay, entity.Kind, entity.Category));
}).RequireAuthorization();

api.MapDelete("/events/{id:guid}", async (Guid id, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var entity = await db.Events.FirstOrDefaultAsync(e => e.Id == id && e.UserId == current.UserId);
    if (entity is null)
    {
        return Results.NotFound();
    }

    db.Events.Remove(entity);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization();

api.MapGet("/meals/week", async (DateOnly? weekStart, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var start = weekStart ?? StartOfWeek(DateOnly.FromDateTime(DateTime.Today));
    var end = start.AddDays(6);
    var meals = await db.MealSlots
        .Where(m => m.UserId == current.UserId && m.Date >= start && m.Date <= end)
        .OrderBy(m => m.Date).ThenBy(m => m.Slot)
        .Select(m => new
        {
            m.Id,
            m.Date,
            slot = m.Slot.ToString(),
            m.Title,
            m.RecipeId,
            m.ImageUrl,
            m.Done,
            m.Kcal
        })
        .ToListAsync();

    return Results.Ok(new { weekStart = start, weekEnd = end, meals });
}).RequireAuthorization();

api.MapPost("/meals", async (MealCreateRequest request, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    if (string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest(new { message = "Le titre du repas est requis." });
    }

    int? kcal = request.Kcal;
    if (kcal is null && request.RecipeId is Guid recipeId)
    {
        kcal = await db.Recipes
            .Where(r => r.Id == recipeId && (r.UserId == null || r.UserId == current.UserId))
            .Select(r => r.Kcal)
            .FirstOrDefaultAsync();
    }

    var entity = new MealSlot
    {
        Id = Guid.NewGuid(),
        UserId = current.UserId,
        Date = request.Date,
        Slot = request.Slot,
        Title = request.Title.Trim(),
        RecipeId = request.RecipeId,
        ImageUrl = request.ImageUrl,
        Done = false,
        Kcal = kcal
    };

    db.MealSlots.Add(entity);
    await db.SaveChangesAsync();
    return Results.Created($"/api/v1/meals/{entity.Id}", entity);
}).RequireAuthorization();

api.MapPatch("/meals/{id:guid}/done", async (Guid id, MealDoneRequest request, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var entity = await db.MealSlots.FirstOrDefaultAsync(m => m.Id == id && m.UserId == current.UserId);
    if (entity is null)
    {
        return Results.NotFound();
    }

    entity.Done = request.Done;
    await db.SaveChangesAsync();
    return Results.Ok(new { entity.Id, entity.Done });
}).RequireAuthorization();

api.MapGet("/grocery", async (ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var items = await db.GroceryItems
        .Where(g => g.UserId == current.UserId)
        .OrderBy(g => g.Aisle).ThenBy(g => g.Name)
        .ToListAsync();

    return Results.Ok(items);
}).RequireAuthorization();

api.MapPost("/grocery/items", async (GroceryCreateRequest request, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var entity = new GroceryItem
    {
        Id = Guid.NewGuid(),
        UserId = current.UserId,
        Name = request.Name.Trim(),
        Quantity = request.Quantity ?? string.Empty,
        Aisle = request.Aisle ?? "Épicerie",
        Status = GroceryStatus.Missing,
        Favorite = false
    };

    db.GroceryItems.Add(entity);
    await db.SaveChangesAsync();
    return Results.Created($"/api/v1/grocery/items/{entity.Id}", entity);
}).RequireAuthorization();

api.MapPatch("/grocery/items/{id:guid}", async (Guid id, GroceryPatchRequest request, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var entity = await db.GroceryItems.FirstOrDefaultAsync(g => g.Id == id && g.UserId == current.UserId);
    if (entity is null)
    {
        return Results.NotFound();
    }

    if (request.Status is not null) entity.Status = request.Status.Value;
    if (request.Quantity is not null) entity.Quantity = request.Quantity;
    if (request.Favorite is not null) entity.Favorite = request.Favorite.Value;
    await db.SaveChangesAsync();
    return Results.Ok(entity);
}).RequireAuthorization();

api.MapDelete("/grocery/items/{id:guid}", async (Guid id, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var entity = await db.GroceryItems.FirstOrDefaultAsync(g => g.Id == id && g.UserId == current.UserId);
    if (entity is null)
    {
        return Results.NotFound();
    }

    db.GroceryItems.Remove(entity);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization();

api.MapGet("/recipes", async (string? q, string? category, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var query = db.Recipes.AsQueryable()
        .Where(r => r.UserId == null || r.UserId == current.UserId);

    if (!string.IsNullOrWhiteSpace(q))
    {
        var term = q.Trim().ToLower();
        query = query.Where(r => r.Title.ToLower().Contains(term));
    }

    if (!string.IsNullOrWhiteSpace(category) && !string.Equals(category, "tout", StringComparison.OrdinalIgnoreCase))
    {
        var cat = category.Trim().ToLower();
        query = query.Where(r => r.Categories.ToLower().Contains(cat));
    }

    var recipes = await query.OrderBy(r => r.Title).Take(500).ToListAsync();
    return Results.Ok(recipes);
}).RequireAuthorization();

api.MapPost("/recipes", async (RecipeCreateRequest request, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var entity = new Recipe
    {
        Id = Guid.NewGuid(),
        UserId = current.UserId,
        Title = request.Title.Trim(),
        DurationMin = request.DurationMin,
        Difficulty = request.Difficulty ?? "Facile",
        Categories = request.Categories ?? string.Empty,
        ImageUrl = request.ImageUrl,
        Instructions = request.Instructions,
        Ingredients = request.Ingredients,
        Kcal = request.Kcal
    };

    db.Recipes.Add(entity);
    await db.SaveChangesAsync();
    return Results.Created($"/api/v1/recipes/{entity.Id}", entity);
}).RequireAuthorization();

api.MapPost("/recipes/sync/croq-kilos", (
    CroqKilosSyncRequest request,
    ICurrentUser current,
    CroqKilosRecipeSyncService sync) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    if (!sync.TryStart(current.UserId, request, out var error))
    {
        return Results.BadRequest(new { message = error });
    }

    return Results.Accepted("/api/v1/recipes/sync/croq-kilos/status", new
    {
        message = "Synchronisation Croq-Kilos démarrée. Un appel toutes les 5 secondes par identifiant.",
        idFrom = request.IdFrom,
        idTo = request.IdTo,
        statusUrl = "/api/v1/recipes/sync/croq-kilos/status"
    });
}).RequireAuthorization();

api.MapGet("/recipes/sync/croq-kilos/status", (ICurrentUser current, CroqKilosRecipeSyncService sync) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var status = sync.GetStatus();
    if (status.UserId is not null && status.UserId != current.UserId)
    {
        return Results.Ok(new CroqKilosSyncStatus());
    }

    return Results.Ok(status);
}).RequireAuthorization();

api.MapPut("/recipes/{id:guid}", async (Guid id, RecipeCreateRequest request, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    if (string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest(new { message = "Le titre de la recette est requis." });
    }

    var entity = await db.Recipes.FirstOrDefaultAsync(r => r.Id == id && r.UserId == current.UserId);
    if (entity is null)
    {
        return Results.NotFound(new { message = "Recette introuvable." });
    }

    entity.Title = request.Title.Trim();
    entity.DurationMin = request.DurationMin;
    entity.Difficulty = request.Difficulty ?? "Facile";
    entity.Categories = request.Categories ?? string.Empty;
    entity.ImageUrl = request.ImageUrl;
    entity.Instructions = request.Instructions;
    entity.Ingredients = request.Ingredients;
    entity.Kcal = request.Kcal;

    await db.SaveChangesAsync();
    return Results.Ok(entity);
}).RequireAuthorization();

api.MapGet("/trips", async (ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var trips = await db.Trips
        .Where(t => t.UserId == current.UserId)
        .OrderBy(t => t.StartDate)
        .Select(t => new
        {
            t.Id,
            t.Title,
            t.StartDate,
            t.EndDate,
            t.CoverUrl,
            t.Subtitle,
            daysUntil = t.StartDate.DayNumber - DateOnly.FromDateTime(DateTime.Today).DayNumber
        })
        .ToListAsync();

    return Results.Ok(trips);
}).RequireAuthorization();

api.MapGet("/trips/{id:guid}", async (Guid id, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var trip = await db.Trips
        .Include(t => t.Places)
        .Include(t => t.BudgetLines)
        .FirstOrDefaultAsync(t => t.Id == id && t.UserId == current.UserId);

    return trip is null ? Results.NotFound() : Results.Ok(trip);
}).RequireAuthorization();

api.MapPost("/trips", async (TripCreateRequest request, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var entity = new Trip
    {
        Id = Guid.NewGuid(),
        UserId = current.UserId,
        Title = request.Title.Trim(),
        StartDate = request.StartDate,
        EndDate = request.EndDate,
        CoverUrl = request.CoverUrl,
        Subtitle = request.Subtitle
    };

    db.Trips.Add(entity);
    await db.SaveChangesAsync();
    return Results.Created($"/api/v1/trips/{entity.Id}", entity);
}).RequireAuthorization();

api.MapGet("/friends", async (ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var friendIds = await db.Friendships
        .AsNoTracking()
        .Where(f => f.UserId == current.UserId)
        .Select(f => f.FriendUserId)
        .ToListAsync();

    var friends = await db.Users
        .AsNoTracking()
        .Where(u => friendIds.Contains(u.Id))
        .Select(u => new { u.Id, u.DisplayName, u.FriendCode, u.AvatarUrl })
        .ToListAsync();

    var conversations = await db.Conversations
        .AsNoTracking()
        .Where(c => c.UserAId == current.UserId || c.UserBId == current.UserId)
        .ToListAsync();

    var result = friends
        .Select(f =>
        {
            var conv = conversations.FirstOrDefault(c =>
                (c.UserAId == current.UserId && c.UserBId == f.Id) ||
                (c.UserBId == current.UserId && c.UserAId == f.Id));
            return new FriendDto(f.Id, f.DisplayName, f.FriendCode, conv?.Id, f.AvatarUrl);
        })
        .OrderBy(f => f.DisplayName)
        .ToList();

    return Results.Ok(result);
}).RequireAuthorization();

api.MapPost("/friends", async (AddFriendRequest request, ICurrentUser current, FreyaDbContext db, UserManager<AppUser> users) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    if (request.FriendCode is < 100000 or > 999999)
    {
        return Results.BadRequest(new { message = "Le code ami doit contenir 6 chiffres." });
    }

    var me = await users.FindByIdAsync(current.UserId);
    if (me is null)
    {
        return Results.Unauthorized();
    }

    if (me.FriendCode == request.FriendCode)
    {
        return Results.BadRequest(new { message = "Tu ne peux pas t’ajouter toi-même." });
    }

    var friend = await users.Users.FirstOrDefaultAsync(u => u.FriendCode == request.FriendCode);
    if (friend is null)
    {
        return Results.NotFound(new { message = "Aucun profil trouvé avec ce code." });
    }

    var already = await db.Friendships.AnyAsync(f =>
        f.UserId == current.UserId && f.FriendUserId == friend.Id);
    if (already)
    {
        return Results.BadRequest(new { message = "Cette personne est déjà dans tes amis." });
    }

    db.Friendships.Add(new Friendship
    {
        Id = Guid.NewGuid(),
        UserId = current.UserId,
        FriendUserId = friend.Id
    });
    db.Friendships.Add(new Friendship
    {
        Id = Guid.NewGuid(),
        UserId = friend.Id,
        FriendUserId = current.UserId
    });

    var conversation = await GetOrCreateConversationAsync(db, current.UserId, friend.Id);
    await db.SaveChangesAsync();

    return Results.Ok(new FriendDto(friend.Id, friend.DisplayName, friend.FriendCode, conversation.Id, friend.AvatarUrl));
}).RequireAuthorization();

api.MapDelete("/friends/{friendUserId}", async (string friendUserId, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var links = await db.Friendships
        .Where(f =>
            (f.UserId == current.UserId && f.FriendUserId == friendUserId) ||
            (f.UserId == friendUserId && f.FriendUserId == current.UserId))
        .ToListAsync();

    if (links.Count == 0)
    {
        return Results.NotFound();
    }

    db.Friendships.RemoveRange(links);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization();

api.MapGet("/chat/conversations", async (ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var conversations = await db.Conversations
        .AsNoTracking()
        .Where(c => c.UserAId == current.UserId || c.UserBId == current.UserId)
        .OrderByDescending(c => c.LastMessageAtUtc ?? c.CreatedAtUtc)
        .ToListAsync();

    var peerIds = conversations
        .Select(c => c.UserAId == current.UserId ? c.UserBId : c.UserAId)
        .Distinct()
        .ToList();

    var peers = await db.Users
        .AsNoTracking()
        .Where(u => peerIds.Contains(u.Id))
        .ToDictionaryAsync(u => u.Id, u => u);

    var conversationIds = conversations.Select(c => c.Id).ToList();
    var recentMessages = await db.ChatMessages
        .AsNoTracking()
        .Where(m => conversationIds.Contains(m.ConversationId))
        .OrderByDescending(m => m.SentAtUtc)
        .ToListAsync();

    var lastByConv = recentMessages
        .GroupBy(m => m.ConversationId)
        .ToDictionary(g => g.Key, g => g.First());

    var readStates = await db.ConversationReadStates
        .AsNoTracking()
        .Where(r => r.UserId == current.UserId && conversationIds.Contains(r.ConversationId))
        .ToDictionaryAsync(r => r.ConversationId, r => r.LastReadAtUtc);

    var result = conversations.Select(c =>
    {
        var peerId = c.UserAId == current.UserId ? c.UserBId : c.UserAId;
        peers.TryGetValue(peerId, out var peer);
        lastByConv.TryGetValue(c.Id, out var last);
        readStates.TryGetValue(c.Id, out var lastRead);
        var unread = recentMessages.Count(m =>
            m.ConversationId == c.Id
            && m.SenderId != current.UserId
            && m.SentAtUtc > lastRead);
        return new ConversationDto(
            c.Id,
            peerId,
            peer?.DisplayName ?? "Profil",
            peer?.FriendCode ?? 0,
            last?.Body,
            last?.SentAtUtc ?? c.LastMessageAtUtc,
            peer?.AvatarUrl,
            unread);
    }).ToList();

    return Results.Ok(result);
}).RequireAuthorization();

api.MapPost("/chat/conversations", async (StartConversationRequest request, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    if (string.IsNullOrWhiteSpace(request.PeerUserId) || request.PeerUserId == current.UserId)
    {
        return Results.BadRequest(new { message = "Profil invalide." });
    }

    var areFriends = await db.Friendships.AnyAsync(f =>
        f.UserId == current.UserId && f.FriendUserId == request.PeerUserId);
    if (!areFriends)
    {
        return Results.BadRequest(new { message = "Ajoute d’abord cette personne en ami." });
    }

    var peer = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == request.PeerUserId);
    if (peer is null)
    {
        return Results.NotFound(new { message = "Profil introuvable." });
    }

    var conversation = await GetOrCreateConversationAsync(db, current.UserId, peer.Id);
    await db.SaveChangesAsync();

    return Results.Ok(new ConversationDto(
        conversation.Id,
        peer.Id,
        peer.DisplayName,
        peer.FriendCode,
        null,
        conversation.LastMessageAtUtc,
        peer.AvatarUrl));
}).RequireAuthorization();

api.MapGet("/chat/conversations/{id:guid}/messages", async (Guid id, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var conversation = await db.Conversations.AsNoTracking()
        .FirstOrDefaultAsync(c => c.Id == id && (c.UserAId == current.UserId || c.UserBId == current.UserId));
    if (conversation is null)
    {
        return Results.NotFound();
    }

    await MarkConversationReadAsync(db, id, current.UserId);
    await db.SaveChangesAsync();

    var messages = await db.ChatMessages
        .AsNoTracking()
        .Where(m => m.ConversationId == id)
        .OrderBy(m => m.SentAtUtc)
        .Select(m => new ChatMessageDto(m.Id, m.SenderId, m.Body, m.SentAtUtc, m.SenderId == current.UserId))
        .ToListAsync();

    return Results.Ok(messages);
}).RequireAuthorization();

api.MapPost("/chat/conversations/{id:guid}/read", async (Guid id, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var conversation = await db.Conversations.AsNoTracking()
        .FirstOrDefaultAsync(c => c.Id == id && (c.UserAId == current.UserId || c.UserBId == current.UserId));
    if (conversation is null)
    {
        return Results.NotFound();
    }

    await MarkConversationReadAsync(db, id, current.UserId);
    await db.SaveChangesAsync();
    return Results.Ok(new { unreadCount = 0 });
}).RequireAuthorization();

api.MapPost("/chat/conversations/{id:guid}/messages", async (
    Guid id,
    SendMessageRequest request,
    ICurrentUser current,
    FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var body = (request.Body ?? string.Empty).Trim();
    if (string.IsNullOrWhiteSpace(body))
    {
        return Results.BadRequest(new { message = "Écris un message." });
    }

    if (body.Length > 2000)
    {
        return Results.BadRequest(new { message = "Message trop long." });
    }

    var conversation = await db.Conversations
        .FirstOrDefaultAsync(c => c.Id == id && (c.UserAId == current.UserId || c.UserBId == current.UserId));
    if (conversation is null)
    {
        return Results.NotFound();
    }

    var message = new ChatMessage
    {
        Id = Guid.NewGuid(),
        ConversationId = conversation.Id,
        SenderId = current.UserId,
        Body = body,
        SentAtUtc = DateTime.UtcNow
    };

    conversation.LastMessageAtUtc = message.SentAtUtc;
    db.ChatMessages.Add(message);
    await db.SaveChangesAsync();

    return Results.Ok(new ChatMessageDto(message.Id, message.SenderId, message.Body, message.SentAtUtc, true));
}).RequireAuthorization();

api.MapPut("/planning/snapshot", async (PlanningSnapshotRequest request, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var snapshot = await db.PlanningSnapshots.FirstOrDefaultAsync(s => s.UserId == current.UserId);
    if (snapshot is null)
    {
        snapshot = new UserPlanningSnapshot { UserId = current.UserId };
        db.PlanningSnapshots.Add(snapshot);
    }

    snapshot.ObjectivesJson = string.IsNullOrWhiteSpace(request.ObjectivesJson) ? "[]" : request.ObjectivesJson;
    snapshot.RoomsJson = string.IsNullOrWhiteSpace(request.RoomsJson) ? "[]" : request.RoomsJson;
    snapshot.TasksJson = string.IsNullOrWhiteSpace(request.TasksJson) ? "[]" : request.TasksJson;
    snapshot.UpdatedAtUtc = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization();

api.MapGet("/families", async (ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var memberships = await db.FamilyMembers
        .AsNoTracking()
        .Where(m => m.UserId == current.UserId)
        .Select(m => m.FamilyId)
        .ToListAsync();

    if (memberships.Count == 0)
    {
        return Results.Ok(Array.Empty<FamilyDto>());
    }

    var rows = await db.Families
        .AsNoTracking()
        .Where(f => memberships.Contains(f.Id))
        .OrderBy(f => f.Name)
        .Select(f => new
        {
            f.Id,
            f.Name,
            f.InviteCode,
            f.CreatedByUserId,
            MemberCount = db.FamilyMembers.Count(m => m.FamilyId == f.Id)
        })
        .ToListAsync();

    var families = rows
        .Select(f => new FamilyDto(
            f.Id,
            f.Name,
            f.InviteCode,
            f.MemberCount,
            f.CreatedByUserId == current.UserId))
        .ToList();

    return Results.Ok(families);
}).RequireAuthorization();

api.MapPost("/families", async (CreateFamilyRequest request, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var name = (request.Name ?? string.Empty).Trim();
    if (name.Length is < 2 or > 120)
    {
        return Results.BadRequest(new { message = "Le nom de famille doit faire entre 2 et 120 caractères." });
    }

    var family = new Family
    {
        Id = Guid.NewGuid(),
        Name = name,
        InviteCode = await NextFamilyInviteCodeAsync(db),
        CreatedByUserId = current.UserId,
        CreatedAtUtc = DateTime.UtcNow
    };
    db.Families.Add(family);
    db.FamilyMembers.Add(new FamilyMember
    {
        Id = Guid.NewGuid(),
        FamilyId = family.Id,
        UserId = current.UserId,
        JoinedAtUtc = DateTime.UtcNow
    });
    await db.SaveChangesAsync();

    return Results.Ok(new FamilyDto(family.Id, family.Name, family.InviteCode, 1, true));
}).RequireAuthorization();

api.MapPost("/families/join", async (JoinFamilyRequest request, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    if (request.InviteCode is < 100000 or > 999999)
    {
        return Results.BadRequest(new { message = "Le code famille doit contenir 6 chiffres." });
    }

    var family = await db.Families.FirstOrDefaultAsync(f => f.InviteCode == request.InviteCode);
    if (family is null)
    {
        return Results.NotFound(new { message = "Aucune famille trouvée avec ce code." });
    }

    var already = await db.FamilyMembers.AnyAsync(m => m.FamilyId == family.Id && m.UserId == current.UserId);
    if (already)
    {
        return Results.BadRequest(new { message = "Tu fais déjà partie de cette famille." });
    }

    db.FamilyMembers.Add(new FamilyMember
    {
        Id = Guid.NewGuid(),
        FamilyId = family.Id,
        UserId = current.UserId,
        JoinedAtUtc = DateTime.UtcNow
    });
    await db.SaveChangesAsync();

    var count = await db.FamilyMembers.CountAsync(m => m.FamilyId == family.Id);
    return Results.Ok(new FamilyDto(family.Id, family.Name, family.InviteCode, count, family.CreatedByUserId == current.UserId));
}).RequireAuthorization();

api.MapDelete("/families/{id:guid}/leave", async (Guid id, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var membership = await db.FamilyMembers.FirstOrDefaultAsync(m => m.FamilyId == id && m.UserId == current.UserId);
    if (membership is null)
    {
        return Results.NotFound();
    }

    db.FamilyMembers.Remove(membership);
    var remaining = await db.FamilyMembers.CountAsync(m => m.FamilyId == id && m.Id != membership.Id);
    if (remaining == 0)
    {
        var family = await db.Families.FirstOrDefaultAsync(f => f.Id == id);
        if (family is not null)
        {
            db.Families.Remove(family);
        }
    }

    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization();

api.MapGet("/families/{id:guid}/today", async (Guid id, DateOnly? date, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var isMember = await db.FamilyMembers.AnyAsync(m => m.FamilyId == id && m.UserId == current.UserId);
    if (!isMember)
    {
        return Results.Forbid();
    }

    var family = await db.Families.AsNoTracking().FirstOrDefaultAsync(f => f.Id == id);
    if (family is null)
    {
        return Results.NotFound();
    }

    var day = date ?? DateOnly.FromDateTime(DateTime.Now);
    var memberIds = await db.FamilyMembers
        .AsNoTracking()
        .Where(m => m.FamilyId == id)
        .Select(m => m.UserId)
        .ToListAsync();

    var users = await db.Users
        .AsNoTracking()
        .Where(u => memberIds.Contains(u.Id))
        .ToDictionaryAsync(u => u.Id, u => u);

    var members = users.Values
        .Select(u => new FamilyMemberDto(u.Id, u.DisplayName, u.AvatarUrl))
        .OrderBy(u => u.DisplayName)
        .ToList();

    var events = await db.Events
        .AsNoTracking()
        .Where(e => memberIds.Contains(e.UserId) && e.Date <= day && (e.EndDate ?? e.Date) >= day)
        .OrderBy(e => e.StartTime)
        .ToListAsync();

    var eventDtos = events.Select(e =>
    {
        users.TryGetValue(e.UserId, out var owner);
        return new FamilyEventDto(
            e.Id,
            e.UserId,
            owner?.DisplayName ?? "Membre",
            e.UserId == current.UserId,
            e.Title,
            e.Date,
            e.EndDate,
            e.StartTime,
            e.EndTime,
            e.AllDay,
            (int)e.Kind,
            (int)e.Category);
    }).ToList();

    var snapshots = await db.PlanningSnapshots
        .AsNoTracking()
        .Where(s => memberIds.Contains(s.UserId))
        .ToListAsync();

    var objectives = new List<FamilyPlanItemDto>();
    var habits = new List<FamilyPlanItemDto>();
    var tasks = new List<FamilyPlanItemDto>();

    foreach (var snapshot in snapshots)
    {
        users.TryGetValue(snapshot.UserId, out var owner);
        var ownerName = owner?.DisplayName ?? "Membre";
        var mine = snapshot.UserId == current.UserId;
        var dayIso = day.ToString("yyyy-MM-dd");

        foreach (var item in ParseObjectives(snapshot.ObjectivesJson))
        {
            if (!IsDueOn(item.Date, item.Repeat, dayIso)) continue;
            objectives.Add(new FamilyPlanItemDto(
                item.Id,
                snapshot.UserId,
                ownerName,
                mine,
                item.Title,
                RepeatLabel(item.Repeat),
                item.Done,
                "objective",
                null));
        }

        foreach (var room in ParseRooms(snapshot.RoomsJson))
        {
            foreach (var task in room.Tasks)
            {
                if (!IsDueOn(task.Date, task.Repeat, dayIso)) continue;
                habits.Add(new FamilyPlanItemDto(
                    task.Id,
                    snapshot.UserId,
                    ownerName,
                    mine,
                    $"{task.Title} · {room.Name}",
                    RepeatLabel(task.Repeat),
                    task.Done,
                    "habit",
                    room.Id));
            }
        }

        foreach (var task in ParseTasks(snapshot.TasksJson))
        {
            tasks.Add(new FamilyPlanItemDto(
                task.Id,
                snapshot.UserId,
                ownerName,
                mine,
                task.Title,
                "Tâche",
                task.Done,
                "task",
                null));
        }
    }

    return Results.Ok(new FamilyTodayDto(
        family.Id,
        family.Name,
        members,
        eventDtos,
        objectives,
        habits,
        tasks));
}).RequireAuthorization();

api.MapGet("/families/{id:guid}/events", async (
    Guid id,
    DateOnly? from,
    DateOnly? to,
    ICurrentUser current,
    FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var isMember = await db.FamilyMembers.AnyAsync(m => m.FamilyId == id && m.UserId == current.UserId);
    if (!isMember)
    {
        return Results.Forbid();
    }

    var start = from ?? DateOnly.FromDateTime(DateTime.Today);
    var end = to ?? start.AddDays(6);
    var memberIds = await db.FamilyMembers
        .AsNoTracking()
        .Where(m => m.FamilyId == id)
        .Select(m => m.UserId)
        .ToListAsync();

    var users = await db.Users
        .AsNoTracking()
        .Where(u => memberIds.Contains(u.Id))
        .ToDictionaryAsync(u => u.Id, u => u.DisplayName);

    var events = await db.Events
        .AsNoTracking()
        .Where(e => memberIds.Contains(e.UserId) && e.Date <= end && (e.EndDate ?? e.Date) >= start)
        .OrderBy(e => e.Date)
        .ThenBy(e => e.StartTime)
        .ToListAsync();

    var result = events.Select(e => new FamilyEventDto(
        e.Id,
        e.UserId,
        users.GetValueOrDefault(e.UserId) ?? "Membre",
        e.UserId == current.UserId,
        e.Title,
        e.Date,
        e.EndDate,
        e.StartTime,
        e.EndTime,
        e.AllDay,
        (int)e.Kind,
        (int)e.Category)).ToList();

    return Results.Ok(result);
}).RequireAuthorization();

api.MapGet("/budget/month", async (int? year, int? month, string? ownerUserId, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null) return Results.Unauthorized();

    var now = DateTime.Now;
    var y = year ?? now.Year;
    var m = month ?? now.Month;
    if (m is < 1 or > 12) return Results.BadRequest(new { message = "Mois invalide." });

    var ownerId = string.IsNullOrWhiteSpace(ownerUserId) ? current.UserId : ownerUserId.Trim();
    var canEdit = ownerId == current.UserId;
    BudgetShare? share = null;

    if (!canEdit)
    {
        share = await db.BudgetShares.AsNoTracking()
            .FirstOrDefaultAsync(s => s.OwnerUserId == ownerId && s.ViewerUserId == current.UserId);
        if (share is null || !(share.ShareSalary || share.ShareAllocations || share.ShareSavings || share.ShareMovements))
        {
            return Results.Forbid();
        }
    }

    var owner = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == ownerId);
    if (owner is null) return Results.NotFound(new { message = "Profil introuvable." });

    var entity = await db.PersonalBudgetMonths
        .Include(b => b.Allocations)
        .Include(b => b.Movements)
        .AsNoTracking()
        .FirstOrDefaultAsync(b => b.UserId == ownerId && b.Year == y && b.Month == m);

    if (entity is null)
    {
        return Results.Ok(new BudgetMonthDto(
            Guid.Empty,
            y,
            m,
            canEdit || (share?.ShareSalary ?? false) ? 0 : 0,
            null,
            [],
            [],
            canEdit,
            owner.DisplayName,
            ownerId));
    }

    var allocations = entity.Allocations
        .Where(a =>
            canEdit ||
            (a.Kind == "save" && (share?.ShareSavings ?? false)) ||
            (a.Kind != "save" && (share?.ShareAllocations ?? false)))
        .OrderBy(a => a.Label)
        .Select(a => new BudgetAllocationDto(a.Id, a.Label, a.Kind, a.PlannedAmount))
        .ToList();

    var movements = (canEdit || (share?.ShareMovements ?? false))
        ? entity.Movements
            .OrderByDescending(x => x.Date)
            .Select(x => new BudgetMovementDto(x.Id, x.Label, x.Kind, x.Amount, x.Date, x.Note, x.Category, x.AccountName))
            .ToList()
        : [];

    var salary = canEdit || (share?.ShareSalary ?? false) ? entity.Salary : 0;

    return Results.Ok(new BudgetMonthDto(
        entity.Id,
        entity.Year,
        entity.Month,
        salary,
        canEdit ? entity.Note : null,
        allocations,
        movements,
        canEdit,
        owner.DisplayName,
        ownerId));
}).RequireAuthorization();

api.MapPut("/budget/month", async (UpsertBudgetMonthRequest request, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null) return Results.Unauthorized();
    if (request.Month is < 1 or > 12) return Results.BadRequest(new { message = "Mois invalide." });
    if (request.Salary < 0) return Results.BadRequest(new { message = "Salaire invalide." });

    var entity = await db.PersonalBudgetMonths
        .Include(b => b.Allocations)
        .Include(b => b.Movements)
        .FirstOrDefaultAsync(b => b.UserId == current.UserId && b.Year == request.Year && b.Month == request.Month);

    if (entity is null)
    {
        entity = new PersonalBudgetMonth
        {
            Id = Guid.NewGuid(),
            UserId = current.UserId,
            Year = request.Year,
            Month = request.Month
        };
        db.PersonalBudgetMonths.Add(entity);
    }

    entity.Salary = request.Salary;
    entity.Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();

    db.BudgetAllocations.RemoveRange(entity.Allocations);
    entity.Allocations.Clear();
    foreach (var item in request.Allocations ?? [])
    {
        var label = (item.Label ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(label)) continue;
        var kind = item.Kind is "save" or "spend" ? item.Kind : "spend";
        entity.Allocations.Add(new BudgetAllocation
        {
            Id = item.Id is Guid g && g != Guid.Empty ? g : Guid.NewGuid(),
            BudgetMonthId = entity.Id,
            Label = label,
            Kind = kind,
            PlannedAmount = Math.Max(0, item.PlannedAmount)
        });
    }

    db.BudgetMovements.RemoveRange(entity.Movements);
    entity.Movements.Clear();
    foreach (var item in request.Movements ?? [])
    {
        var label = (item.Label ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(label)) continue;
        var kind = item.Kind is "expense" or "saving" or "income" ? item.Kind : "expense";
        entity.Movements.Add(new BudgetMovement
        {
            Id = item.Id is Guid g && g != Guid.Empty ? g : Guid.NewGuid(),
            BudgetMonthId = entity.Id,
            Label = label,
            Kind = kind,
            Amount = Math.Max(0, item.Amount),
            Date = item.Date,
            Note = string.IsNullOrWhiteSpace(item.Note) ? null : item.Note.Trim(),
            Category = string.IsNullOrWhiteSpace(item.Category) ? null : item.Category.Trim(),
            AccountName = string.IsNullOrWhiteSpace(item.AccountName) ? null : item.AccountName.Trim()
        });
    }

    await db.SaveChangesAsync();

    var me = await db.Users.AsNoTracking().FirstAsync(u => u.Id == current.UserId);
    return Results.Ok(new BudgetMonthDto(
        entity.Id,
        entity.Year,
        entity.Month,
        entity.Salary,
        entity.Note,
        entity.Allocations.Select(a => new BudgetAllocationDto(a.Id, a.Label, a.Kind, a.PlannedAmount)).ToList(),
        entity.Movements.OrderByDescending(x => x.Date)
            .Select(x => new BudgetMovementDto(x.Id, x.Label, x.Kind, x.Amount, x.Date, x.Note, x.Category, x.AccountName))
            .ToList(),
        true,
        me.DisplayName,
        me.Id));
}).RequireAuthorization();

api.MapGet("/budget/accounts", async (string? ownerUserId, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null) return Results.Unauthorized();
    var ownerId = string.IsNullOrWhiteSpace(ownerUserId) ? current.UserId : ownerUserId.Trim();
    if (ownerId != current.UserId)
    {
        var share = await db.BudgetShares.AsNoTracking()
            .FirstOrDefaultAsync(s => s.OwnerUserId == ownerId && s.ViewerUserId == current.UserId);
        if (share is null || !share.ShareAllocations) return Results.Forbid();
    }

    var accounts = await db.BudgetAccounts.AsNoTracking()
        .Where(a => a.UserId == ownerId)
        .OrderBy(a => a.SortOrder)
        .ThenBy(a => a.Label)
        .Select(a => new BudgetAccountDto(a.Id, a.Label, a.Icon, a.Balance, a.PerformancePct, a.SortOrder))
        .ToListAsync();
    return Results.Ok(accounts);
}).RequireAuthorization();

api.MapPut("/budget/accounts", async (UpsertBudgetAccountsRequest request, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null) return Results.Unauthorized();
    var existing = await db.BudgetAccounts.Where(a => a.UserId == current.UserId).ToListAsync();
    db.BudgetAccounts.RemoveRange(existing);

    var order = 0;
    foreach (var item in request.Accounts ?? [])
    {
        var label = (item.Label ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(label)) continue;
        db.BudgetAccounts.Add(new BudgetAccount
        {
            Id = item.Id is Guid g && g != Guid.Empty ? g : Guid.NewGuid(),
            UserId = current.UserId,
            Label = label,
            Icon = string.IsNullOrWhiteSpace(item.Icon) ? "💳" : item.Icon.Trim(),
            Balance = item.Balance,
            PerformancePct = item.PerformancePct,
            SortOrder = item.SortOrder > 0 ? item.SortOrder : order
        });
        order++;
    }

    await db.SaveChangesAsync();
    var result = await db.BudgetAccounts.AsNoTracking()
        .Where(a => a.UserId == current.UserId)
        .OrderBy(a => a.SortOrder)
        .ThenBy(a => a.Label)
        .Select(a => new BudgetAccountDto(a.Id, a.Label, a.Icon, a.Balance, a.PerformancePct, a.SortOrder))
        .ToListAsync();
    return Results.Ok(result);
}).RequireAuthorization();

api.MapGet("/budget/projects", async (string? ownerUserId, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null) return Results.Unauthorized();
    var ownerId = string.IsNullOrWhiteSpace(ownerUserId) ? current.UserId : ownerUserId.Trim();
    if (ownerId != current.UserId)
    {
        var share = await db.BudgetShares.AsNoTracking()
            .FirstOrDefaultAsync(s => s.OwnerUserId == ownerId && s.ViewerUserId == current.UserId);
        if (share is null || !share.ShareSavings) return Results.Forbid();
    }

    var projects = await db.BudgetProjects.AsNoTracking()
        .Where(p => p.UserId == ownerId)
        .OrderBy(p => p.Archived)
        .ThenBy(p => p.SortOrder)
        .ThenBy(p => p.Label)
        .Select(p => new BudgetProjectDto(
            p.Id, p.Label, p.Icon, p.TargetAmount, p.SavedAmount, p.MonthlyContribution, p.Archived, p.CompletedOn, p.SortOrder))
        .ToListAsync();
    return Results.Ok(projects);
}).RequireAuthorization();

api.MapPut("/budget/projects", async (UpsertBudgetProjectsRequest request, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null) return Results.Unauthorized();
    var existing = await db.BudgetProjects.Where(p => p.UserId == current.UserId).ToListAsync();
    db.BudgetProjects.RemoveRange(existing);

    var order = 0;
    foreach (var item in request.Projects ?? [])
    {
        var label = (item.Label ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(label)) continue;
        db.BudgetProjects.Add(new BudgetProject
        {
            Id = item.Id is Guid g && g != Guid.Empty ? g : Guid.NewGuid(),
            UserId = current.UserId,
            Label = label,
            Icon = string.IsNullOrWhiteSpace(item.Icon) ? "🎯" : item.Icon.Trim(),
            TargetAmount = Math.Max(0, item.TargetAmount),
            SavedAmount = Math.Max(0, item.SavedAmount),
            MonthlyContribution = Math.Max(0, item.MonthlyContribution),
            Archived = item.Archived,
            CompletedOn = item.CompletedOn,
            SortOrder = item.SortOrder > 0 ? item.SortOrder : order
        });
        order++;
    }

    await db.SaveChangesAsync();
    var result = await db.BudgetProjects.AsNoTracking()
        .Where(p => p.UserId == current.UserId)
        .OrderBy(p => p.Archived)
        .ThenBy(p => p.SortOrder)
        .ThenBy(p => p.Label)
        .Select(p => new BudgetProjectDto(
            p.Id, p.Label, p.Icon, p.TargetAmount, p.SavedAmount, p.MonthlyContribution, p.Archived, p.CompletedOn, p.SortOrder))
        .ToListAsync();
    return Results.Ok(result);
}).RequireAuthorization();

api.MapGet("/budget/shares", async (ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null) return Results.Unauthorized();

    var shares = await db.BudgetShares.AsNoTracking()
        .Where(s => s.OwnerUserId == current.UserId)
        .ToListAsync();
    var viewerIds = shares.Select(s => s.ViewerUserId).ToList();
    var viewers = await db.Users.AsNoTracking()
        .Where(u => viewerIds.Contains(u.Id))
        .ToDictionaryAsync(u => u.Id, u => u.DisplayName);

    var result = shares.Select(s => new BudgetShareDto(
        s.ViewerUserId,
        viewers.GetValueOrDefault(s.ViewerUserId) ?? "Profil",
        s.ShareSalary,
        s.ShareAllocations,
        s.ShareSavings,
        s.ShareMovements)).ToList();

    return Results.Ok(result);
}).RequireAuthorization();

api.MapPut("/budget/shares", async (UpsertBudgetShareRequest request, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null) return Results.Unauthorized();
    if (string.IsNullOrWhiteSpace(request.ViewerUserId) || request.ViewerUserId == current.UserId)
    {
        return Results.BadRequest(new { message = "Destinataire invalide." });
    }

    var areFriends = await db.Friendships.AnyAsync(f =>
        f.UserId == current.UserId && f.FriendUserId == request.ViewerUserId);
    if (!areFriends)
    {
        return Results.BadRequest(new { message = "Tu ne peux partager qu’avec un ami." });
    }

    var viewer = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == request.ViewerUserId);
    if (viewer is null) return Results.NotFound(new { message = "Profil introuvable." });

    var anyShare = request.ShareSalary || request.ShareAllocations || request.ShareSavings || request.ShareMovements;
    var existing = await db.BudgetShares
        .FirstOrDefaultAsync(s => s.OwnerUserId == current.UserId && s.ViewerUserId == request.ViewerUserId);

    if (!anyShare)
    {
        if (existing is not null)
        {
            db.BudgetShares.Remove(existing);
            await db.SaveChangesAsync();
        }
        return Results.NoContent();
    }

    if (existing is null)
    {
        existing = new BudgetShare
        {
            Id = Guid.NewGuid(),
            OwnerUserId = current.UserId,
            ViewerUserId = request.ViewerUserId
        };
        db.BudgetShares.Add(existing);
    }

    existing.ShareSalary = request.ShareSalary;
    existing.ShareAllocations = request.ShareAllocations;
    existing.ShareSavings = request.ShareSavings;
    existing.ShareMovements = request.ShareMovements;
    existing.UpdatedAtUtc = DateTime.UtcNow;
    await db.SaveChangesAsync();

    return Results.Ok(new BudgetShareDto(
        existing.ViewerUserId,
        viewer.DisplayName,
        existing.ShareSalary,
        existing.ShareAllocations,
        existing.ShareSavings,
        existing.ShareMovements));
}).RequireAuthorization();

api.MapGet("/budget/shared-with-me", async (ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null) return Results.Unauthorized();

    var ownerIds = await db.BudgetShares.AsNoTracking()
        .Where(s => s.ViewerUserId == current.UserId &&
                    (s.ShareSalary || s.ShareAllocations || s.ShareSavings || s.ShareMovements))
        .Select(s => s.OwnerUserId)
        .ToListAsync();

    if (ownerIds.Count == 0)
    {
        return Results.Ok(Array.Empty<SharedBudgetOwnerDto>());
    }

    var owners = await db.Users.AsNoTracking()
        .Where(u => ownerIds.Contains(u.Id))
        .OrderBy(u => u.DisplayName)
        .Select(u => new SharedBudgetOwnerDto(u.Id, u.DisplayName, u.AvatarUrl))
        .ToListAsync();

    return Results.Ok(owners);
}).RequireAuthorization();

api.MapPost("/pets/shares", async (CreatePetShareRequest request, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null) return Results.Unauthorized();
    if (string.IsNullOrWhiteSpace(request.PetPayloadJson))
    {
        return Results.BadRequest(new { message = "Profil animal manquant." });
    }

    var me = await db.Users.AsNoTracking().FirstAsync(u => u.Id == current.UserId);
    var token = Convert.ToHexString(Guid.NewGuid().ToByteArray()).ToLowerInvariant();
    var entity = new PetProfileShare
    {
        Id = Guid.NewGuid(),
        Token = token,
        OwnerUserId = current.UserId,
        OwnerName = me.DisplayName,
        PetPayloadJson = request.PetPayloadJson,
        CreatedAtUtc = DateTime.UtcNow
    };
    db.PetProfileShares.Add(entity);
    await db.SaveChangesAsync();
    return Results.Ok(new PetShareDto(entity.Token, entity.OwnerName, entity.CreatedAtUtc));
}).RequireAuthorization();

api.MapGet("/pets/shares/{token}", async (string token, FreyaDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(token)) return Results.BadRequest(new { message = "Lien invalide." });
    var entity = await db.PetProfileShares.AsNoTracking()
        .FirstOrDefaultAsync(s => s.Token == token.Trim().ToLowerInvariant());
    if (entity is null) return Results.NotFound(new { message = "Lien de partage introuvable." });
    return Results.Ok(new PetShareViewDto(entity.Token, entity.OwnerName, entity.PetPayloadJson, entity.CreatedAtUtc));
});

app.Run();

static DateOnly StartOfWeek(DateOnly date)
{
    var diff = ((int)date.DayOfWeek + 6) % 7;
    return date.AddDays(-diff);
}

/// <summary>Recettes importées (Croq-Kilos, etc.) : UserId null pour que tout le monde les voie.</summary>
static async Task PublishCatalogRecipesAsync(FreyaDbContext db)
{
    const string croqMarker = "croq-kilos:";

    var ownedCatalog = await db.Recipes
        .Where(r => r.UserId != null && r.Categories.Contains(croqMarker))
        .ToListAsync();
    if (ownedCatalog.Count > 0)
    {
        foreach (var recipe in ownedCatalog)
        {
            recipe.UserId = null;
        }

        await db.SaveChangesAsync();
    }

    var catalog = await db.Recipes
        .Where(r => r.UserId == null && r.Categories.Contains(croqMarker))
        .ToListAsync();

    if (catalog.Count < 2)
    {
        return;
    }

    static string? CroqKey(Recipe r)
    {
        foreach (var part in r.Categories.Split(',', StringSplitOptions.TrimEntries))
        {
            if (part.StartsWith(croqMarker, StringComparison.Ordinal))
            {
                return part;
            }
        }

        return null;
    }

    var keepers = new Dictionary<string, Recipe>(StringComparer.Ordinal);
    var dupes = new List<Recipe>();

    foreach (var recipe in catalog.OrderBy(r => r.Title))
    {
        var key = CroqKey(recipe) ?? recipe.Id.ToString();
        if (keepers.ContainsKey(key))
        {
            dupes.Add(recipe);
        }
        else
        {
            keepers[key] = recipe;
        }
    }

    if (dupes.Count > 0)
    {
        db.Recipes.RemoveRange(dupes);
        await db.SaveChangesAsync();
    }
}

static async Task EnsureFriendCodesAsync(FreyaDbContext db, UserManager<AppUser> users)
{
    var missing = await users.Users.Where(u => u.FriendCode <= 0).ToListAsync();
    if (missing.Count == 0)
    {
        return;
    }

    foreach (var user in missing)
    {
        user.FriendCode = await NextFriendCodeAsync(users);
        await users.UpdateAsync(user);
    }
}

static async Task<int> NextFamilyInviteCodeAsync(FreyaDbContext db)
{
    var existing = await db.Families.Select(f => f.InviteCode).ToListAsync();
    var used = existing.ToHashSet();
    for (var i = 0; i < 40; i++)
    {
        var code = Random.Shared.Next(100000, 1000000);
        if (!used.Contains(code)) return code;
    }

    for (var code = 100000; code <= 999999; code++)
    {
        if (!used.Contains(code)) return code;
    }

    throw new InvalidOperationException("Plus de codes famille disponibles.");
}

static bool IsDueOn(string date, string repeat, string dayIso)
{
    if (string.IsNullOrWhiteSpace(date) || string.IsNullOrWhiteSpace(dayIso)) return false;
    if (string.CompareOrdinal(dayIso, date) < 0) return false;
    repeat = string.IsNullOrWhiteSpace(repeat) ? "once" : repeat;
    if (repeat == "once") return date == dayIso;
    if (repeat == "daily") return true;

    if (!DateOnly.TryParse(date, out var start) || !DateOnly.TryParse(dayIso, out var day))
    {
        return false;
    }

    if (repeat == "weekly") return (int)start.DayOfWeek == (int)day.DayOfWeek;
    if (repeat == "monthly") return start.Day == day.Day;
    return false;
}

static string RepeatLabel(string repeat) => repeat switch
{
    "daily" => "Au jour",
    "weekly" => "À la semaine",
    "monthly" => "Au mois",
    _ => "1 fois"
};

static JsonSerializerOptions PlanJsonOptions() => new()
{
    PropertyNameCaseInsensitive = true
};

static List<PlanObjectiveJson> ParseObjectives(string json)
{
    try
    {
        return JsonSerializer.Deserialize<List<PlanObjectiveJson>>(json, PlanJsonOptions()) ?? [];
    }
    catch
    {
        return [];
    }
}

static List<PlanRoomJson> ParseRooms(string json)
{
    try
    {
        return JsonSerializer.Deserialize<List<PlanRoomJson>>(json, PlanJsonOptions()) ?? [];
    }
    catch
    {
        return [];
    }
}

static List<PlanTaskJson> ParseTasks(string json)
{
    try
    {
        return JsonSerializer.Deserialize<List<PlanTaskJson>>(json, PlanJsonOptions()) ?? [];
    }
    catch
    {
        return [];
    }
}

static async Task<int> NextFriendCodeAsync(UserManager<AppUser> users)
{
    var existing = await users.Users
        .Where(u => u.FriendCode > 0)
        .Select(u => u.FriendCode)
        .ToListAsync();
    var used = existing.ToHashSet();
    var random = Random.Shared;

    for (var i = 0; i < 40; i++)
    {
        var code = random.Next(100000, 1000000);
        if (!used.Contains(code))
        {
            return code;
        }
    }

    for (var code = 100000; code <= 999999; code++)
    {
        if (!used.Contains(code))
        {
            return code;
        }
    }

    throw new InvalidOperationException("Plus de codes amis disponibles.");
}

static async Task MarkConversationReadAsync(FreyaDbContext db, Guid conversationId, string userId)
{
    var state = await db.ConversationReadStates
        .FirstOrDefaultAsync(r => r.ConversationId == conversationId && r.UserId == userId);
    if (state is null)
    {
        db.ConversationReadStates.Add(new ConversationReadState
        {
            Id = Guid.NewGuid(),
            ConversationId = conversationId,
            UserId = userId,
            LastReadAtUtc = DateTime.UtcNow
        });
        return;
    }

    state.LastReadAtUtc = DateTime.UtcNow;
}

static async Task<Conversation> GetOrCreateConversationAsync(FreyaDbContext db, string userId, string peerId)
{
    var a = string.CompareOrdinal(userId, peerId) <= 0 ? userId : peerId;
    var b = string.CompareOrdinal(userId, peerId) <= 0 ? peerId : userId;

    var existing = await db.Conversations
        .FirstOrDefaultAsync(c => c.UserAId == a && c.UserBId == b);
    if (existing is not null)
    {
        return existing;
    }

    var created = new Conversation
    {
        Id = Guid.NewGuid(),
        UserAId = a,
        UserBId = b,
        CreatedAtUtc = DateTime.UtcNow
    };
    db.Conversations.Add(created);
    return created;
}

internal sealed class PlanObjectiveJson
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string Repeat { get; set; } = "once";
    public bool Done { get; set; }
}

internal sealed class PlanHabitJson
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string Repeat { get; set; } = "daily";
    public bool Done { get; set; }
}

internal sealed class PlanRoomJson
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public List<PlanHabitJson> Tasks { get; set; } = [];
}

internal sealed class PlanTaskJson
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public bool Done { get; set; }
}

internal record MealCreateRequest(DateOnly Date, MealSlotType Slot, string Title, Guid? RecipeId, string? ImageUrl, int? Kcal);
internal record MealDoneRequest(bool Done);
internal record GroceryCreateRequest(string Name, string? Quantity, string? Aisle);
internal record GroceryPatchRequest(GroceryStatus? Status, string? Quantity, bool? Favorite);
internal record RecipeCreateRequest(string Title, int DurationMin, string? Difficulty, string? Categories, string? ImageUrl, string? Instructions, string? Ingredients, int? Kcal);
internal record TripCreateRequest(string Title, DateOnly StartDate, DateOnly EndDate, string? CoverUrl, string? Subtitle);
internal record CreatePetShareRequest(string PetPayloadJson);
internal record PetShareDto(string Token, string OwnerName, DateTime CreatedAtUtc);
internal record PetShareViewDto(string Token, string OwnerName, string PetPayloadJson, DateTime CreatedAtUtc);
