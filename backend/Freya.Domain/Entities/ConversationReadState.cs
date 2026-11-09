namespace Freya.Domain.Entities;

public class ConversationReadState
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public Conversation? Conversation { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateTime LastReadAtUtc { get; set; } = DateTime.UnixEpoch;
}
