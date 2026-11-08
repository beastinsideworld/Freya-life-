namespace Freya.Domain.Entities;

public class TripPlace
{
    public Guid Id { get; set; }
    public Guid TripId { get; set; }
    public string Type { get; set; } = "Visit";
    public string Name { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string? ImageUrl { get; set; }
    public Trip? Trip { get; set; }
}
