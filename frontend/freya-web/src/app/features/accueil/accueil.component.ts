import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { createId } from '../../core/id';
import { CalendarEvent, EventsService } from '../../core/api/events.service';
import {
  loadSnoozedIds,
  loadSettings,
  markReminderShown,
  reminderShownToday,
  snoozeReminderItem
} from '../../core/app-settings';
import {
  isDueOn,
  loadObjectives,
  loadRooms,
  loadTasks,
  repeatLabel,
  saveObjectives,
  saveRooms,
  saveTasks,
  toIsoDate
} from '../../core/planning-local';
import { FamilyService, FamilySummary } from '../../core/family.service';
import { AuthService } from '../../core/auth/auth.service';
import { DatePickerComponent } from '../../shared/date-picker/date-picker.component';
import { NavIconComponent } from '../../shared/nav-icon/nav-icon.component';

const EVENT_DONE_KEY = 'freya.accueil.event-done.v1';
const FAMILY_SCOPE_KEY = 'freya.accueil.family-scope.v1';

interface WeatherDay {
  date: string;
  label: string;
  icon: string;
  tempMax: number;
  tempMin: number;
  summary: string;
}

interface ReminderItem {
  id: string;
  title: string;
  meta: string;
  kind: 'objective' | 'habit' | 'task';
  roomId?: string;
  repeat?: string;
}

interface DayEvent {
  id: string;
  title: string;
  startTime: string;
  endTime?: string | null;
  endDate?: string | null;
  allDay?: boolean;
  done: boolean;
  icon: string;
  date: string;
  kind: number;
  category: number;
  ownerName?: string;
  ownerUserId?: string;
  mine?: boolean;
}

type MealSlotKey = 'breakfast' | 'lunch' | 'snack' | 'dinner';

interface DayMeal {
  id: string;
  key: MealSlotKey;
  slot: string;
  title: string;
  done: boolean;
  kcal: number;
  iconSrc: string;
}

const MEAL_SLOTS: Array<{ key: MealSlotKey; slot: string; iconSrc: string; aliases: string[] }> = [
  {
    key: 'breakfast',
    slot: 'Petit-déjeuner',
    iconSrc: 'assets/meals/petit-dejeuner.png',
    aliases: ['breakfast', 'petit-déjeuner', 'petit dejeuner', 'petit-dejeuner']
  },
  {
    key: 'lunch',
    slot: 'Déjeuner',
    iconSrc: 'assets/meals/dejeuner.png',
    aliases: ['lunch', 'déjeuner', 'dejeuner', 'main']
  },
  {
    key: 'snack',
    slot: 'Collation',
    iconSrc: 'assets/meals/collation.png',
    aliases: ['snack', 'collation']
  },
  {
    key: 'dinner',
    slot: 'Dîner',
    iconSrc: 'assets/meals/diner.png',
    aliases: ['dinner', 'dîner', 'diner', 'repas']
  }
];

interface WeekDay {
  date: string;
  label: string;
  dayNum: number;
  isToday: boolean;
  events: DayEvent[];
}

interface DayListItem {
  id: string;
  title: string;
  meta: string;
  done: boolean;
  kind: 'objective' | 'habit' | 'task';
  roomId?: string;
  ownerName?: string;
  ownerUserId?: string;
  mine?: boolean;
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
  imports: [RouterLink, FormsModule, DatePickerComponent, NavIconComponent],
  templateUrl: './accueil.component.html',
  styleUrl: './accueil.component.scss'
})
export class AccueilComponent implements OnInit, OnDestroy {
  readonly now = new Date();
  readonly time = signal(this.now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
  readonly events = signal<DayEvent[]>([]);
  readonly todayObjectives = signal<DayListItem[]>([]);
  readonly todayHabits = signal<DayListItem[]>([]);
  readonly todayTasks = signal<DayListItem[]>([]);
  readonly meals = signal<DayMeal[]>(this.fallbackMeals());
  readonly weekDays = signal<WeekDay[]>([]);
  readonly nextTrip = signal<NextTrip | null>(null);
  readonly temperature = signal(12);
  readonly error = signal('');
  readonly editingEvent = signal<DayEvent | null>(null);
  readonly weatherDays = signal<WeatherDay[]>([]);
  readonly weatherLoading = signal(false);
  readonly weatherPlace = signal('Ma position');
  readonly weatherFallback = signal(false);
  readonly reminderOpen = signal(false);
  readonly reminderItems = signal<ReminderItem[]>([]);
  readonly postponeTarget = signal<ReminderItem | null>(null);
  readonly families = signal<FamilySummary[]>([]);
  readonly selectedFamilyId = signal<string>('me');

  private geoCoords: { lat: number; lon: number } | null = null;

  newTitle = '';
  newDate = toIsoDate(this.now);
  newTime = '18:00';
  editEventTitle = '';
  editEventDate = toIsoDate(this.now);
  editEventEndDate = toIsoDate(this.now);
  editEventTime = '18:00';
  editEventEndTime = '19:00';
  editEventAllDay = false;
  postponeDate = toIsoDate(new Date(Date.now() + 86_400_000));

  private reminderTimer: number | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly eventsApi: EventsService,
    private readonly familiesApi: FamilyService,
    private readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    const stored = localStorage.getItem(FAMILY_SCOPE_KEY);
    if (stored) this.selectedFamilyId.set(stored);
    this.weekDays.set(this.buildWeek([]));
    this.familiesApi.syncPlanningSnapshot().subscribe({ error: () => undefined });
    this.loadFamilies();
    this.reloadScopedDay();
    this.loadDashboard();
    this.loadNextTrip();
    this.resolveGeolocation(() => this.loadWeatherWeek(false));
    this.checkReminderPopup();
    this.reminderTimer = window.setInterval(() => this.checkReminderPopup(), 30_000);
  }

  selectFamilyScope(familyId: string): void {
    this.selectedFamilyId.set(familyId || 'me');
    localStorage.setItem(FAMILY_SCOPE_KEY, this.selectedFamilyId());
    this.reloadScopedDay();
  }

  private reloadScopedDay(): void {
    this.loadTodayTasks();
    this.loadWeekEvents();
  }

  private loadFamilies(): void {
    this.familiesApi.list().subscribe({
      next: (list) => {
        this.families.set(list);
        if (this.selectedFamilyId() !== 'me' && !list.some((f) => f.id === this.selectedFamilyId())) {
          this.selectedFamilyId.set('me');
          localStorage.setItem(FAMILY_SCOPE_KEY, 'me');
        }
      },
      error: () => this.families.set([])
    });
  }

  ngOnDestroy(): void {
    if (this.reminderTimer != null) {
      window.clearInterval(this.reminderTimer);
      this.reminderTimer = null;
    }
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

  weatherFor(date: string): WeatherDay | null {
    return this.weatherDays().find((d) => d.date === date) ?? null;
  }

  closeReminderPopup(): void {
    this.reminderOpen.set(false);
    this.postponeTarget.set(null);
  }

  completeReminderItem(item: ReminderItem): void {
    this.toggleListItem({
      id: item.id,
      title: item.title,
      meta: item.meta,
      done: false,
      kind: item.kind,
      roomId: item.roomId
    });
    this.reminderItems.update((list) => list.filter((row) => row.id !== item.id));
    if (!this.reminderItems().length) this.closeReminderPopup();
  }

  openPostpone(item: ReminderItem): void {
    this.postponeDate = toIsoDate(this.addDays(new Date(), 1));
    this.postponeTarget.set(item);
  }

  cancelPostpone(): void {
    this.postponeTarget.set(null);
  }

  postponeTomorrow(item: ReminderItem): void {
    this.applyPostpone(item, toIsoDate(this.addDays(new Date(), 1)));
  }

  confirmPostpone(): void {
    const item = this.postponeTarget();
    if (!item || !this.postponeDate) return;
    this.applyPostpone(item, this.postponeDate);
  }

  private applyPostpone(item: ReminderItem, dateIso: string): void {
    const today = toIsoDate(new Date());

    if (item.kind === 'objective') {
      const list = loadObjectives();
      const current = list.find((row) => row.id === item.id);
      if (current?.repeat === 'once') {
        saveObjectives(list.map((row) => (row.id === item.id ? { ...row, date: dateIso, done: false } : row)));
      } else {
        snoozeReminderItem(today, item.id);
      }
    } else if (item.kind === 'habit' && item.roomId) {
      const rooms = loadRooms();
      let once = false;
      for (const room of rooms) {
        const task = room.tasks.find((row) => row.id === item.id);
        if (task?.repeat === 'once') {
          once = true;
          break;
        }
      }
      if (once) {
        saveRooms(
          rooms.map((room) =>
            room.id !== item.roomId
              ? room
              : {
                  ...room,
                  tasks: room.tasks.map((task) =>
                    task.id === item.id ? { ...task, date: dateIso, done: false } : task
                  )
                }
          )
        );
      } else {
        snoozeReminderItem(today, item.id);
      }
    } else {
      snoozeReminderItem(today, item.id);
    }

    this.reminderItems.update((list) => list.filter((row) => row.id !== item.id));
    this.postponeTarget.set(null);
    this.loadTodayTasks();
    if (!this.reminderItems().length) this.closeReminderPopup();
  }

  private checkReminderPopup(): void {
    const settings = loadSettings();
    if (!settings.reminderEnabled) return;

    const now = new Date();
    const today = toIsoDate(now);
    if (reminderShownToday(today)) return;

    const [hh, mm] = settings.reminderTime.split(':').map(Number);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return;
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const minutesTarget = hh * 60 + mm;
    if (minutesNow < minutesTarget) return;

    const items = this.collectIncompleteItems(today);
    if (!items.length) {
      markReminderShown(today);
      return;
    }

    this.reminderItems.set(items);
    this.reminderOpen.set(true);
    markReminderShown(today);
  }

  private collectIncompleteItems(today: string): ReminderItem[] {
    const snoozed = loadSnoozedIds(today);
    const items: ReminderItem[] = [];

    for (const item of this.todayObjectives()) {
      if (item.done || snoozed.has(item.id)) continue;
      items.push({
        id: item.id,
        title: item.title,
        meta: `Objectif · ${item.meta}`,
        kind: 'objective'
      });
    }
    for (const item of this.todayHabits()) {
      if (item.done || snoozed.has(item.id)) continue;
      items.push({
        id: item.id,
        title: item.title,
        meta: `Habitude · ${item.meta}`,
        kind: 'habit',
        roomId: item.roomId
      });
    }
    for (const item of this.todayTasks()) {
      if (item.done || snoozed.has(item.id)) continue;
      items.push({
        id: item.id,
        title: item.title,
        meta: 'Tâche',
        kind: 'task'
      });
    }
    return items;
  }

  private resolveGeolocation(done: () => void): void {
    if (this.geoCoords) {
      done();
      return;
    }
    if (!navigator.geolocation) {
      this.weatherPlace.set('Paris (défaut)');
      done();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.geoCoords = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude
        };
        this.weatherPlace.set('Autour de toi');
        done();
      },
      () => {
        this.weatherPlace.set('Paris (défaut)');
        done();
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 }
    );
  }

  private loadWeatherWeek(force = false): void {
    if (!force && this.weatherDays().length) return;
    this.weatherLoading.set(true);
    this.weatherFallback.set(false);
    const lat = this.geoCoords?.lat ?? 48.8566;
    const lon = this.geoCoords?.lon ?? 2.3522;
    const cacheKey = `freya.weather.v1:${lat.toFixed(2)},${lon.toFixed(2)}`;

    const applyDto = (dto: any, fromCache = false): boolean => {
      const times: string[] = dto?.daily?.time ?? [];
      const codes: number[] = dto?.daily?.weather_code ?? [];
      const maxes: number[] = dto?.daily?.temperature_2m_max ?? [];
      const mins: number[] = dto?.daily?.temperature_2m_min ?? [];
      if (!times.length) return false;
      this.weatherDays.set(
        times.map((date, i) => {
          const info = this.weatherFromCode(codes[i] ?? 0);
          const d = new Date(date + 'T12:00:00');
          return {
            date,
            label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
            icon: info.icon,
            tempMax: Math.round(maxes[i] ?? this.temperature()),
            tempMin: Math.round(mins[i] ?? this.temperature() - 4),
            summary: info.summary
          };
        })
      );
      if (maxes[0] != null) this.temperature.set(Math.round(maxes[0]));
      this.weatherFallback.set(fromCache);
      this.weatherLoading.set(false);
      return true;
    };

    const useCacheOrDemo = (): void => {
      try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
          const parsed = JSON.parse(raw) as { at: number; dto: unknown };
          // Cache valide 12 h
          if (parsed?.dto && Date.now() - Number(parsed.at || 0) < 12 * 60 * 60 * 1000) {
            if (applyDto(parsed.dto, true)) return;
          }
        }
      } catch {
        /* ignore */
      }
      this.weatherDays.set(this.demoWeatherWeek());
      this.weatherFallback.set(true);
      this.weatherLoading.set(false);
    };

    // Couvrir toute la semaine calendaire (lundi → dimanche)
    const pastDays = (this.now.getDay() + 6) % 7; // 0 = lundi … 6 = dimanche
    const forecastDays = Math.max(1, 7 - pastDays);
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto` +
      `&past_days=${pastDays}&forecast_days=${forecastDays}`;

    const attemptFetch = (attempt: number): void => {
      this.http.get<any>(url).subscribe({
        next: (dto) => {
          if (!applyDto(dto, false)) {
            useCacheOrDemo();
            return;
          }
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), dto }));
          } catch {
            /* quota */
          }
        },
        error: () => {
          // Open-Meteo renvoie parfois 503 : 2 retries puis cache / démo
          if (attempt < 2) {
            window.setTimeout(() => attemptFetch(attempt + 1), 600 * (attempt + 1));
            return;
          }
          useCacheOrDemo();
        }
      });
    };

    attemptFetch(0);
  }

  private weatherFromCode(code: number): { icon: string; summary: string } {
    if (code === 0) return { icon: '☀', summary: 'Ensoleillé' };
    if (code <= 3) return { icon: '🌤', summary: 'Peu nuageux' };
    if (code <= 48) return { icon: '☁', summary: 'Nuageux' };
    if (code <= 67) return { icon: '🌧', summary: 'Pluie' };
    if (code <= 77) return { icon: '❄', summary: 'Neige' };
    if (code <= 82) return { icon: '🌦', summary: 'Averses' };
    return { icon: '⛈', summary: 'Orage' };
  }

  private demoWeatherWeek(): WeatherDay[] {
    const base = this.temperature();
    return Array.from({ length: 7 }, (_, i) => {
      const d = this.addDays(new Date(), i);
      const iso = toIsoDate(d);
      const swing = ((i % 3) - 1) * 2;
      return {
        date: iso,
        label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
        icon: i % 4 === 0 ? '☀' : i % 4 === 1 ? '🌤' : i % 4 === 2 ? '☁' : '🌧',
        tempMax: base + swing + 2,
        tempMin: base + swing - 3,
        summary: i % 4 === 0 ? 'Ensoleillé' : i % 4 === 1 ? 'Peu nuageux' : i % 4 === 2 ? 'Nuageux' : 'Pluie'
      };
    });
  }

  toggleEventDone(id: string, ev?: Event): void {
    ev?.stopPropagation();
    this.events.update((list) =>
      list.map((item) => {
        if (item.id !== id) return item;
        const done = !item.done;
        this.persistEventDone(id, done);
        return { ...item, done };
      })
    );
  }

  toggleListItem(item: DayListItem): void {
    if (item.mine === false) return;
    const localId = item.id.includes(':') ? item.id.slice(item.id.indexOf(':') + 1) : item.id;

    if (item.kind === 'objective') {
      const next = loadObjectives().map((row) =>
        row.id === localId ? { ...row, done: !row.done } : row
      );
      saveObjectives(next);
      this.familiesApi.syncPlanningSnapshot().subscribe({ error: () => undefined });
      this.todayObjectives.update((list) =>
        list.map((row) => (row.id === item.id ? { ...row, done: !row.done } : row))
      );
      return;
    }

    if (item.kind === 'task') {
      const next = loadTasks().map((row) =>
        row.id === localId ? { ...row, done: !row.done } : row
      );
      saveTasks(next);
      this.familiesApi.syncPlanningSnapshot().subscribe({ error: () => undefined });
      this.todayTasks.update((list) =>
        list.map((row) => (row.id === item.id ? { ...row, done: !row.done } : row))
      );
      return;
    }

    if (!item.roomId) return;
    const rooms = loadRooms().map((room) =>
      room.id !== item.roomId
        ? room
        : {
            ...room,
            tasks: room.tasks.map((task) =>
              task.id === localId ? { ...task, done: !task.done } : task
            )
          }
    );
    saveRooms(rooms);
    this.familiesApi.syncPlanningSnapshot().subscribe({ error: () => undefined });
    this.todayHabits.update((list) =>
      list.map((row) => (row.id === item.id ? { ...row, done: !row.done } : row))
    );
  }

  toggleMeal(meal: DayMeal): void {
    const done = !meal.done;
    this.meals.update((list) =>
      list.map((row) => (row.id === meal.id ? { ...row, done } : row))
    );

    if (!meal.id || meal.id.startsWith('demo-') || meal.id.startsWith('empty-') || meal.id.startsWith('slot-')) {
      return;
    }
    this.http.patch(`${environment.apiUrl}/meals/${meal.id}/done`, { done }).subscribe({
      error: () => {
        this.meals.update((list) =>
          list.map((row) => (row.id === meal.id ? { ...row, done: !done } : row))
        );
      }
    });
  }

  openWeekEvent(event: DayEvent, ev?: Event): void {
    ev?.stopPropagation();
    this.editingEvent.set(event);
    this.editEventTitle = event.title;
    this.editEventDate = event.date;
    this.editEventEndDate = event.endDate || event.date;
    this.editEventTime = String(event.startTime).slice(0, 5) || '18:00';
    this.editEventEndTime = String(event.endTime || event.startTime).slice(0, 5) || '19:00';
    this.editEventAllDay = !!event.allDay || this.editEventTime === '00:00';
  }

  closeEventEditor(): void {
    this.editingEvent.set(null);
  }

  toggleEditAllDay(): void {
    this.editEventAllDay = !this.editEventAllDay;
  }

  saveEventEdit(): void {
    const current = this.editingEvent();
    if (!current) return;
    const title = this.editEventTitle.trim();
    if (!title || !this.editEventDate || !this.editEventEndDate) return;
    if (this.editEventEndDate < this.editEventDate) return;
    if (!this.editEventAllDay && (!this.editEventTime || !this.editEventEndTime)) return;

    const payload = {
      title,
      date: this.editEventDate,
      endDate: this.editEventEndDate,
      startTime: this.editEventAllDay ? null : this.normalizeTime(this.editEventTime),
      endTime: this.editEventAllDay ? null : this.normalizeTime(this.editEventEndTime),
      allDay: this.editEventAllDay,
      kind: current.kind,
      category: current.category
    };

    const applyLocal = () => {
      this.editingEvent.set(null);
      this.loadWeekEvents();
      this.loadTodayTasks();
    };

    if (current.id.startsWith('demo-')) {
      applyLocal();
      return;
    }

    this.eventsApi.update(current.id, payload).subscribe({
      next: () => applyLocal(),
      error: () => applyLocal()
    });
  }

  deleteEvent(): void {
    const current = this.editingEvent();
    if (!current) return;

    const applyLocal = () => {
      this.editingEvent.set(null);
      this.events.update((list) => list.filter((item) => item.id !== current.id));
      this.loadWeekEvents();
      this.loadTodayTasks();
    };

    if (current.id.startsWith('demo-')) {
      applyLocal();
      return;
    }

    this.eventsApi.remove(current.id).subscribe({
      next: () => applyLocal(),
      error: () => applyLocal()
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
        endDate: date,
        startTime,
        endTime: null,
        allDay: false,
        kind: 0,
        category: 0
      })
      .subscribe({
        next: (created) => {
          this.newTitle = '';
          this.afterAdd(this.toDayEvent(created));
        },
        error: () => {
          this.afterAdd({
            id: createId(),
            title,
            startTime: startTime.slice(0, 5),
            endTime: null,
            endDate: date,
            allDay: false,
            done: false,
            icon: this.iconFor(title),
            date,
            kind: 0,
            category: 0
          });
        }
      });
  }

  private afterAdd(event: DayEvent): void {
    const today = toIsoDate(new Date());
    if (event.date === today) {
      this.events.update((list) => [...list, event]);
    }
    this.weekDays.update((days) =>
      days.map((day) =>
        day.date === event.date ? { ...day, events: [...day.events, event] } : day
      )
    );
    this.newTitle = '';
  }

  private loadTodayTasks(): void {
    const today = toIsoDate(new Date());
    const familyId = this.selectedFamilyId();
    if (familyId !== 'me') {
      this.loadFamilyToday(familyId, today);
      return;
    }

    const doneMap = this.loadEventDoneMap();
    const me = this.auth.user()?.displayName || 'Moi';

    this.eventsApi.list(today, today).subscribe({
      next: (items) => {
        this.events.set(
          items
            .filter((e) => e.date <= today && (e.endDate ?? e.date) >= today)
            .map((e) => this.toDayEvent(e, !!doneMap[e.id], me, true))
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
          done: item.done,
          kind: 'objective' as const,
          ownerName: me,
          mine: true
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
          done: task.done,
          kind: 'habit',
          roomId: room.id,
          ownerName: me,
          mine: true
        });
      }
    }
    this.todayHabits.set(habits);

    this.todayTasks.set(
      loadTasks().map((item) => ({
        id: item.id,
        title: item.title,
        meta: 'Tâche',
        done: item.done,
        kind: 'task' as const,
        ownerName: me,
        mine: true
      }))
    );
  }

  private loadFamilyToday(familyId: string, today: string): void {
    const doneMap = this.loadEventDoneMap();
    this.familiesApi.today(familyId, today).subscribe({
      next: (dto) => {
        this.events.set(
          dto.events.map((e) =>
            this.toDayEvent(
              {
                id: e.id,
                title: e.title,
                date: e.date,
                endDate: e.endDate,
                startTime: e.startTime || '00:00',
                endTime: e.endTime,
                allDay: e.allDay,
                kind: e.kind,
                category: e.category
              } as CalendarEvent,
              !!doneMap[e.id],
              e.ownerName,
              e.mine
            )
          )
        );
        this.todayObjectives.set(
          dto.objectives.map((item) => ({
            id: `${item.userId}:${item.id}`,
            title: item.title,
            meta: `${item.ownerName} · ${item.meta}`,
            done: item.done,
            kind: 'objective' as const,
            ownerName: item.ownerName,
            ownerUserId: item.userId,
            mine: item.mine
          }))
        );
        this.todayHabits.set(
          dto.habits.map((item) => ({
            id: `${item.userId}:${item.id}`,
            title: item.title,
            meta: `${item.ownerName} · ${item.meta}`,
            done: item.done,
            kind: 'habit' as const,
            roomId: item.mine ? item.roomId ?? undefined : undefined,
            ownerName: item.ownerName,
            ownerUserId: item.userId,
            mine: item.mine
          }))
        );
        this.todayTasks.set(
          dto.tasks.map((item) => ({
            id: `${item.userId}:${item.id}`,
            title: item.title,
            meta: `${item.ownerName} · ${item.meta}`,
            done: item.done,
            kind: 'task' as const,
            ownerName: item.ownerName,
            ownerUserId: item.userId,
            mine: item.mine
          }))
        );
      },
      error: () => {
        this.events.set([]);
        this.todayObjectives.set([]);
        this.todayHabits.set([]);
        this.todayTasks.set([]);
        this.error.set('Impossible de charger la vue famille.');
      }
    });
  }

  private loadDashboard(): void {
    this.http.get<any>(`${environment.apiUrl}/dashboard/today`).subscribe({
      next: (dto) => {
        this.time.set(dto.time ?? this.time());
        this.temperature.set(dto.temperatureC ?? 12);
        const apiMeals = (dto.meals ?? []).map((m: any) => ({
          id: String(m.id ?? createId()),
          slot: this.mealLabel(String(m.slot ?? '')),
          title: String(m.title ?? ''),
          done: !!m.done,
          kcal: Number(m.kcal ?? this.estimateKcal(String(m.title ?? '')))
        }));
        this.meals.set(this.normalizeMeals(apiMeals));
      },
      error: () => this.meals.set(this.fallbackMeals())
    });
  }

  totalMealsKcal(): number {
    return this.meals().reduce((sum, meal) => sum + (meal.kcal || 0), 0);
  }

  private normalizeMeals(
    incoming: Array<{ id?: string; slot: string; title: string; done: boolean; kcal: number }>
  ): DayMeal[] {
    const demos = environment.useDemoData ? this.demoMeals() : [];
    return MEAL_SLOTS.map((def) => {
      const match = incoming.find((m) => this.matchMealSlot(m.slot, def));
      if (match) {
        return {
          id: match.id || `slot-${def.key}`,
          key: def.key,
          slot: def.slot,
          title: match.title || 'À définir',
          done: match.done,
          kcal: match.kcal || this.defaultKcal(def.key),
          iconSrc: def.iconSrc
        };
      }
      const demo = demos.find((m) => m.key === def.key);
      return (
        demo ?? {
          id: `empty-${def.key}`,
          key: def.key,
          slot: def.slot,
          title: 'À définir',
          done: false,
          kcal: 0,
          iconSrc: def.iconSrc
        }
      );
    });
  }

  private matchMealSlot(
    slot: string,
    def: (typeof MEAL_SLOTS)[number]
  ): boolean {
    const value = slot.trim().toLowerCase();
    if (!value) return false;
    if (value === def.key || value === def.slot.toLowerCase()) return true;
    return def.aliases.some((alias) => value === alias || value.includes(alias));
  }

  private defaultKcal(key: MealSlotKey): number {
    switch (key) {
      case 'breakfast':
        return 380;
      case 'lunch':
        return 520;
      case 'snack':
        return 180;
      case 'dinner':
        return 480;
    }
  }

  private loadNextTrip(): void {
    const today = toIsoDate(new Date());
    this.http.get<any[]>(`${environment.apiUrl}/trips`).subscribe({
      next: (items) => {
        const upcoming = (items?.length ? items : this.fallbackTrips())
          .map((item) => this.toNextTrip(item))
          .filter((trip) => trip.startDate >= today)
          .sort((a, b) => a.startDate.localeCompare(b.startDate));
        this.nextTrip.set(upcoming[0] ?? null);
      },
      error: () => {
        const upcoming = this.fallbackTrips()
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

  private fallbackTrips() {
    return environment.useDemoData ? this.demoTrips() : [];
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
    const doneMap = this.loadEventDoneMap();
    const familyId = this.selectedFamilyId();

    if (familyId !== 'me') {
      this.familiesApi.events(familyId, from, to).subscribe({
        next: (items) => {
          const mapped = items.map((e) =>
            this.toDayEvent(
              {
                id: e.id,
                title: e.mine ? e.title : `${e.title} · ${e.ownerName}`,
                date: e.date,
                endDate: e.endDate,
                startTime: e.startTime || '00:00',
                endTime: e.endTime,
                allDay: e.allDay,
                kind: e.kind,
                category: e.category
              } as CalendarEvent,
              !!doneMap[e.id],
              e.ownerName,
              e.mine
            )
          );
          this.weekDays.set(this.buildWeek(mapped));
        },
        error: () => this.weekDays.set(this.buildWeek([]))
      });
      return;
    }

    this.eventsApi.list(from, to).subscribe({
      next: (items) => {
        const mapped = (items.length ? items : this.fallbackWeekEvents(start)).map((e) =>
          this.toDayEvent(e, !!doneMap[e.id])
        );
        this.weekDays.set(this.buildWeek(mapped));
      },
      error: () =>
        this.weekDays.set(
          this.buildWeek(this.fallbackWeekEvents(start).map((e) => this.toDayEvent(e, !!doneMap[e.id])))
        )
    });
  }

  private buildWeek(items: DayEvent[]): WeekDay[] {
    const labels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const start = this.startOfWeek(this.now);
    const today = toIsoDate(this.now);
    return labels.map((label, i) => {
      const dateObj = this.addDays(start, i);
      const date = toIsoDate(dateObj);
      const events = items
        .filter((e) => e.date <= date && (e.endDate ?? e.date) >= date)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      return {
        date,
        label,
        dayNum: dateObj.getDate(),
        isToday: date === today,
        events
      };
    });
  }

  private toDayEvent(
    e: CalendarEvent | DayEvent,
    done = false,
    ownerName?: string,
    mine = true
  ): DayEvent {
    return {
      id: e.id,
      title: e.title,
      date: e.date,
      endDate: e.endDate ?? e.date,
      startTime: String(e.startTime).slice(0, 5),
      endTime: e.endTime ? String(e.endTime).slice(0, 5) : null,
      allDay: !!(e as CalendarEvent).allDay || String(e.startTime).slice(0, 5) === '00:00',
      done,
      icon: this.iconFor(e.title),
      kind: typeof (e as CalendarEvent).kind === 'number' ? Number((e as CalendarEvent).kind) : 0,
      category:
        typeof (e as CalendarEvent).category === 'number' ? Number((e as CalendarEvent).category) : 0,
      ownerName: ownerName ?? (e as DayEvent).ownerName,
      mine: mine ?? (e as DayEvent).mine ?? true
    };
  }

  private fallbackMeals(): DayMeal[] {
    return this.normalizeMeals(environment.useDemoData ? this.demoMeals() : []);
  }

  private demoMeals(): DayMeal[] {
    return MEAL_SLOTS.map((def, i) => {
      const samples = [
        { title: 'Porridge protéiné', done: true, kcal: 508 },
        { title: 'Wraps matin légumes', done: true, kcal: 430 },
        { title: 'Yaourt, fruits et amandes', done: false, kcal: 310 },
        { title: 'Saumon, poireaux et riz', done: false, kcal: 246 }
      ][i];
      return {
        id: `demo-${def.key}`,
        key: def.key,
        slot: def.slot,
        title: samples.title,
        done: samples.done,
        kcal: samples.kcal,
        iconSrc: def.iconSrc
      };
    });
  }

  private estimateKcal(title: string): number {
    const t = title.toLowerCase();
    if (t.includes('porridge') || t.includes('yaourt')) return 350;
    if (t.includes('saumon')) return 540;
    if (t.includes('poulet')) return 620;
    if (t.includes('salade')) return 380;
    return 450;
  }

  private fallbackWeekEvents(start: Date): CalendarEvent[] {
    return environment.useDemoData ? this.demoWeekEvents(start) : [];
  }

  private demoWeekEvents(start: Date): CalendarEvent[] {
    const d = (i: number) => toIsoDate(this.addDays(start, i));
    return [
      { id: 'demo-1', date: d(0), endDate: d(0), title: 'Muscu', startTime: '07:00', endTime: '08:00', allDay: false, kind: 0, category: 1 },
      { id: 'demo-2', date: d(0), endDate: d(0), title: 'Course', startTime: '18:00', endTime: '19:00', allDay: false, kind: 0, category: 4 },
      { id: 'demo-3', date: d(2), endDate: d(2), title: 'Travail', startTime: '08:30', endTime: '17:00', allDay: false, kind: 0, category: 2 },
      { id: 'demo-4', date: d(3), endDate: d(3), title: 'Muscu', startTime: '07:00', endTime: '08:00', allDay: false, kind: 0, category: 1 },
      { id: 'demo-5', date: d(3), endDate: d(3), title: 'Course', startTime: '18:00', endTime: '19:00', allDay: false, kind: 0, category: 4 },
      { id: 'demo-6', date: d(4), endDate: d(4), title: 'Muscu', startTime: '10:00', endTime: '11:00', allDay: false, kind: 0, category: 1 }
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

  private normalizeTime(value: string): string {
    return value.length === 5 ? `${value}:00` : value;
  }

  private loadEventDoneMap(): Record<string, boolean> {
    try {
      const raw = localStorage.getItem(EVENT_DONE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private persistEventDone(id: string, done: boolean): void {
    const map = this.loadEventDoneMap();
    map[id] = done;
    localStorage.setItem(EVENT_DONE_KEY, JSON.stringify(map));
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
