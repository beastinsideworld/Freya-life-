import { Injectable, computed, signal } from '@angular/core';
import { createId } from './id';
import { environment } from '../../environments/environment';

export type PetSex = 'F' | 'M';
export type ExpenseCategory = 'Alimentation' | 'Vétérinaire' | 'Toilettage' | 'Soins / Traitements' | 'Autres';

export interface PetReminders {
  treatments: boolean;
  vaccines: boolean;
  vermifuge: boolean;
  weight: boolean;
}

export interface HeatCycle {
  id: string;
  startDate: string;
  endDate: string;
  durationDays: number;
}

export interface PetHeatTracking {
  enabled: boolean;
  /** Espacement approximatif entre deux chaleurs (jours). */
  intervalDays: number;
  cycles: HeatCycle[];
}

export const DEFAULT_HEAT_TRACKING: PetHeatTracking = {
  enabled: true,
  intervalDays: 180,
  cycles: []
};

export const HEAT_INTERVAL_PRESETS: Array<{ label: string; days: number }> = [
  { label: '1 mois', days: 30 },
  { label: '2 mois', days: 60 },
  { label: '3 mois', days: 90 },
  { label: '4 mois', days: 120 },
  { label: '6 mois', days: 180 },
  { label: '12 mois', days: 365 }
];

export interface Pet {
  id: string;
  name: string;
  sex: PetSex;
  species: string;
  breed: string;
  birthDate: string;
  photoEmoji: string;
  chip: string | null;
  insurance: boolean;
  insuranceName: string | null;
  vaccines: string | null;
  treatments: string | null;
  medicalHistory: string | null;
  foodBrand: string | null;
  mealsPerDay: number;
  mealGrams: number;
  mealSchedule: string | null;
  weightKg: number;
  weightDeltaKg: number;
  notes: string | null;
  reminders: PetReminders;
  heatTracking: PetHeatTracking;
}

export interface PetTask {
  id: string;
  petId: string;
  label: string;
  time: string | null;
  done: boolean;
  date: string;
}

export interface PetExpense {
  id: string;
  petId: string;
  label: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
}

export type AppointmentKind = 'manual' | 'heat';

export interface PetAppointment {
  id: string;
  petId: string;
  title: string;
  date: string;
  time: string | null;
  place: string | null;
  notes: string | null;
  done: boolean;
  icon: string;
  kind?: AppointmentKind;
  /** Fin prévue pour une chaleur (ISO). */
  endDate?: string | null;
}

export interface PetsState {
  pets: Pet[];
  tasks: PetTask[];
  expenses: PetExpense[];
  appointments: PetAppointment[];
  monthlyBudget: number;
}

const STORAGE_KEY = 'freya.pets.v1';

const DEFAULT_REMINDERS: PetReminders = {
  treatments: true,
  vaccines: true,
  vermifuge: true,
  weight: true
};

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function daysBetween(startIso: string, endIso: string): number {
  const a = new Date(`${startIso}T12:00:00`).getTime();
  const b = new Date(`${endIso}T12:00:00`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

function normalizeHeatTracking(raw: Partial<PetHeatTracking> | null | undefined): PetHeatTracking {
  const cycles = Array.isArray(raw?.cycles)
    ? raw!.cycles.map((c) => ({
        id: c.id || createId(),
        startDate: c.startDate,
        endDate: c.endDate,
        durationDays: c.durationDays || daysBetween(c.startDate, c.endDate)
      }))
    : [];
  return {
    enabled: raw?.enabled !== false,
    intervalDays: Math.max(7, Number(raw?.intervalDays || DEFAULT_HEAT_TRACKING.intervalDays)),
    cycles: cycles.sort((a, b) => b.startDate.localeCompare(a.startDate))
  };
}

function normalizePet(raw: Partial<Pet> & Pick<Pet, 'id' | 'name'>): Pet {
  return {
    id: raw.id,
    name: raw.name,
    sex: raw.sex === 'M' ? 'M' : 'F',
    species: raw.species || 'Animal',
    breed: raw.breed || '—',
    birthDate: raw.birthDate || todayIso(),
    photoEmoji: raw.photoEmoji || '🐾',
    chip: raw.chip ?? null,
    insurance: !!raw.insurance,
    insuranceName: raw.insuranceName ?? null,
    vaccines: raw.vaccines ?? null,
    treatments: raw.treatments ?? null,
    medicalHistory: raw.medicalHistory ?? null,
    foodBrand: raw.foodBrand ?? null,
    mealsPerDay: Number(raw.mealsPerDay || 0),
    mealGrams: Number(raw.mealGrams || 0),
    mealSchedule: raw.mealSchedule ?? null,
    weightKg: Number(raw.weightKg || 0),
    weightDeltaKg: Number(raw.weightDeltaKg || 0),
    notes: raw.notes ?? null,
    reminders: { ...DEFAULT_REMINDERS, ...(raw.reminders || {}) },
    heatTracking: normalizeHeatTracking(raw.heatTracking)
  };
}

export function predictHeatCycles(
  tracking: PetHeatTracking,
  count = 3
): Array<{ startDate: string; endDate: string; durationDays: number }> {
  if (!tracking.enabled || !tracking.cycles.length) return [];
  const last = [...tracking.cycles].sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
  const avgDuration = Math.round(
    tracking.cycles.reduce((s, c) => s + (c.durationDays || daysBetween(c.startDate, c.endDate)), 0) /
      tracking.cycles.length
  );
  const duration = Math.max(1, avgDuration || last.durationDays || 7);
  const interval = Math.max(7, tracking.intervalDays || 180);
  const out: Array<{ startDate: string; endDate: string; durationDays: number }> = [];
  let cursor = last.startDate;
  const today = todayIso();
  for (let i = 0; i < count + 6 && out.length < count; i++) {
    cursor = addDaysIso(cursor, interval);
    if (cursor < today) continue;
    out.push({
      startDate: cursor,
      endDate: addDaysIso(cursor, duration - 1),
      durationDays: duration
    });
  }
  return out;
}

function demoState(): PetsState {
  const isisId = createId();
  const freyaId = createId();
  const y = new Date().getFullYear();
  const m = String(new Date().getMonth() + 1).padStart(2, '0');
  const today = todayIso();

  const base: PetsState = {
    monthlyBudget: 400,
    pets: [
      {
        id: isisId,
        name: 'Isis',
        sex: 'F',
        species: 'Chien',
        breed: 'Berger Australien',
        birthDate: '2023-02-21',
        photoEmoji: '🐕',
        chip: '250269801234567',
        insurance: true,
        insuranceName: 'SantéVet',
        vaccines: 'CHPPi + Lepto à jour',
        treatments: 'Antiparasitaire mensuel',
        medicalHistory: null,
        foodBrand: 'Pro Plan Medium Adult',
        mealsPerDay: 2,
        mealGrams: 160,
        mealSchedule: 'matin et soir',
        weightKg: 25,
        weightDeltaKg: -0.2,
        notes: null,
        reminders: { ...DEFAULT_REMINDERS },
        heatTracking: {
          enabled: true,
          intervalDays: 180,
          cycles: [
            {
              id: createId(),
              startDate: `${y}-08-10`,
              endDate: `${y}-08-20`,
              durationDays: 11
            }
          ]
        }
      },
      {
        id: freyaId,
        name: 'Freya',
        sex: 'F',
        species: 'Chat',
        breed: 'Européen',
        birthDate: '2025-10-12',
        photoEmoji: '🐱',
        chip: null,
        insurance: false,
        insuranceName: null,
        vaccines: null,
        treatments: null,
        medicalHistory: null,
        foodBrand: 'Croquettes chat adult',
        mealsPerDay: 2,
        mealGrams: 40,
        mealSchedule: null,
        weightKg: 3.8,
        weightDeltaKg: 0.1,
        notes: null,
        reminders: { ...DEFAULT_REMINDERS },
        heatTracking: { ...DEFAULT_HEAT_TRACKING, intervalDays: 21, cycles: [] }
      }
    ],
    tasks: [
      {
        id: createId(),
        petId: isisId,
        label: 'Donner les croquettes – Isis',
        time: '08:00',
        done: false,
        date: today
      },
      {
        id: createId(),
        petId: isisId,
        label: 'Sortie / activité – Isis',
        time: '17:00',
        done: true,
        date: today
      },
      {
        id: createId(),
        petId: freyaId,
        label: 'Nettoyer la litière – Freya',
        time: null,
        done: false,
        date: today
      }
    ],
    expenses: [
      {
        id: createId(),
        petId: isisId,
        label: 'Croquettes (15 kg)',
        category: 'Alimentation',
        amount: 46.9,
        date: `${y}-${m}-04`
      },
      {
        id: createId(),
        petId: isisId,
        label: 'Consultation vétérinaire',
        category: 'Vétérinaire',
        amount: 120,
        date: `${y}-${m}-06`
      },
      {
        id: createId(),
        petId: isisId,
        label: 'Toilettage',
        category: 'Toilettage',
        amount: 40,
        date: `${y}-${m}-12`
      },
      {
        id: createId(),
        petId: freyaId,
        label: 'Antiparasitaire',
        category: 'Soins / Traitements',
        amount: 15.6,
        date: `${y}-${m}-14`
      },
      {
        id: createId(),
        petId: freyaId,
        label: 'Croquettes chat (3 kg)',
        category: 'Alimentation',
        amount: 19,
        date: `${y}-${m}-18`
      },
      {
        id: createId(),
        petId: isisId,
        label: 'Jouets',
        category: 'Autres',
        amount: 31,
        date: `${y}-${m}-22`
      }
    ],
    appointments: [
      {
        id: createId(),
        petId: isisId,
        title: 'Vaccin – Isis',
        date: `${y}-11-20`,
        time: '10:30',
        place: 'Chez le vétérinaire',
        notes: 'Rappel : vaccin annuel + contrôle général.',
        done: false,
        icon: '💉'
      },
      {
        id: createId(),
        petId: freyaId,
        title: 'Antiparasitaire – Freya',
        date: `${y}-11-30`,
        time: null,
        place: 'À administrer à la maison',
        notes: null,
        done: false,
        icon: '💊'
      },
      {
        id: createId(),
        petId: isisId,
        title: 'Toilettage – Isis',
        date: `${y}-12-12`,
        time: '14:00',
        place: 'Salon Canin',
        notes: null,
        done: false,
        icon: '✂'
      }
    ]
  };

  return {
    ...base,
    appointments: withSyncedHeatAppointments(base.pets, base.appointments)
  };
}

function emptyState(): PetsState {
  return { pets: [], tasks: [], expenses: [], appointments: [], monthlyBudget: 0 };
}

function loadState(): PetsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      if (!environment.useDemoData) return emptyState();
      const seeded = demoState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as PetsState;
    if (!parsed.pets?.length) {
      if (!environment.useDemoData) {
        return {
          pets: [],
          tasks: parsed.tasks ?? [],
          expenses: parsed.expenses ?? [],
          appointments: parsed.appointments ?? [],
          monthlyBudget: Number(parsed.monthlyBudget || 0)
        };
      }
      const seeded = demoState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const pets = (parsed.pets ?? []).map((p) => normalizePet(p));
    const appointments = withSyncedHeatAppointments(pets, parsed.appointments ?? []);
    return {
      pets,
      tasks: parsed.tasks ?? [],
      expenses: parsed.expenses ?? [],
      appointments,
      monthlyBudget: Number(parsed.monthlyBudget || 400)
    };
  } catch {
    return environment.useDemoData ? demoState() : emptyState();
  }
}

function buildHeatAppointments(pet: Pet): PetAppointment[] {
  if (pet.sex !== 'F' || !pet.heatTracking?.enabled) return [];
  return predictHeatCycles(pet.heatTracking, 3).map((cycle) => ({
    id: createId(),
    petId: pet.id,
    title: `Chaleurs probables – ${pet.name}`,
    date: cycle.startDate,
    endDate: cycle.endDate,
    time: null,
    place: null,
    notes: `Prévision basée sur un espacement de ${pet.heatTracking.intervalDays} jours (durée ~${cycle.durationDays} j).`,
    done: false,
    icon: '💗',
    kind: 'heat' as const
  }));
}

function withSyncedHeatAppointments(pets: Pet[], appointments: PetAppointment[]): PetAppointment[] {
  const kept = appointments.filter((a) => a.kind !== 'heat');
  const generated = pets.flatMap((p) => buildHeatAppointments(p));
  return [...kept, ...generated].sort((a, b) =>
    `${a.date}${a.time ?? ''}`.localeCompare(`${b.date}${b.time ?? ''}`)
  );
}

@Injectable({ providedIn: 'root' })
export class PetsStore {
  private readonly state = signal<PetsState>(loadState());

  readonly pets = computed(() => this.state().pets);
  readonly tasks = computed(() => this.state().tasks);
  readonly expenses = computed(() => this.state().expenses);
  readonly appointments = computed(() => this.state().appointments);
  readonly monthlyBudget = computed(() => this.state().monthlyBudget);

  petById(id: string | null | undefined): Pet | null {
    if (!id) return null;
    return this.state().pets.find((p) => p.id === id) ?? null;
  }

  ageLabel(pet: Pet): string {
    const birth = new Date(`${pet.birthDate}T12:00:00`);
    if (Number.isNaN(birth.getTime())) return '';
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years -= 1;
    if (years <= 0) {
      const months =
        (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
      return months <= 1 ? '1 mois' : `${Math.max(1, months)} mois`;
    }
    return years === 1 ? '1 an' : `${years} ans`;
  }

  birthLabel(pet: Pet): string {
    const d = new Date(`${pet.birthDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return pet.birthDate;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  upsertPet(pet: Pet): void {
    const normalized = normalizePet(pet);
    this.patch((s) => {
      const exists = s.pets.some((p) => p.id === normalized.id);
      const pets = exists
        ? s.pets.map((p) => (p.id === normalized.id ? normalized : p))
        : [...s.pets, normalized];
      return {
        ...s,
        pets,
        appointments: withSyncedHeatAppointments(pets, s.appointments)
      };
    });
  }

  setHeatInterval(petId: string, intervalDays: number): void {
    const pet = this.petById(petId);
    if (!pet) return;
    this.upsertPet({
      ...pet,
      heatTracking: {
        ...pet.heatTracking,
        enabled: true,
        intervalDays: Math.max(7, intervalDays)
      }
    });
  }

  addHeatCycle(petId: string, startDate: string, endDate: string): void {
    const pet = this.petById(petId);
    if (!pet || !startDate || !endDate || endDate < startDate) return;
    const cycle: HeatCycle = {
      id: createId(),
      startDate,
      endDate,
      durationDays: daysBetween(startDate, endDate)
    };
    this.upsertPet({
      ...pet,
      heatTracking: {
        ...pet.heatTracking,
        enabled: true,
        cycles: [cycle, ...pet.heatTracking.cycles]
      }
    });
  }

  removeHeatCycle(petId: string, cycleId: string): void {
    const pet = this.petById(petId);
    if (!pet) return;
    this.upsertPet({
      ...pet,
      heatTracking: {
        ...pet.heatTracking,
        cycles: pet.heatTracking.cycles.filter((c) => c.id !== cycleId)
      }
    });
  }

  removePet(id: string): void {
    this.patch((s) => {
      const pets = s.pets.filter((p) => p.id !== id);
      return {
        ...s,
        pets,
        tasks: s.tasks.filter((t) => t.petId !== id),
        expenses: s.expenses.filter((e) => e.petId !== id),
        appointments: withSyncedHeatAppointments(
          pets,
          s.appointments.filter((a) => a.petId !== id)
        )
      };
    });
  }

  toggleTask(id: string): void {
    this.patch((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    }));
  }

  removeTask(id: string): void {
    this.patch((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
  }

  addTask(task: Omit<PetTask, 'id'>): void {
    this.patch((s) => ({ ...s, tasks: [...s.tasks, { ...task, id: createId() }] }));
  }

  addExpense(expense: Omit<PetExpense, 'id'>): void {
    this.patch((s) => ({ ...s, expenses: [{ ...expense, id: createId() }, ...s.expenses] }));
  }

  removeExpense(id: string): void {
    this.patch((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== id) }));
  }

  addAppointment(appt: Omit<PetAppointment, 'id'>): void {
    this.patch((s) => ({
      ...s,
      appointments: [...s.appointments, { ...appt, id: createId() }]
    }));
  }

  updateAppointment(appt: PetAppointment): void {
    this.patch((s) => ({
      ...s,
      appointments: s.appointments.map((a) => (a.id === appt.id ? appt : a))
    }));
  }

  removeAppointment(id: string): void {
    this.patch((s) => ({
      ...s,
      appointments: s.appointments.filter((a) => a.id !== id)
    }));
  }

  setMonthlyBudget(value: number): void {
    this.patch((s) => ({ ...s, monthlyBudget: Math.max(0, value) }));
  }

  private patch(updater: (s: PetsState) => PetsState): void {
    const next = updater(this.state());
    this.state.set(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
}

export const EXPENSE_CATEGORY_META: Record<
  ExpenseCategory,
  { icon: string; color: string }
> = {
  Alimentation: { icon: '🥣', color: 'var(--chart-1)' },
  Vétérinaire: { icon: '🩺', color: 'var(--chart-3)' },
  Toilettage: { icon: '✂', color: 'var(--chart-2)' },
  'Soins / Traitements': { icon: '💊', color: 'var(--ok)' },
  Autres: { icon: '📦', color: 'var(--project)' }
};
