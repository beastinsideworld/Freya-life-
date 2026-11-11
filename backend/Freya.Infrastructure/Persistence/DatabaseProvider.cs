using Microsoft.Extensions.Configuration;

namespace Freya.Infrastructure.Persistence;

public enum DatabaseProviderKind
{
    Sqlite,
    SqlServer
}

public static class DatabaseProvider
{
    public static string ResolveConnectionString(IConfiguration configuration) =>
        (configuration.GetConnectionString("Default")
         ?? configuration.GetConnectionString("Database")
         ?? "Data Source=freya.db").Trim();

    public static DatabaseProviderKind Resolve(IConfiguration configuration)
    {
        var explicitProvider = configuration["Database:Provider"] ?? configuration["DATABASE_PROVIDER"];
        var connectionString = ResolveConnectionString(configuration);
        return Resolve(connectionString, explicitProvider);
    }

    public static DatabaseProviderKind Resolve(string connectionString, string? explicitProvider = null)
    {
        if (!string.IsNullOrWhiteSpace(explicitProvider))
        {
            if (explicitProvider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase)
                || explicitProvider.Equals("mssql", StringComparison.OrdinalIgnoreCase))
            {
                return DatabaseProviderKind.SqlServer;
            }

            if (explicitProvider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
            {
                return DatabaseProviderKind.Sqlite;
            }
        }

        return LooksLikeSqlServer(connectionString)
            ? DatabaseProviderKind.SqlServer
            : DatabaseProviderKind.Sqlite;
    }

    public static bool LooksLikeSqlServer(string connectionString) =>
        connectionString.Contains("Server=", StringComparison.OrdinalIgnoreCase)
        || connectionString.Contains("Initial Catalog=", StringComparison.OrdinalIgnoreCase)
        || (connectionString.Contains("User Id=", StringComparison.OrdinalIgnoreCase)
            && !connectionString.Contains(".db", StringComparison.OrdinalIgnoreCase));
}
