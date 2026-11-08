# Freya

Application web de vie quotidienne (planning, repas, voyages).

- **Front :** Angular 19 (`frontend/freya-web`)
- **Back :** ASP.NET Core 8 (`backend/`)
- **Specs :** [SPECS.md](./SPECS.md)
- **Maquettes :** `Assets/`

## Prérequis

- .NET SDK 8 (`dotnet --version`)
- Node.js 20+ et npm

Si `dotnet` n’est pas dans le PATH Windows, ajoute :

`%LOCALAPPDATA%\Microsoft\dotnet`

## Lancer avec Podman (recommandé)

```powershell
podman compose up --build -d
```

- App : http://localhost:4200  
- API / Swagger : http://localhost:5180/swagger  

Si `localhost` ne répond pas (fréquent avec Podman Machine / WSL), utilise l’IP de la machine :

```powershell
wsl -d podman-machine-default -- bash -lc "ip -4 -o addr show eth0 | awk '{print `$4}' | cut -d/ -f1"
```

Puis ouvre `http://<IP>:4200` et `http://<IP>:5180/swagger`.

Arrêt :

```powershell
podman compose down
```

## Lancer en local (sans conteneurs)

### API

```powershell
cd backend
dotnet run --project Freya.Api
```

- Swagger : http://localhost:5180/swagger  
- API : http://localhost:5180/api/v1  

Base SQLite créée automatiquement (`freya.db`).

### Front

```powershell
cd frontend/freya-web
npm start
```

App : http://localhost:4200  

## Premier usage

1. Ouvre http://localhost:4200/register  
2. Crée un compte  
3. Ajoute des événements dans **Planning**  
4. Planifie des repas dans **Repas → Semaine**

## Structure

```
backend/
  Freya.Api/             # Host + endpoints REST
  Freya.Application/     # DTOs
  Freya.Domain/          # Entités / enums
  Freya.Infrastructure/  # EF Core, Identity, JWT
frontend/
  freya-web/             # SPA Angular
```
