import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { filterBreeds } from '../../core/pet-breeds';
import {
  DEFAULT_HEAT_TRACKING,
  EXPENSE_CATEGORY_META,
  ExpenseCategory,
  HEAT_INTERVAL_PRESETS,
  Pet,
  PetAppointment,
  PetExpense,
  PetsStore,
  PetSex,
  predictHeatCycles
} from '../../core/pets.store';
import { PetShareService } from '../../core/pet-share.service';
import { createId } from '../../core/id';
import { resolveAssetUrl } from '../../core/asset-url';
import { animauxEmojiIconSrc, animauxIconsForTheme, petAvatarIconSrc } from '../../core/theme-ange-icons';

type PetsTab = 'accueil' | 'depenses' | 'rendezvous';
type ExpenseScope = 'mois' | 'annee' | 'animal';
type ApptFilter = 'avenir' | 'passes';
type DetailSection = 'identite' | 'sante' | 'alimentation' | 'poids' | 'notes' | 'chaleurs';
type DateField = 'birth' | 'heatStart' | 'heatEnd' | 'expense' | 'appt';

@Component({
  selector: 'app-animaux',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './animaux.component.html',
  styleUrl: './animaux.component.scss'
})
export class AnimauxComponent {
  get icons() {
    return animauxIconsForTheme();
  }
  readonly assetUrl = resolveAssetUrl;
  readonly animauxEmojiIconSrc = animauxEmojiIconSrc;
  readonly petAvatarIconSrc = petAvatarIconSrc;
  readonly tab = signal<PetsTab>('accueil');
  readonly selectedPetId = signal<string | null>(null);
  readonly detailSection = signal<DetailSection | null>(null);
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
  readonly shareOpen = signal(false);
  readonly shareBusy = signal(false);
  readonly shareCopied = signal(false);
  readonly shareError = signal('');
  readonly shareLink = signal('');
  readonly sharePet = signal<Pet | null>(null);

  readonly breedMenuOpen = signal(false);
  readonly calendarOpen = signal(false);
  readonly calendarField = signal<DateField | null>(null);
  readonly calendarCursor = signal({ year: new Date().getFullYear(), month: new Date().getMonth() });

  draftShareEmail = '';

  draftPetName = '';
  draftPetSex: PetSex = 'F';
  draftPetSpecies = 'Chien';
  draftPetBreed = '';
  draftPetBirth = '';
  draftPetEmoji = '🐾';

  draftChip = '';
  draftInsurance = false;
  draftInsuranceName = '';
  draftVaccines = '';
  draftTreatments = '';
  draftMedicalHistory = '';
  draftFoodBrand = '';
  draftMealsPerDay = '2';
  draftMealGrams = '';
  draftMealSchedule = '';
  draftWeightKg = '';
  draftWeightDelta = '';
  draftNotes = '';
  draftHeatStart = '';
  draftHeatEnd = '';
  draftHeatInterval = 180;
  draftHeatCustomDays = '180';

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

  readonly heatIntervalPresets = HEAT_INTERVAL_PRESETS;
  readonly categoryOptions = Object.keys(EXPENSE_CATEGORY_META) as ExpenseCategory[];
  readonly store = inject(PetsStore);
  private readonly petShare = inject(PetShareService);

  readonly filteredBreeds = computed(() =>
    filterBreeds(this.draftPetSpecies, this.draftPetBreed)
  );

  readonly calendarCells = computed(() => {
    const { year, month } = this.calendarCursor();
    const first = new Date(year, month, 1);
    const startPad = (first.getDay() + 6) % 7; // lundi = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ iso: string | null; day: number | null; inMonth: boolean }> = [];
    for (let i = 0; i < startPad; i++) cells.push({ iso: null, day: null, inMonth: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ iso, day: d, inMonth: true });
    }
    while (cells.length % 7 !== 0) cells.push({ iso: null, day: null, inMonth: false });
    return cells;
  });

  readonly calendarMonthLabel = computed(() => {
    const { year, month } = this.calendarCursor();
    const label = new Date(year, month, 1).toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric'
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  });

  readonly predictedHeats = computed(() => {
    const pet = this.selectedPet();
    if (!pet || pet.sex !== 'F') return [];
    return predictHeatCycles(pet.heatTracking, 3);
  });

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
    this.selectedPetId.set(null);
    this.detailSection.set(null);
    if (tab !== 'rendezvous') this.selectedApptId.set(null);
  }

  openPet(pet: Pet): void {
    this.selectedPetId.set(pet.id);
    this.detailSection.set(null);
  }

  backFromPet(): void {
    this.selectedPetId.set(null);
    this.detailSection.set(null);
    this.tab.set('accueil');
  }

  openSection(section: DetailSection): void {
    const pet = this.selectedPet();
    if (!pet) return;
    this.fillSectionDraft(pet, section);
    this.detailSection.set(section);
  }

  closeSection(): void {
    this.detailSection.set(null);
    this.breedMenuOpen.set(false);
    this.closeCalendar();
  }

  sectionTitle(section: DetailSection | null): string {
    switch (section) {
      case 'identite':
        return 'Identité';
      case 'sante':
        return 'Santé';
      case 'alimentation':
        return 'Alimentation';
      case 'poids':
        return 'Poids';
      case 'notes':
        return 'Notes & suivi';
      case 'chaleurs':
        return 'Suivi des chaleurs';
      default:
        return '';
    }
  }

  private fillSectionDraft(pet: Pet, section: DetailSection): void {
    this.breedMenuOpen.set(false);
    this.calendarOpen.set(false);
    if (section === 'identite') {
      this.draftPetName = pet.name;
      this.draftPetSex = pet.sex;
      this.draftPetSpecies = pet.species;
      this.draftPetBreed = pet.breed === '—' ? '' : pet.breed;
      this.draftPetBirth = pet.birthDate;
      this.draftPetEmoji = pet.photoEmoji;
      this.draftChip = pet.chip || '';
      this.draftInsurance = pet.insurance;
      this.draftInsuranceName = pet.insuranceName || '';
    } else if (section === 'sante') {
      this.draftVaccines = pet.vaccines || '';
      this.draftTreatments = pet.treatments || '';
      this.draftMedicalHistory = pet.medicalHistory || '';
    } else if (section === 'alimentation') {
      this.draftFoodBrand = pet.foodBrand || '';
      this.draftMealsPerDay = String(pet.mealsPerDay || 0);
      this.draftMealGrams = pet.mealGrams ? String(pet.mealGrams) : '';
      this.draftMealSchedule = pet.mealSchedule || '';
    } else if (section === 'poids') {
      this.draftWeightKg = pet.weightKg ? String(pet.weightKg).replace('.', ',') : '';
      this.draftWeightDelta = pet.weightDeltaKg
        ? String(pet.weightDeltaKg).replace('.', ',')
        : '';
    } else if (section === 'notes') {
      this.draftNotes = pet.notes || '';
    } else if (section === 'chaleurs') {
      this.draftHeatStart = '';
      this.draftHeatEnd = '';
      this.draftHeatInterval = pet.heatTracking.intervalDays;
      this.draftHeatCustomDays = String(pet.heatTracking.intervalDays);
    }
  }

  onBreedInput(value: string): void {
    this.draftPetBreed = value;
    this.breedMenuOpen.set(true);
  }

  selectBreed(breed: string): void {
    this.draftPetBreed = breed;
    this.breedMenuOpen.set(false);
  }

  openCalendar(field: DateField, currentIso?: string): void {
    const base = currentIso && /^\d{4}-\d{2}-\d{2}$/.test(currentIso) ? currentIso : this.todayIso();
    const [y, m] = base.split('-').map(Number);
    this.calendarCursor.set({ year: y, month: m - 1 });
    this.calendarField.set(field);
    this.calendarOpen.set(true);
  }

  closeCalendar(): void {
    this.calendarOpen.set(false);
    this.calendarField.set(null);
  }

  shiftCalendarMonth(delta: number): void {
    const { year, month } = this.calendarCursor();
    const d = new Date(year, month + delta, 1);
    this.calendarCursor.set({ year: d.getFullYear(), month: d.getMonth() });
  }

  pickCalendarDay(iso: string | null): void {
    if (!iso) return;
    const field = this.calendarField();
    if (field === 'birth') this.draftPetBirth = iso;
    else if (field === 'heatStart') this.draftHeatStart = iso;
    else if (field === 'heatEnd') this.draftHeatEnd = iso;
    else if (field === 'expense') this.draftExpenseDate = iso;
    else if (field === 'appt') this.draftApptDate = iso;
    this.closeCalendar();
  }

  selectedCalendarIso(): string {
    const field = this.calendarField();
    if (field === 'birth') return this.draftPetBirth;
    if (field === 'heatStart') return this.draftHeatStart;
    if (field === 'heatEnd') return this.draftHeatEnd;
    if (field === 'expense') return this.draftExpenseDate;
    if (field === 'appt') return this.draftApptDate;
    return '';
  }

  formatIsoFr(iso: string | null | undefined): string {
    if (!iso) return 'Choisir une date';
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  setHeatIntervalPreset(days: number): void {
    this.draftHeatInterval = days;
    this.draftHeatCustomDays = String(days);
  }

  applyHeatInterval(): void {
    const pet = this.selectedPet();
    if (!pet) return;
    const custom = Math.max(7, Number(this.draftHeatCustomDays) || this.draftHeatInterval);
    this.draftHeatInterval = custom;
    this.store.setHeatInterval(pet.id, custom);
  }

  addHeatCycle(): void {
    const pet = this.selectedPet();
    if (!pet || !this.draftHeatStart || !this.draftHeatEnd) return;
    this.store.addHeatCycle(pet.id, this.draftHeatStart, this.draftHeatEnd);
    this.draftHeatStart = '';
    this.draftHeatEnd = '';
  }

  heatSummary(pet: Pet): string {
    const cycles = pet.heatTracking?.cycles?.length || 0;
    const next = predictHeatCycles(pet.heatTracking, 1)[0];
    if (next) {
      return `${cycles} chaleur(s) · prochaine ~ ${this.formatIsoFr(next.startDate)}`;
    }
    return cycles ? `${cycles} chaleur(s) enregistrée(s)` : 'Ajouter les chaleurs passées';
  }

  saveSection(): void {
    const pet = this.selectedPet();
    const section = this.detailSection();
    if (!pet || !section) return;

    if (section === 'identite') {
      const name = this.draftPetName.trim();
      if (!name || !this.draftPetBirth) return;
      this.store.upsertPet({
        ...pet,
        name,
        sex: this.draftPetSex,
        species: this.draftPetSpecies.trim() || 'Animal',
        breed: this.draftPetBreed.trim() || '—',
        birthDate: this.draftPetBirth,
        photoEmoji: this.draftPetEmoji || '🐾',
        chip: this.draftChip.trim() || null,
        insurance: this.draftInsurance,
        insuranceName: this.draftInsuranceName.trim() || null
      });
    } else if (section === 'sante') {
      this.store.upsertPet({
        ...pet,
        vaccines: this.draftVaccines.trim() || null,
        treatments: this.draftTreatments.trim() || null,
        medicalHistory: this.draftMedicalHistory.trim() || null
      });
    } else if (section === 'alimentation') {
      this.store.upsertPet({
        ...pet,
        foodBrand: this.draftFoodBrand.trim() || null,
        mealsPerDay: Math.max(0, Number(this.draftMealsPerDay) || 0),
        mealGrams: Math.max(0, Number(String(this.draftMealGrams).replace(',', '.')) || 0),
        mealSchedule: this.draftMealSchedule.trim() || null
      });
    } else if (section === 'poids') {
      this.store.upsertPet({
        ...pet,
        weightKg: Math.max(0, Number(String(this.draftWeightKg).replace(',', '.')) || 0),
        weightDeltaKg: Number(String(this.draftWeightDelta).replace(',', '.')) || 0
      });
    } else if (section === 'notes') {
      this.store.upsertPet({
        ...pet,
        notes: this.draftNotes.trim() || null
      });
    }

    this.closeSection();
  }

  foodSummary(pet: Pet): string {
    if (!pet.foodBrand && !pet.mealsPerDay) return 'Non renseigné';
    const parts: string[] = [];
    if (pet.foodBrand) parts.push(pet.foodBrand);
    if (pet.mealsPerDay) {
      let meal = `${pet.mealsPerDay} repas / jour`;
      if (pet.mealGrams) meal += ` • ${pet.mealGrams} g`;
      if (pet.mealSchedule) meal += ` (${pet.mealSchedule})`;
      parts.push(meal);
    }
    return parts.join(' · ');
  }

  healthSummary(pet: Pet): string {
    const bits = [pet.vaccines, pet.treatments, pet.medicalHistory].filter(Boolean);
    return bits.length ? bits.join(' · ') : 'Vaccins, traitements, antécédents';
  }

  toggleReminder(pet: Pet, key: keyof Pet['reminders']): void {
    this.store.upsertPet({
      ...pet,
      reminders: { ...pet.reminders, [key]: !pet.reminders[key] }
    });
  }

  openPetForm(): void {
    this.draftPetName = '';
    this.draftPetSex = 'F';
    this.draftPetSpecies = 'Chien';
    this.draftPetBreed = '';
    this.draftPetBirth = '';
    this.draftPetEmoji = '🐾';
    this.breedMenuOpen.set(false);
    this.closeCalendar();
    this.petFormOpen.set(true);
  }

  openShare(pet: Pet, event?: Event): void {
    event?.stopPropagation();
    this.sharePet.set(pet);
    this.shareLink.set('');
    this.shareError.set('');
    this.shareCopied.set(false);
    this.draftShareEmail = '';
    this.shareOpen.set(true);
    this.shareBusy.set(true);
    this.petShare.create(pet).subscribe({
      next: (dto) => {
        this.shareLink.set(this.petShare.shareUrl(dto.token));
        this.shareBusy.set(false);
      },
      error: () => {
        // Fallback local link if API unavailable
        const token = createId().replace(/-/g, '').slice(0, 24);
        this.shareLink.set(`${window.location.origin}/partage/animaux/${token}`);
        this.shareError.set('Lien généré localement (partage serveur indisponible).');
        this.shareBusy.set(false);
      }
    });
  }

  closeShare(): void {
    this.shareOpen.set(false);
    this.sharePet.set(null);
  }

  async copyShareLink(): Promise<void> {
    const link = this.shareLink();
    if (!link) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const input = document.createElement('textarea');
        input.value = link;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      this.shareCopied.set(true);
      window.setTimeout(() => this.shareCopied.set(false), 1600);
    } catch {
      this.shareError.set('Impossible de copier le lien.');
    }
  }

  sendShareEmail(): void {
    const pet = this.sharePet();
    const link = this.shareLink();
    if (!pet || !link) return;
    const email = this.draftShareEmail.trim();
    const subject = encodeURIComponent(`Profil de ${pet.name} sur Freya`);
    const body = encodeURIComponent(
      `Voici le profil de ${pet.name} (${pet.species}) partagé via Freya :\n\n${link}\n`
    );
    const mailto = email
      ? `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`
      : `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailto;
  }

  async nativeShare(): Promise<void> {
    const pet = this.sharePet();
    const link = this.shareLink();
    if (!pet || !link || !navigator.share) return;
    try {
      await navigator.share({
        title: `Profil de ${pet.name}`,
        text: `Profil de ${pet.name} (${pet.species}) sur Freya`,
        url: link
      });
    } catch {
      /* user cancelled */
    }
  }

  canNativeShare(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
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
      insuranceName: null,
      vaccines: null,
      treatments: null,
      medicalHistory: null,
      foodBrand: null,
      mealsPerDay: 2,
      mealGrams: 0,
      mealSchedule: null,
      weightKg: 0,
      weightDeltaKg: 0,
      notes: null,
      reminders: { treatments: true, vaccines: true, vermifuge: true, weight: true },
      heatTracking: {
        ...DEFAULT_HEAT_TRACKING,
        enabled: this.draftPetSex === 'F',
        intervalDays: this.draftPetSpecies.toLowerCase().includes('chat') ? 21 : 180
      }
    });
    this.petFormOpen.set(false);
    this.breedMenuOpen.set(false);
    this.closeCalendar();
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
    if (appt.kind === 'heat' && appt.endDate) {
      return `${date} → ${this.formatIsoFr(appt.endDate)}`;
    }
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
