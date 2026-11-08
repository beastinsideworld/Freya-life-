FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Freya.Domain/Freya.Domain.csproj Freya.Domain/
COPY Freya.Application/Freya.Application.csproj Freya.Application/
COPY Freya.Infrastructure/Freya.Infrastructure.csproj Freya.Infrastructure/
COPY Freya.Api/Freya.Api.csproj Freya.Api/
RUN dotnet restore Freya.Api/Freya.Api.csproj

COPY . .
RUN dotnet publish Freya.Api/Freya.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
RUN mkdir -p /app/data
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Freya.Api.dll"]
