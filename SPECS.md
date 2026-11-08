# Freya — Spécifications de développement

**Stack :** backend C# (ASP.NET Core) · frontend Angular  
**Références UI :** wireframe validé + maquettes `Assets/`  
**Langue produit :** français  

---

## 1. Vision produit

Freya est une application web de vie quotidienne : tableau de bord du jour, planning horaire, repas (semaine / courses / recettes), voyages, sport, chat et paramètres.

Ambiance visuelle cible (maquettes) : fond sombre, accents rouge sombre / bordeaux, titres serif, UI sans-serif, coins arrondis, photos ambiance.

---

## 2. Architecture

```
[Angular SPA]  ←→  [ASP.NET Core Web API]  ←→  [Base de données]
                         ↓
                   Auth (JWT / cookies)
```

| Couche | Techno proposée | Rôle |
|--------|-----------------|------|
| Front | Angular (standalone components), Angular Router, HttpClient | SPA responsive |
| Back | ASP.NET Core Minimal APIs ou Controllers | REST JSON |
| Données | EF Core + PostgreSQL (ou SQL Server) | Persistance |
| Auth | ASP.NET Identity + JWT Bearer | Compte utilisateur |

### Principes

- Une seule SPA Angular ; le back expose uniquement une API REST.
- Desktop : navigation latérale (Accueil, Planning, Repas, Voyages, Sport, Chat, Paramètres).
- Mobile : même routes, barre basse Accueil / Chat / Planning / Repas / Voyages (comme les maquettes).
- Les écrans Sport, Chat et Paramètres sont dans la navigation : pages réelles avec contenu minimal en V1 si besoin.

---

## 3. Modules fonctionnels

### 3.1 Accueil (`/`)

**Réf. :** `Assets/1-ACCUEIL.png`

| Élément | Comportement |
|---------|--------------|
| Titre | « Planning » + sous-titre « Ta journée en un coup d’œil » |
| Méta | Date du jour, heure courante, météo (température) |
| Tâches du jour | Timeline des événements du jour avec statut (Fait / En cours / À faire) |
| Repas du jour | 3 cartes : Petit-déjeuner, Déjeuner, Dîner (photo, titre, statut) |
| Liens | « Voir le planning », « Voir les recettes », raccourcis modules |

**API :** agrégat du jour courant pour l’utilisateur connecté.

### 3.2 Planning (`/planning`)

**Réf. :** `Assets/2-Planning.png` + wireframe validé

**En-tête (centré)**  
1. Titre « Planning »  
2. Sous-titre « Organise ton temps, tes objectifs et tes activités »  
3. Boutons sur une ligne : **Semaine** · **Mois** · **Tâche** · **Objectif**

**Création d’événement**  
- Champs : nom (texte), date, heure  
- Bouton « Ajouter un événement »  
- Type actif = Tâche ou Objectif (boutons mutuellement exclusifs)  
- Validation : les trois champs sont obligatoires  

**Vue Semaine**  
- Abscisse : jours de la semaine (Lun → Dim)  
- Ordonnée : heures 07:00 → 22:00  
- Événements en **blocs** positionnés par début/fin dans la colonne du jour  
- Jour courant mis en évidence  

**Vue Mois**  
- Grille calendrier du mois  
- Jours avec événements marqués  

**Modèle événement**

| Champ | Type | Notes |
|-------|------|-------|
| Id | Guid | |
| UserId | Guid | |
| Title | string | Obligatoire |
| Date | date | Obligatoire |
| StartTime | time | Obligatoire |
| EndTime | time | Optionnel en V1 (défaut +45 min si absent) |
| Kind | enum | `Task` \| `Objective` |
| Category | enum? | Sport, Travail, Repas, Course, Projets, Social… (couleur bloc) |

### 3.3 Repas (`/repas`)

**Réfs. :** `Assets/3.1- Repas planning.png`, `3.2-Repas course.png`, `3.3-Repas - recette.png`

**En-tête (centré)**  
1. Titre « Repas »  
2. Sous-titre « Organise tes menus, tes courses et tes recettes »  
3. Onglets : **Semaine** · **Courses** · **Recettes**

#### 3.3.1 Semaine

- Sélecteur de plage « Du … au … » + bouton « Ajouter un repas »
- Grille :
  - **Ordonnée :** jours de la semaine en cours  
  - **Abscisse :** Déjeuner · Repas · Collation · Dîner  
- Case remplie : photo + nom du plat  
- Case vide : bouton « Ajouter un repas » (créé pour ce jour + ce créneau)

#### 3.3.2 Courses

- Champ d’ajout / recherche d’article  
- Filtres : Toutes · Manquants · À racheter bientôt · Favoris  
- Liste par rayons (Fruits & légumes, Viandes & poissons, Produits frais, Épicerie, Surgelés, Hygiène & maison)  
- Article : nom, quantité, coché / manquant  
- CTA « Ajouter un article »

#### 3.3.3 Recettes

- Recherche + catégories (Tout, Rapide, Healthy, Végé, Viande, Poisson, Dessert…)  
- Grille de cartes : photo, nom, durée, difficulté  
- CTA « Ajouter une recette »

### 3.4 Voyages (`/voyages`)

**Réfs. :** `Assets/4-Voyage.png`, `4.1-Voyage - inspiration .png`

- Titre « Voyages » + sous-titre  
- Sous-nav : Mes voyages · Inspirations · Checklist · Budget  
- Liste des voyages (destination, dates, compte à rebours J-n)  
- Outils : Transport, Hébergement, Itinéraire, À emporter, Budget, Repas, Cartes, Documents  
- Fiche voyage (ex. Portugal) : restos, randonnées, visites, budget, hôtels, transport  
- Actions : Ajouter une adresse, Créer mon itinéraire, Ajouter un voyage  

### 3.5 Sport (`/sport`) — V1

- Liste des séances issues du planning (catégorie sport / course) pour la semaine courante.

### 3.6 Chat (`/chat`) — V1

- Fil de discussion (placeholder ou messagerie simple utilisateur ↔ assistant / notes).  
- Détail produit hors V1 possible : à trancher (chat IA vs notes).

### 3.7 Paramètres (`/parametres`)

- Compte, notifications, apparence (thème sombre par défaut).

---

## 4. API REST (ASP.NET Core)

Base URL : `/api/v1`  
Auth : `Authorization: Bearer {token}`  
Format : JSON, camelCase côté contrat Angular.

### Auth

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/auth/register` | Création compte |
| POST | `/auth/login` | Connexion → JWT |
| GET | `/auth/me` | Profil courant |

### Accueil

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/dashboard/today` | Tâches + repas + météo du jour |

### Planning

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/events?from=&to=` | Liste sur une plage |
| POST | `/events` | Créer |
| PUT | `/events/{id}` | Modifier |
| DELETE | `/events/{id}` | Supprimer |

### Repas

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/meals/week?weekStart=` | Grille semaine |
| POST | `/meals` | Placer un repas (jour + créneau + recette/texte) |
| PUT | `/meals/{id}` | Modifier |
| DELETE | `/meals/{id}` | Supprimer |
| GET | `/grocery` | Liste de courses |
| POST | `/grocery/items` | Ajouter article |
| PATCH | `/grocery/items/{id}` | Cocher / quantité / favori |
| GET | `/recipes?q=&category=` | Recherche recettes |
| POST | `/recipes` | Créer recette |
| GET | `/recipes/{id}` | Détail |

### Voyages

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/trips` | Liste |
| POST | `/trips` | Créer |
| GET | `/trips/{id}` | Détail + sections |
| POST | `/trips/{id}/places` | Ajouter adresse / lieu |
| GET | `/trips/{id}/budget` | Budget |
| GET | `/inspirations` | Destinations inspiration |

### Météo (optionnel V1)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/weather/today` | Température (proxy service externe côté back) |

---

## 5. Modèle de données (schéma logique)

```
User
  id, email, displayName, passwordHash, createdAt

Event
  id, userId, title, date, startTime, endTime?, kind, category?

MealSlot
  id, userId, date, slot (Lunch|Main|Snack|Dinner), title, recipeId?, imageUrl?, done?

GroceryItem
  id, userId, name, quantity, unit?, aisle, status (Missing|Bought|Soon), favorite

Recipe
  id, userId?, title, durationMin, difficulty, categoryTags[], imageUrl, instructions?

Trip
  id, userId, title, startDate, endDate, coverUrl, status

TripPlace
  id, tripId, type (Restaurant|Visit|Hotel|Transport|Hike), name, notes?, imageUrl?

TripBudgetLine
  id, tripId, label, amount

Inspiration
  id, title, imageUrl, region?
```

Toutes les entités utilisateur sont scopées par `userId` (isolation multi-utilisateur).

---

## 6. Structure de solution recommandée

```
Freya-life-/
  backend/
    Freya.Api/           # ASP.NET Core host
    Freya.Application/   # Cas d’usage, DTOs
    Freya.Domain/        # Entités, enums
    Freya.Infrastructure/# EF Core, Identity, météo
  frontend/
    freya-web/           # Angular
  Assets/                # Maquettes
  SPECS.md
```

### Backend (C#)

- .NET 8 ou 9  
- EF Core migrations  
- Validation FluentValidation ou DataAnnotations  
- Swagger / OpenAPI  
- CORS ouvert vers l’origine Angular en local  

### Frontend (Angular)

- Angular 19+ (standalone)  
- Dossiers : `core/` (auth, interceptors), `shared/`, `features/accueil|planning|repas|voyages|sport|chat|parametres`  
- State léger : signals + services (pas d’obligation NgRx en V1)  
- Styles : variables CSS (rouge sombre, noir, or), polices serif titres / sans corps  
- Design tokens alignés maquettes, pas de thème violet générique  

---

## 7. Parcours utilisateur prioritaires (V1)

1. S’inscrire / se connecter  
2. Voir l’accueil du jour  
3. Ajouter un événement Planning (tâche ou objectif) visible en grille semaine  
4. Remplir une case repas vide (jour + créneau)  
5. Cocher un article de courses  
6. Consulter / ajouter une recette  
7. Voir la liste des voyages + ouvrir une fiche  

Hors V1 (à prévoir) : génération IA de la semaine repas, chat IA, cartes hors ligne, scan code-barres courses.

---

## 8. Règles UI / UX à respecter

- Titres de pages **centrés** (Planning, Repas, Voyages) avec sous-titre sous le titre.  
- Planning : Semaine / Mois / Tâche / Objectif sur **une seule rangée**.  
- Planning semaine = grille **jours × heures** avec blocs.  
- Repas semaine = grille **jours × (Déjeuner, Repas, Collation, Dîner)**.  
- Une seule navigation globale (sidebar desktop / tab bar mobile).  
- États vides explicites avec action (« Ajouter un repas », etc.).  
- Responsive : grilles larges scrollables horizontalement si besoin, pas de colonnes perdues.  

---

## 9. Non-fonctionnel

| Critère | Cible |
|---------|--------|
| Auth | HTTPS, mots de passe hashés, JWT court + refresh optionnel |
| Perf | Accueil & grille semaine < 300 ms API en local / données typiques |
| Accessibilité | Labels sur inputs, contrastes texte ≥ 4.5:1, navigation clavier |
| i18n | Français uniquement en V1 |
| Tests back | Tests unitaires services + tests d’intégration API auth/events |
| Tests front | Tests composants critiques Planning (création) et Repas (grille) |

---

## 10. Critères d’acceptation (extraits)

**Planning**  
- Given un utilisateur connecté, when il saisit titre + date + heure et clique Ajouter, then le bloc apparaît dans la colonne du jour à la bonne heure.  
- Given Semaine active, when il clique Mois, then la grille mensuelle remplace la grille horaire.  

**Repas**  
- Given l’onglet Semaine, when une case est vide, then « Ajouter un repas » est affiché.  
- Given Courses, when filtre Manquants, then seuls les articles non cochés apparaissent.  

**Accueil**  
- Given des événements et repas du jour, when ouverture de `/`, then les deux panneaux affichent les données du jour courant.

---

## 11. Ordre de livraison suggéré

1. Solution C# + projet Angular + auth JWT  
2. Events API + écran Planning (semaine / mois / création)  
3. Dashboard Accueil  
4. MealSlot + grille Semaine Repas  
5. Courses + Recettes  
6. Voyages (liste + fiche)  
7. Sport / Chat / Paramètres (socle)  
8. Polish UI maquettes + responsive  

---

## 12. Décisions ouvertes

- Chat : notes locales vs assistant IA  
- Météo : fournisseur et clé API  
- Hébergement : Azure / autre  
- « Générer la semaine » (Repas) : reporté hors V1 sauf demande contraire  

Ces points n’empêchent pas de démarrer l’implémentation des modules 1–6.
