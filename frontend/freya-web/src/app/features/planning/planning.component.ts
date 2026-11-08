import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CalendarEvent, EventsService } from '../../core/api/events.service';

type ViewMode = 'semaine' | 'mois';
type KindMode = 'tache' | 'objectif';

interface DayCol {
  date: string;
  label: string;
  isToday: boolean;
}

@Component({
  selector: 'app-planning',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './planning.component.html',
  styleUrl: './planning.component.scss'
})
export class PlanningComponent implements OnInit {
  readonly view = signal<ViewMode>('semaine');
  readonly kind = signal<KindMode>('tache');
  readonly events = signal<CalendarEvent[]>([]);
  readonly error = signal('');
  readonly hours = Array.from({ length: 16 }, (_, i) => `${String(7 + i).padStart(2, '0')}:00`);

  title = '';
  date = this.toIsoDate(new Date());
  time = '18:00';

  readonly weekStart = this.startOfWeek(new Date());
  readonly days = signal<DayCol[]>(this.buildDays(this.weekStart));

  readonly monthCells = computed(() => this.buildMonth(new Date()));

  constructor(private readonly eventsApi: EventsService) {}

  ngOnInit(): void {
    this.reload();
  }

  setView(mode: ViewMode): void {
    this.view.set(mode);
  }

  setKind(mode: KindMode): void {
    this.kind.set(mode);
  }

  addEvent(): void {
    this.error.set('');
    if (!this.title.trim() || !this.date || !this.time) {
      this.error.set('Indique un nom, une date et une heure.');
      return;
    }

    this.eventsApi
      .create({
        title: this.title.trim(),
        date: this.date,
        startTime: this.time.length === 5 ? `${this.time}:00` : this.time,
        kind: this.kind() === 'objectif' ? 1 : 0,
        category: 0
      })
      .subscribe({
        next: () => {
          this.title = '';
          this.reload();
        },
        error: () => this.error.set('Impossible d’ajouter l’événement.')
      });
  }

  blocksFor(date: string): Array<CalendarEvent & { top: number; height: number }> {
    return this.events()
      .filter((e) => e.date === date)
      .map((e) => {
        const start = this.hourOffset(e.startTime);
        const end = e.endTime ? this.hourOffset(e.endTime) : start + 0.75;
        return {
          ...e,
          top: Math.max(0, start) * 28,
          height: Math.max(0.5, end - start) * 28
        };
      });
  }

  private reload(): void {
    const from = this.toIsoDate(this.weekStart);
    const to = this.toIsoDate(this.addDays(this.weekStart, 6));
    this.eventsApi.list(from, to).subscribe({
      next: (items) => this.events.set(items),
      error: () => this.events.set([])
    });
  }

  private buildDays(start: Date): DayCol[] {
    const labels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const today = this.toIsoDate(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = this.addDays(start, i);
      const iso = this.toIsoDate(d);
      return {
        date: iso,
        label: `${labels[i]} ${d.getDate()}`,
        isToday: iso === today
      };
    });
  }

  private buildMonth(ref: Date): Array<{ day: number | null; iso: string | null; has: boolean; today: boolean }> {
    const year = ref.getFullYear();
    const month = ref.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = this.toIsoDate(new Date());
    const eventDates = new Set(this.events().map((e) => e.date));
    const cells: Array<{ day: number | null; iso: string | null; has: boolean; today: boolean }> = [];

    for (let i = 0; i < offset; i++) {
      cells.push({ day: null, iso: null, has: false, today: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = this.toIsoDate(new Date(year, month, day));
      cells.push({ day, iso, has: eventDates.has(iso), today: iso === today });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ day: null, iso: null, has: false, today: false });
    }
    return cells;
  }

  private hourOffset(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h - 7 + m / 60;
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

  private toIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  weekLabel(): string {
    const end = this.addDays(this.weekStart, 6);
    return `Semaine du ${this.weekStart.getDate()} au ${end.getDate()} ${this.monthName(end)} ${end.getFullYear()}`;
  }

  monthNameNow(): string {
    const now = new Date();
    return `${this.monthName(now)} ${now.getFullYear()}`;
  }

  private monthName(date: Date): string {
    return date.toLocaleDateString('fr-FR', { month: 'long' });
  }
}
