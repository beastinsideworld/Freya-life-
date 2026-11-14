using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Freya.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Freya.Api.Services;

public sealed class AlertWorker(
    IServiceScopeFactory scopes,
    IConfiguration config,
    IHttpClientFactory http,
    ILogger<AlertWorker> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var key = config["API_ALERTS_KEY"];
        if (string.IsNullOrWhiteSpace(key))
        {
            log.LogInformation("API_ALERTS_KEY absente, notifications désactivées.");
            await Task.Delay(Timeout.Infinite, stoppingToken);
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Tick(key, stoppingToken);
                await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                log.LogWarning("Alerte en échec : {Message}", ex.Message);
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            }
        }
    }

    private async Task Tick(string key, CancellationToken cancellationToken)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FreyaDbContext>();
        var pending = await db.PendingAlerts
            .AsNoTracking()
            .Where(alert => alert.SentAtUtc == null && alert.ClaimedAtUtc == null)
            .OrderBy(alert => alert.Id)
            .Take(20)
            .ToListAsync(cancellationToken);

        foreach (var alert in pending)
        {
            var claimed = await db.PendingAlerts
                .Where(item => item.Id == alert.Id && item.SentAtUtc == null && item.ClaimedAtUtc == null)
                .ExecuteUpdateAsync(
                    setters => setters.SetProperty(item => item.ClaimedAtUtc, DateTime.UtcNow),
                    cancellationToken);
            if (claimed != 1)
            {
                continue;
            }

            try
            {
                await Post(key, alert.Channel, alert.Title, alert.Message, alert.EventName, cancellationToken);
                await db.PendingAlerts
                    .Where(item => item.Id == alert.Id)
                    .ExecuteUpdateAsync(
                        setters => setters.SetProperty(item => item.SentAtUtc, DateTime.UtcNow),
                        cancellationToken);
                log.LogInformation("Alerte {Id} envoyée sur {Channel}", alert.Id, alert.Channel);
            }
            catch
            {
                await db.PendingAlerts
                    .Where(item => item.Id == alert.Id && item.SentAtUtc == null)
                    .ExecuteUpdateAsync(
                        setters => setters.SetProperty(item => item.ClaimedAtUtc, (DateTime?)null),
                        cancellationToken);
                throw;
            }
        }
    }

    private async Task Post(
        string key,
        string channel,
        string title,
        string message,
        string eventName,
        CancellationToken cancellationToken)
    {
        var payload = JsonSerializer.Serialize(new
        {
            channel,
            title,
            message,
            @event = eventName
        });

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.apialerts.com/event");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key.Trim());
        request.Content = new StringContent(payload, Encoding.UTF8, "application/json");
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(5));
        var client = http.CreateClient("alerts");
        using var response = await client.SendAsync(request, timeout.Token);
        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException("API Alerts a répondu " + (int)response.StatusCode);
        }
    }
}
