import { Injectable, computed, signal } from '@angular/core';
import { createId } from './id';

export type PetSex = 'F' | 'M';
export type ExpenseCategory = 'Alimentation' | 'Vétérinaire' | 'Toilettage' | 'Soins / Traitements' | 'Autres';

export interface PetReminders {
  treatments: boolean;
  vaccines: boolean;
  vermifuge: boolean;
  weight: boolean;
}

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
  foodBrand: string | null;
  mealsPerDay: number;
  mealGrams: number;
  weightKg: number;
  weightDeltaKg: number;
  notes: string | null;
  reminders: PetReminders;
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

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function demoState(): PetsState {
  const isisId = createId();
  const freyaId = createId();
  const y = new Date().getFullYear();
  const m = String(new Date().getMonth() + 1).padStart(2, '0');
  const today = todayIso();

  return {
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
        foodBrand: 'Pro Plan Medium Adult',
        mealsPerDay: 2,
        mealGrams: 160,
        weightKg: 25,
        weightDeltaKg: -0.2,
        notes: null,
        reminders: { ...DEFAULT_REMINDERS }
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
        foodBrand: 'Croquettes chat adult',
        mealsPerDay: 2,
        mealGrams: 40,
        weightKg: 3.8,
        weightDeltaKg: 0.1,
        notes: null,
        reminders: { ...DEFAULT_REMINDERS }
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
}

function loadState(): PetsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = demoState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as PetsState;
    if (!parsed.pets?.length) {
      const seeded = demoState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return {
      pets: parsed.pets ?? [],
      tasks: parsed.tasks ?? [],
      expenses: parsed.expenses ?? [],
      appointments: parsed.appointments ?? [],
      monthlyBudget: Number(parsed.monthlyBudget || 400)
    };
  } catch {
    return demoState();
  }
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
    this.patch((s) => {
      const exists = s.pets.some((p) => p.id === pet.id);
      return {
        ...s,
        pets: exists ? s.pets.map((p) => (p.id === pet.id ? pet : p)) : [...s.pets, pet]
      };
    });
  }

  removePet(id: string): void {
    this.patch((s) => ({
      ...s,
      pets: s.pets.filter((p) => p.id !== id),
      tasks: s.tasks.filter((t) => t.petId !== id),
      expenses: s.expenses.filter((e) => e.petId !== id),
      appointments: s.appointments.filter((a) => a.petId !== id)
    }));
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
  Alimentation: { icon: '🥣', color: '#c44d5f' },
  Vétérinaire: { icon: '🩺', color: '#8f3d4a' },
  Toilettage: { icon: '✂', color: '#b87333' },
  'Soins / Traitements': { icon: '💊', color: '#6b8f71' },
  Autres: { icon: '📦', color: '#5c6bc0' }
};
