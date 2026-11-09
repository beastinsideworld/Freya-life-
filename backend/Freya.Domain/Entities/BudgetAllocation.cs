namespace Freya.Domain.Entities;

public class BudgetAllocation
{
    public Guid Id { get; set; }
    public Guid BudgetMonthId { get; set; }
    public PersonalBudgetMonth? BudgetMonth { get; set; }
    public string Label { get; set; } = string.Empty;
    /// <summary>spend | save</summary>
    public string Kind { get; set; } = "spend";
    public decimal PlannedAmount { get; set; }
}
