namespace Freya.Application.Social;

public record FriendDto(string UserId, string DisplayName, int FriendCode, Guid? ConversationId, string? AvatarUrl);
public record AddFriendRequest(int FriendCode);
public record ConversationDto(
    Guid Id,
    string PeerUserId,
    string PeerDisplayName,
    int PeerFriendCode,
    string? LastMessage,
    DateTime? LastMessageAtUtc,
    string? PeerAvatarUrl,
    int UnreadCount = 0);
public record ChatMessageDto(Guid Id, string SenderId, string Body, DateTime SentAtUtc, bool Mine);
public record SendMessageRequest(string Body);
public record StartConversationRequest(string PeerUserId);
