using Freya.Domain.Enums;

namespace Freya.Domain.Entities;

public class CalendarEvent
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly? EndTime { get; set; }
    public EventKind Kind { get; set; }
    public EventCategory Category { get; set; } = EventCategory.Other;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
