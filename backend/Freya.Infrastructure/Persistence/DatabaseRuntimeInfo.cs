namespace Freya.Infrastructure.Persistence;

public sealed record DatabaseRuntimeInfo(DatabaseProviderKind Provider, string ConnectionString)
{
    public bool IsSqlServer => Provider == DatabaseProviderKind.SqlServer;
    public bool IsSqlite => Provider == DatabaseProviderKind.Sqlite;
}
