import { Component, OnInit, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

type Tab = 'semaine' | 'courses' | 'recettes';

interface MealRow {
  id: string;
  date: string;
  slot: string;
  title: string;
}

@Component({
  selector: 'app-repas',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './repas.component.html',
  styleUrl: './repas.component.scss'
})
export class RepasComponent implements OnInit {
  readonly tab = signal<Tab>('semaine');
  readonly meals = signal<MealRow[]>([]);
  readonly grocery = signal<any[]>([]);
  readonly recipes = signal<any[]>([]);
  readonly days = ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.'];
  readonly slots = ['Lunch', 'Main', 'Snack', 'Dinner'];
  readonly slotLabels: Record<string, string> = {
    Lunch: 'Déjeuner',
    Main: 'Repas',
    Snack: 'Collation',
    Dinner: 'Dîner'
  };

  weekStart = this.toIso(this.startOfWeek(new Date()));
  newMealTitle = '';
  newMealDate = this.toIso(new Date());
  newMealSlot: 'Lunch' | 'Main' | 'Snack' | 'Dinner' = 'Main';

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.loadWeek();
  }

  setTab(tab: Tab): void {
    this.tab.set(tab);
    if (tab === 'semaine') this.loadWeek();
    if (tab === 'courses') this.loadGrocery();
    if (tab === 'recettes') this.loadRecipes();
  }

  mealAt(dayIndex: number, slot: string): MealRow | undefined {
    const date = this.dateFor(dayIndex);
    return this.meals().find((m) => m.date === date && m.slot === slot);
  }

  addMeal(): void {
    if (!this.newMealTitle.trim()) {
      return;
    }
    this.http
      .post(`${environment.apiUrl}/meals`, {
        date: this.newMealDate,
        slot: this.slotIndex(this.newMealSlot),
        title: this.newMealTitle.trim()
      })
      .subscribe({
        next: () => {
          this.newMealTitle = '';
          this.loadWeek();
        }
      });
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

  private loadWeek(): void {
    const params = new HttpParams().set('weekStart', this.weekStart);
    this.http.get<{ meals: MealRow[] }>(`${environment.apiUrl}/meals/week`, { params }).subscribe({
      next: (res) => this.meals.set(res.meals ?? []),
      error: () => this.meals.set([])
    });
  }

  private loadGrocery(): void {
    this.http.get<any[]>(`${environment.apiUrl}/grocery`).subscribe({
      next: (items) => this.grocery.set(items),
      error: () => this.grocery.set([])
    });
  }

  private loadRecipes(): void {
    this.http.get<any[]>(`${environment.apiUrl}/recipes`).subscribe({
      next: (items) => this.recipes.set(items),
      error: () => this.recipes.set([])
    });
  }

  dateForPublic(dayIndex: number): string {
    return this.dateFor(dayIndex);
  }

  private dateFor(dayIndex: number): string {
    const start = new Date(this.weekStart + 'T12:00:00');
    start.setDate(start.getDate() + dayIndex);
    return this.toIso(start);
  }

  private slotIndex(slot: string): number {
    return this.slots.indexOf(slot);
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
