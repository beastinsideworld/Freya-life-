namespace Freya.Domain.Entities;

public class Recipe
{
    public Guid Id { get; set; }
    public string? UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int DurationMin { get; set; }
    public string Difficulty { get; set; } = "Facile";
    public string Categories { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string? Instructions { get; set; }
    public string? Ingredients { get; set; }
    public int? Kcal { get; set; }
}
