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

## Mise en ligne

Un push sur `master` ou `main` lance `.github/workflows/deploy.yml`.

L’image de l’API part sur `registry.bariserv.net/freya`, avec les étiquettes `latest` et le SHA du commit. Dans le dépôt GitHub, ajoute les secrets `REGISTRY_USERNAME` et `REGISTRY_PASSWORD`. Si le chemin de l’image est différent, ajoute la variable `REGISTRY_IMAGE` avec le nom complet, par exemple `registry.bariserv.net/bari/freya`.

Le site Angular part sur GitHub Pages : `https://beastinsideworld.github.io/Freya-life-/`. Dans les réglages du dépôt, la source des Pages doit être **GitHub Actions**. La variable `API_BASE` (optionnelle) pointe vers l’API ; par défaut `https://freya-life-api.bariserv.net`.

Sur le serveur (réseau Traefik `traefik_proxy` déjà présent) :

L’API publique est `https://freya-life-api.bariserv.net` (zone DNS déjà créée).

En production l’API utilise **SQL Server** sur l’hôte (`host.docker.internal`, base `FreyaLife`). Le SQLite local reste pour le docker-compose de dev.

```bash
# .env à côté de compose.prod.yaml
JWT_KEY=une-cle-secrete-d-au-moins-32-caracteres
SQL_PASSWORD=MonMdp

# Migration one-shot des données SQLite existantes (volume /app/data) :
MIGRATE_FROM_SQLITE=/app/data/freya.db

podman compose -f compose.prod.yaml pull
podman compose -f compose.prod.yaml up -d
```

Après un démarrage réussi avec migration, **retire** `MIGRATE_FROM_SQLITE` du `.env` et relance. La migration est ignorée si SQL Server a déjà des utilisateurs.

`API_HOST` vaut par défaut `freya-life-api.bariserv.net`. Variables utiles : `REGISTRY`, `TAG`, `JWT_ISSUER`, `JWT_AUDIENCE`, `CORS_ORIGINS`, `TRAEFIK_CERT_RESOLVER`.

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
