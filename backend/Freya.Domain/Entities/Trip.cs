namespace Freya.Domain.Entities;

public class Trip
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string? CoverUrl { get; set; }
    public string? Subtitle { get; set; }
    public ICollection<TripPlace> Places { get; set; } = new List<TripPlace>();
    public ICollection<TripBudgetLine> BudgetLines { get; set; } = new List<TripBudgetLine>();
}
