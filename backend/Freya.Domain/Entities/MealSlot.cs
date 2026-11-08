using Freya.Domain.Enums;

namespace Freya.Domain.Entities;

public class MealSlot
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public MealSlotType Slot { get; set; }
    public string Title { get; set; } = string.Empty;
    public Guid? RecipeId { get; set; }
    public string? ImageUrl { get; set; }
    public bool Done { get; set; }
}
