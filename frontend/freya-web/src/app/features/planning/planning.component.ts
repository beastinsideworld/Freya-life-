import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CalendarEvent, EventsService } from '../../core/api/events.service';
import {
  HabitRoom,
  ObjectiveItem,
  PlanningTask,
  REPEAT_OPTIONS,
  RepeatMode,
  loadObjectives,
  loadRooms,
  loadTasks,
  repeatLabel,
  saveObjectives,
  saveRooms,
  saveTasks,
  toIsoDate
} from '../../core/planning-local';
import { createId } from '../../core/id';
import { FamilyService } from '../../core/family.service';
import { isFrenchHoliday } from '../../core/french-holidays';
import { DatePickerComponent } from '../../shared/date-picker/date-picker.component';
import { environment } from '../../../environments/environment';

interface MonthCell {
  day: number | null;
  iso: string | null;
  today: boolean;
  holiday: boolean;
  dots: string[];
}

type TabMode = 'semaine' | 'mois' | 'objectif' | 'habitude' | 'tache';

interface DayCol {
  date: string;
  label: string;
  short: string;
  isToday: boolean;
  isHoliday: boolean;
}

@Component({
  selector: 'app-planning',
  standalone: true,
  imports: [FormsModule, DatePickerComponent],
  templateUrl: './planning.component.html',
  styleUrl: './planning.component.scss'
})
export class PlanningComponent implements OnInit {
  readonly tab = signal<TabMode>('semaine');
  readonly events = signal<CalendarEvent[]>([]);
  readonly error = signal('');
  readonly showComposer = signal(false);
  readonly showObjectiveForm = signal(false);
  readonly showRoomForm = signal(false);
  readonly showHabitForm = signal(false);
  readonly showTaskForm = signal(false);
  readonly editingEvent = signal<CalendarEvent | null>(null);
  readonly editingObjective = signal<ObjectiveItem | null>(null);
  readonly editingHabit = signal<{ roomId: string; taskId: string } | null>(null);
  readonly roomToDelete = signal<HabitRoom | null>(null);
  readonly objectives = signal<ObjectiveItem[]>([]);
  readonly rooms = signal<HabitRoom[]>([]);
  readonly tasks = signal<PlanningTask[]>([]);
  readonly selectedRoomId = signal<string>('');
  readonly hours = Array.from({ length: 16 }, (_, i) => `${String(7 + i).padStart(2, '0')}:00`);
  readonly repeatOptions = REPEAT_OPTIONS;

  title = '';
  date = toIsoDate(new Date());
  endDate = toIsoDate(new Date());
  time = '18:00';
  endTime = '19:00';
  allDay = false;
  objectiveTitle = '';
  objectiveDate = toIsoDate(new Date());
  objectiveRepeat: RepeatMode = 'once';
  newRoomName = '';
  newTaskTitle = '';
  newTaskDate = toIsoDate(new Date());
  newTaskRepeat: RepeatMode = 'daily';
  planningTaskTitle = '';
  editEventTitle = '';
  editEventDate = toIsoDate(new Date());
  editEventEndDate = toIsoDate(new Date());
  editEventTime = '18:00';
  editEventEndTime = '19:00';
  editEventAllDay = false;
  editObjectiveTitle = '';
  editObjectiveDate = toIsoDate(new Date());
  editObjectiveRepeat: RepeatMode = 'once';
  editHabitTitle = '';
  editHabitDate = toIsoDate(new Date());
  editHabitRepeat: RepeatMode = 'daily';

  readonly weekStart = signal(this.startOfWeek(new Date()));
  readonly days = signal<DayCol[]>(this.buildDays(this.weekStart()));
  readonly monthCursor = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  readonly monthEvents = signal<CalendarEvent[]>([]);
  readonly monthCells = computed(() => this.buildMonth(this.monthCursor(), this.monthEvents()));
  readonly selectedRoom = computed(
    () => this.rooms().find((room) => room.id === this.selectedRoomId()) ?? this.rooms()[0] ?? null
  );

  constructor(
    private readonly eventsApi: EventsService,
    private readonly families: FamilyService
  ) {}

  ngOnInit(): void {
    this.objectives.set(loadObjectives());
    this.rooms.set(loadRooms());
    this.tasks.set(loadTasks());
    const firstRoom = this.rooms()[0];
    if (firstRoom) this.selectedRoomId.set(firstRoom.id);
    this.reload();
    this.reloadMonth();
    this.syncPlanning();
  }

  setTab(mode: TabMode): void {
    this.tab.set(mode);
    this.showComposer.set(false);
    this.showObjectiveForm.set(false);
    this.showRoomForm.set(false);
    this.showHabitForm.set(false);
    this.showTaskForm.set(false);
    this.closeAllEditors();
    if (mode === 'mois') this.reloadMonth();
    if (mode === 'semaine') this.reload();
  }

  closeAllEditors(): void {
    this.editingEvent.set(null);
    this.editingObjective.set(null);
    this.editingHabit.set(null);
  }

  toggleComposer(): void {
    this.showComposer.update((v) => !v);
  }

  toggleAllDay(): void {
    this.allDay = !this.allDay;
  }

  toggleEditAllDay(): void {
    this.editEventAllDay = !this.editEventAllDay;
  }

  toggleObjectiveForm(): void {
    this.showObjectiveForm.update((v) => !v);
  }

  toggleRoomForm(): void {
    this.showRoomForm.update((v) => !v);
  }

  toggleHabitForm(): void {
    this.showHabitForm.update((v) => !v);
  }

  addEvent(): void {
    this.error.set('');
    if (!this.title.trim() || !this.date || !this.endDate) {
      this.error.set('Indique un nom, une date de début et de fin.');
      return;
    }
    if (this.endDate < this.date) {
      this.error.set('La date de fin doit être après la date de début.');
      return;
    }
    if (!this.allDay && (!this.time || !this.endTime)) {
      this.error.set('Indique une heure de début et de fin.');
      return;
    }
    if (!this.allDay && this.endDate === this.date && this.endTime < this.time) {
      this.error.set('L’heure de fin doit être après l’heure de début.');
      return;
    }

    const payload = {
      title: this.title.trim(),
      date: this.date,
      endDate: this.endDate,
      startTime: this.allDay ? null : this.normalizeTime(this.time),
      endTime: this.allDay ? null : this.normalizeTime(this.endTime),
      allDay: this.allDay,
      kind: 0,
      category: 0
    };

    this.eventsApi.create(payload).subscribe({
      next: () => {
        this.resetComposer();
        this.reload();
      },
      error: () => {
        const local: CalendarEvent = {
          id: createId(),
          title: payload.title,
          date: payload.date,
          endDate: payload.endDate,
          startTime: payload.allDay ? '00:00:00' : (payload.startTime ?? '09:00:00'),
          endTime: payload.allDay ? '23:59:00' : (payload.endTime ?? '10:00:00'),
          allDay: payload.allDay,
          kind: 0,
          category: 0
        };
        this.events.update((list) => [...list, local]);
        this.resetComposer();
      }
    });
  }

  private resetComposer(): void {
    const today = toIsoDate(new Date());
    this.title = '';
    this.date = today;
    this.endDate = today;
    this.time = '18:00';
    this.endTime = '19:00';
    this.allDay = false;
    this.showComposer.set(false);
  }

  private normalizeTime(value: string): string {
    return value.length === 5 ? `${value}:00` : value;
  }

  addObjective(): void {
    const title = this.objectiveTitle.trim();
    if (!title || !this.objectiveDate) return;

    this.objectives.update((list) => [
      {
        id: createId(),
        title,
        date: this.objectiveDate,
        repeat: this.objectiveRepeat,
        done: false
      },
      ...list
    ]);
    this.persistObjectives();
    this.objectiveTitle = '';
    this.objectiveDate = toIsoDate(new Date());
    this.objectiveRepeat = 'once';
    this.showObjectiveForm.set(false);
  }

  toggleObjective(id: string): void {
    this.objectives.update((list) =>
      list.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
    this.persistObjectives();
  }

  removeObjective(id: string): void {
    this.objectives.update((list) => list.filter((item) => item.id !== id));
    this.persistObjectives();
  }

  openEventEditor(event: CalendarEvent, ev?: Event): void {
    ev?.stopPropagation();
    this.closeAllEditors();
    this.editingEvent.set(event);
    this.editEventTitle = event.title;
    this.editEventDate = event.date;
    this.editEventEndDate = event.endDate || event.date;
    this.editEventTime = String(event.startTime).slice(0, 5);
    this.editEventEndTime = String(event.endTime || event.startTime).slice(0, 5);
    this.editEventAllDay = !!event.allDay || this.editEventTime === '00:00';
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
      kind: typeof current.kind === 'number' ? current.kind : 0,
      category: typeof current.category === 'number' ? current.category : 0
    };

    this.eventsApi.update(current.id, payload).subscribe({
      next: (updated) => {
        this.events.update((list) => list.map((item) => (item.id === current.id ? { ...item, ...updated } : item)));
        this.editingEvent.set(null);
      },
      error: () => {
        this.events.update((list) =>
          list.map((item) =>
            item.id === current.id
              ? {
                  ...item,
                  title: payload.title,
                  date: payload.date,
                  endDate: payload.endDate,
                  startTime: payload.allDay ? '00:00:00' : (payload.startTime ?? item.startTime),
                  endTime: payload.allDay ? '23:59:00' : (payload.endTime ?? item.endTime),
                  allDay: payload.allDay
                }
              : item
          )
        );
        this.editingEvent.set(null);
      }
    });
  }

  deleteEvent(): void {
    const current = this.editingEvent();
    if (!current) return;
    const removeLocal = () => {
      this.events.update((list) => list.filter((item) => item.id !== current.id));
      this.editingEvent.set(null);
    };
    this.eventsApi.remove(current.id).subscribe({
      next: () => removeLocal(),
      error: () => removeLocal()
    });
  }

  openObjectiveEditor(item: ObjectiveItem, ev?: Event): void {
    ev?.stopPropagation();
    this.closeAllEditors();
    this.editingObjective.set(item);
    this.editObjectiveTitle = item.title;
    this.editObjectiveDate = item.date;
    this.editObjectiveRepeat = item.repeat;
  }

  saveObjectiveEdit(): void {
    const current = this.editingObjective();
    const title = this.editObjectiveTitle.trim();
    if (!current || !title || !this.editObjectiveDate) return;

    this.objectives.update((list) =>
      list.map((item) =>
        item.id === current.id
          ? {
              ...item,
              title,
              date: this.editObjectiveDate,
              repeat: this.editObjectiveRepeat
            }
          : item
      )
    );
    this.persistObjectives();
    this.editingObjective.set(null);
  }

  deleteObjective(): void {
    const current = this.editingObjective();
    if (!current) return;
    this.objectives.update((list) => list.filter((item) => item.id !== current.id));
    this.persistObjectives();
    this.editingObjective.set(null);
  }

  toggleTaskForm(): void {
    this.showTaskForm.update((v) => !v);
  }

  addPlanningTask(): void {
    const title = this.planningTaskTitle.trim();
    if (!title) return;
    this.tasks.update((list) => [
      { id: createId(), title, done: false },
      ...list
    ]);
    this.persistTasks();
    this.planningTaskTitle = '';
    this.showTaskForm.set(false);
  }

  togglePlanningTask(id: string): void {
    this.tasks.update((list) =>
      list.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
    this.persistTasks();
  }

  deletePlanningTask(id: string): void {
    this.tasks.update((list) => list.filter((item) => item.id !== id));
    this.persistTasks();
  }

  openHabitEditor(roomId: string, taskId: string, ev?: Event): void {
    ev?.stopPropagation();
    const room = this.rooms().find((r) => r.id === roomId);
    const task = room?.tasks.find((t) => t.id === taskId);
    if (!task) return;
    this.closeAllEditors();
    this.editingHabit.set({ roomId, taskId });
    this.editHabitTitle = task.title;
    this.editHabitDate = task.date;
    this.editHabitRepeat = task.repeat;
  }

  saveHabitEdit(): void {
    const current = this.editingHabit();
    const title = this.editHabitTitle.trim();
    if (!current || !title || !this.editHabitDate) return;

    this.rooms.update((list) =>
      list.map((room) =>
        room.id === current.roomId
          ? {
              ...room,
              tasks: room.tasks.map((task) =>
                task.id === current.taskId
                  ? {
                      ...task,
                      title,
                      date: this.editHabitDate,
                      repeat: this.editHabitRepeat
                    }
                  : task
              )
            }
          : room
      )
    );
    this.persistRooms();
    this.editingHabit.set(null);
  }

  labelForRepeat(repeat: RepeatMode): string {
    return repeatLabel(repeat);
  }

  selectRoom(id: string): void {
    this.selectedRoomId.set(id);
    this.newTaskTitle = '';
    this.newTaskDate = toIsoDate(new Date());
    this.newTaskRepeat = 'daily';
    this.showHabitForm.set(false);
  }

  addRoom(): void {
    const name = this.newRoomName.trim();
    if (!name) return;
    const room: HabitRoom = {
      id: createId(),
      name,
      tasks: []
    };
    this.rooms.update((list) => [...list, room]);
    this.selectedRoomId.set(room.id);
    this.persistRooms();
    this.newRoomName = '';
    this.showRoomForm.set(false);
  }

  askRemoveRoom(roomId: string): void {
    const room = this.rooms().find((item) => item.id === roomId) ?? null;
    this.roomToDelete.set(room);
  }

  cancelRemoveRoom(): void {
    this.roomToDelete.set(null);
  }

  confirmRemoveRoom(): void {
    const room = this.roomToDelete();
    if (!room) return;
    const next = this.rooms().filter((item) => item.id !== room.id);
    this.rooms.set(next);
    this.persistRooms();
    if (this.selectedRoomId() === room.id) {
      this.selectedRoomId.set(next[0]?.id ?? '');
      this.showHabitForm.set(false);
    }
    this.roomToDelete.set(null);
  }

  addHabitTask(): void {
    const roomId = this.selectedRoom()?.id;
    const title = this.newTaskTitle.trim();
    if (!roomId || !title || !this.newTaskDate) return;

    this.rooms.update((list) =>
      list.map((room) =>
        room.id === roomId
          ? {
              ...room,
              tasks: [
                ...room.tasks,
                {
                  id: createId(),
                  title,
                  date: this.newTaskDate,
                  repeat: this.newTaskRepeat,
                  done: false
                }
              ]
            }
          : room
      )
    );
    this.persistRooms();
    this.newTaskTitle = '';
    this.newTaskDate = toIsoDate(new Date());
    this.newTaskRepeat = 'daily';
    this.showHabitForm.set(false);
  }

  toggleHabitTask(roomId: string, taskId: string): void {
    this.rooms.update((list) =>
      list.map((room) =>
        room.id === roomId
          ? {
              ...room,
              tasks: room.tasks.map((task) =>
                task.id === taskId ? { ...task, done: !task.done } : task
              )
            }
          : room
      )
    );
    this.persistRooms();
  }

  removeHabitTask(roomId: string, taskId: string): void {
    this.rooms.update((list) =>
      list.map((room) =>
        room.id === roomId
          ? { ...room, tasks: room.tasks.filter((task) => task.id !== taskId) }
          : room
      )
    );
    this.persistRooms();
  }

  blocksFor(date: string): Array<CalendarEvent & { top: number; height: number; tone: string }> {
    const source = this.events().length ? this.events() : this.fallbackEvents();
    return source
      .filter((e) => this.occursOn(e, date))
      .map((e) => {
        const { start, end } = this.blockRange(e, date);
        return {
          ...e,
          top: Math.max(0, start) * 28,
          height: Math.max(0.55, end - start) * 28,
          tone: this.toneFor(e)
        };
      });
  }

  private occursOn(event: CalendarEvent, date: string): boolean {
    const end = event.endDate || event.date;
    return event.date <= date && end >= date;
  }

  private blockRange(event: CalendarEvent, date: string): { start: number; end: number } {
    const endDate = event.endDate || event.date;
    const multiDay = endDate !== event.date;
    if (event.allDay) {
      return { start: 0, end: 16 };
    }
    if (!multiDay) {
      const start = this.hourOffset(event.startTime);
      const end = event.endTime ? this.hourOffset(event.endTime) : start + 0.75;
      return { start, end };
    }
    if (date === event.date) {
      return { start: this.hourOffset(event.startTime), end: 16 };
    }
    if (date === endDate) {
      return { start: 0, end: event.endTime ? this.hourOffset(event.endTime) : 16 };
    }
    return { start: 0, end: 16 };
  }

  shiftWeek(delta: number): void {
    const next = this.addDays(this.weekStart(), delta * 7);
    this.weekStart.set(next);
    this.days.set(this.buildDays(next));
    this.reload();
  }

  shiftMonth(delta: number): void {
    const current = this.monthCursor();
    const next = new Date(current.getFullYear(), current.getMonth() + delta, 1);
    this.monthCursor.set(next);
    this.reloadMonth();
  }

  weekLabel(): string {
    const start = this.weekStart();
    const end = this.addDays(start, 6);
    return `Semaine du ${start.getDate()} au ${end.getDate()} ${this.monthName(end)} ${end.getFullYear()}`;
  }

  monthNameNow(): string {
    const cursor = this.monthCursor();
    return `${this.monthName(cursor)} ${cursor.getFullYear()}`;
  }

  private reload(): void {
    const start = this.weekStart();
    const from = toIsoDate(start);
    const to = toIsoDate(this.addDays(start, 6));
    this.eventsApi.list(from, to).subscribe({
      next: (items) => this.events.set(items.length ? items : this.fallbackEvents()),
      error: () => this.events.set(this.fallbackEvents())
    });
  }

  private reloadMonth(): void {
    const cursor = this.monthCursor();
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const from = toIsoDate(this.addDays(first, -offset));
    const last = new Date(year, month + 1, 0);
    const endPad = 6 - ((last.getDay() + 6) % 7);
    const to = toIsoDate(this.addDays(last, endPad));
    this.eventsApi.list(from, to).subscribe({
      next: (items) => this.monthEvents.set(items.length ? items : this.fallbackMonthEvents(from, to)),
      error: () => this.monthEvents.set(this.fallbackMonthEvents(from, to))
    });
  }

  private fallbackEvents(): CalendarEvent[] {
    return environment.useDemoData ? this.demoEvents() : [];
  }

  private fallbackMonthEvents(from: string, to: string): CalendarEvent[] {
    return environment.useDemoData ? this.demoMonthEvents(from, to) : [];
  }

  private demoEvents(): CalendarEvent[] {
    const days = this.days();
    return [
      { id: '1', title: 'Muscu', date: days[0].date, startTime: '07:00:00', endTime: '08:15:00', kind: 0, category: 1 },
      { id: '2', title: 'Repas', date: days[0].date, startTime: '12:00:00', endTime: '12:45:00', kind: 0, category: 3 },
      { id: '3', title: 'Course', date: days[0].date, startTime: '18:00:00', endTime: '18:45:00', kind: 0, category: 4 },
      { id: '4', title: 'BDE', date: days[0].date, startTime: '19:30:00', endTime: '21:00:00', kind: 0, category: 6 },
      { id: '5', title: 'Projets', date: days[0].date, startTime: '20:30:00', endTime: '22:00:00', kind: 0, category: 5 },
      { id: '6', title: 'Repas', date: days[1].date, startTime: '12:00:00', endTime: '12:45:00', kind: 0, category: 3 },
      { id: '7', title: 'Travail', date: days[2].date, startTime: '08:30:00', endTime: '12:00:00', kind: 0, category: 2 },
      { id: '8', title: 'Repas', date: days[2].date, startTime: '12:00:00', endTime: '12:45:00', kind: 0, category: 3 },
      { id: '9', title: 'Travail', date: days[2].date, startTime: '13:00:00', endTime: '17:30:00', kind: 0, category: 2 },
      { id: '10', title: 'Muscu', date: days[3].date, startTime: '07:00:00', endTime: '08:15:00', kind: 0, category: 1 },
      { id: '11', title: 'Repas', date: days[3].date, startTime: '12:00:00', endTime: '12:45:00', kind: 0, category: 3 },
      { id: '12', title: 'Travail', date: days[3].date, startTime: '13:00:00', endTime: '17:30:00', kind: 0, category: 2 },
      { id: '13', title: 'Course', date: days[3].date, startTime: '18:00:00', endTime: '18:45:00', kind: 0, category: 4 },
      { id: '14', title: 'Dîner', date: days[3].date, startTime: '19:30:00', endTime: '20:00:00', kind: 0, category: 3 },
      { id: '15', title: 'Projets', date: days[3].date, startTime: '20:30:00', endTime: '22:00:00', kind: 0, category: 5 },
      { id: '16', title: 'Muscu', date: days[4].date, startTime: '10:00:00', endTime: '11:15:00', kind: 0, category: 1 },
      { id: '17', title: 'Repas', date: days[4].date, startTime: '12:00:00', endTime: '12:45:00', kind: 0, category: 3 },
      { id: '18', title: 'Dîner', date: days[4].date, startTime: '19:30:00', endTime: '20:15:00', kind: 0, category: 3 }
    ];
  }

  private toneFor(event: CalendarEvent): string {
    const cat = typeof event.category === 'number' ? event.category : Number(event.category);
    switch (cat) {
      case 1:
        return 'sport';
      case 2:
        return 'work';
      case 3:
        return 'meal';
      case 4:
        return 'run';
      case 5:
        return 'project';
      case 6:
        return 'social';
      default:
        break;
    }
    const t = event.title.toLowerCase();
    if (t.includes('muscu') || t.includes('sport')) return 'sport';
    if (t.includes('travail')) return 'work';
    if (t.includes('repas') || t.includes('dîner') || t.includes('diner')) return 'meal';
    if (t.includes('course')) return 'run';
    if (t.includes('projet')) return 'project';
    if (t.includes('bde')) return 'social';
    return 'other';
  }

  private buildDays(start: Date): DayCol[] {
    const labels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const today = toIsoDate(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = this.addDays(start, i);
      const iso = toIsoDate(d);
      return {
        date: iso,
        label: `${labels[i]} ${d.getDate()}`,
        short: labels[i],
        isToday: iso === today,
        isHoliday: isFrenchHoliday(iso)
      };
    });
  }

  private buildMonth(ref: Date, source: CalendarEvent[]): MonthCell[] {
    const year = ref.getFullYear();
    const month = ref.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = toIsoDate(new Date());
    const events = source.length ? source : this.fallbackEvents();
    const cells: MonthCell[] = [];

    for (let i = 0; i < offset; i++) {
      cells.push({ day: null, iso: null, today: false, holiday: false, dots: [] });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = toIsoDate(new Date(year, month, day));
      const tones = events
        .filter((event) => this.occursOn(event, iso))
        .map((event) => this.toneFor(event));
      const dots = [...new Set(tones)].slice(0, 4);
      cells.push({
        day,
        iso,
        today: iso === today,
        holiday: isFrenchHoliday(iso),
        dots
      });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ day: null, iso: null, today: false, holiday: false, dots: [] });
    }
    return cells;
  }

  private demoMonthEvents(from: string, to: string): CalendarEvent[] {
    const weekDemo = this.demoEvents();
    return weekDemo.filter((event) => event.date >= from && event.date <= to);
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

  private monthName(date: Date): string {
    return date.toLocaleDateString('fr-FR', { month: 'long' });
  }

  private persistObjectives(): void {
    saveObjectives(this.objectives());
    this.syncPlanning();
  }

  private persistTasks(): void {
    saveTasks(this.tasks());
    this.syncPlanning();
  }

  private persistRooms(): void {
    saveRooms(this.rooms());
    this.syncPlanning();
  }

  private syncPlanning(): void {
    this.families.syncPlanningSnapshot().subscribe({ error: () => undefined });
  }
}
