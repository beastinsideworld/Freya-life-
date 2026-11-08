using Freya.Domain.Enums;

namespace Freya.Application.Events;

public record EventDto(
    Guid Id,
    string Title,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly? EndTime,
    EventKind Kind,
    EventCategory Category);

public record CreateEventRequest(
    string Title,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly? EndTime,
    EventKind Kind,
    EventCategory Category);

public record UpdateEventRequest(
    string Title,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly? EndTime,
    EventKind Kind,
    EventCategory Category);
