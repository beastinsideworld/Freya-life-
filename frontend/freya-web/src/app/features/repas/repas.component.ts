import { Component, OnInit, computed, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { createId } from '../../core/id';
import {
  CatalogArticle,
  GROCERY_AISLES,
  catalogByAisle,
  findCatalogArticle,
  ingredientNames,
  searchCatalog
} from '../../core/grocery-catalog';
import { ImagePickerComponent } from '../../shared/image-picker/image-picker.component';
import { NavIconComponent } from '../../shared/nav-icon/nav-icon.component';

type Tab = 'semaine' | 'courses' | 'recettes';

interface MealRow {
  id: string;
  date: string;
  slot: string;
  title: string;
  recipeId?: string | null;
  kcal?: number | null;
}

interface GroceryItem {
  id: string;
  name: string;
  quantity: string;
  aisle: string;
  status: number | string;
  favorite: boolean;
}

interface RecipeIngredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
}

interface Recipe {
  id: string;
  title: string;
  durationMin: number;
  difficulty: string;
  categories: string;
  favorite?: boolean;
  imageUrl?: string | null;
  instructions?: string | null;
  ingredients?: RecipeIngredient[];
  kcal?: number | null;
}

@Component({
  selector: 'app-repas',
  standalone: true,
  imports: [FormsModule, ImagePickerComponent, NavIconComponent],
  templateUrl: './repas.component.html',
  styleUrl: './repas.component.scss'
})
export class RepasComponent implements OnInit {
  readonly tab = signal<Tab>('semaine');
  readonly recipeCat = signal('tout');
  readonly meals = signal<MealRow[]>([]);
  readonly grocery = signal<GroceryItem[]>([]);
  readonly recipes = signal<Recipe[]>([]);
  readonly recipeQuery = signal('');
  readonly recipeModalOpen = signal(false);
  readonly recipeDetail = signal<Recipe | null>(null);
  readonly editingRecipeId = signal<string | null>(null);
  readonly recipeSaving = signal(false);
  readonly recipeFormError = signal('');
  readonly articleQuery = signal('');
  readonly suggestionsOpen = signal(false);
  readonly selectedAisle = signal<string>('Fruits & Légumes');
  readonly browseAisle = signal<string>('Toutes');
  readonly deleteConfirmAisle = signal<string | null>(null);

  readonly days = ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.'];
  readonly slots: Array<'Breakfast' | 'Lunch' | 'Snack' | 'Dinner'> = [
    'Breakfast',
    'Lunch',
    'Snack',
    'Dinner'
  ];
  readonly slotLabels: Record<'Breakfast' | 'Lunch' | 'Snack' | 'Dinner', string> = {
    Breakfast: 'Petit-déjeuner',
    Lunch: 'Déjeuner',
    Snack: 'Collation',
    Dinner: 'Dîner'
  };
  readonly slotIcons: Record<'Breakfast' | 'Lunch' | 'Snack' | 'Dinner', string> = {
    Breakfast: 'assets/meals/petit-dejeuner.png',
    Lunch: 'assets/meals/dejeuner.png',
    Snack: 'assets/meals/collation.png',
    Dinner: 'assets/meals/diner.png'
  };
  readonly recipeCats = ['Tout', 'Rapide', 'Healthy', 'Végé', 'Viande', 'Poisson', 'Dessert'];
  readonly recipeFormCats = ['Rapide', 'Healthy', 'Végé', 'Viande', 'Poisson', 'Dessert'];
  readonly difficulties = ['Facile', 'Moyen', 'Difficile'];
  readonly units = ['pièce', 'g', 'kg', 'mL', 'L', 'botte', 'sachet', 'boîte', 'tranche', 'c. à s.', 'c. à c.'];
  readonly aisles = [...GROCERY_AISLES];
  readonly aisleFilters = ['Toutes', ...GROCERY_AISLES];
  readonly ingredientOptions = ingredientNames();

  weekStart = this.toIso(this.startOfWeek(new Date()));
  newMealTitle = '';
  newMealDate = this.toIso(new Date());
  newMealSlot: 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner' = 'Lunch';
  newArticle = '';
  newQty = '1';
  newUnit = 'pièce';
  recipeForm = this.emptyRecipeForm();
  draftIngredient = { name: '', quantity: '1', unit: 'g' };

  dayKcal(dayIndex: number): number {
    const date = this.dateFor(dayIndex);
    return this.meals()
      .filter((meal) => meal.date === date)
      .reduce((sum, meal) => sum + (meal.kcal ?? 0), 0);
  }

  formatKcal(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(value) || value <= 0) return '—';
    return `${Math.round(value)} kcal`;
  }

  readonly filteredRecipes = computed(() => {
    const q = this.recipeQuery().trim().toLowerCase();
    const cat = this.recipeCat().toLowerCase();
    return this.recipes().filter((r) => {
      const okQ = !q || r.title.toLowerCase().includes(q);
      const okC = cat === 'tout' || (r.categories || '').toLowerCase().includes(cat);
      return okQ && okC;
    });
  });

  readonly catalogSuggestions = computed(() => searchCatalog(this.articleQuery(), 8));

  readonly categorySuggestions = computed(() => catalogByAisle(this.browseAisle(), 18));

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.loadWeek();
    this.loadRecipes();
  }

  setTab(tab: Tab): void {
    this.tab.set(tab);
    if (tab === 'semaine') {
      this.loadWeek();
      if (!this.recipes().length) this.loadRecipes();
    }
    if (tab === 'courses') this.loadGrocery();
    if (tab === 'recettes') this.loadRecipes();
  }

  mealAt(dayIndex: number, slot: string): MealRow | undefined {
    const date = this.dateFor(dayIndex);
    const idx = this.slots.indexOf(slot as (typeof this.slots)[number]);
    const aliases = this.slotAliases(slot);
    return this.meals().find(
      (m) =>
        m.date === date &&
        (aliases.includes(m.slot) || m.slot === String(idx) || m.slot === String(idx + 1))
    );
  }

  private slotAliases(slot: string): string[] {
    switch (slot) {
      case 'Breakfast':
        return ['Breakfast', 'Petit-déjeuner', '0'];
      case 'Lunch':
        return ['Lunch', 'Main', 'Déjeuner', '1'];
      case 'Snack':
        return ['Snack', 'Collation', '2'];
      case 'Dinner':
        return ['Dinner', 'Dîner', '3'];
      default:
        return [slot];
    }
  }

  openMealRecipe(meal: MealRow): void {
    const byId = meal.recipeId
      ? this.recipes().find((r) => r.id === String(meal.recipeId))
      : undefined;
    if (byId) {
      this.openRecipeDetail(byId);
      return;
    }

    const title = meal.title.trim().toLowerCase();
    const byTitle = this.recipes().find((r) => {
      const recipeTitle = r.title.trim().toLowerCase();
      return recipeTitle === title || title.includes(recipeTitle) || recipeTitle.includes(title);
    });
    if (byTitle) {
      this.openRecipeDetail(byTitle);
      return;
    }

    this.openRecipeDetail({
      id: meal.recipeId || meal.id,
      title: meal.title,
      durationMin: 20,
      difficulty: 'Facile',
      categories: '',
      kcal: meal.kcal ?? null,
      instructions: 'Aucune fiche recette liée pour le moment.',
      ingredients: []
    });
  }

  quickAdd(dayIndex: number, slot: string): void {
    this.newMealTitle = 'Nouveau repas';
    this.addMeal(dayIndex, slot);
  }

  addMeal(dayIndex?: number, slot?: string): void {
    if (dayIndex !== undefined && slot) {
      this.newMealDate = this.dateFor(dayIndex);
      this.newMealSlot = slot as typeof this.newMealSlot;
    }
    if (!this.newMealTitle.trim()) {
      this.newMealTitle = 'Nouveau repas';
    }
    this.http
      .post(`${environment.apiUrl}/meals`, {
        date: this.newMealDate,
        slot: this.slots.indexOf(this.newMealSlot),
        title: this.newMealTitle.trim()
      })
      .subscribe({
        next: () => {
          this.newMealTitle = '';
          this.loadWeek();
        },
        error: () => {
          this.meals.update((list) => [
            ...list,
            {
              id: createId(),
              date: this.newMealDate,
              slot: this.newMealSlot,
              title: this.newMealTitle.trim(),
              kcal: 450
            }
          ]);
          this.newMealTitle = '';
        }
      });
  }

  openRecipeModal(): void {
    this.recipeDetail.set(null);
    this.editingRecipeId.set(null);
    this.recipeForm = this.emptyRecipeForm();
    this.draftIngredient = { name: '', quantity: '1', unit: 'g' };
    this.recipeFormError.set('');
    this.recipeModalOpen.set(true);
  }

  closeRecipeModal(): void {
    if (this.recipeSaving()) return;
    this.recipeModalOpen.set(false);
    this.editingRecipeId.set(null);
    this.recipeFormError.set('');
  }

  openRecipeDetail(recipe: Recipe): void {
    this.recipeDetail.set(recipe);
  }

  closeRecipeDetail(): void {
    this.recipeDetail.set(null);
  }

  editRecipeFromDetail(): void {
    const recipe = this.recipeDetail();
    if (!recipe) return;
    this.recipeDetail.set(null);
    this.editingRecipeId.set(recipe.id);
    const catRaw = (recipe.categories || '').split(/[\s,]+/).find(Boolean) || 'rapide';
    const matchedCat =
      this.recipeFormCats.find((c) => c.toLowerCase() === catRaw.toLowerCase()) || 'Rapide';
    this.recipeForm = {
      title: recipe.title,
      durationMin: recipe.durationMin || 20,
      difficulty: recipe.difficulty || 'Facile',
      category: matchedCat,
      instructions: recipe.instructions || '',
      imageUrl: recipe.imageUrl || '',
      ingredients: [...(recipe.ingredients ?? [])],
      kcal: recipe.kcal ?? null
    };
    this.draftIngredient = { name: '', quantity: '1', unit: 'g' };
    this.recipeFormError.set('');
    this.recipeModalOpen.set(true);
  }

  onRecipePhotoSelected(dataUrl: string): void {
    this.recipeForm.imageUrl = dataUrl;
    this.recipeFormError.set('');
  }

  clearRecipePhoto(): void {
    this.recipeForm.imageUrl = '';
  }

  addRecipeIngredient(): void {
    const name = this.draftIngredient.name.trim();
    if (!name) {
      this.recipeFormError.set('Choisis un ingrédient.');
      return;
    }
    const quantity = this.draftIngredient.quantity.trim() || '1';
    const unit = this.draftIngredient.unit.trim() || 'pièce';
    this.recipeForm.ingredients = [
      ...this.recipeForm.ingredients,
      { id: createId(), name, quantity, unit }
    ];
    this.draftIngredient = { name: '', quantity: '1', unit: 'g' };
    this.recipeFormError.set('');
  }

  removeRecipeIngredient(id: string): void {
    this.recipeForm.ingredients = this.recipeForm.ingredients.filter((item) => item.id !== id);
  }

  onIngredientTyped(name: string): void {
    this.draftIngredient.name = name;
    const matched = findCatalogArticle(name);
    if (matched) this.draftIngredient.unit = matched.unit;
  }

  submitRecipe(): void {
    const title = this.recipeForm.title.trim();
    if (!title) {
      this.recipeFormError.set('Indique un titre pour la recette.');
      return;
    }
    const duration = Number(this.recipeForm.durationMin);
    if (!Number.isFinite(duration) || duration <= 0) {
      this.recipeFormError.set('La durée doit être un nombre positif.');
      return;
    }

    this.recipeSaving.set(true);
    this.recipeFormError.set('');
    const ingredients = this.recipeForm.ingredients.map(({ name, quantity, unit }) => ({
      name,
      quantity,
      unit
    }));
    const kcalRaw = Number(this.recipeForm.kcal);
    const kcal = Number.isFinite(kcalRaw) && kcalRaw > 0 ? Math.round(kcalRaw) : null;
    const payload = {
      title,
      durationMin: Math.round(duration),
      difficulty: this.recipeForm.difficulty,
      categories: this.recipeForm.category.toLowerCase(),
      instructions: this.recipeForm.instructions.trim() || null,
      imageUrl: this.recipeForm.imageUrl || null,
      ingredients: ingredients.length ? JSON.stringify(ingredients) : null,
      kcal
    };

    const editingId = this.editingRecipeId();
    const request$ = editingId
      ? this.http.put<any>(`${environment.apiUrl}/recipes/${editingId}`, payload)
      : this.http.post<any>(`${environment.apiUrl}/recipes`, payload);

    request$.subscribe({
      next: (recipe) => {
        const mapped = this.mapRecipe(recipe, payload.imageUrl);
        if (editingId) {
          this.recipes.update((list) =>
            list.map((item) => (item.id === editingId ? { ...mapped, id: editingId } : item))
          );
        } else {
          this.recipes.update((list) => [mapped, ...list]);
        }
        this.recipeSaving.set(false);
        this.recipeModalOpen.set(false);
        this.editingRecipeId.set(null);
      },
      error: () => {
        if (editingId) {
          this.recipes.update((list) =>
            list.map((item) =>
              item.id === editingId
                ? {
                    ...item,
                    title: payload.title,
                    durationMin: payload.durationMin,
                    difficulty: payload.difficulty,
                    categories: payload.categories,
                    imageUrl: payload.imageUrl,
                    instructions: payload.instructions,
                    ingredients: this.recipeForm.ingredients,
                    kcal: payload.kcal
                  }
                : item
            )
          );
        } else {
          this.recipes.update((list) => [
            {
              id: createId(),
              title: payload.title,
              durationMin: payload.durationMin,
              difficulty: payload.difficulty,
              categories: payload.categories,
              imageUrl: payload.imageUrl,
              instructions: payload.instructions,
              ingredients: this.recipeForm.ingredients,
              kcal: payload.kcal
            },
            ...list
          ]);
        }
        this.recipeSaving.set(false);
        this.recipeModalOpen.set(false);
        this.editingRecipeId.set(null);
      }
    });
  }

  onArticleQuery(value: string): void {
    this.newArticle = value;
    this.articleQuery.set(value);
    this.suggestionsOpen.set(true);
    const exact = findCatalogArticle(value);
    if (exact) {
      this.newUnit = exact.unit;
      this.selectedAisle.set(exact.aisle);
      this.browseAisle.set(exact.aisle);
    }
  }

  setBrowseAisle(aisle: string): void {
    this.browseAisle.set(aisle);
  }

  pickCatalogArticle(item: CatalogArticle): void {
    this.newArticle = item.name;
    this.articleQuery.set(item.name);
    this.newUnit = item.unit;
    this.selectedAisle.set(item.aisle);
    this.browseAisle.set(item.aisle);
    this.suggestionsOpen.set(false);
  }

  addArticle(): void {
    const name = this.newArticle.trim();
    if (!name) return;

    const matched = findCatalogArticle(name);
    const aisle = matched?.aisle ?? this.selectedAisle();
    if (matched) {
      this.newUnit = matched.unit;
    }

    const qty = this.newQty.trim() || '1';
    const unit = this.newUnit.trim() || matched?.unit || 'pièce';
    const quantity = `${qty} ${unit}`.trim();
    this.suggestionsOpen.set(false);

    this.http
      .post<GroceryItem>(`${environment.apiUrl}/grocery/items`, {
        name: matched?.name ?? name,
        quantity,
        aisle
      })
      .subscribe({
        next: (item) => {
          this.grocery.update((list) => [...list, item]);
          this.resetArticleForm();
        },
        error: () => {
          this.grocery.update((list) => [
            ...list,
            {
              id: createId(),
              name: matched?.name ?? name,
              quantity,
              aisle,
              status: 0,
              favorite: false
            }
          ]);
          this.resetArticleForm();
        }
      });
  }

  private resetArticleForm(): void {
    this.newArticle = '';
    this.articleQuery.set('');
    this.newQty = '1';
    this.newUnit = 'pièce';
    this.selectedAisle.set('Fruits & Légumes');
    this.suggestionsOpen.set(false);
  }

  toggleBought(item: GroceryItem): void {
    const missing = String(item.status) === '0' || item.status === 'Missing';
    const next = missing ? 1 : 0;
    this.http.patch(`${environment.apiUrl}/grocery/items/${item.id}`, { status: next }).subscribe({
      next: () => this.loadGrocery(),
      error: () => {
        this.grocery.update((list) =>
          list.map((g) => (g.id === item.id ? { ...g, status: next } : g))
        );
      }
    });
  }

  itemsForAisle(aisle: string): GroceryItem[] {
    return this.grocery().filter((i) => i.aisle === aisle);
  }

  isBought(item: GroceryItem): boolean {
    return String(item.status) === '1' || item.status === 'Bought';
  }

  boughtCount(aisle: string): number {
    return this.itemsForAisle(aisle).filter((item) => this.isBought(item)).length;
  }

  askDeleteBought(aisle: string): void {
    if (!this.boughtCount(aisle)) return;
    this.deleteConfirmAisle.set(aisle);
  }

  cancelDeleteBought(): void {
    this.deleteConfirmAisle.set(null);
  }

  confirmDeleteBought(): void {
    const aisle = this.deleteConfirmAisle();
    if (!aisle) return;
    const toRemove = this.itemsForAisle(aisle).filter((item) => this.isBought(item));
    if (!toRemove.length) {
      this.deleteConfirmAisle.set(null);
      return;
    }

    const ids = new Set(toRemove.map((item) => item.id));
    this.grocery.update((list) => list.filter((item) => !ids.has(item.id)));
    this.deleteConfirmAisle.set(null);

    for (const item of toRemove) {
      this.http.delete(`${environment.apiUrl}/grocery/items/${item.id}`).subscribe({
        error: () => undefined
      });
    }
  }

  weekLabel(): string {
    const start = new Date(this.weekStart + 'T12:00:00');
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `Du ${start.getDate()} au ${end.getDate()} ${end.toLocaleDateString('fr-FR', { month: 'long' })}`;
  }

  dayLabel(index: number): string {
    const date = new Date(this.dateFor(index) + 'T12:00:00');
    return `${this.days[index]} ${date.getDate()} ${date.toLocaleDateString('fr-FR', { month: 'short' })}`;
  }

  dateFor(dayIndex: number): string {
    const start = new Date(this.weekStart + 'T12:00:00');
    start.setDate(start.getDate() + dayIndex);
    return this.toIso(start);
  }

  private loadWeek(): void {
    const params = new HttpParams().set('weekStart', this.weekStart);
    this.http.get<{ meals: any[] }>(`${environment.apiUrl}/meals/week`, { params }).subscribe({
      next: (res) => {
        const mapped = (res.meals ?? []).map((m) => this.mapMeal(m));
        this.meals.set(mapped.length ? mapped : this.fallbackMeals());
      },
      error: () => this.meals.set(this.fallbackMeals())
    });
  }

  private mapMeal(item: any): MealRow {
    return {
      id: String(item.id ?? createId()),
      date: String(item.date ?? ''),
      slot: String(item.slot ?? ''),
      title: String(item.title ?? 'Repas'),
      recipeId: item.recipeId != null ? String(item.recipeId) : null,
      kcal: item.kcal != null ? Number(item.kcal) : null
    };
  }

  private loadGrocery(): void {
    this.http.get<GroceryItem[]>(`${environment.apiUrl}/grocery`).subscribe({
      next: (items) => this.grocery.set(items.length ? items : this.fallbackGrocery()),
      error: () => this.grocery.set(this.fallbackGrocery())
    });
  }

  private loadRecipes(): void {
    this.http.get<any[]>(`${environment.apiUrl}/recipes`).subscribe({
      next: (items) =>
        this.recipes.set(items.length ? items.map((item) => this.mapRecipe(item)) : this.fallbackRecipes()),
      error: () => this.recipes.set(this.fallbackRecipes())
    });
  }

  private mapRecipe(item: any, fallbackImage?: string | null): Recipe {
    return {
      id: String(item.id ?? createId()),
      title: item.title,
      durationMin: Number(item.durationMin ?? 20),
      difficulty: item.difficulty ?? 'Facile',
      categories: item.categories ?? '',
      favorite: !!item.favorite,
      imageUrl: item.imageUrl ?? fallbackImage ?? null,
      instructions: item.instructions ?? null,
      ingredients: this.parseIngredients(item.ingredients),
      kcal: item.kcal != null ? Number(item.kcal) : null
    };
  }

  private parseIngredients(raw: unknown): RecipeIngredient[] {
    if (Array.isArray(raw)) {
      return raw.map((item: any) => ({
        id: String(item.id ?? createId()),
        name: String(item.name ?? ''),
        quantity: String(item.quantity ?? '1'),
        unit: String(item.unit ?? 'pièce')
      }));
    }
    if (typeof raw === 'string' && raw.trim()) {
      try {
        return this.parseIngredients(JSON.parse(raw));
      } catch {
        return [];
      }
    }
    return [];
  }

  private emptyRecipeForm() {
    return {
      title: '',
      durationMin: 20,
      difficulty: 'Facile',
      category: 'Rapide',
      instructions: '',
      imageUrl: '' as string,
      ingredients: [] as RecipeIngredient[],
      kcal: 450 as number | null
    };
  }

  private fallbackMeals(): MealRow[] {
    return environment.useDemoData ? this.demoMeals() : [];
  }

  private fallbackGrocery(): GroceryItem[] {
    return environment.useDemoData ? this.demoGrocery() : [];
  }

  private fallbackRecipes(): Recipe[] {
    return environment.useDemoData ? this.demoRecipes() : [];
  }

  private demoMeals(): MealRow[] {
    const d = (i: number) => this.dateFor(i);
    return [
      { id: '1', date: d(0), slot: 'Breakfast', title: 'Porridge protéiné', kcal: 380 },
      { id: '2', date: d(0), slot: 'Lunch', title: 'Salade poulet césar', kcal: 420 },
      { id: '3', date: d(0), slot: 'Snack', title: 'Yaourt et fruits rouges', kcal: 180 },
      { id: '4', date: d(0), slot: 'Dinner', title: 'Omelette aux légumes', kcal: 390 },
      { id: '5', date: d(1), slot: 'Breakfast', title: 'Pain, beurre et confiture', kcal: 320 },
      { id: '6', date: d(1), slot: 'Lunch', title: 'Wrap poulet', kcal: 450 },
      { id: '7', date: d(1), slot: 'Snack', title: 'Amandes', kcal: 160 },
      { id: '8', date: d(1), slot: 'Dinner', title: 'Saumon et légumes', kcal: 520 },
      { id: '9', date: d(2), slot: 'Lunch', title: 'Riz sauté aux légumes', kcal: 560 },
      { id: '10', date: d(2), slot: 'Dinner', title: 'Soupe maison', kcal: 280 },
      { id: '11', date: d(3), slot: 'Breakfast', title: 'Smoothie bol', kcal: 340 },
      { id: '12', date: d(3), slot: 'Lunch', title: 'Bowl quinoa et avocat', kcal: 480 },
      { id: '13', date: d(3), slot: 'Snack', title: 'Pomme et beurre de cacahuète', kcal: 220 },
      { id: '14', date: d(3), slot: 'Dinner', title: 'Gratin de courgettes', kcal: 410 },
      { id: '15', date: d(4), slot: 'Lunch', title: 'Burger maison et salade', kcal: 720 },
      { id: '16', date: d(4), slot: 'Snack', title: 'Yaourt et granola', kcal: 210 },
      { id: '17', date: d(4), slot: 'Dinner', title: 'Soupe et toast', kcal: 360 },
      { id: '18', date: d(5), slot: 'Breakfast', title: 'Pancakes maison', kcal: 540 },
      { id: '19', date: d(5), slot: 'Snack', title: 'Salade de fruits', kcal: 150 },
      { id: '20', date: d(5), slot: 'Dinner', title: 'Pizza maison', kcal: 780 },
      { id: '21', date: d(6), slot: 'Lunch', title: 'Brunch maison', kcal: 650 },
      { id: '22', date: d(6), slot: 'Dinner', title: 'Poulet rôti et pommes de terre', kcal: 690 }
    ];
  }

  private demoGrocery(): GroceryItem[] {
    return [
      { id: '1', name: 'Tomates', quantity: '500 g', aisle: 'Fruits & Légumes', status: 1, favorite: false },
      { id: '2', name: 'Salade', quantity: '1 pièce', aisle: 'Fruits & Légumes', status: 1, favorite: false },
      { id: '3', name: 'Carottes', quantity: '1 kg', aisle: 'Fruits & Légumes', status: 0, favorite: true },
      { id: '4', name: 'Oignons', quantity: '3 pièces', aisle: 'Fruits & Légumes', status: 0, favorite: false },
      { id: '5', name: 'Bananes', quantity: '1 régime', aisle: 'Fruits & Légumes', status: 0, favorite: false },
      { id: '6', name: 'Pommes', quantity: '4 pièces', aisle: 'Fruits & Légumes', status: 0, favorite: false },
      { id: '7', name: 'Poulet', quantity: '800 g', aisle: 'Viandes & Poissons', status: 0, favorite: false },
      { id: '8', name: 'Saumon', quantity: '2 pavés', aisle: 'Viandes & Poissons', status: 0, favorite: true },
      { id: '9', name: 'Lait', quantity: '1 L', aisle: 'Produits Frais', status: 0, favorite: false },
      { id: '10', name: 'Pâtes', quantity: '500 g', aisle: 'Épicerie', status: 0, favorite: false },
      { id: '11', name: 'Surgelés légumes', quantity: '1 sac', aisle: 'Surgelés', status: 2, favorite: false },
      { id: '12', name: 'Savon', quantity: '1', aisle: 'Hygiène & Maison', status: 0, favorite: false }
    ];
  }

  private demoRecipes(): Recipe[] {
    return [
      {
        id: '1',
        title: 'Bavette & pommes grenaille',
        durationMin: 25,
        difficulty: 'Facile',
        categories: 'viande',
        favorite: true,
        instructions: 'Saisir la bavette à feu vif, rôtir les pommes de terre, servir avec une salade.',
        kcal: 620,
        ingredients: [
          { id: 'i1', name: 'Steak', quantity: '2', unit: 'pièce' },
          { id: 'i2', name: 'Pommes de terre', quantity: '600', unit: 'g' }
        ]
      },
      {
        id: '2',
        title: 'Pâtes à la carbonara',
        durationMin: 15,
        difficulty: 'Facile',
        categories: 'rapide',
        instructions: 'Cuire les pâtes, mélanger lardons, œufs et fromage hors du feu.',
        kcal: 710,
        ingredients: [
          { id: 'i3', name: 'Pâtes', quantity: '300', unit: 'g' },
          { id: 'i4', name: 'Lardons', quantity: '150', unit: 'g' },
          { id: 'i5', name: 'Oeufs', quantity: '3', unit: 'pièce' }
        ]
      },
      {
        id: '3',
        title: 'Saumon, riz et asperges',
        durationMin: 30,
        difficulty: 'Moyen',
        categories: 'poisson healthy',
        instructions: 'Cuire le riz, rôtir le saumon et les asperges.',
        kcal: 540,
        ingredients: [
          { id: 'i6', name: 'Saumon', quantity: '2', unit: 'pièce' },
          { id: 'i7', name: 'Riz', quantity: '200', unit: 'g' }
        ]
      },
      { id: '4', title: 'Poulet curry coco', durationMin: 25, difficulty: 'Facile', categories: 'viande', instructions: 'Faire revenir le poulet, ajouter curry et lait de coco.', ingredients: [], kcal: 580 },
      { id: '5', title: 'Wrap poulet légumes', durationMin: 10, difficulty: 'Facile', categories: 'rapide', instructions: 'Assembler le wrap avec poulet et crudités.', ingredients: [], kcal: 430 },
      { id: '6', title: 'Brownie chocolat', durationMin: 35, difficulty: 'Facile', categories: 'dessert', instructions: 'Fondre le chocolat, mélanger, cuire 25 min.', ingredients: [], kcal: 390 }
    ];
  }

  private startOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7;
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - day);
    return d;
  }

  private toIso(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
