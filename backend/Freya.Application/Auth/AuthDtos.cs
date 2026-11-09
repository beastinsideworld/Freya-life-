namespace Freya.Application.Auth;

public record RegisterRequest(string Email, string Password, string DisplayName);
public record LoginRequest(string Email, string Password);
public record AuthResponse(string Token, string Email, string DisplayName, string UserId, int FriendCode, string? AvatarUrl);
public record UserProfileDto(string UserId, string Email, string DisplayName, int FriendCode, string? AvatarUrl);
public record UpdateProfileRequest(string? AvatarUrl);
