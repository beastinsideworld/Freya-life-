import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CalendarEvent, EventsService } from '../../core/api/events.service';
import {
  HabitRoom,
  ObjectiveItem,
  REPEAT_OPTIONS,
  RepeatMode,
  loadObjectives,
  loadRooms,
  repeatLabel,
  saveObjectives,
  saveRooms,
  toIsoDate
} from '../../core/planning-local';
import { createId } from '../../core/id';
import { DatePickerComponent } from '../../shared/date-picker/date-picker.component';

type TabMode = 'semaine' | 'mois' | 'objectif' | 'habitude';

interface DayCol {
  date: string;
  label: string;
  short: string;
  isToday: boolean;
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
  readonly editingEvent = signal<CalendarEvent | null>(null);
  readonly editingObjective = signal<ObjectiveItem | null>(null);
  readonly editingHabit = signal<{ roomId: string; taskId: string } | null>(null);
  readonly objectives = signal<ObjectiveItem[]>([]);
  readonly rooms = signal<HabitRoom[]>([]);
  readonly selectedRoomId = signal<string>('');
  readonly hours = Array.from({ length: 16 }, (_, i) => `${String(7 + i).padStart(2, '0')}:00`);
  readonly repeatOptions = REPEAT_OPTIONS;

  title = '';
  date = toIsoDate(new Date());
  time = '18:00';
  objectiveTitle = '';
  objectiveDate = toIsoDate(new Date());
  objectiveRepeat: RepeatMode = 'once';
  newRoomName = '';
  newTaskTitle = '';
  newTaskDate = toIsoDate(new Date());
  newTaskRepeat: RepeatMode = 'daily';
  editEventTitle = '';
  editEventDate = toIsoDate(new Date());
  editEventTime = '18:00';
  editObjectiveTitle = '';
  editObjectiveDate = toIsoDate(new Date());
  editObjectiveRepeat: RepeatMode = 'once';
  editHabitTitle = '';
  editHabitDate = toIsoDate(new Date());
  editHabitRepeat: RepeatMode = 'daily';

  readonly weekStart = this.startOfWeek(new Date());
  readonly days = signal<DayCol[]>(this.buildDays(this.weekStart));
  readonly monthCells = computed(() => this.buildMonth(new Date()));
  readonly selectedRoom = computed(
    () => this.rooms().find((room) => room.id === this.selectedRoomId()) ?? this.rooms()[0] ?? null
  );

  constructor(private readonly eventsApi: EventsService) {}

  ngOnInit(): void {
    this.objectives.set(loadObjectives());
    this.rooms.set(loadRooms());
    const firstRoom = this.rooms()[0];
    if (firstRoom) this.selectedRoomId.set(firstRoom.id);
    this.reload();
  }

  setTab(mode: TabMode): void {
    this.tab.set(mode);
    this.showComposer.set(false);
    this.showObjectiveForm.set(false);
    this.showRoomForm.set(false);
    this.showHabitForm.set(false);
    this.closeAllEditors();
  }

  closeAllEditors(): void {
    this.editingEvent.set(null);
    this.editingObjective.set(null);
    this.editingHabit.set(null);
  }

  toggleComposer(): void {
    this.showComposer.update((v) => !v);
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
    if (!this.title.trim() || !this.date || !this.time) {
      this.error.set('Indique un nom, une date et une heure.');
      return;
    }

    this.eventsApi
      .create({
        title: this.title.trim(),
        date: this.date,
        startTime: this.time.length === 5 ? `${this.time}:00` : this.time,
        kind: 0,
        category: 0
      })
      .subscribe({
        next: () => {
          this.title = '';
          this.showComposer.set(false);
          this.reload();
        },
        error: () => {
          const local: CalendarEvent = {
            id: createId(),
            title: this.title.trim(),
            date: this.date,
            startTime: this.time.length === 5 ? `${this.time}:00` : this.time,
            endTime: null,
            kind: 0,
            category: 0
          };
          this.events.update((list) => [...list, local]);
          this.title = '';
          this.showComposer.set(false);
        }
      });
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
    saveObjectives(this.objectives());
    this.objectiveTitle = '';
    this.objectiveDate = toIsoDate(new Date());
    this.objectiveRepeat = 'once';
    this.showObjectiveForm.set(false);
  }

  toggleObjective(id: string): void {
    this.objectives.update((list) =>
      list.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
    saveObjectives(this.objectives());
  }

  removeObjective(id: string): void {
    this.objectives.update((list) => list.filter((item) => item.id !== id));
    saveObjectives(this.objectives());
  }

  openEventEditor(event: CalendarEvent, ev?: Event): void {
    ev?.stopPropagation();
    this.closeAllEditors();
    this.editingEvent.set(event);
    this.editEventTitle = event.title;
    this.editEventDate = event.date;
    this.editEventTime = String(event.startTime).slice(0, 5);
  }

  saveEventEdit(): void {
    const current = this.editingEvent();
    if (!current) return;
    const title = this.editEventTitle.trim();
    if (!title || !this.editEventDate || !this.editEventTime) return;

    const payload = {
      title,
      date: this.editEventDate,
      startTime: this.editEventTime.length === 5 ? `${this.editEventTime}:00` : this.editEventTime,
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
                  startTime: payload.startTime
                }
              : item
          )
        );
        this.editingEvent.set(null);
      }
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
    saveObjectives(this.objectives());
    this.editingObjective.set(null);
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
    saveRooms(this.rooms());
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
    saveRooms(this.rooms());
    this.newRoomName = '';
    this.showRoomForm.set(false);
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
    saveRooms(this.rooms());
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
    saveRooms(this.rooms());
  }

  removeHabitTask(roomId: string, taskId: string): void {
    this.rooms.update((list) =>
      list.map((room) =>
        room.id === roomId
          ? { ...room, tasks: room.tasks.filter((task) => task.id !== taskId) }
          : room
      )
    );
    saveRooms(this.rooms());
  }

  blocksFor(date: string): Array<CalendarEvent & { top: number; height: number; tone: string }> {
    const source = this.events().length ? this.events() : this.demoEvents();
    return source
      .filter((e) => e.date === date)
      .map((e) => {
        const start = this.hourOffset(e.startTime);
        const end = e.endTime ? this.hourOffset(e.endTime) : start + 0.75;
        return {
          ...e,
          top: Math.max(0, start) * 28,
          height: Math.max(0.55, end - start) * 28,
          tone: this.toneFor(e.title)
        };
      });
  }

  weekLabel(): string {
    const end = this.addDays(this.weekStart, 6);
    return `Semaine du ${this.weekStart.getDate()} au ${end.getDate()} ${this.monthName(end)} ${end.getFullYear()}`;
  }

  monthNameNow(): string {
    const now = new Date();
    return `${this.monthName(now)} ${now.getFullYear()}`;
  }

  private reload(): void {
    const from = toIsoDate(this.weekStart);
    const to = toIsoDate(this.addDays(this.weekStart, 6));
    this.eventsApi.list(from, to).subscribe({
      next: (items) => this.events.set(items.length ? items : this.demoEvents()),
      error: () => this.events.set(this.demoEvents())
    });
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

  private toneFor(title: string): string {
    const t = title.toLowerCase();
    if (t.includes('muscu')) return 'sport';
    if (t.includes('travail')) return 'work';
    if (t.includes('repas') || t.includes('dîner') || t.includes('diner')) return 'meal';
    if (t.includes('course')) return 'run';
    if (t.includes('projet')) return 'project';
    if (t.includes('bde')) return 'social';
    return 'sport';
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
    const today = toIsoDate(new Date());
    const eventDates = new Set((this.events().length ? this.events() : this.demoEvents()).map((e) => e.date));
    const cells: Array<{ day: number | null; iso: string | null; has: boolean; today: boolean }> = [];

    for (let i = 0; i < offset; i++) cells.push({ day: null, iso: null, has: false, today: false });
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = toIsoDate(new Date(year, month, day));
      cells.push({ day, iso, has: eventDates.has(iso), today: iso === today });
    }
    while (cells.length % 7 !== 0) cells.push({ day: null, iso: null, has: false, today: false });
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

  private monthName(date: Date): string {
    return date.toLocaleDateString('fr-FR', { month: 'long' });
  }
}
