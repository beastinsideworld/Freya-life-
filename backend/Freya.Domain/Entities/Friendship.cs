namespace Freya.Domain.Entities;

public class Friendship
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string FriendUserId { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
