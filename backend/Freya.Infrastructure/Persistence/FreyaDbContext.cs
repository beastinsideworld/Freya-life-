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

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

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
        });

        builder.Entity<Trip>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.UserId);
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.HasMany(x => x.Places).WithOne(x => x.Trip!).HasForeignKey(x => x.TripId);
            e.HasMany(x => x.BudgetLines).WithOne(x => x.Trip!).HasForeignKey(x => x.TripId);
        });
    }
}
