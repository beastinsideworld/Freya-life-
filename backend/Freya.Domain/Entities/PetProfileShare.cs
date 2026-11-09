namespace Freya.Domain.Entities;

public class PetProfileShare
{
    public Guid Id { get; set; }
    public string Token { get; set; } = string.Empty;
    public string OwnerUserId { get; set; } = string.Empty;
    public string OwnerName { get; set; } = string.Empty;
    public string PetPayloadJson { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
}
