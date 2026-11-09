export type RepeatMode = 'once' | 'daily' | 'weekly' | 'monthly';

export interface ObjectiveItem {
  id: string;
  title: string;
  date: string;
  repeat: RepeatMode;
  done: boolean;
}

export interface HabitTask {
  id: string;
  title: string;
  date: string;
  repeat: RepeatMode;
  done: boolean;
}

export interface HabitRoom {
  id: string;
  name: string;
  tasks: HabitTask[];
}

export interface PlanningTask {
  id: string;
  title: string;
  done: boolean;
}

export const OBJECTIVES_KEY = 'freya.planning.objectives.v2';
export const ROOMS_KEY = 'freya.planning.habitRooms.v2';
export const TASKS_KEY = 'freya.planning.tasks.v1';

export const REPEAT_OPTIONS: Array<{ value: RepeatMode; label: string }> = [
  { value: 'once', label: '1 fois' },
  { value: 'daily', label: 'Au jour' },
  { value: 'weekly', label: 'À la semaine' },
  { value: 'monthly', label: 'Au mois' }
];

export function repeatLabel(repeat: RepeatMode): string {
  return REPEAT_OPTIONS.find((option) => option.value === repeat)?.label ?? '1 fois';
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isDueOn(date: string, repeat: RepeatMode, dayIso: string): boolean {
  if (!date || !dayIso) return false;
  if (dayIso < date) return false;
  if (repeat === 'once') return date === dayIso;
  if (repeat === 'daily') return true;

  const start = parseIso(date);
  const day = parseIso(dayIso);
  if (!start || !day) return false;

  if (repeat === 'weekly') return start.getDay() === day.getDay();
  if (repeat === 'monthly') return start.getDate() === day.getDate();
  return false;
}

export function loadObjectives(): ObjectiveItem[] {
  const today = toIsoDate(new Date());
  try {
    const raw = localStorage.getItem(OBJECTIVES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ObjectiveItem[];
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map((item) => ({
          ...item,
          date: item.date || today,
          repeat: item.repeat || 'once'
        }));
      }
    }
  } catch {
    /* ignore */
  }

  return [
    { id: 'obj-1', title: 'Courir 5 km', date: '2026-11-03', repeat: 'weekly', done: false },
    { id: 'obj-2', title: 'Lire 20 pages', date: today, repeat: 'daily', done: false },
    { id: 'obj-3', title: 'Réviser le budget', date: '2026-11-01', repeat: 'monthly', done: false }
  ];
}

export function saveObjectives(items: ObjectiveItem[]): void {
  localStorage.setItem(OBJECTIVES_KEY, JSON.stringify(items));
}

export function loadRooms(): HabitRoom[] {
  const today = toIsoDate(new Date());
  try {
    const raw = localStorage.getItem(ROOMS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as HabitRoom[];
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map((room) => ({
          ...room,
          tasks: (room.tasks ?? []).map((task) => ({
            ...task,
            date: task.date || today,
            repeat: task.repeat || 'daily'
          }))
        }));
      }
    }
  } catch {
    /* ignore */
  }

  return [
    {
      id: 'room-chambre',
      name: 'Chambre',
      tasks: [
        { id: 't1', title: 'Faire le lit', date: today, repeat: 'daily', done: false },
        { id: 't2', title: 'Ranger les vêtements', date: '2026-11-03', repeat: 'weekly', done: false }
      ]
    },
    {
      id: 'room-salon',
      name: 'Salon',
      tasks: [
        { id: 't3', title: 'Passer l’aspirateur', date: '2026-11-03', repeat: 'weekly', done: false },
        { id: 't4', title: 'Dépoussiérer', date: '2026-11-03', repeat: 'weekly', done: false }
      ]
    },
    {
      id: 'room-cuisine',
      name: 'Cuisine',
      tasks: [
        { id: 't5', title: 'Faire la vaisselle', date: today, repeat: 'daily', done: false },
        { id: 't6', title: 'Nettoyer le plan de travail', date: today, repeat: 'daily', done: false }
      ]
    }
  ];
}

export function saveRooms(rooms: HabitRoom[]): void {
  localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
}

export function loadTasks(): PlanningTask[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PlanningTask[];
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          id: item.id,
          title: item.title,
          done: !!item.done
        }));
      }
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function saveTasks(items: PlanningTask[]): void {
  localStorage.setItem(TASKS_KEY, JSON.stringify(items));
}

function parseIso(iso: string): Date | null {
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}
