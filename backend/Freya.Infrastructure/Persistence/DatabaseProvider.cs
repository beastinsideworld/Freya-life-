using Microsoft.Extensions.Configuration;

namespace Freya.Infrastructure.Persistence;

public static class DatabaseProvider
{
    public const string DefaultDevConnection =
        "Server=localhost,1433;Database=FreyaLife;User Id=sa;Password=Freya_Local_Dev_2026!;TrustServerCertificate=True;Encrypt=True";

    public static string ResolveConnectionString(IConfiguration configuration) =>
        (configuration.GetConnectionString("Default")
         ?? configuration.GetConnectionString("Database")
         ?? DefaultDevConnection).Trim();
}
