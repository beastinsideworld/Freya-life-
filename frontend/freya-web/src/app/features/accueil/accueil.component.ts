import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { createId } from '../../core/id';
import { EventsService } from '../../core/api/events.service';
import {
  isDueOn,
  loadObjectives,
  loadRooms,
  repeatLabel,
  toIsoDate
} from '../../core/planning-local';
import { DatePickerComponent } from '../../shared/date-picker/date-picker.component';

interface DayEvent {
  title: string;
  startTime: string;
  endTime?: string | null;
  done?: boolean;
  icon?: string;
  date?: string;
}

interface DayMeal {
  slot: string;
  title: string;
  done: boolean;
}

interface WeekDay {
  date: string;
  label: string;
  dayNum: number;
  isToday: boolean;
  events: string[];
}

interface DayListItem {
  id: string;
  title: string;
  meta: string;
  done: boolean;
}

interface NextTrip {
  id: string;
  title: string;
  startDate: string;
  daysUntil: number;
}

@Component({
  selector: 'app-accueil',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePickerComponent],
  templateUrl: './accueil.component.html',
  styleUrl: './accueil.component.scss'
})
export class AccueilComponent implements OnInit {
  readonly now = new Date();
  readonly time = signal(this.now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
  readonly events = signal<DayEvent[]>([]);
  readonly todayObjectives = signal<DayListItem[]>([]);
  readonly todayHabits = signal<DayListItem[]>([]);
  readonly meals = signal<DayMeal[]>([]);
  readonly weekDays = signal<WeekDay[]>([]);
  readonly nextTrip = signal<NextTrip | null>(null);
  readonly temperature = signal(12);
  readonly error = signal('');

  newTitle = '';
  newDate = toIsoDate(this.now);
  newTime = '18:00';

  constructor(
    private readonly http: HttpClient,
    private readonly eventsApi: EventsService
  ) {}

  ngOnInit(): void {
    this.weekDays.set(this.buildWeek([]));
    this.loadTodayTasks();
    this.loadDashboard();
    this.loadWeekEvents();
    this.loadNextTrip();
  }

  countdown(daysUntil: number): string {
    if (daysUntil === 0) return 'Aujourd’hui';
    if (daysUntil === 1) return 'J - 1';
    return `J - ${daysUntil}`;
  }

  dateLabel(): string {
    return this.now.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  addEvent(): void {
    this.error.set('');
    if (!this.newTitle.trim() || !this.newDate || !this.newTime) {
      this.error.set('Indique un nom, une date et une heure.');
      return;
    }

    const title = this.newTitle.trim();
    const date = this.newDate;
    const startTime = this.newTime.length === 5 ? `${this.newTime}:00` : this.newTime;

    this.eventsApi
      .create({
        title,
        date,
        startTime,
        kind: 0,
        category: 0
      })
      .subscribe({
        next: () => {
          this.newTitle = '';
          this.afterAdd(title, date, startTime.slice(0, 5));
        },
        error: () => {
          this.afterAdd(title, date, startTime.slice(0, 5));
        }
      });
  }

  private afterAdd(title: string, date: string, startTime: string): void {
    const today = toIsoDate(new Date());
    if (date === today) {
      this.events.update((list) => [
        ...list,
        { title, startTime, endTime: null, done: false, icon: this.iconFor(title), date }
      ]);
    }
    this.weekDays.update((days) =>
      days.map((day) =>
        day.date === date
          ? { ...day, events: [...day.events, `${startTime} ${title}`] }
          : day
      )
    );
    this.newTitle = '';
  }

  private loadTodayTasks(): void {
    const today = toIsoDate(new Date());

    this.eventsApi.list(today, today).subscribe({
      next: (items) => {
        this.events.set(
          items
            .filter((e) => e.date === today)
            .map((e) => ({
              title: e.title,
              startTime: String(e.startTime).slice(0, 5),
              endTime: e.endTime ? String(e.endTime).slice(0, 5) : null,
              done: false,
              icon: this.iconFor(e.title),
              date: e.date
            }))
        );
      },
      error: () => this.events.set([])
    });

    this.todayObjectives.set(
      loadObjectives()
        .filter((item) => isDueOn(item.date, item.repeat, today))
        .map((item) => ({
          id: item.id,
          title: item.title,
          meta: repeatLabel(item.repeat),
          done: item.done
        }))
    );

    const habits: DayListItem[] = [];
    for (const room of loadRooms()) {
      for (const task of room.tasks) {
        if (!isDueOn(task.date, task.repeat, today)) continue;
        habits.push({
          id: task.id,
          title: `${task.title} · ${room.name}`,
          meta: repeatLabel(task.repeat),
          done: task.done
        });
      }
    }
    this.todayHabits.set(habits);
  }

  private loadDashboard(): void {
    this.http.get<any>(`${environment.apiUrl}/dashboard/today`).subscribe({
      next: (dto) => {
        this.time.set(dto.time ?? this.time());
        this.temperature.set(dto.temperatureC ?? 12);
        const apiMeals = (dto.meals ?? []).map((m: any) => ({
          slot: this.mealLabel(m.slot),
          title: m.title,
          done: !!m.done
        }));
        this.meals.set(apiMeals.length ? apiMeals : this.demoMeals());
      },
      error: () => this.meals.set(this.demoMeals())
    });
  }

  private loadNextTrip(): void {
    const today = toIsoDate(new Date());
    this.http.get<any[]>(`${environment.apiUrl}/trips`).subscribe({
      next: (items) => {
        const upcoming = (items?.length ? items : this.demoTrips())
          .map((item) => this.toNextTrip(item))
          .filter((trip) => trip.startDate >= today)
          .sort((a, b) => a.startDate.localeCompare(b.startDate));
        this.nextTrip.set(upcoming[0] ?? null);
      },
      error: () => {
        const upcoming = this.demoTrips()
          .map((item) => this.toNextTrip(item))
          .filter((trip) => trip.startDate >= today)
          .sort((a, b) => a.startDate.localeCompare(b.startDate));
        this.nextTrip.set(upcoming[0] ?? null);
      }
    });
  }

  private toNextTrip(item: any): NextTrip {
    const startDate = String(item.startDate).slice(0, 10);
    return {
      id: String(item.id ?? createId()),
      title: item.title,
      startDate,
      daysUntil: this.daysUntil(startDate)
    };
  }

  private demoTrips() {
    return [
      { id: 'portugal', title: 'Portugal', startDate: '2026-08-03' },
      { id: 'corse', title: 'Corse', startDate: '2026-08-20' }
    ];
  }

  private daysUntil(iso: string): number {
    const parts = iso.split('-').map(Number);
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return 0;
    const target = new Date(parts[0], parts[1] - 1, parts[2]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86400000);
  }

  private loadWeekEvents(): void {
    const start = this.startOfWeek(this.now);
    const from = toIsoDate(start);
    const to = toIsoDate(this.addDays(start, 6));
    this.eventsApi.list(from, to).subscribe({
      next: (items) => {
        this.weekDays.set(this.buildWeek(items.length ? items : this.demoWeekEvents(start)));
      },
      error: () => this.weekDays.set(this.buildWeek(this.demoWeekEvents(start)))
    });
  }

  private buildWeek(items: Array<{ date: string; title: string; startTime: string }>): WeekDay[] {
    const labels = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const start = this.startOfWeek(this.now);
    const today = toIsoDate(this.now);
    return labels.map((label, i) => {
      const dateObj = this.addDays(start, i);
      const date = toIsoDate(dateObj);
      const events = items
        .filter((e) => e.date === date)
        .map((e) => `${String(e.startTime).slice(0, 5)} ${e.title}`);
      return {
        date,
        label,
        dayNum: dateObj.getDate(),
        isToday: date === today,
        events
      };
    });
  }

  private demoMeals(): DayMeal[] {
    return [
      { slot: 'Petit-déjeuner', title: 'Porridge protéiné', done: true },
      { slot: 'Déjeuner', title: 'Poulet, riz, légumes', done: true },
      { slot: 'Dîner', title: 'Saumon, patates douces', done: false }
    ];
  }

  private demoWeekEvents(start: Date) {
    const d = (i: number) => toIsoDate(this.addDays(start, i));
    return [
      { date: d(0), title: 'Muscu', startTime: '07:00' },
      { date: d(0), title: 'Course', startTime: '18:00' },
      { date: d(2), title: 'Travail', startTime: '08:30' },
      { date: d(3), title: 'Muscu', startTime: '07:00' },
      { date: d(3), title: 'Course', startTime: '18:00' },
      { date: d(4), title: 'Muscu', startTime: '10:00' }
    ];
  }

  private iconFor(title: string): string {
    const t = title.toLowerCase();
    if (t.includes('muscu') || t.includes('sport')) return '🏋';
    if (t.includes('travail') || t.includes('projet')) return '💼';
    if (t.includes('course')) return '👟';
    if (t.includes('dîner') || t.includes('diner') || t.includes('repas')) return '🍴';
    return '•';
  }

  private mealLabel(slot: string): string {
    const map: Record<string, string> = {
      Lunch: 'Déjeuner',
      Main: 'Repas',
      Snack: 'Collation',
      Dinner: 'Dîner',
      Breakfast: 'Petit-déjeuner'
    };
    return map[slot] ?? slot;
  }

  private startOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7;
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - day);
    return d;
  }

  private addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }
}
