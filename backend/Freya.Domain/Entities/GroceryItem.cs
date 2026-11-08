using Freya.Domain.Enums;

namespace Freya.Domain.Entities;

public class GroceryItem
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Quantity { get; set; } = string.Empty;
    public string Aisle { get; set; } = "Épicerie";
    public GroceryStatus Status { get; set; } = GroceryStatus.Missing;
    public bool Favorite { get; set; }
}
