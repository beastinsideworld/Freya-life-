namespace Freya.Domain.Entities;

/// <summary>Notification en attente d'envoi vers API Alerts.</summary>
public class PendingAlert
{
    public long Id { get; set; }
    public string Channel { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string EventName { get; set; } = "freya.alert";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ClaimedAtUtc { get; set; }
    public DateTime? SentAtUtc { get; set; }
}
