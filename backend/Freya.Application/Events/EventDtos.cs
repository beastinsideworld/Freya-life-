using Freya.Domain.Enums;

namespace Freya.Application.Events;

public record EventDto(
    Guid Id,
    string Title,
    DateOnly Date,
    DateOnly? EndDate,
    TimeOnly StartTime,
    TimeOnly? EndTime,
    bool AllDay,
    EventKind Kind,
    EventCategory Category);

public record CreateEventRequest(
    string Title,
    DateOnly Date,
    DateOnly? EndDate,
    TimeOnly? StartTime,
    TimeOnly? EndTime,
    bool AllDay,
    EventKind Kind,
    EventCategory Category);

public record UpdateEventRequest(
    string Title,
    DateOnly Date,
    DateOnly? EndDate,
    TimeOnly? StartTime,
    TimeOnly? EndTime,
    bool AllDay,
    EventKind Kind,
    EventCategory Category);
