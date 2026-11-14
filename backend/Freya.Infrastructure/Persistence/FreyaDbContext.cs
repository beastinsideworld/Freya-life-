using Freya.Domain.Entities;
using Freya.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Freya.Infrastructure.Persistence;

public class FreyaDbContext : IdentityDbContext<AppUser>
{
    public FreyaDbContext(DbContextOptions<FreyaDbContext> options) : base(options)
    {
    }

    public DbSet<CalendarEvent> Events => Set<CalendarEvent>();
    public DbSet<MealSlot> MealSlots => Set<MealSlot>();
    public DbSet<GroceryItem> GroceryItems => Set<GroceryItem>();
    public DbSet<Recipe> Recipes => Set<Recipe>();
    public DbSet<Trip> Trips => Set<Trip>();
    public DbSet<TripPlace> TripPlaces => Set<TripPlace>();
    public DbSet<TripBudgetLine> TripBudgetLines => Set<TripBudgetLine>();
    public DbSet<Friendship> Friendships => Set<Friendship>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<ConversationReadState> ConversationReadStates => Set<ConversationReadState>();
    public DbSet<Family> Families => Set<Family>();
    public DbSet<FamilyMember> FamilyMembers => Set<FamilyMember>();
    public DbSet<UserPlanningSnapshot> PlanningSnapshots => Set<UserPlanningSnapshot>();
    public DbSet<PersonalBudgetMonth> PersonalBudgetMonths => Set<PersonalBudgetMonth>();
    public DbSet<BudgetAllocation> BudgetAllocations => Set<BudgetAllocation>();
    public DbSet<BudgetMovement> BudgetMovements => Set<BudgetMovement>();
    public DbSet<BudgetShare> BudgetShares => Set<BudgetShare>();
    public DbSet<BudgetAccount> BudgetAccounts => Set<BudgetAccount>();
    public DbSet<BudgetProject> BudgetProjects => Set<BudgetProject>();
    public DbSet<PetProfileShare> PetProfileShares => Set<PetProfileShare>();
    public DbSet<PendingAlert> PendingAlerts => Set<PendingAlert>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<AppUser>(e =>
        {
            e.HasIndex(x => x.FriendCode).IsUnique();
        });

        builder.Entity<CalendarEvent>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.UserId, x.Date });
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
        });

        builder.Entity<MealSlot>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.UserId, x.Date, x.Slot }).IsUnique();
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
        });

        builder.Entity<GroceryItem>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.UserId);
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
        });

        builder.Entity<Recipe>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.HasIndex(x => x.CreatedAtUtc);
        });

        builder.Entity<Trip>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.UserId);
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.HasMany(x => x.Places).WithOne(x => x.Trip!).HasForeignKey(x => x.TripId);
            e.HasMany(x => x.BudgetLines).WithOne(x => x.Trip!).HasForeignKey(x => x.TripId);
        });

        builder.Entity<Friendship>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.UserId, x.FriendUserId }).IsUnique();
            e.Property(x => x.UserId).HasMaxLength(450).IsRequired();
            e.Property(x => x.FriendUserId).HasMaxLength(450).IsRequired();
        });

        builder.Entity<Conversation>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.UserAId, x.UserBId }).IsUnique();
            e.Property(x => x.UserAId).HasMaxLength(450).IsRequired();
            e.Property(x => x.UserBId).HasMaxLength(450).IsRequired();
            e.HasMany(x => x.Messages).WithOne(x => x.Conversation!).HasForeignKey(x => x.ConversationId);
        });

        builder.Entity<ChatMessage>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.ConversationId, x.SentAtUtc });
            e.Property(x => x.SenderId).HasMaxLength(450).IsRequired();
            e.Property(x => x.Body).HasMaxLength(2000).IsRequired();
        });

        builder.Entity<ConversationReadState>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.ConversationId, x.UserId }).IsUnique();
            e.Property(x => x.UserId).HasMaxLength(450).IsRequired();
            e.HasOne(x => x.Conversation)
                .WithMany()
                .HasForeignKey(x => x.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Family>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.InviteCode).IsUnique();
            e.Property(x => x.Name).HasMaxLength(120).IsRequired();
            e.Property(x => x.CreatedByUserId).HasMaxLength(450).IsRequired();
            e.HasMany(x => x.Members).WithOne(x => x.Family!).HasForeignKey(x => x.FamilyId);
        });

        builder.Entity<FamilyMember>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.FamilyId, x.UserId }).IsUnique();
            e.Property(x => x.UserId).HasMaxLength(450).IsRequired();
        });

        builder.Entity<UserPlanningSnapshot>(e =>
        {
            e.HasKey(x => x.UserId);
            e.Property(x => x.UserId).HasMaxLength(450);
        });

        builder.Entity<PersonalBudgetMonth>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.UserId, x.Year, x.Month }).IsUnique();
            e.Property(x => x.UserId).HasMaxLength(450).IsRequired();
            e.Property(x => x.Salary).HasPrecision(18, 2);
            e.HasMany(x => x.Allocations).WithOne(x => x.BudgetMonth!).HasForeignKey(x => x.BudgetMonthId);
            e.HasMany(x => x.Movements).WithOne(x => x.BudgetMonth!).HasForeignKey(x => x.BudgetMonthId);
        });

        builder.Entity<BudgetAllocation>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Label).HasMaxLength(120).IsRequired();
            e.Property(x => x.Kind).HasMaxLength(20).IsRequired();
            e.Property(x => x.PlannedAmount).HasPrecision(18, 2);
        });

        builder.Entity<BudgetMovement>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Label).HasMaxLength(120).IsRequired();
            e.Property(x => x.Kind).HasMaxLength(20).IsRequired();
            e.Property(x => x.Amount).HasPrecision(18, 2);
            e.Property(x => x.Note).HasMaxLength(500);
            e.Property(x => x.Category).HasMaxLength(80);
            e.Property(x => x.AccountName).HasMaxLength(80);
        });

        builder.Entity<BudgetShare>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.OwnerUserId, x.ViewerUserId }).IsUnique();
            e.Property(x => x.OwnerUserId).HasMaxLength(450).IsRequired();
            e.Property(x => x.ViewerUserId).HasMaxLength(450).IsRequired();
        });

        builder.Entity<BudgetAccount>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.UserId);
            e.Property(x => x.UserId).HasMaxLength(450).IsRequired();
            e.Property(x => x.Label).HasMaxLength(120).IsRequired();
            e.Property(x => x.Icon).HasMaxLength(16).IsRequired();
            e.Property(x => x.Balance).HasPrecision(18, 2);
            e.Property(x => x.PerformancePct).HasPrecision(18, 2);
        });

        builder.Entity<BudgetProject>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.UserId);
            e.Property(x => x.UserId).HasMaxLength(450).IsRequired();
            e.Property(x => x.Label).HasMaxLength(160).IsRequired();
            e.Property(x => x.Icon).HasMaxLength(16).IsRequired();
            e.Property(x => x.TargetAmount).HasPrecision(18, 2);
            e.Property(x => x.SavedAmount).HasPrecision(18, 2);
            e.Property(x => x.MonthlyContribution).HasPrecision(18, 2);
        });

        builder.Entity<TripBudgetLine>(e =>
        {
            e.Property(x => x.Amount).HasPrecision(18, 2);
        });

        builder.Entity<PendingAlert>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.SentAtUtc, x.ClaimedAtUtc, x.Id });
            e.Property(x => x.Channel).HasMaxLength(32).IsRequired();
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.Message).HasMaxLength(500).IsRequired();
            e.Property(x => x.EventName).HasMaxLength(80).IsRequired();
        });

        builder.Entity<PetProfileShare>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Token).IsUnique();
            e.Property(x => x.Token).HasMaxLength(64).IsRequired();
            e.Property(x => x.OwnerUserId).HasMaxLength(450).IsRequired();
            e.Property(x => x.OwnerName).HasMaxLength(120).IsRequired();
            e.Property(x => x.PetPayloadJson).IsRequired();
        });
    }
}
