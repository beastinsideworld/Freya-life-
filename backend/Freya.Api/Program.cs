using System.Text;
using Freya.Application.Auth;
using Freya.Application.Common;
using Freya.Application.Dashboard;
using Freya.Application.Events;
using Freya.Domain.Entities;
using Freya.Domain.Enums;
using Freya.Infrastructure;
using Freya.Infrastructure.Auth;
using Freya.Infrastructure.Identity;
using Freya.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Freya API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Bearer. Exemple : Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var jwtKey = builder.Configuration["Jwt:Key"] ?? "FreyaDevSecretKey_ChangeMe_AtLeast32Chars!";
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "Freya",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "Freya",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AngularDev", policy =>
        policy.WithOrigins(
                "http://localhost:4200",
                "http://127.0.0.1:4200")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<FreyaDbContext>();
    await db.Database.EnsureCreatedAsync();
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AngularDev");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

var api = app.MapGroup("/api/v1");

api.MapPost("/auth/register", async (
    RegisterRequest request,
    UserManager<AppUser> users,
    JwtTokenService tokens) =>
{
    if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
    {
        return Results.BadRequest(new { message = "Email et mot de passe requis." });
    }

    var user = new AppUser
    {
        UserName = request.Email.Trim(),
        Email = request.Email.Trim(),
        DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? request.Email.Split('@')[0] : request.DisplayName.Trim()
    };

    var result = await users.CreateAsync(user, request.Password);
    if (!result.Succeeded)
    {
        return Results.BadRequest(new { message = string.Join(" ", result.Errors.Select(e => e.Description)) });
    }

    var token = tokens.CreateToken(user);
    return Results.Ok(new AuthResponse(token, user.Email!, user.DisplayName, user.Id));
});

api.MapPost("/auth/login", async (
    LoginRequest request,
    UserManager<AppUser> users,
    JwtTokenService tokens) =>
{
    var user = await users.FindByEmailAsync(request.Email.Trim());
    if (user is null || !await users.CheckPasswordAsync(user, request.Password))
    {
        return Results.Unauthorized();
    }

    var token = tokens.CreateToken(user);
    return Results.Ok(new AuthResponse(token, user.Email!, user.DisplayName, user.Id));
});

api.MapGet("/auth/me", async (ICurrentUser current, UserManager<AppUser> users) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var user = await users.FindByIdAsync(current.UserId);
    if (user is null)
    {
        return Results.Unauthorized();
    }

    return Results.Ok(new UserProfileDto(user.Id, user.Email!, user.DisplayName));
}).RequireAuthorization();

api.MapGet("/dashboard/today", async (ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var today = DateOnly.FromDateTime(DateTime.Now);
    var events = await db.Events
        .Where(e => e.UserId == current.UserId && e.Date == today)
        .OrderBy(e => e.StartTime)
        .Select(e => new EventDto(e.Id, e.Title, e.Date, e.StartTime, e.EndTime, e.Kind, e.Category))
        .ToListAsync();

    var meals = await db.MealSlots
        .Where(m => m.UserId == current.UserId && m.Date == today)
        .OrderBy(m => m.Slot)
        .Select(m => new MealTodayDto(m.Slot.ToString(), m.Title, m.Done, m.ImageUrl))
        .ToListAsync();

    var dto = new DashboardTodayDto(
        today,
        DateTime.Now.ToString("HH:mm"),
        12,
        events,
        meals);

    return Results.Ok(dto);
}).RequireAuthorization();

api.MapGet("/events", async (DateOnly? from, DateOnly? to, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var start = from ?? DateOnly.FromDateTime(DateTime.Today.AddDays(-(int)DateTime.Today.DayOfWeek + 1));
    var end = to ?? start.AddDays(6);

    var events = await db.Events
        .Where(e => e.UserId == current.UserId && e.Date >= start && e.Date <= end)
        .OrderBy(e => e.Date).ThenBy(e => e.StartTime)
        .Select(e => new EventDto(e.Id, e.Title, e.Date, e.StartTime, e.EndTime, e.Kind, e.Category))
        .ToListAsync();

    return Results.Ok(events);
}).RequireAuthorization();

api.MapPost("/events", async (CreateEventRequest request, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    if (string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest(new { message = "Indique un nom, une date et une heure." });
    }

    var entity = new CalendarEvent
    {
        Id = Guid.NewGuid(),
        UserId = current.UserId,
        Title = request.Title.Trim(),
        Date = request.Date,
        StartTime = request.StartTime,
        EndTime = request.EndTime ?? request.StartTime.AddMinutes(45),
        Kind = request.Kind,
        Category = request.Category
    };

    db.Events.Add(entity);
    await db.SaveChangesAsync();

    return Results.Created($"/api/v1/events/{entity.Id}",
        new EventDto(entity.Id, entity.Title, entity.Date, entity.StartTime, entity.EndTime, entity.Kind, entity.Category));
}).RequireAuthorization();

api.MapPut("/events/{id:guid}", async (Guid id, UpdateEventRequest request, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var entity = await db.Events.FirstOrDefaultAsync(e => e.Id == id && e.UserId == current.UserId);
    if (entity is null)
    {
        return Results.NotFound();
    }

    entity.Title = request.Title.Trim();
    entity.Date = request.Date;
    entity.StartTime = request.StartTime;
    entity.EndTime = request.EndTime ?? request.StartTime.AddMinutes(45);
    entity.Kind = request.Kind;
    entity.Category = request.Category;
    await db.SaveChangesAsync();

    return Results.Ok(new EventDto(entity.Id, entity.Title, entity.Date, entity.StartTime, entity.EndTime, entity.Kind, entity.Category));
}).RequireAuthorization();

api.MapDelete("/events/{id:guid}", async (Guid id, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var entity = await db.Events.FirstOrDefaultAsync(e => e.Id == id && e.UserId == current.UserId);
    if (entity is null)
    {
        return Results.NotFound();
    }

    db.Events.Remove(entity);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization();

api.MapGet("/meals/week", async (DateOnly? weekStart, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var start = weekStart ?? StartOfWeek(DateOnly.FromDateTime(DateTime.Today));
    var end = start.AddDays(6);
    var meals = await db.MealSlots
        .Where(m => m.UserId == current.UserId && m.Date >= start && m.Date <= end)
        .OrderBy(m => m.Date).ThenBy(m => m.Slot)
        .Select(m => new
        {
            m.Id,
            m.Date,
            slot = m.Slot.ToString(),
            m.Title,
            m.RecipeId,
            m.ImageUrl,
            m.Done
        })
        .ToListAsync();

    return Results.Ok(new { weekStart = start, weekEnd = end, meals });
}).RequireAuthorization();

api.MapPost("/meals", async (MealCreateRequest request, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    if (string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest(new { message = "Le titre du repas est requis." });
    }

    var entity = new MealSlot
    {
        Id = Guid.NewGuid(),
        UserId = current.UserId,
        Date = request.Date,
        Slot = request.Slot,
        Title = request.Title.Trim(),
        RecipeId = request.RecipeId,
        ImageUrl = request.ImageUrl,
        Done = false
    };

    db.MealSlots.Add(entity);
    await db.SaveChangesAsync();
    return Results.Created($"/api/v1/meals/{entity.Id}", entity);
}).RequireAuthorization();

api.MapGet("/grocery", async (ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var items = await db.GroceryItems
        .Where(g => g.UserId == current.UserId)
        .OrderBy(g => g.Aisle).ThenBy(g => g.Name)
        .ToListAsync();

    return Results.Ok(items);
}).RequireAuthorization();

api.MapPost("/grocery/items", async (GroceryCreateRequest request, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var entity = new GroceryItem
    {
        Id = Guid.NewGuid(),
        UserId = current.UserId,
        Name = request.Name.Trim(),
        Quantity = request.Quantity ?? string.Empty,
        Aisle = request.Aisle ?? "Épicerie",
        Status = GroceryStatus.Missing,
        Favorite = false
    };

    db.GroceryItems.Add(entity);
    await db.SaveChangesAsync();
    return Results.Created($"/api/v1/grocery/items/{entity.Id}", entity);
}).RequireAuthorization();

api.MapPatch("/grocery/items/{id:guid}", async (Guid id, GroceryPatchRequest request, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var entity = await db.GroceryItems.FirstOrDefaultAsync(g => g.Id == id && g.UserId == current.UserId);
    if (entity is null)
    {
        return Results.NotFound();
    }

    if (request.Status is not null) entity.Status = request.Status.Value;
    if (request.Quantity is not null) entity.Quantity = request.Quantity;
    if (request.Favorite is not null) entity.Favorite = request.Favorite.Value;
    await db.SaveChangesAsync();
    return Results.Ok(entity);
}).RequireAuthorization();

api.MapGet("/recipes", async (string? q, string? category, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var query = db.Recipes.AsQueryable()
        .Where(r => r.UserId == null || r.UserId == current.UserId);

    if (!string.IsNullOrWhiteSpace(q))
    {
        var term = q.Trim().ToLower();
        query = query.Where(r => r.Title.ToLower().Contains(term));
    }

    if (!string.IsNullOrWhiteSpace(category) && !string.Equals(category, "tout", StringComparison.OrdinalIgnoreCase))
    {
        var cat = category.Trim().ToLower();
        query = query.Where(r => r.Categories.ToLower().Contains(cat));
    }

    var recipes = await query.OrderByDescending(r => r.Title).Take(50).ToListAsync();
    return Results.Ok(recipes);
}).RequireAuthorization();

api.MapPost("/recipes", async (RecipeCreateRequest request, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var entity = new Recipe
    {
        Id = Guid.NewGuid(),
        UserId = current.UserId,
        Title = request.Title.Trim(),
        DurationMin = request.DurationMin,
        Difficulty = request.Difficulty ?? "Facile",
        Categories = request.Categories ?? string.Empty,
        ImageUrl = request.ImageUrl,
        Instructions = request.Instructions
    };

    db.Recipes.Add(entity);
    await db.SaveChangesAsync();
    return Results.Created($"/api/v1/recipes/{entity.Id}", entity);
}).RequireAuthorization();

api.MapGet("/trips", async (ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var trips = await db.Trips
        .Where(t => t.UserId == current.UserId)
        .OrderBy(t => t.StartDate)
        .Select(t => new
        {
            t.Id,
            t.Title,
            t.StartDate,
            t.EndDate,
            t.CoverUrl,
            t.Subtitle,
            daysUntil = t.StartDate.DayNumber - DateOnly.FromDateTime(DateTime.Today).DayNumber
        })
        .ToListAsync();

    return Results.Ok(trips);
}).RequireAuthorization();

api.MapGet("/trips/{id:guid}", async (Guid id, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var trip = await db.Trips
        .Include(t => t.Places)
        .Include(t => t.BudgetLines)
        .FirstOrDefaultAsync(t => t.Id == id && t.UserId == current.UserId);

    return trip is null ? Results.NotFound() : Results.Ok(trip);
}).RequireAuthorization();

api.MapPost("/trips", async (TripCreateRequest request, ICurrentUser current, FreyaDbContext db) =>
{
    if (current.UserId is null)
    {
        return Results.Unauthorized();
    }

    var entity = new Trip
    {
        Id = Guid.NewGuid(),
        UserId = current.UserId,
        Title = request.Title.Trim(),
        StartDate = request.StartDate,
        EndDate = request.EndDate,
        CoverUrl = request.CoverUrl,
        Subtitle = request.Subtitle
    };

    db.Trips.Add(entity);
    await db.SaveChangesAsync();
    return Results.Created($"/api/v1/trips/{entity.Id}", entity);
}).RequireAuthorization();

app.Run();

static DateOnly StartOfWeek(DateOnly date)
{
    var diff = ((int)date.DayOfWeek + 6) % 7;
    return date.AddDays(-diff);
}

internal record MealCreateRequest(DateOnly Date, MealSlotType Slot, string Title, Guid? RecipeId, string? ImageUrl);
internal record GroceryCreateRequest(string Name, string? Quantity, string? Aisle);
internal record GroceryPatchRequest(GroceryStatus? Status, string? Quantity, bool? Favorite);
internal record RecipeCreateRequest(string Title, int DurationMin, string? Difficulty, string? Categories, string? ImageUrl, string? Instructions);
internal record TripCreateRequest(string Title, DateOnly StartDate, DateOnly EndDate, string? CoverUrl, string? Subtitle);
