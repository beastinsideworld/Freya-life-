namespace Freya.Domain.Entities;

public class BudgetMovement
{
    public Guid Id { get; set; }
    public Guid BudgetMonthId { get; set; }
    public PersonalBudgetMonth? BudgetMonth { get; set; }
    public string Label { get; set; } = string.Empty;
    /// <summary>expense | saving | income</summary>
    public string Kind { get; set; } = "expense";
    public decimal Amount { get; set; }
    public DateOnly Date { get; set; }
    public string? Note { get; set; }
}
