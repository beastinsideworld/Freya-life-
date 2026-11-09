import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { resolveAssetUrl } from '../../core/asset-url';
import {
  ACTIVITY_OPTIONS,
  ActivityLevel,
  computeEnergy,
  exerciseIconSrc,
  formatDuration,
  formatRest,
  GOAL_TYPE_OPTIONS,
  GoalType,
  kindIcon,
  kindIconSrc,
  MUSCU_ICON,
  muscuIcon,
  pct,
  SportSex,
  SportStore,
  SportTab
} from '../../core/sport.store';

@Component({
  selector: 'app-sport',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './sport.component.html',
  styleUrl: './sport.component.scss'
})
export class SportComponent {
  readonly store = inject(SportStore);
  readonly icons = MUSCU_ICON;
  readonly assetUrl = resolveAssetUrl;
  readonly muscuIcon = muscuIcon;
  readonly exerciseIconSrc = exerciseIconSrc;
  readonly kindIconSrc = kindIconSrc;
  readonly tab = signal<SportTab>('suivi');
  readonly period = signal<'1 mois' | '3 mois' | '6 mois'>('3 mois');
  readonly sportFilter = signal('Tous les sports');
  readonly loadExercise = signal('Développé couché');
  readonly goalFormOpen = signal(false);

  readonly goalTypes = GOAL_TYPE_OPTIONS;
  readonly activityOptions = ACTIVITY_OPTIONS;

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
