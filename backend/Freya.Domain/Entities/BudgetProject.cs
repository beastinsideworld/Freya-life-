namespace Freya.Domain.Entities;

public class BudgetProject
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Icon { get; set; } = "🎯";
    public decimal TargetAmount { get; set; }
    public decimal SavedAmount { get; set; }
    public decimal MonthlyContribution { get; set; }
    public bool Archived { get; set; }
    public DateOnly? CompletedOn { get; set; }
    public int SortOrder { get; set; }
}
