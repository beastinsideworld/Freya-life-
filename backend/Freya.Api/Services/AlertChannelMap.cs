using Freya.Infrastructure.Identity;
using Microsoft.Extensions.Configuration;

namespace Freya.Api.Services;

public sealed class AlertChannelMap(IConfiguration config)
{
    public string Freya => Pick(config["API_ALERTS_CHANNEL_FREYA"], "Freya");
    public string Bari => Pick(config["API_ALERTS_CHANNEL_BARI"], "Bari");
    public string General => Pick(config["API_ALERTS_CHANNEL_GENERAL"], "General");

    /// <summary>Canal personnel de l'utilisateur, ou null s'il n'est ni Freya ni Bari.</summary>
    public string? ForUser(AppUser user)
    {
        if (IsConfiguredUser("API_ALERTS_USER_BARI", user) || Mentions(user, "bari"))
        {
            return Bari;
        }

        if (IsConfiguredUser("API_ALERTS_USER_FREYA", user) || Mentions(user, "freya"))
        {
            return Freya;
        }

        return null;
    }

    private bool IsConfiguredUser(string key, AppUser user)
    {
        var configured = config[key]?.Trim();
        if (string.IsNullOrWhiteSpace(configured))
        {
            return false;
        }

        return string.Equals(configured, user.Id, StringComparison.OrdinalIgnoreCase)
            || string.Equals(configured, user.Email, StringComparison.OrdinalIgnoreCase)
            || string.Equals(configured, user.UserName, StringComparison.OrdinalIgnoreCase)
            || string.Equals(configured, user.DisplayName, StringComparison.OrdinalIgnoreCase);
    }

    private static bool Mentions(AppUser user, string token)
    {
        return Contains(user.DisplayName, token)
            || Contains(user.Email, token)
            || Contains(user.UserName, token);
    }

    private static bool Contains(string? value, string token) =>
        !string.IsNullOrWhiteSpace(value)
        && value.Contains(token, StringComparison.OrdinalIgnoreCase);

    private static string Pick(string? configured, string fallback) =>
        string.IsNullOrWhiteSpace(configured) ? fallback : configured.Trim();
}
