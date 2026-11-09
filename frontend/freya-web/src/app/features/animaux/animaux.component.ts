import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  EXPENSE_CATEGORY_META,
  ExpenseCategory,
  Pet,
  PetAppointment,
  PetExpense,
  PetsStore,
  PetSex
} from '../../core/pets.store';
import { createId } from '../../core/id';

type PetsTab = 'accueil' | 'animaux' | 'depenses' | 'rendezvous';
type ExpenseScope = 'mois' | 'annee' | 'animal';
type ApptFilter = 'avenir' | 'passes';
type DetailSection = 'identite' | 'sante' | 'alimentation' | 'poids' | 'notes' | null;

@Component({
  selector: 'app-animaux',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './animaux.component.html',
  styleUrl: './animaux.component.scss'
})
export class AnimauxComponent {
  readonly tab = signal<PetsTab>('accueil');
  readonly selectedPetId = signal<string | null>(null);
  readonly detailSection = signal<DetailSection>(null);
  readonly expenseScope = signal<ExpenseScope>('mois');
  readonly expenseYear = signal(new Date().getFullYear());
  readonly expenseMonth = signal(new Date().getMonth() + 1);
  readonly expensePetFilter = signal<string>('all');
  readonly apptFilter = signal<ApptFilter>('avenir');
  readonly selectedApptId = signal<string | null>(null);

  readonly petFormOpen = signal(false);
  readonly taskFormOpen = signal(false);
  readonly expenseFormOpen = signal(false);
  readonly apptFormOpen = signal(false);

  draftPetName = '';
  draftPetSex: PetSex = 'F';
  draftPetSpecies = 'Chien';
  draftPetBreed = '';
  draftPetBirth = '';
  draftPetEmoji = '🐾';

  draftTaskLabel = '';
  draftTaskPetId = '';
  draftTaskTime = '';

  draftExpenseLabel = '';
  draftExpenseAmount = '';
  draftExpenseCategory: ExpenseCategory = 'Alimentation';
  draftExpensePetId = '';
  draftExpenseDate = this.todayIso();

  draftApptTitle = '';
  draftApptPetId = '';
  draftApptDate = this.todayIso();
  draftApptTime = '';
  draftApptPlace = '';
  draftApptNotes = '';
  draftApptIcon = '📅';

  readonly categoryOptions = Object.keys(EXPENSE_CATEGORY_META) as ExpenseCategory[];
  readonly store = inject(PetsStore);

  readonly pets = this.store.pets;
  readonly monthlyBudget = this.store.monthlyBudget;

  readonly selectedPet = computed(() => this.store.petById(this.selectedPetId()));

  readonly todayTasks = computed(() => {
    const today = this.todayIso();
    return this.store.tasks().filter((t) => t.date === today);
  });

  readonly openTaskCount = computed(() => this.todayTasks().filter((t) => !t.done).length);

  readonly nextAppointment = computed(() => {
    const today = this.todayIso();
    return [...this.store.appointments()]
      .filter((a) => !a.done && a.date >= today)
      .sort((a, b) => `${a.date}${a.time ?? ''}`.localeCompare(`${b.date}${b.time ?? ''}`))[0] ?? null;
  });

  readonly monthExpenses = computed(() => {
    const y = this.expenseYear();
    const m = this.expenseMonth();
    return this.store.expenses().filter((e) => {
      const [ey, em] = e.date.split('-').map(Number);
      return ey === y && em === m;
    });
  });

  readonly yearExpenses = computed(() =>
    this.store.expenses().filter((e) => Number(e.date.slice(0, 4)) === this.expenseYear())
  );

  readonly scopedExpenses = computed(() => {
    if (this.expenseScope() === 'annee') return this.yearExpenses();
    if (this.expenseScope() === 'animal') {
      const petId = this.expensePetFilter();
      const list = this.monthExpenses();
      return petId === 'all' ? list : list.filter((e) => e.petId === petId);
    }
    return this.monthExpenses();
  });

  readonly monthExpenseTotal = computed(() =>
    this.monthExpenses().reduce((s, e) => s + Number(e.amount || 0), 0)
  );

  readonly scopedExpenseTotal = computed(() =>
    this.scopedExpenses().reduce((s, e) => s + Number(e.amount || 0), 0)
  );

  readonly expensePct = computed(() => {
    const budget = this.monthlyBudget() || 1;
    return Math.min(100, Math.round((this.monthExpenseTotal() / budget) * 100));
  });

  readonly expenseBreakdown = computed(() => {
    const map = new Map<ExpenseCategory, number>();
    for (const e of this.scopedExpenses()) {
      map.set(e.category, (map.get(e.category) || 0) + Number(e.amount || 0));
    }
    return (Object.keys(EXPENSE_CATEGORY_META) as ExpenseCategory[]).map((category) => ({
      category,
      amount: map.get(category) || 0,
      icon: EXPENSE_CATEGORY_META[category].icon,
      color: EXPENSE_CATEGORY_META[category].color
    }));
  });

  readonly donutGradient = computed(() => {
    const slices = this.expenseBreakdown().filter((s) => s.amount > 0);
    const total = this.scopedExpenseTotal() || 1;
    if (!slices.length) return 'conic-gradient(#3a1a22 0 100%)';
    let cursor = 0;
    const parts: string[] = [];
    for (const slice of slices) {
      const next = cursor + (slice.amount / total) * 100;
      parts.push(`${slice.color} ${cursor}% ${next}%`);
      cursor = next;
    }
    if (cursor < 100) parts.push(`#3a1a22 ${cursor}% 100%`);
    return `conic-gradient(${parts.join(', ')})`;
  });

  readonly expenseHistory = computed(() => {
    const points: Array<{ key: string; label: string; total: number }> = [];
    let y = this.expenseYear();
    let m = this.expenseMonth();
    for (let i = 0; i < 6; i++) {
      const date = new Date(y, m - 1, 1);
      const label = date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
      const total = this.store
        .expenses()
        .filter((e) => {
          const [ey, em] = e.date.split('-').map(Number);
          return ey === y && em === m;
        })
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      points.unshift({
        key: `${y}-${m}`,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        total
      });
      m -= 1;
      if (m < 1) {
        m = 12;
        y -= 1;
      }
    }
    return points;
  });

  readonly historyMax = computed(() => Math.max(500, ...this.expenseHistory().map((h) => h.total), 1));

  readonly monthLabel = computed(() => {
    const date = new Date(this.expenseYear(), this.expenseMonth() - 1, 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  });

  readonly upcomingAppointments = computed(() => {
    const today = this.todayIso();
    return [...this.store.appointments()]
      .filter((a) => !a.done && a.date >= today)
      .sort((a, b) => `${a.date}${a.time ?? ''}`.localeCompare(`${b.date}${b.time ?? ''}`));
  });

  readonly pastAppointments = computed(() => {
    const today = this.todayIso();
    return [...this.store.appointments()]
      .filter((a) => a.done || a.date < today)
      .sort((a, b) => `${b.date}${b.time ?? ''}`.localeCompare(`${a.date}${a.time ?? ''}`));
  });

  readonly visibleAppointments = computed(() =>
    this.apptFilter() === 'avenir' ? this.upcomingAppointments() : this.pastAppointments()
  );

  readonly selectedAppointment = computed(() => {
    const id = this.selectedApptId();
    if (!id) return this.visibleAppointments()[0] ?? null;
    return this.store.appointments().find((a) => a.id === id) ?? null;
  });

  setTab(tab: PetsTab): void {
    this.tab.set(tab);
    if (tab !== 'animaux') {
      this.selectedPetId.set(null);
      this.detailSection.set(null);
    }
    if (tab !== 'rendezvous') this.selectedApptId.set(null);
  }

  openPet(pet: Pet): void {
    this.selectedPetId.set(pet.id);
    this.detailSection.set(null);
    this.tab.set('animaux');
  }

  backFromPet(): void {
    this.selectedPetId.set(null);
    this.detailSection.set(null);
  }

  openSection(section: DetailSection): void {
    this.detailSection.set(this.detailSection() === section ? null : section);
  }

  toggleReminder(pet: Pet, key: keyof Pet['reminders']): void {
    this.store.upsertPet({
      ...pet,
      reminders: { ...pet.reminders, [key]: !pet.reminders[key] }
    });
  }

  updatePetNotes(pet: Pet, notes: string): void {
    this.store.upsertPet({ ...pet, notes: notes.trim() || null });
  }

  openPetForm(): void {
    this.draftPetName = '';
    this.draftPetSex = 'F';
    this.draftPetSpecies = 'Chien';
    this.draftPetBreed = '';
    this.draftPetBirth = '';
    this.draftPetEmoji = '🐾';
    this.petFormOpen.set(true);
  }

  addPet(): void {
    const name = this.draftPetName.trim();
    if (!name || !this.draftPetBirth) return;
    this.store.upsertPet({
      id: createId(),
      name,
      sex: this.draftPetSex,
      species: this.draftPetSpecies.trim() || 'Animal',
      breed: this.draftPetBreed.trim() || '—',
      birthDate: this.draftPetBirth,
      photoEmoji: this.draftPetEmoji || '🐾',
      chip: null,
      insurance: false,
      foodBrand: null,
      mealsPerDay: 2,
      mealGrams: 0,
      weightKg: 0,
      weightDeltaKg: 0,
      notes: null,
      reminders: { treatments: true, vaccines: true, vermifuge: true, weight: true }
    });
    this.petFormOpen.set(false);
  }

  openTaskForm(): void {
    this.draftTaskLabel = '';
    this.draftTaskPetId = this.pets()[0]?.id ?? '';
    this.draftTaskTime = '';
    this.taskFormOpen.set(true);
  }

  addTask(): void {
    const label = this.draftTaskLabel.trim();
    if (!label || !this.draftTaskPetId) return;
    this.store.addTask({
      petId: this.draftTaskPetId,
      label,
      time: this.draftTaskTime || null,
      done: false,
      date: this.todayIso()
    });
    this.taskFormOpen.set(false);
  }

  openExpenseForm(): void {
    this.draftExpenseLabel = '';
    this.draftExpenseAmount = '';
    this.draftExpenseCategory = 'Alimentation';
    this.draftExpensePetId = this.pets()[0]?.id ?? '';
    this.draftExpenseDate = this.todayIso();
    this.expenseFormOpen.set(true);
  }

  addExpense(): void {
    const label = this.draftExpenseLabel.trim();
    const amount = Number(String(this.draftExpenseAmount).replace(',', '.'));
    if (!label || Number.isNaN(amount) || amount < 0 || !this.draftExpensePetId) return;
    this.store.addExpense({
      petId: this.draftExpensePetId,
      label,
      category: this.draftExpenseCategory,
      amount,
      date: this.draftExpenseDate
    });
    this.expenseFormOpen.set(false);
  }

  openApptForm(): void {
    this.draftApptTitle = '';
    this.draftApptPetId = this.pets()[0]?.id ?? '';
    this.draftApptDate = this.todayIso();
    this.draftApptTime = '';
    this.draftApptPlace = '';
    this.draftApptNotes = '';
    this.draftApptIcon = '📅';
    this.apptFormOpen.set(true);
  }

  addAppointment(): void {
    const title = this.draftApptTitle.trim();
    if (!title || !this.draftApptPetId || !this.draftApptDate) return;
    const pet = this.store.petById(this.draftApptPetId);
    const fullTitle = title.includes('–') || title.includes('-')
      ? title
      : `${title} – ${pet?.name ?? ''}`.trim();
    this.store.addAppointment({
      petId: this.draftApptPetId,
      title: fullTitle,
      date: this.draftApptDate,
      time: this.draftApptTime || null,
      place: this.draftApptPlace.trim() || null,
      notes: this.draftApptNotes.trim() || null,
      done: false,
      icon: this.draftApptIcon || '📅'
    });
    this.apptFormOpen.set(false);
    this.apptFilter.set('avenir');
  }

  markApptDone(appt: PetAppointment): void {
    this.store.updateAppointment({ ...appt, done: true });
  }

  prevExpenseMonth(): void {
    if (this.expenseMonth() === 1) {
      this.expenseMonth.set(12);
      this.expenseYear.update((y) => y - 1);
    } else {
      this.expenseMonth.update((m) => m - 1);
    }
  }

  nextExpenseMonth(): void {
    if (this.expenseMonth() === 12) {
      this.expenseMonth.set(1);
      this.expenseYear.update((y) => y + 1);
    } else {
      this.expenseMonth.update((m) => m + 1);
    }
  }

  petName(petId: string): string {
    return this.store.petById(petId)?.name ?? 'Animal';
  }

  expenseIcon(expense: PetExpense): string {
    return EXPENSE_CATEGORY_META[expense.category]?.icon ?? '📦';
  }

  money(value: number, digits = 2): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value || 0);
  }

  formatDate(iso: string, withWeekday = true): string {
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    const opts: Intl.DateTimeFormatOptions = withWeekday
      ? { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }
      : { day: 'numeric', month: 'short' };
    const raw = d.toLocaleDateString('fr-FR', opts);
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  formatApptWhen(appt: PetAppointment): string {
    const date = this.formatDate(appt.date, true);
    return appt.time ? `${date} à ${appt.time}` : date;
  }

  barHeight(value: number): string {
    return `${Math.max(4, (value / this.historyMax()) * 100)}%`;
  }

  sexSymbol(sex: PetSex): string {
    return sex === 'F' ? '♀' : '♂';
  }

  private todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
