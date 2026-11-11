import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { resolveAssetUrl } from '../../core/asset-url';
import {
  ACTIVITY_OPTIONS,
  ActivityLevel,
  computeEnergy,
  disciplineEmoji,
  disciplineLabel,
  exerciseIconSrc,
  filterSportDisciplines,
  formatDuration,
  formatRest,
  GOAL_TYPE_OPTIONS,
  GoalType,
  kindIcon,
  kindIconSrc,
  muscuIcon,
  muscuIconsForTheme,
  pct,
  SPORT_DISCIPLINE_CATEGORIES,
  SportDisciplineCategory,
  SportDisciplineId,
  SportSex,
  SportStore,
  SportTab
} from '../../core/sport.store';
import {
  exerciseTemplatesForDay,
  filterExerciseTemplates,
  type ExerciseTemplate
} from '../../core/sport-exercise-catalog';

@Component({
  selector: 'app-sport',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './sport.component.html',
  styleUrl: './sport.component.scss'
})
export class SportComponent {
  readonly store = inject(SportStore);
  get icons() {
    return muscuIconsForTheme();
  }
  readonly assetUrl = resolveAssetUrl;
  readonly muscuIcon = muscuIcon;
  readonly exerciseIconSrc = exerciseIconSrc;
  readonly kindIconSrc = kindIconSrc;
  readonly tab = signal<SportTab>('suivi');
  readonly period = signal<'1 mois' | '3 mois' | '6 mois'>('3 mois');
  readonly sportFilter = signal('Tous les sports');
  readonly loadExercise = signal('Développé couché');
  readonly goalFormOpen = signal(false);
  readonly sportPickerOpen = signal(false);
  readonly disciplineQuery = signal('');
  readonly disciplineCategory = signal<SportDisciplineCategory>('Toutes');
  readonly draftDisciplineId = signal<SportDisciplineId | 'custom' | null>(null);

  readonly goalTypes = GOAL_TYPE_OPTIONS;
  readonly activityOptions = ACTIVITY_OPTIONS;
  readonly disciplineCategories = SPORT_DISCIPLINE_CATEGORIES;

  readonly selectedDayDiscipline = computed(() => {
    const date = this.store.selectedDate();
    const session = this.store.selectedSession();
    const day = this.store.weekDays().find((d) => d.date === date);
    const id = session?.disciplineId ?? day?.disciplineId ?? null;
    const custom = session?.customDiscipline ?? day?.customDiscipline ?? null;
    return {
      id,
      label: disciplineLabel(id, custom),
      emoji: disciplineEmoji(id)
    };
  });

  readonly filteredDisciplines = computed(() =>
    filterSportDisciplines(this.disciplineQuery(), this.disciplineCategory())
  );

  readonly selectedDayLabel = computed(() => {
    const date = this.store.selectedDate();
    return this.store.weekDays().find((d) => d.date === date)?.label ?? '';
  });

  readonly sessionEditOpen = signal(false);
  readonly exercisePickerOpen = signal(false);
  readonly exerciseConfigureOpen = signal(false);
  readonly expandedExerciseId = signal<string | null>(null);
  readonly exerciseConfigureMode = signal<'add' | 'edit'>('add');
  readonly exerciseQuery = signal('');
  pendingExerciseTemplate: ExerciseTemplate | null = null;
  editingExerciseId: string | null = null;
  draftExerciseSets = 3;
  draftExerciseReps = 10;
  draftExerciseLoadKg: number | null = null;
  draftExerciseRestSec = 90;
  draftExerciseRpe = 7;

  draftSessionTitle = '';
  draftSessionDetail = '';
  draftSessionDuration = 45;

  readonly dayExerciseCatalog = computed(() => {
    const date = this.store.selectedDate();
    const session = this.store.selectedSession();
    const day = this.store.weekDays().find((d) => d.date === date);
    const disciplineId = session?.disciplineId ?? day?.disciplineId ?? null;
    const kind = session?.kind ?? day?.kind ?? null;
    return exerciseTemplatesForDay(disciplineId, kind);
  });

  readonly filteredExerciseTemplates = computed(() =>
    filterExerciseTemplates(this.dayExerciseCatalog(), this.exerciseQuery())
  );

  readonly configurePersonalBestKg = computed(() => {
    if (this.exerciseConfigureMode() === 'add' && this.pendingExerciseTemplate) {
      return this.store.personalBestForTemplate(this.pendingExerciseTemplate.id);
    }
    const session = this.store.selectedSession();
    const ex = session?.exercises.find((e) => e.id === this.editingExerciseId);
    return ex ? this.store.personalBestKg(ex) : null;
  });

  readonly configureExerciseTitle = computed(() => {
    if (this.exerciseConfigureMode() === 'add' && this.pendingExerciseTemplate) {
      return this.pendingExerciseTemplate.name;
    }
    const session = this.store.selectedSession();
    return session?.exercises.find((e) => e.id === this.editingExerciseId)?.name ?? 'Exercice';
  });

  draftType: GoalType = 'prise_seche';
  draftSex: SportSex = 'M';
  draftAge = 28;
  draftHeight = 178;
  draftWeight = 76;
  draftActivity: ActivityLevel = 'modere';
  draftWeightMin = 76;
  draftWeightMax = 82;
  draftStart = 'Nov. 2026';
  draftEnd = 'Janv. 2027';

  readonly formTick = signal(0);
  readonly livePreview = computed(() => {
    this.formTick();
    return computeEnergy({
      type: this.draftType,
      sex: this.draftSex,
      age: Number(this.draftAge) || 25,
      heightCm: Number(this.draftHeight) || 170,
      weightKg: Number(String(this.draftWeight).replace(',', '.')) || 70,
      activity: this.draftActivity
    });
  });

  readonly weightPoints = computed(() => {
    const hist = this.store.weightHistory();
    const min = Math.min(...hist.map((p) => p.kg));
    const max = Math.max(...hist.map((p) => p.kg));
    const span = Math.max(0.5, max - min);
    return hist.map((p, i) => ({
      ...p,
      x: hist.length <= 1 ? 50 : (i / (hist.length - 1)) * 100,
      y: 100 - ((p.kg - min) / span) * 78 - 8
    }));
  });

  readonly weightPolyline = computed(() =>
    this.weightPoints()
      .map((p) => `${p.x},${p.y}`)
      .join(' ')
  );

  readonly loadMax = computed(() => Math.max(1, ...this.store.loadProgress().map((p) => p.kg)));
  readonly volumeMax = computed(() =>
    Math.max(1, ...this.store.volumeWeeks().map((w) => w.musculation + w.course + w.autres))
  );

  readonly kcalRing = computed(() => pct(this.store.current().kcal, this.store.targets().kcal));
  readonly weekRing = computed(() =>
    pct(this.store.weeklyGoal().done, this.store.weeklyGoal().target)
  );
  readonly regularityRing = computed(() => this.store.regularityPct());

  setTab(tab: SportTab): void {
    this.tab.set(tab);
  }

  openGoalForm(): void {
    const g = this.store.goal();
    this.draftType = g.type;
    this.draftSex = g.sex;
    this.draftAge = g.age;
    this.draftHeight = g.heightCm;
    this.draftWeight = g.weightKg;
    this.draftActivity = g.activity;
    this.draftWeightMin = g.weightMinKg;
    this.draftWeightMax = g.weightMaxKg;
    this.draftStart = g.startLabel;
    this.draftEnd = g.endLabel;
    this.formTick.update((n) => n + 1);
    this.goalFormOpen.set(true);
  }

  closeGoalForm(): void {
    this.goalFormOpen.set(false);
  }

  openSportPicker(): void {
    const sel = this.selectedDayDiscipline();
    this.disciplineQuery.set('');
    this.disciplineCategory.set('Toutes');
    this.draftDisciplineId.set((sel.id as SportDisciplineId) ?? null);
    this.sportPickerOpen.set(true);
  }

  closeSportPicker(): void {
    this.sportPickerOpen.set(false);
  }

  pickDiscipline(id: SportDisciplineId): void {
    this.draftDisciplineId.set(id);
    this.disciplineQuery.set('');
  }

  saveSportDiscipline(): void {
    const date = this.store.selectedDate();
    const id = this.draftDisciplineId();
    const query = this.disciplineQuery().trim();

    if (id) {
      this.store.setDayDiscipline(date, id);
      this.closeSportPicker();
      return;
    }

    if (query.length >= 2) {
      this.store.setDayDiscipline(date, 'custom', query);
      this.closeSportPicker();
      return;
    }

    const matches = this.filteredDisciplines();
    if (matches.length === 1) {
      this.store.setDayDiscipline(date, matches[0].id);
      this.closeSportPicker();
    }
  }

  useTypedSportAsCustom(): void {
    const query = this.disciplineQuery().trim();
    if (query.length < 2) return;
    this.store.setDayDiscipline(this.store.selectedDate(), 'custom', query);
    this.closeSportPicker();
  }

  private requireSession(): { id: string } | null {
    const session = this.store.selectedSession();
    if (session) return session;
    this.openSportPicker();
    return null;
  }

  openSessionEditor(): void {
    const session = this.requireSession();
    if (!session) return;
    const full = this.store.selectedSession()!;
    this.draftSessionTitle = full.title;
    this.draftSessionDetail = full.detail;
    this.draftSessionDuration = full.durationMin;
    this.sessionEditOpen.set(true);
  }

  closeSessionEditor(): void {
    this.sessionEditOpen.set(false);
  }

  saveSessionEditor(): void {
    const session = this.store.selectedSession();
    if (!session || !this.draftSessionTitle.trim()) return;
    this.store.updateSessionMeta(session.id, {
      title: this.draftSessionTitle,
      detail: this.draftSessionDetail,
      durationMin: Number(this.draftSessionDuration) || session.durationMin
    });
    this.closeSessionEditor();
  }

  openExercisePicker(): void {
    if (!this.requireSession()) return;
    this.exerciseQuery.set('');
    this.exercisePickerOpen.set(true);
  }

  closeExercisePicker(): void {
    this.exercisePickerOpen.set(false);
    this.closeExerciseConfigure();
  }

  pickExerciseTemplate(template: ExerciseTemplate): void {
    this.pendingExerciseTemplate = template;
    this.editingExerciseId = null;
    this.exerciseConfigureMode.set('add');
    this.draftExerciseSets = template.defaultSets;
    this.draftExerciseReps = template.defaultReps;
    this.draftExerciseLoadKg = template.defaultLoadKg;
    this.draftExerciseRestSec = template.defaultRestSec;
    this.draftExerciseRpe = template.defaultRpe;
    this.exercisePickerOpen.set(false);
    this.exerciseConfigureOpen.set(true);
  }

  openExerciseEdit(exerciseId: string): void {
    const session = this.store.selectedSession();
    const ex = session?.exercises.find((e) => e.id === exerciseId);
    if (!ex) return;
    this.pendingExerciseTemplate = null;
    this.editingExerciseId = exerciseId;
    this.exerciseConfigureMode.set('edit');
    this.draftExerciseSets = ex.sets;
    this.draftExerciseReps = ex.reps;
    this.draftExerciseLoadKg = ex.loadKg;
    this.draftExerciseRestSec = ex.restSec;
    this.draftExerciseRpe = ex.rpe;
    this.sessionEditOpen.set(false);
    this.exercisePickerOpen.set(false);
    this.exerciseConfigureOpen.set(false);
    this.expandedExerciseId.set(exerciseId);
  }

  toggleExerciseEditor(exerciseId: string): void {
    if (this.expandedExerciseId() === exerciseId) {
      this.expandedExerciseId.set(null);
      return;
    }
    this.openExerciseEdit(exerciseId);
  }

  saveExpandedExercise(): void {
    const session = this.store.selectedSession();
    const exerciseId = this.expandedExerciseId();
    if (!session || !exerciseId) return;
    this.store.updateExercise(session.id, exerciseId, {
      sets: Math.max(1, Math.round(Number(this.draftExerciseSets) || 1)),
      reps: Math.max(1, Math.round(Number(this.draftExerciseReps) || 1)),
      loadKg: this.parseExerciseLoadKg(this.draftExerciseLoadKg),
      restSec: Math.max(0, Math.round(Number(this.draftExerciseRestSec) || 0)),
      rpe: Math.min(10, Math.max(1, Math.round(Number(this.draftExerciseRpe) || 7)))
    });
  }

  closeExerciseConfigure(): void {
    this.exerciseConfigureOpen.set(false);
    this.pendingExerciseTemplate = null;
    this.editingExerciseId = null;
  }

  parseExerciseLoadKg(raw: number | null | string): number | null {
    if (raw === null || raw === undefined || raw === '') return null;
    const n = Number(String(raw).replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  confirmExerciseConfigure(): void {
    const session = this.store.selectedSession();
    if (!session) return;
    const sets = Math.max(1, Math.round(Number(this.draftExerciseSets) || 1));
    const reps = Math.max(1, Math.round(Number(this.draftExerciseReps) || 1));
    const loadKg = this.parseExerciseLoadKg(this.draftExerciseLoadKg);
    const restSec = Math.max(0, Math.round(Number(this.draftExerciseRestSec) || 0));
    const rpe = Math.min(10, Math.max(1, Math.round(Number(this.draftExerciseRpe) || 7)));

    if (this.exerciseConfigureMode() === 'add' && this.pendingExerciseTemplate) {
      this.store.addExerciseFromTemplate(session.id, this.pendingExerciseTemplate, {
        sets,
        reps,
        loadKg,
        restSec,
        rpe
      });
      this.closeExerciseConfigure();
      return;
    }

    if (this.exerciseConfigureMode() === 'edit' && this.editingExerciseId) {
      this.store.updateExercise(session.id, this.editingExerciseId, { sets, reps, loadKg, restSec, rpe });
      this.closeExerciseConfigure();
    }
  }

  removeSessionExercise(exerciseId: string): void {
    const session = this.store.selectedSession();
    if (!session) return;
    this.store.removeExercise(session.id, exerciseId);
  }

  onDraftChange(): void {
    this.formTick.update((n) => n + 1);
  }

  saveGoal(): void {
    const weight = Number(String(this.draftWeight).replace(',', '.'));
    const height = Number(this.draftHeight);
    const age = Number(this.draftAge);
    const minW = Number(String(this.draftWeightMin).replace(',', '.'));
    const maxW = Number(String(this.draftWeightMax).replace(',', '.'));
    if (!weight || !height || !age || weight < 30 || height < 120 || age < 14) return;

    this.store.updateGoal({
      type: this.draftType,
      sex: this.draftSex,
      age,
      heightCm: height,
      weightKg: weight,
      activity: this.draftActivity,
      weightMinKg: minW || weight,
      weightMaxKg: maxW || weight,
      startLabel: this.draftStart,
      endLabel: this.draftEnd
    });
    this.closeGoalForm();
  }

  activityLabel(value: ActivityLevel): string {
    return ACTIVITY_OPTIONS.find((a) => a.value === value)?.label ?? value;
  }

  kindIcon = kindIcon;
  formatDuration = formatDuration;
  formatRest = formatRest;
  pct = pct;

  ringStyle(percent: number): string {
    const p = Math.max(0, Math.min(100, percent));
    return `conic-gradient(var(--accent) ${p}%, rgba(255,255,255,0.08) ${p}% 100%)`;
  }

  barWidth(current: number, target: number): string {
    return `${Math.min(100, pct(current, target))}%`;
  }

  deltaLabel(value: number, unit = 'kg'): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1).replace('.', ',')} ${unit}`;
  }

  numberFr(value: number, digits = 0): string {
    return new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits
    }).format(value);
  }
}
