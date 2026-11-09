using Microsoft.AspNetCore.Identity;

namespace Freya.Infrastructure.Identity;

public class AppUser : IdentityUser
{
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>Identifiant simple à 6 chiffres pour ajouter des amis.</summary>
    public int FriendCode { get; set; }

    public string? AvatarUrl { get; set; }
}
