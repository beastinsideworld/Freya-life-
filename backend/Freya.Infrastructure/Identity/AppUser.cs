using Microsoft.AspNetCore.Identity;

namespace Freya.Infrastructure.Identity;

public class AppUser : IdentityUser
{
    public string DisplayName { get; set; } = string.Empty;
}
