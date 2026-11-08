namespace Freya.Domain.Entities;

public class TripBudgetLine
{
    public Guid Id { get; set; }
    public Guid TripId { get; set; }
    public string Label { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public Trip? Trip { get; set; }
}
