using Freya.Domain.Entities;
using Freya.Infrastructure.Identity;
using Freya.Infrastructure.Persistence;

namespace Freya.Api.Services;

public sealed class AlertQueue(FreyaDbContext db, AlertChannelMap channels)
{
    public Task NotifyFreyaAsync(string title, string message, string eventName, CancellationToken cancellationToken = default) =>
        EnqueueAsync(channels.Freya, title, message, eventName, cancellationToken);

    public Task NotifyBariAsync(string title, string message, string eventName, CancellationToken cancellationToken = default) =>
        EnqueueAsync(channels.Bari, title, message, eventName, cancellationToken);

    public Task NotifyBothAsync(string title, string message, string eventName, CancellationToken cancellationToken = default) =>
        EnqueueAsync(channels.General, title, message, eventName, cancellationToken);

    public Task NotifyUserAsync(AppUser user, string title, string message, string eventName, CancellationToken cancellationToken = default)
    {
        var channel = channels.ForUser(user);
        if (channel is null)
        {
            return Task.CompletedTask;
        }

        return EnqueueAsync(channel, title, message, eventName, cancellationToken);
    }

    public async Task EnqueueAsync(string channel, string title, string message, string eventName, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(channel) || string.IsNullOrWhiteSpace(title))
        {
            return;
        }

        db.PendingAlerts.Add(new PendingAlert
        {
            Channel = channel.Trim(),
            Title = Trim(title, 200),
            Message = Trim(message, 500),
            EventName = Trim(string.IsNullOrWhiteSpace(eventName) ? "freya.alert" : eventName, 80),
            CreatedAtUtc = DateTime.UtcNow
        });
        await db.SaveChangesAsync(cancellationToken);
    }

    private static string Trim(string value, int max) =>
        value.Trim().Length <= max ? value.Trim() : value.Trim()[..max];
}
