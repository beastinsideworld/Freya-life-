using Freya.Application.Events;

namespace Freya.Application.Dashboard;

public record DashboardTodayDto(
    DateOnly Date,
    string Time,
    int? TemperatureC,
    IReadOnlyList<EventDto> Events,
    IReadOnlyList<MealTodayDto> Meals);

public record MealTodayDto(string Slot, string Title, bool Done, string? ImageUrl);
