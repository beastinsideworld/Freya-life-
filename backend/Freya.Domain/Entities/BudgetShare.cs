namespace Freya.Domain.Entities;

public class BudgetShare
{
    public Guid Id { get; set; }
    public string OwnerUserId { get; set; } = string.Empty;
    public string ViewerUserId { get; set; } = string.Empty;
    public bool ShareSalary { get; set; }
    public bool ShareAllocations { get; set; }
    public bool ShareSavings { get; set; }
    public bool ShareMovements { get; set; }
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
