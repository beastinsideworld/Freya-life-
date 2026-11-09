namespace Freya.Domain.Entities;

public class BudgetAccount
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Icon { get; set; } = "💳";
    public decimal Balance { get; set; }
    public decimal? PerformancePct { get; set; }
    public int SortOrder { get; set; }
}
