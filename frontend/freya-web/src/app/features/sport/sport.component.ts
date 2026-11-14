import { Component, computed, DestroyRef, ElementRef, inject, signal, ViewChild } from '@angular/core';
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
  SportTab,
  exerciseTrackKey
} from '../../core/sport.store';
import {
  deadliftVariantTemplates,
  exerciseTemplatesForDay,
  pressVariantTemplates,
  squatVariantTemplates,
  strengthLiftTemplates,
  type ExerciseTemplate
} from '../../core/sport-exercise-catalog';

interface SavedExerciseOption {
  key: string;
  name: string;
  muscle: string;
  emoji: string;
  sets: number;
  reps: number;
  loadKg: number | null;
  restSec: number;
  rpe: number;
  template: ExerciseTemplate;
}

function foldExerciseQuery(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function savedExerciseOption(template: ExerciseTemplate): SavedExerciseOption {
  return {
    key: foldExerciseQuery(template.name),
    name: template.name,
    muscle: template.muscle,
    emoji: template.emoji,
    sets: template.defaultSets,
    reps: template.defaultReps,
    loadKg: template.defaultLoadKg,
    restSec: template.defaultRestSec,
    rpe: template.defaultRpe,
    template
  };
}

@Component({
  selector: 'app-sport',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './sport.component.html',
  styleUrl: './sport.component.scss'
})
export class SportComponent {
  readonly store = inject(SportStore);
  private readonly destroyRef = inject(DestroyRef);
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private timerPreset = 90;
  private timerEditLock = false;
  timerMin = 1;
  timerSec = 30;
  readonly timerLeft = signal(90);
  readonly timerRunning = signal(false);
  readonly timerPaused = signal(false);
  readonly timerDocked = signal(false);
  readonly timerDockHeight = signal(240);
  @ViewChild('sessionTimer') private sessionTimer?: ElementRef<HTMLElement>;
  readonly timerClock = computed(() => {
    const total = Math.max(0, this.timerLeft());
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  });
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
  readonly loadMenuOpen = signal(false);
  readonly loadExerciseOptions = ['Développé couché', 'Squat', 'Soulevé de terre'];
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
  readonly exerciseConfigureOpen = signal(false);
  readonly expandedExerciseId = signal<string | null>(null);
  readonly exerciseConfigureMode = signal<'add' | 'edit'>('add');
  pendingExerciseTemplate: ExerciseTemplate | null = null;
  editingExerciseId: string | null = null;
  draftExerciseName = '';
  draftExerciseSets = 3;
  draftExerciseReps = 10;
  draftExerciseLoadKg: number | null = null;
  draftExerciseRestSec = 90;
  draftExerciseRpe = 7;
  readonly savedExerciseKey = signal<string | null>(null);
  readonly exerciseNameQuery = signal('');
  readonly exerciseNameMenuOpen = signal(false);
  readonly exerciseLibraryOpen = signal(false);
  libraryExerciseName = '';

  draftSessionTitle = '';
  draftSessionDetail = '';
  draftSessionDuration = 45;

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

  readonly savedExerciseOptions = computed(() => {
    const session = this.store.selectedSession();
    const forceDay = session?.disciplineId === 'force';
    const strengthDay = forceDay || session?.disciplineId === 'musculation' || session?.kind === 'musculation';
    const dayTemplates = exerciseTemplatesForDay(session?.disciplineId, session?.kind ?? null);
    const seen = new Set(dayTemplates.map((template) => foldExerciseQuery(template.name)));
    const extras = [
      ...(strengthDay ? strengthLiftTemplates() : []),
      ...squatVariantTemplates(),
      ...deadliftVariantTemplates(),
      ...pressVariantTemplates()
    ].filter((template) => {
      const key = foldExerciseQuery(template.name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const templates = [...dayTemplates, ...extras];
    const byName = new Map<string, SavedExerciseOption>();

    for (const template of templates) {
      byName.set(foldExerciseQuery(template.name), savedExerciseOption(template));
    }

    const sessions = [...this.store.sessions()].sort((a, b) => a.date.localeCompare(b.date));
    for (const day of sessions) {
      for (const ex of day.exercises) {
        const name = ex.name.trim();
        if (!name) continue;
        const key = foldExerciseQuery(name);
        if (forceDay && !byName.has(key)) continue;
        const existing = byName.get(key);
        const template: ExerciseTemplate = {
          id: ex.templateId || existing?.template.id || exerciseTrackKey(undefined, name) || 'exercice',
          name,
          muscle: ex.muscle || existing?.muscle || '',
          emoji: ex.emoji || existing?.emoji || '🏋️',
          defaultSets: ex.sets,
          defaultReps: ex.reps,
          defaultLoadKg: ex.loadKg,
          defaultRestSec: ex.restSec,
          defaultRpe: ex.rpe
        };
        byName.set(key, savedExerciseOption(template));
      }
    }

    const hidden = new Set(this.store.hiddenExerciseKeys());
    for (const key of [...byName.keys()]) {
      if (hidden.has(key)) byName.delete(key);
    }
    for (const custom of this.store.customExercises()) {
      if (!custom.name || hidden.has(custom.key) || byName.has(custom.key)) continue;
      byName.set(
        custom.key,
        savedExerciseOption({
          id: custom.id,
          name: custom.name,
          muscle: '',
          emoji: '🏋️',
          defaultSets: 3,
          defaultReps: 10,
          defaultLoadKg: null,
          defaultRestSec: 90,
          defaultRpe: 7
        })
      );
    }

    const list = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
    if (forceDay) {
      const allowed = new Set(templates.map((template) => foldExerciseQuery(template.name)));
      for (const custom of this.store.customExercises()) allowed.add(custom.key);
      return list.filter((option) => allowed.has(option.key));
    }
    return list;
  });

  readonly filteredSavedExercises = computed(() => {
    const query = foldExerciseQuery(this.exerciseNameQuery());
    const options = this.savedExerciseOptions();
    if (!query) return options;
    return options.filter((option) => foldExerciseQuery(option.name).includes(query));
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
    if (!hist.length) return [];
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

  constructor() {
    this.destroyRef.onDestroy(() => this.clearSessionTimer());
  }

  setTab(tab: SportTab): void {
    this.tab.set(tab);
  }

  onTimerEdit(): void {
    if (this.timerEditLock || this.timerRunning()) return;
    const minutes = this.clampTimer(this.timerMin, 0, 180);
    const seconds = this.clampTimer(this.timerSec, 0, 59);
    this.timerEditLock = true;
    this.timerMin = minutes;
    this.timerSec = seconds;
    this.timerEditLock = false;
    const total = minutes * 60 + seconds;
    if (!this.timerPaused()) this.timerPreset = total;
    this.timerLeft.set(total);
  }

  startSessionTimer(): void {
    if (this.timerRunning()) return;
    if (this.timerLeft() <= 0) {
      this.timerLeft.set(this.timerPreset);
      this.writeTimerInputs(this.timerPreset);
    }
    if (this.timerLeft() <= 0) return;
    this.rememberTimerHeight();
    this.timerDocked.set(true);
    this.timerPaused.set(false);
    this.timerRunning.set(true);
    this.clearSessionTimer();
    this.timerHandle = setInterval(() => {
      const next = this.timerLeft() - 1;
      if (next <= 0) {
        this.timerLeft.set(this.timerPreset);
        this.writeTimerInputs(this.timerPreset);
        this.timerRunning.set(false);
        this.timerPaused.set(false);
        this.timerDocked.set(false);
        this.clearSessionTimer();
        return;
      }
      this.timerLeft.set(next);
    }, 1000);
  }

  pauseSessionTimer(): void {
    if (!this.timerRunning()) return;
    this.clearSessionTimer();
    this.timerRunning.set(false);
    this.timerPaused.set(true);
    this.writeTimerInputs(this.timerLeft());
  }

  stopSessionTimer(): void {
    this.clearSessionTimer();
    this.timerRunning.set(false);
    this.timerPaused.set(false);
    this.timerDocked.set(false);
    this.timerLeft.set(this.timerPreset);
    this.writeTimerInputs(this.timerPreset);
  }

  private rememberTimerHeight(): void {
    const height = this.sessionTimer?.nativeElement.getBoundingClientRect().height ?? 0;
    if (height > 0) this.timerDockHeight.set(Math.ceil(height));
  }

  private writeTimerInputs(total: number): void {
    const safe = Math.max(0, total);
    this.timerEditLock = true;
    this.timerMin = Math.floor(safe / 60);
    this.timerSec = safe % 60;
    this.timerEditLock = false;
  }

  private clearSessionTimer(): void {
    if (!this.timerHandle) return;
    clearInterval(this.timerHandle);
    this.timerHandle = null;
  }

  private clampTimer(value: number, min: number, max: number): number {
    const parsed = Math.floor(Number(value) || 0);
    return Math.min(max, Math.max(min, parsed));
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

  toggleExerciseLibrary(): void {
    if (this.exerciseLibraryOpen()) {
      this.closeExerciseLibrary();
      return;
    }
    this.libraryExerciseName = '';
    this.exerciseLibraryOpen.set(true);
  }

  closeExerciseLibrary(): void {
    this.exerciseLibraryOpen.set(false);
    this.libraryExerciseName = '';
  }

  addLibraryExercise(): void {
    const name = this.libraryExerciseName.trim();
    if (name.length < 2) return;
    this.store.addCustomExercise(name, foldExerciseQuery(name));
    this.libraryExerciseName = '';
  }

  removeLibraryExercise(key: string): void {
    this.store.hideExercise(key);
    if (this.savedExerciseKey() === key) {
      this.savedExerciseKey.set(null);
      this.pendingExerciseTemplate = null;
      this.draftExerciseName = '';
      this.exerciseNameQuery.set('');
    }
  }

  openExercisePicker(): void {
    if (!this.requireSession()) return;
    this.pendingExerciseTemplate = null;
    this.editingExerciseId = null;
    this.exerciseConfigureMode.set('add');
    this.draftExerciseName = '';
    this.draftExerciseSets = 3;
    this.draftExerciseReps = 10;
    this.draftExerciseLoadKg = null;
    this.draftExerciseRestSec = 90;
    this.draftExerciseRpe = 7;
    this.savedExerciseKey.set(null);
    this.exerciseNameQuery.set('');
    this.exerciseNameMenuOpen.set(false);
    this.sessionEditOpen.set(false);
    this.closeExerciseLibrary();
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

  updateSessionExercise(
    sessionId: string,
    exerciseId: string,
    patch: { sets?: number | string; reps?: number | string; loadKg?: number | null | string }
  ): void {
    const input: { sets?: number; reps?: number; loadKg?: number | null } = {};
    if (patch.sets != null && patch.sets !== '') {
      input.sets = Math.max(1, Math.round(Number(patch.sets) || 1));
    }
    if (patch.reps != null && patch.reps !== '') {
      input.reps = Math.max(1, Math.round(Number(patch.reps) || 1));
    }
    if ('loadKg' in patch) {
      input.loadKg = this.parseExerciseLoadKg(patch.loadKg ?? null);
    }
    this.store.updateExercise(sessionId, exerciseId, input);
  }

  addExerciseSetLine(sessionId: string, exerciseId: string, afterLineId: string | null): void {
    this.store.addExerciseSetLine(sessionId, exerciseId, afterLineId);
  }

  updateSessionExerciseLine(
    sessionId: string,
    exerciseId: string,
    lineId: string,
    patch: { sets?: number | string; reps?: number | string; loadKg?: number | null | string }
  ): void {
    const input: { sets?: number; reps?: number; loadKg?: number | null } = {};
    if (patch.sets != null && patch.sets !== '') {
      input.sets = Math.max(1, Math.round(Number(patch.sets) || 1));
    }
    if (patch.reps != null && patch.reps !== '') {
      input.reps = Math.max(1, Math.round(Number(patch.reps) || 1));
    }
    if ('loadKg' in patch) {
      input.loadKg = this.parseExerciseLoadKg(patch.loadKg ?? null);
    }
    this.store.updateExerciseSetLine(sessionId, exerciseId, lineId, input);
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
    this.closeExerciseLibrary();
    this.pendingExerciseTemplate = null;
    this.editingExerciseId = null;
    this.savedExerciseKey.set(null);
    this.exerciseNameQuery.set('');
    this.exerciseNameMenuOpen.set(false);
  }

  onExerciseNameQuery(value: string): void {
    this.exerciseNameQuery.set(value);
    this.draftExerciseName = value;
    this.exerciseNameMenuOpen.set(true);
    const selected = this.savedExerciseOptions().find((option) => option.key === this.savedExerciseKey());
    if (!selected || foldExerciseQuery(selected.name) !== foldExerciseQuery(value)) {
      this.savedExerciseKey.set(null);
      this.pendingExerciseTemplate = null;
    }
  }

  closeExerciseNameMenuSoon(): void {
    window.setTimeout(() => this.exerciseNameMenuOpen.set(false), 150);
  }

  pickSavedExercise(option: SavedExerciseOption): void {
    this.onSavedExerciseSelect(option.key);
    this.exerciseNameQuery.set(option.name);
    this.exerciseNameMenuOpen.set(false);
  }

  pickLoadExercise(name: string): void {
    this.loadExercise.set(name);
    this.loadMenuOpen.set(false);
  }

  onSavedExerciseSelect(key: string | null): void {
    if (!key) {
      this.savedExerciseKey.set(null);
      this.pendingExerciseTemplate = null;
      this.draftExerciseName = '';
      return;
    }
    const option = this.savedExerciseOptions().find((ex) => ex.key === key);
    if (!option) return;
    this.savedExerciseKey.set(option.key);
    this.pendingExerciseTemplate = option.template;
    this.draftExerciseName = option.name;
    this.draftExerciseSets = option.sets;
    this.draftExerciseReps = option.reps;
    this.draftExerciseLoadKg = option.loadKg;
    this.draftExerciseRestSec = option.restSec;
    this.draftExerciseRpe = option.rpe;
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

    if (this.exerciseConfigureMode() === 'add') {
      const template = this.pendingExerciseTemplate;
      if (!template) return;
      this.store.addExerciseFromTemplate(session.id, template, { sets, reps, loadKg, restSec, rpe });
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
