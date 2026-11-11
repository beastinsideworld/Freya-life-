using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Freya.Infrastructure.Persistence;

public static class SqliteToSqlServerMigrator
{
    public static async Task<int> MigrateAsync(
        string sqlitePathOrConnection,
        FreyaDbContext target,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var sqliteCs = sqlitePathOrConnection.Contains('=', StringComparison.Ordinal)
            ? sqlitePathOrConnection
            : $"Data Source={sqlitePathOrConnection}";

        var sourceOptions = new DbContextOptionsBuilder<FreyaDbContext>()
            .UseSqlite(sqliteCs)
            .Options;

        await using var source = new FreyaDbContext(sourceOptions);
        if (!await source.Database.CanConnectAsync(cancellationToken))
        {
            throw new InvalidOperationException($"Impossible d’ouvrir la source SQLite : {sqliteCs}");
        }

        await target.Database.EnsureCreatedAsync(cancellationToken);

        if (await target.Users.AsNoTracking().AnyAsync(cancellationToken))
        {
            logger.LogInformation("SQL Server contient déjà des utilisateurs — migration ignorée.");
            return 0;
        }

        var copied = 0;
        copied += await CopyAsync(source.Set<IdentityRole>(), target.Set<IdentityRole>(), cancellationToken);
        copied += await CopyAsync(source.Users, target.Users, cancellationToken);
        copied += await CopyAsync(source.Set<IdentityUserRole<string>>(), target.Set<IdentityUserRole<string>>(), cancellationToken);
        copied += await CopyAsync(source.Set<IdentityUserClaim<string>>(), target.Set<IdentityUserClaim<string>>(), cancellationToken);
        copied += await CopyAsync(source.Set<IdentityUserLogin<string>>(), target.Set<IdentityUserLogin<string>>(), cancellationToken);
        copied += await CopyAsync(source.Set<IdentityUserToken<string>>(), target.Set<IdentityUserToken<string>>(), cancellationToken);
        copied += await CopyAsync(source.Set<IdentityRoleClaim<string>>(), target.Set<IdentityRoleClaim<string>>(), cancellationToken);

        copied += await CopyAsync(source.Events, target.Events, cancellationToken);
        copied += await CopyAsync(source.MealSlots, target.MealSlots, cancellationToken);
        copied += await CopyAsync(source.GroceryItems, target.GroceryItems, cancellationToken);
        copied += await CopyAsync(source.Recipes, target.Recipes, cancellationToken);
        copied += await CopyAsync(source.Trips, target.Trips, cancellationToken);
        copied += await CopyAsync(source.TripPlaces, target.TripPlaces, cancellationToken);
        copied += await CopyAsync(source.TripBudgetLines, target.TripBudgetLines, cancellationToken);
        copied += await CopyAsync(source.Friendships, target.Friendships, cancellationToken);
        copied += await CopyAsync(source.Conversations, target.Conversations, cancellationToken);
        copied += await CopyAsync(source.ChatMessages, target.ChatMessages, cancellationToken);
        copied += await CopyAsync(source.ConversationReadStates, target.ConversationReadStates, cancellationToken);
        copied += await CopyAsync(source.Families, target.Families, cancellationToken);
        copied += await CopyAsync(source.FamilyMembers, target.FamilyMembers, cancellationToken);
        copied += await CopyAsync(source.PlanningSnapshots, target.PlanningSnapshots, cancellationToken);
        copied += await CopyAsync(source.PersonalBudgetMonths, target.PersonalBudgetMonths, cancellationToken);
        copied += await CopyAsync(source.BudgetAllocations, target.BudgetAllocations, cancellationToken);
        copied += await CopyAsync(source.BudgetMovements, target.BudgetMovements, cancellationToken);
        copied += await CopyAsync(source.BudgetShares, target.BudgetShares, cancellationToken);
        copied += await CopyAsync(source.BudgetAccounts, target.BudgetAccounts, cancellationToken);
        copied += await CopyAsync(source.BudgetProjects, target.BudgetProjects, cancellationToken);
        copied += await CopyAsync(source.PetProfileShares, target.PetProfileShares, cancellationToken);

        await target.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Migration SQLite → SQL Server terminée : {Count} lignes copiées.", copied);
        return copied;
    }

    private static async Task<int> CopyAsync<T>(
        IQueryable<T> sourceQuery,
        DbSet<T> targetSet,
        CancellationToken cancellationToken) where T : class
    {
        List<T> rows;
        try
        {
            rows = await sourceQuery.AsNoTracking().ToListAsync(cancellationToken);
        }
        catch (Exception)
        {
            // Table absente dans d’anciennes bases SQLite.
            return 0;
        }

        if (rows.Count == 0) return 0;
        await targetSet.AddRangeAsync(rows, cancellationToken);
        return rows.Count;
    }
}
