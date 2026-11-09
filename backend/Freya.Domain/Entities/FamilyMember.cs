namespace Freya.Domain.Entities;

public class FamilyMember
{
    public Guid Id { get; set; }
    public Guid FamilyId { get; set; }
    public Family? Family { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateTime JoinedAtUtc { get; set; } = DateTime.UtcNow;
}
