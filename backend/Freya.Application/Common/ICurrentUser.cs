namespace Freya.Application.Common;

public interface ICurrentUser
{
    string? UserId { get; }
    bool IsAuthenticated { get; }
}
