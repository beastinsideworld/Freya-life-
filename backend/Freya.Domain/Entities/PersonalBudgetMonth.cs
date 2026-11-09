namespace Freya.Domain.Entities;

public class PersonalBudgetMonth
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal Salary { get; set; }
    public string? Note { get; set; }
    public ICollection<BudgetAllocation> Allocations { get; set; } = new List<BudgetAllocation>();
    public ICollection<BudgetMovement> Movements { get; set; } = new List<BudgetMovement>();
}
