using Freya.Application.Common;
using Freya.Infrastructure.Auth;
using Freya.Infrastructure.Identity;
using Freya.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Freya.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = DatabaseProvider.ResolveConnectionString(configuration);
        var provider = DatabaseProvider.Resolve(configuration);

        services.AddDbContext<FreyaDbContext>(options =>
        {
            if (provider == DatabaseProviderKind.SqlServer)
            {
                options.UseSqlServer(connectionString);
            }
            else
            {
                options.UseSqlite(connectionString);
            }
        });

        services.AddSingleton(new DatabaseRuntimeInfo(provider, connectionString));

        services
            .AddIdentityCore<AppUser>(options =>
            {
                options.Password.RequiredLength = 6;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequireUppercase = false;
                options.Password.RequireLowercase = false;
                options.Password.RequireDigit = false;
                options.User.RequireUniqueEmail = true;
            })
            .AddEntityFrameworkStores<FreyaDbContext>();

        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUser, CurrentUser>();
        services.AddSingleton<JwtTokenService>();

        return services;
    }
}
