namespace Freya.Domain.Entities;

public class UserPlanningSnapshot
{
    public string UserId { get; set; } = string.Empty;
    public string ObjectivesJson { get; set; } = "[]";
    public string RoomsJson { get; set; } = "[]";
    public string TasksJson { get; set; } = "[]";
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
