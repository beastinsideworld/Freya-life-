import { Injectable, computed, signal } from '@angular/core';
import { resolveAssetUrl } from './asset-url';
import { createId } from './id';
import type { ExerciseTemplate } from './sport-exercise-catalog';

export type SportTab = 'suivi' | 'entrainement' | 'progression';
export type SportKind = 'musculation' | 'course' | 'velo' | 'natation' | 'mobilite' | 'autre';

export type SportDisciplineId =
  | 'musculation'
  | 'force'
  | 'course'
  | 'natation'
  | 'velo'
  | 'yoga'
  | 'boxe'
  | 'vr_beatsaber'
  | 'vr_boxvr'
  | 'vr_fitxr'
  | 'vr_supernatural'
  | 'hiit'
  | 'mobilite'
  | 'escalade'
  | 'tennis'
  | 'football'
  | 'marche'
  | 'custom';

export interface SportDisciplineOption {
  id: SportDisciplineId;
  label: string;
  category: string;
  kind: SportKind;
  emoji: string;
  keywords: string[];
}

export const SPORT_DISCIPLINE_CATEGORIES = [
  'Toutes',
  'Cardio',
  'Renfo',
  'VR & Quest',
  'Mind-body',
  'Sports collectifs',
  'Autre'
] as const;

export type SportDisciplineCategory = (typeof SPORT_DISCIPLINE_CATEGORIES)[number];

export const SPORT_DISCIPLINE_CATALOG: SportDisciplineOption[] = [
  {
    id: 'course',
    label: 'Course à pied',
    category: 'Cardio',
    kind: 'course',
    emoji: '🏃',
    keywords: ['running', 'jogging', 'trail']
  },
  {
    id: 'natation',
    label: 'Natation',
    category: 'Cardio',
    kind: 'natation',
    emoji: '🏊',
    keywords: ['piscine', 'nage', 'crawl']
  },
  {
    id: 'velo',
    label: 'Vélo',
    category: 'Cardio',
    kind: 'velo',
    emoji: '🚴',
    keywords: ['vélo', 'home trainer', 'zwift', 'cyclisme']
  },
  {
    id: 'marche',
    label: 'Marche rapide',
    category: 'Cardio',
    kind: 'course',
    emoji: '🚶',
    keywords: ['marche', 'rando', 'nordic']
  },
  {
    id: 'hiit',
    label: 'HIIT',
    category: 'Cardio',
    kind: 'autre',
    emoji: '⚡',
    keywords: ['interval', 'tabata', 'cardio']
  },
  {
    id: 'musculation',
    label: 'Musculation',
    category: 'Renfo',
    kind: 'musculation',
    emoji: '🏋️',
    keywords: ['hypertrophie', 'salles', 'poids']
  },
  {
    id: 'force',
    label: 'Force / Powerlifting',
    category: 'Renfo',
    kind: 'musculation',
    emoji: '💪',
    keywords: ['squat', 'deadlift', 'haltéro']
  },
  {
    id: 'vr_beatsaber',
    label: 'Beat Saber (Quest)',
    category: 'VR & Quest',
    kind: 'autre',
    emoji: '🎵',
    keywords: ['meta quest', 'vr', 'rhythm', 'sabre']
  },
  {
    id: 'vr_boxvr',
    label: 'BoxVR / Thrill of the Fight',
    category: 'VR & Quest',
    kind: 'autre',
    emoji: '🥽',
    keywords: ['boxvr', 'quest', 'vr', 'boxe']
  },
  {
    id: 'vr_fitxr',
    label: 'FitXR',
    category: 'VR & Quest',
    kind: 'autre',
    emoji: '🥊',
    keywords: ['fitxr', 'meta quest', 'cardio vr']
  },
  {
    id: 'vr_supernatural',
    label: 'Supernatural VR',
    category: 'VR & Quest',
    kind: 'autre',
    emoji: '✨',
    keywords: ['supernatural', 'quest', 'vr fitness']
  },
  {
    id: 'yoga',
    label: 'Yoga',
    category: 'Mind-body',
    kind: 'mobilite',
    emoji: '🧘',
    keywords: ['stretch', 'souplesse', 'flow']
  },
  {
    id: 'mobilite',
    label: 'Mobilité / Étirements',
    category: 'Mind-body',
    kind: 'mobilite',
    emoji: '🤸',
    keywords: ['stretching', 'récup', 'souplesse']
  },
  {
    id: 'boxe',
    label: 'Boxe',
    category: 'Autre',
    kind: 'autre',
    emoji: '🥊',
    keywords: ['muay thai', 'kick', 'sac']
  },
  {
    id: 'escalade',
    label: 'Escalade',
    category: 'Autre',
    kind: 'autre',
    emoji: '🧗',
    keywords: ['bloc', 'voie', 'mur']
  },
  {
    id: 'tennis',
    label: 'Tennis / Padel',
    category: 'Sports collectifs',
    kind: 'autre',
    emoji: '🎾',
    keywords: ['padel', 'raquette']
  },
  {
    id: 'football',
    label: 'Football',
    category: 'Sports collectifs',
    kind: 'autre',
    emoji: '⚽',
    keywords: ['five', 'futsal']
  }
];

export function disciplineById(id: string | null | undefined): SportDisciplineOption | null {
  if (!id || id === 'custom') return null;
  return SPORT_DISCIPLINE_CATALOG.find((d) => d.id === id) ?? null;
}

export function disciplineLabel(
  disciplineId: string | null | undefined,
  customLabel?: string | null
): string {
  if (disciplineId === 'custom' && customLabel?.trim()) return customLabel.trim();
  const d = disciplineById(disciplineId);
  if (d) return d.label;
  return customLabel?.trim() || 'Choisir un sport';
}

export function disciplineEmoji(disciplineId: string | null | undefined): string {
  const d = disciplineById(disciplineId);
  if (d) return d.emoji;
  return '🏅';
}

export function defaultDisciplineIdForKind(kind: SportKind | null | undefined): SportDisciplineId | null {
  switch (kind) {
    case 'musculation':
      return 'musculation';
    case 'course':
      return 'course';
    case 'velo':
      return 'velo';
    case 'natation':
      return 'natation';
    case 'mobilite':
      return 'mobilite';
    default:
      return null;
  }
}

export function filterSportDisciplines(
  query: string,
  category: SportDisciplineCategory
): SportDisciplineOption[] {
  const q = query
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  return SPORT_DISCIPLINE_CATALOG.filter((d) => {
    if (category !== 'Toutes' && d.category !== category) return false;
    if (!q) return true;
    const hay = [d.label, d.category, ...d.keywords]
      .join(' ')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '');
    return hay.includes(q) || d.label.toLowerCase().includes(query.trim().toLowerCase());
  });
}
export type SportSex = 'F' | 'M';
export type ActivityLevel = 'sedentaire' | 'leger' | 'modere' | 'actif' | 'tres_actif';
export type GoalType = 'perte' | 'maintien' | 'prise_seche' | 'prise_muscle' | 'recomposition';

export interface SportGoal {
  type: GoalType;
  title: string;
  weightMinKg: number;
  weightMaxKg: number;
  startLabel: string;
  endLabel: string;
  progressPct: number;
  sex: SportSex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  bmrKcal: number;
  tdeeKcal: number;
  targetKcal: number;
}

export const GOAL_TYPE_OPTIONS: Array<{ value: GoalType; label: string; hint: string }> = [
  { value: 'perte', label: 'Perte de poids', hint: 'Déficit calorique progressif' },
  { value: 'maintien', label: 'Maintien du poids', hint: 'Équilibre dépense / apport' },
  { value: 'prise_seche', label: 'Prise de muscle (lean bulk)', hint: 'Léger surplus propre' },
  { value: 'prise_muscle', label: 'Prise de masse', hint: 'Surplus plus marqué' },
  { value: 'recomposition', label: 'Recomposition', hint: 'Maintien avec focus protéines' }
];

export const ACTIVITY_OPTIONS: Array<{ value: ActivityLevel; label: string; factor: number }> = [
  { value: 'sedentaire', label: 'Sédentaire (peu ou pas de sport)', factor: 1.2 },
  { value: 'leger', label: 'Légèrement actif (1–3 séances / sem.)', factor: 1.375 },
  { value: 'modere', label: 'Modérément actif (3–5 séances / sem.)', factor: 1.55 },
  { value: 'actif', label: 'Actif (6–7 séances / sem.)', factor: 1.725 },
  { value: 'tres_actif', label: 'Très actif (2× / jour ou métier physique)', factor: 1.9 }
];

/** Mifflin–St Jeor + multiplicateur d’activité + ajustement d’objectif. */
export function computeEnergy(input: {
  sex: SportSex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  type: GoalType;
}): { bmr: number; tdee: number; targetKcal: number; macros: MacroTargets; title: string } {
  const weight = Math.max(30, input.weightKg);
  const height = Math.max(120, input.heightCm);
  const age = Math.max(14, Math.min(90, input.age));
  const bmrRaw =
    input.sex === 'M'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;
  const bmr = Math.round(bmrRaw);
  const factor = ACTIVITY_OPTIONS.find((a) => a.value === input.activity)?.factor ?? 1.2;
  const tdee = Math.round(bmr * factor);

  let target = tdee;
  switch (input.type) {
    case 'perte':
      target = tdee - 450;
      break;
    case 'maintien':
      target = tdee;
      break;
    case 'prise_seche':
      target = tdee + 250;
      break;
    case 'prise_muscle':
      target = tdee + 450;
      break;
    case 'recomposition':
      target = tdee - 150;
      break;
  }
  target = Math.max(1200, target);

  const proteinPerKg =
    input.type === 'perte' || input.type === 'recomposition'
      ? 2.0
      : input.type === 'prise_seche' || input.type === 'prise_muscle'
        ? 1.8
        : 1.6;
  const fatPerKg = input.type === 'perte' ? 0.8 : 0.9;
  const proteinG = Math.round(weight * proteinPerKg);
  const fatG = Math.round(weight * fatPerKg);
  const carbsG = Math.max(0, Math.round((target - proteinG * 4 - fatG * 9) / 4));

  const title = GOAL_TYPE_OPTIONS.find((g) => g.value === input.type)?.label ?? 'Objectif';
  return {
    bmr,
    tdee,
    targetKcal: target,
    macros: { kcal: target, proteinG, carbsG, fatG },
    title
  };
}

export interface MacroTargets {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MacroCurrent {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface SportMeal {
  id: string;
  slot: string;
  title: string;
  detail: string;
  emoji: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface WeeklyTrainingGoal {
  done: number;
  target: number;
  musculationDone: number;
  musculationTarget: number;
  courseDone: number;
  courseTarget: number;
  veloDone: number;
  veloTarget: number;
}

export interface SportExercise {
  id: string;
  /** Id du catalogue (sport-exercise-catalog) pour suivre le record par exercice. */
  templateId?: string;
  name: string;
  muscle: string;
  emoji: string;
  sets: number;
  reps: number;
  loadKg: number | null;
  restSec: number;
  rpe: number;
  done: boolean;
}

/** Clé stable pour agréger le poids max par type d'exercice. */
export function exerciseTrackKey(templateId: string | undefined | null, name: string): string {
  if (templateId) return templateId;
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildExercisePersonalBests(sessions: DaySession[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const session of sessions) {
    for (const ex of session.exercises) {
      if (ex.loadKg == null || ex.loadKg <= 0) continue;
      if (!ex.done && !session.completed) continue;
      const key = exerciseTrackKey(ex.templateId, ex.name);
      map[key] = Math.max(map[key] ?? 0, ex.loadKg);
    }
  }
  return map;
}

export interface DaySession {
  id: string;
  date: string;
  kind: SportKind;
  disciplineId?: SportDisciplineId | string | null;
  customDiscipline?: string | null;
  title: string;
  detail: string;
  tags: string[];
  durationMin: number;
  exerciseCount: number;
  kcalEstimate: number;
  seriesTotal: number;
  volumeKg: number;
  completed: boolean;
  exercises: SportExercise[];
}

export interface WeekDayCard {
  date: string;
  label: string;
  kind: SportKind | null;
  disciplineId?: SportDisciplineId | string | null;
  customDiscipline?: string | null;
  title: string;
  detail: string;
  completed: boolean;
}

export interface WeightPoint {
  date: string;
  label: string;
  kg: number;
}

export interface PersonalRecord {
  id: string;
  name: string;
  value: string;
  emoji: string;
}

export interface LoadWeekPoint {
  label: string;
  kg: number;
}

export interface VolumeWeekPoint {
  label: string;
  musculation: number;
  course: number;
  autres: number;
}

export interface SportState {
  goal: SportGoal;
  targets: MacroTargets;
  current: MacroCurrent;
  meals: SportMeal[];
  weeklyGoal: WeeklyTrainingGoal;
  weekDays: WeekDayCard[];
  selectedDate: string;
  sessions: DaySession[];
  weightHistory: WeightPoint[];
  records: PersonalRecord[];
  loadProgress: LoadWeekPoint[];
  volumeWeeks: VolumeWeekPoint[];
  plannedSessions: number;
  doneSessions: number;
  avgNutrition: MacroCurrent;
  avgTargets: MacroTargets;
}

const STORAGE_KEY = 'freya.sport.v2';

function recomputeSession(session: DaySession): DaySession {
  const exercises = session.exercises;
  const seriesTotal = exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const volumeKg = Math.round(
    exercises.reduce((sum, ex) => sum + ex.sets * ex.reps * (ex.loadKg ?? 0), 0)
  );
  const exerciseCount = exercises.length;
  const restMin = exercises.reduce((sum, ex) => sum + Math.max(0, ex.sets - 1) * (ex.restSec / 60), 0);
  const workMin = exercises.reduce((sum, ex) => sum + ex.sets * (ex.reps > 15 ? 1.2 : 2), 0);
  const durationMin = exerciseCount > 0 ? Math.max(20, Math.round(restMin + workMin)) : session.durationMin;
  const kcalPerMin =
    session.kind === 'musculation' ? 6.5 : session.kind === 'course' || session.kind === 'natation' ? 9.5 : 7;
  const kcalEstimate = Math.round(durationMin * kcalPerMin);
  return {
    ...session,
    seriesTotal,
    volumeKg,
    exerciseCount,
    durationMin,
    kcalEstimate
  };
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDaysIso(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function weekdayShort(iso: string): string {
  const raw = new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short' });
  return raw.replace('.', '');
}

function dayMonth(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function demoState(): SportState {
  const today = todayIso();
  const mondayOffset = (new Date(`${today}T12:00:00`).getDay() + 6) % 7;
  const monday = addDaysIso(today, -mondayOffset);

  const sessionId = createId();
  const sessions: DaySession[] = [
    {
      id: createId(),
      date: addDaysIso(monday, 0),
      kind: 'musculation',
      disciplineId: 'musculation',
      title: 'Musculation - Bas du corps',
      detail: 'Jambes / Fessiers',
      tags: ['Hypertrophie'],
      durationMin: 75,
      exerciseCount: 6,
      kcalEstimate: 380,
      seriesTotal: 22,
      volumeKg: 7200,
      completed: true,
      exercises: []
    },
    {
      id: createId(),
      date: addDaysIso(monday, 1),
      kind: 'course',
      disciplineId: 'course',
      title: 'Course',
      detail: '5 km',
      tags: ['Endurance'],
      durationMin: 35,
      exerciseCount: 1,
      kcalEstimate: 320,
      seriesTotal: 0,
      volumeKg: 0,
      completed: true,
      exercises: []
    },
    {
      id: sessionId,
      date: today,
      kind: 'musculation',
      disciplineId: 'musculation',
      title: 'Musculation - Haut du corps',
      detail: 'Pecs / Dos / Épaules',
      tags: ['Force', 'Hypertrophie'],
      durationMin: 80,
      exerciseCount: 7,
      kcalEstimate: 420,
      seriesTotal: 25,
      volumeKg: 8540,
      completed: false,
      exercises: [
        {
          id: createId(),
          templateId: 'mp-bench',
          name: 'Développé couché',
          muscle: 'Pectoraux',
          emoji: '🏋️',
          sets: 4,
          reps: 8,
          loadKg: 100,
          restSec: 120,
          rpe: 8,
          done: true
        },
        {
          id: createId(),
          templateId: 'mp-pull',
          name: 'Tirage vertical',
          muscle: 'Dos',
          emoji: '💪',
          sets: 4,
          reps: 10,
          loadKg: 55,
          restSec: 90,
          rpe: 7,
          done: true
        },
        {
          id: createId(),
          templateId: 'mp-ohp',
          name: 'Développé militaire',
          muscle: 'Épaules',
          emoji: '🏋️',
          sets: 3,
          reps: 10,
          loadKg: 40,
          restSec: 90,
          rpe: 7,
          done: false
        },
        {
          id: createId(),
          name: 'Rowing haltère',
          muscle: 'Dos',
          emoji: '💪',
          sets: 3,
          reps: 12,
          loadKg: 28,
          restSec: 75,
          rpe: 8,
          done: false
        },
        {
          id: createId(),
          name: 'Élévations latérales',
          muscle: 'Épaules',
          emoji: '🦾',
          sets: 3,
          reps: 15,
          loadKg: 10,
          restSec: 60,
          rpe: 7,
          done: false
        },
        {
          id: createId(),
          name: 'Curl biceps',
          muscle: 'Bras',
          emoji: '💪',
          sets: 3,
          reps: 12,
          loadKg: 16,
          restSec: 60,
          rpe: 8,
          done: false
        },
        {
          id: createId(),
          name: 'Extensions triceps',
          muscle: 'Bras',
          emoji: '🦾',
          sets: 3,
          reps: 12,
          loadKg: 20,
          restSec: 60,
          rpe: 7,
          done: false
        }
      ]
    },
    {
      id: createId(),
      date: addDaysIso(today, 1),
      kind: 'velo',
      disciplineId: 'velo',
      title: 'Vélo',
      detail: '45 min zone 2',
      tags: ['Cardio'],
      durationMin: 45,
      exerciseCount: 1,
      kcalEstimate: 350,
      seriesTotal: 0,
      volumeKg: 0,
      completed: false,
      exercises: []
    },
    {
      id: createId(),
      date: addDaysIso(today, 2),
      kind: 'mobilite',
      disciplineId: 'mobilite',
      title: 'Mobilité',
      detail: 'Hanches / Dos',
      tags: ['Récup'],
      durationMin: 30,
      exerciseCount: 8,
      kcalEstimate: 120,
      seriesTotal: 0,
      volumeKg: 0,
      completed: false,
      exercises: []
    }
  ];

  const weekDays: WeekDayCard[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDaysIso(monday, i);
    const session = sessions.find((s) => s.date === date);
    return {
      date,
      label: `${weekdayShort(date)}. ${dayMonth(date)}`,
      kind: session?.kind ?? null,
      disciplineId: session?.disciplineId ?? defaultDisciplineIdForKind(session?.kind ?? null),
      customDiscipline: session?.customDiscipline ?? null,
      title: session?.title ?? 'Repos',
      detail: session?.detail ?? '—',
      completed: !!session?.completed
    };
  });

  const demoProfile = {
    sex: 'M' as SportSex,
    age: 28,
    heightCm: 178,
    weightKg: 76,
    activity: 'modere' as ActivityLevel,
    type: 'prise_seche' as GoalType
  };
  const energy = computeEnergy(demoProfile);

  return {
    goal: {
      type: demoProfile.type,
      title: energy.title,
      weightMinKg: 76,
      weightMaxKg: 82,
      startLabel: 'Nov. 2026',
      endLabel: 'Janv. 2027',
      progressPct: 63,
      sex: demoProfile.sex,
      age: demoProfile.age,
      heightCm: demoProfile.heightCm,
      weightKg: demoProfile.weightKg,
      activity: demoProfile.activity,
      bmrKcal: energy.bmr,
      tdeeKcal: energy.tdee,
      targetKcal: energy.targetKcal
    },
    targets: energy.macros,
    current: { kcal: 1980, proteinG: 156, carbsG: 230, fatG: 68 },
    meals: [
      {
        id: createId(),
        slot: 'Petit-déjeuner',
        title: 'Porridge avoine & fruits',
        detail: 'Avoine, banane, amandes',
        emoji: '🥣',
        kcal: 520,
        proteinG: 28,
        carbsG: 72,
        fatG: 14
      },
      {
        id: createId(),
        slot: 'Déjeuner',
        title: 'Poulet, riz & légumes',
        detail: 'Poulet grillé, riz basmati',
        emoji: '🍗',
        kcal: 720,
        proteinG: 55,
        carbsG: 78,
        fatG: 18
      },
      {
        id: createId(),
        slot: 'Collation',
        title: 'Yaourt grec & miel',
        detail: 'Yaourt 0%, miel, noix',
        emoji: '🥛',
        kcal: 210,
        proteinG: 22,
        carbsG: 18,
        fatG: 6
      },
      {
        id: createId(),
        slot: 'Dîner',
        title: 'Saumon, quinoa & brocolis',
        detail: 'Saumon, quinoa, légumes',
        emoji: '🐟',
        kcal: 530,
        proteinG: 41,
        carbsG: 42,
        fatG: 22
      }
    ],
    weeklyGoal: {
      done: 4,
      target: 5,
      musculationDone: 3,
      musculationTarget: 3,
      courseDone: 1,
      courseTarget: 2,
      veloDone: 0,
      veloTarget: 0
    },
    weekDays,
    selectedDate: today,
    sessions,
    weightHistory: [
      { date: '2026-08-11', label: '11 août', kg: 78 },
      { date: '2026-08-28', label: '28 août', kg: 77.6 },
      { date: '2026-09-12', label: '12 sept.', kg: 77.2 },
      { date: '2026-09-28', label: '28 sept.', kg: 76.8 },
      { date: '2026-10-14', label: '14 oct.', kg: 76.5 },
      { date: '2026-10-28', label: '28 oct.', kg: 76.3 },
      { date: '2026-11-09', label: '9 nov.', kg: 76 }
    ],
    records: [
      { id: createId(), name: 'Développé couché', value: '115 kg × 1', emoji: '🏋️' },
      { id: createId(), name: 'Dips lestés', value: '36 kg × 8', emoji: '💪' },
      { id: createId(), name: 'Tractions', value: '× 7', emoji: '🤸' },
      { id: createId(), name: 'Course 5 km', value: '24 min 31 s', emoji: '🏃' }
    ],
    loadProgress: [
      { label: 'S1', kg: 95 },
      { label: 'S2', kg: 97.5 },
      { label: 'S3', kg: 100 },
      { label: 'S4', kg: 102.5 },
      { label: 'S5', kg: 105 },
      { label: 'S6', kg: 107.5 },
      { label: 'S7', kg: 110 },
      { label: 'S8', kg: 115 }
    ],
    volumeWeeks: [
      { label: 'S1', musculation: 18, course: 2, autres: 1 },
      { label: 'S2', musculation: 20, course: 2, autres: 1 },
      { label: 'S3', musculation: 22, course: 3, autres: 1 },
      { label: 'S4', musculation: 21, course: 2, autres: 2 },
      { label: 'S5', musculation: 24, course: 3, autres: 1 },
      { label: 'S6', musculation: 23, course: 2, autres: 2 },
      { label: 'S7', musculation: 25, course: 3, autres: 1 },
      { label: 'S8', musculation: 26, course: 2, autres: 2 }
    ],
    plannedSessions: 26,
    doneSessions: 24,
    avgNutrition: { kcal: 2230, proteinG: 148, carbsG: 270, fatG: 72 },
    avgTargets: { kcal: 2200, proteinG: 150, carbsG: 275, fatG: 70 }
  };
}

function normalizeGoal(raw: Partial<SportGoal> | undefined, fallbackWeight: number): SportGoal {
  const base = demoState().goal;
  const sex: SportSex = raw?.sex === 'F' ? 'F' : 'M';
  const type: GoalType = (GOAL_TYPE_OPTIONS.some((g) => g.value === raw?.type)
    ? raw!.type
    : base.type) as GoalType;
  const activity: ActivityLevel = (ACTIVITY_OPTIONS.some((a) => a.value === raw?.activity)
    ? raw!.activity
    : base.activity) as ActivityLevel;
  const profile = {
    sex,
    age: Number(raw?.age || base.age),
    heightCm: Number(raw?.heightCm || base.heightCm),
    weightKg: Number(raw?.weightKg || fallbackWeight || base.weightKg),
    activity,
    type
  };
  const energy = computeEnergy(profile);
  return {
    ...base,
    ...raw,
    ...profile,
    title: energy.title,
    bmrKcal: energy.bmr,
    tdeeKcal: energy.tdee,
    targetKcal: energy.targetKcal,
    weightMinKg: Number(raw?.weightMinKg || profile.weightKg),
    weightMaxKg: Number(raw?.weightMaxKg || profile.weightKg + 4),
    progressPct: Math.max(0, Math.min(100, Number(raw?.progressPct ?? base.progressPct)))
  };
}

function normalizeSessionsAndDays(sessions: DaySession[], weekDays: WeekDayCard[]): {
  sessions: DaySession[];
  weekDays: WeekDayCard[];
} {
  const normSessions = sessions.map((s) => ({
    ...s,
    disciplineId: s.disciplineId ?? defaultDisciplineIdForKind(s.kind)
  }));
  const normDays = weekDays.map((d) => {
    const session = normSessions.find((s) => s.date === d.date);
    return {
      ...d,
      disciplineId:
        d.disciplineId ?? session?.disciplineId ?? defaultDisciplineIdForKind(d.kind ?? session?.kind),
      customDiscipline: d.customDiscipline ?? session?.customDiscipline ?? null,
      title: d.title || session?.title || 'Repos',
      detail: d.detail || session?.detail || '—',
      kind: d.kind ?? session?.kind ?? null
    };
  });
  return { sessions: normSessions, weekDays: normDays };
}

function loadState(): SportState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = demoState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as Partial<SportState>;
    const seeded = demoState();
    const merged: SportState = {
      ...seeded,
      ...parsed,
      goal: normalizeGoal(parsed.goal, seeded.goal.weightKg),
      meals: parsed.meals?.length ? parsed.meals : seeded.meals,
      sessions: parsed.sessions?.length ? parsed.sessions : seeded.sessions,
      weekDays: parsed.weekDays?.length ? parsed.weekDays : seeded.weekDays,
      weightHistory: parsed.weightHistory?.length ? parsed.weightHistory : seeded.weightHistory,
      records: parsed.records?.length ? parsed.records : seeded.records,
      loadProgress: parsed.loadProgress?.length ? parsed.loadProgress : seeded.loadProgress,
      volumeWeeks: parsed.volumeWeeks?.length ? parsed.volumeWeeks : seeded.volumeWeeks,
      targets: parsed.targets ?? seeded.targets,
      current: parsed.current ?? seeded.current,
      weeklyGoal: parsed.weeklyGoal ?? seeded.weeklyGoal,
      avgNutrition: parsed.avgNutrition ?? seeded.avgNutrition,
      avgTargets: parsed.avgTargets ?? seeded.avgTargets
    };
    // Recalcule les cibles macros si le profil est complet
    const energy = computeEnergy(merged.goal);
    merged.goal = {
      ...merged.goal,
      title: energy.title,
      bmrKcal: energy.bmr,
      tdeeKcal: energy.tdee,
      targetKcal: energy.targetKcal
    };
    if (!parsed.targets) merged.targets = energy.macros;
    const norm = normalizeSessionsAndDays(merged.sessions, merged.weekDays);
    merged.sessions = norm.sessions;
    merged.weekDays = norm.weekDays;
    return merged;
  } catch {
    return demoState();
  }
}

@Injectable({ providedIn: 'root' })
export class SportStore {
  private readonly state = signal<SportState>(loadState());

  readonly goal = computed(() => this.state().goal);
  readonly targets = computed(() => this.state().targets);
  readonly current = computed(() => this.state().current);
  readonly meals = computed(() => this.state().meals);
  readonly weeklyGoal = computed(() => this.state().weeklyGoal);
  readonly weekDays = computed(() => this.state().weekDays);
  readonly selectedDate = computed(() => this.state().selectedDate);
  readonly sessions = computed(() => this.state().sessions);
  readonly weightHistory = computed(() => this.state().weightHistory);
  readonly records = computed(() => this.state().records);
  readonly loadProgress = computed(() => this.state().loadProgress);
  readonly volumeWeeks = computed(() => this.state().volumeWeeks);
  readonly plannedSessions = computed(() => this.state().plannedSessions);
  readonly doneSessions = computed(() => this.state().doneSessions);
  readonly avgNutrition = computed(() => this.state().avgNutrition);
  readonly avgTargets = computed(() => this.state().avgTargets);

  readonly selectedSession = computed(() => {
    const date = this.selectedDate();
    return this.state().sessions.find((s) => s.date === date) ?? null;
  });

  readonly exercisePersonalBests = computed(() => buildExercisePersonalBests(this.state().sessions));

  personalBestKg(exercise: SportExercise): number | null {
    const key = exerciseTrackKey(exercise.templateId, exercise.name);
    const kg = this.exercisePersonalBests()[key];
    return kg != null && kg > 0 ? kg : null;
  }

  personalBestForTemplate(templateId: string): number | null {
    const kg = this.exercisePersonalBests()[templateId];
    return kg != null && kg > 0 ? kg : null;
  }

  readonly currentWeight = computed(() => {
    const hist = this.weightHistory();
    return hist[hist.length - 1]?.kg ?? 0;
  });

  readonly weightDelta7d = computed(() => {
    const hist = this.weightHistory();
    if (hist.length < 2) return 0;
    return Number((hist[hist.length - 1].kg - hist[hist.length - 2].kg).toFixed(1));
  });

  readonly weightDeltaPeriod = computed(() => {
    const hist = this.weightHistory();
    if (hist.length < 2) return 0;
    return Number((hist[hist.length - 1].kg - hist[0].kg).toFixed(1));
  });

  readonly regularityPct = computed(() => {
    const planned = this.plannedSessions() || 1;
    return Math.round((this.doneSessions() / planned) * 100);
  });

  readonly volumeTotal = computed(() =>
    this.volumeWeeks().reduce((s, w) => s + w.musculation + w.course + w.autres, 0)
  );

  selectDate(date: string): void {
    this.patch((s) => ({ ...s, selectedDate: date }));
  }

  /** Sport choisi pour un jour (catalogue ou nom libre). */
  setDayDiscipline(date: string, disciplineId: string, customLabel?: string): void {
    const custom = customLabel?.trim() ?? '';
    const catalog = disciplineById(disciplineId);
    const useCustom = disciplineId === 'custom' || (!catalog && custom.length > 0);
    const resolvedId: string = useCustom ? 'custom' : disciplineId;
    const option =
      catalog ??
      (useCustom
        ? {
            id: 'custom' as SportDisciplineId,
            label: custom,
            category: 'Autre',
            kind: 'autre' as SportKind,
            emoji: '🏅',
            keywords: []
          }
        : null);
    if (!option) return;

    const title = useCustom ? custom : option.label;
    const detail = option.category === 'Autre' && useCustom ? 'Personnalisé' : option.category;

    this.patch((s) => {
      const sessions = [...s.sessions];
      const idx = sessions.findIndex((x) => x.date === date);
      let session = idx >= 0 ? { ...sessions[idx] } : null;

      if (!session) {
        session = {
          id: createId(),
          date,
          kind: option.kind,
          disciplineId: resolvedId,
          customDiscipline: useCustom ? custom : null,
          title,
          detail,
          tags: [option.category],
          durationMin: 45,
          exerciseCount: 0,
          kcalEstimate: option.kind === 'musculation' ? 350 : 280,
          seriesTotal: 0,
          volumeKg: 0,
          completed: false,
          exercises: []
        };
        sessions.push(session);
      } else {
        session = {
          ...session,
          kind: option.kind,
          disciplineId: resolvedId,
          customDiscipline: useCustom ? custom : null,
          title,
          detail,
          tags: session.tags?.length ? session.tags : [option.category]
        };
        sessions[idx] = session;
      }

      const weekDays = s.weekDays.map((day) =>
        day.date === date
          ? {
              ...day,
              kind: option.kind,
              disciplineId: resolvedId,
              customDiscipline: useCustom ? custom : null,
              title,
              detail
            }
          : day
      );

      return {
        ...s,
        sessions,
        weekDays,
        selectedDate: date,
        plannedSessions: Math.max(s.plannedSessions, sessions.length)
      };
    });
  }

  updateSessionMeta(
    sessionId: string,
    input: { title: string; detail: string; durationMin?: number }
  ): void {
    const title = input.title.trim();
    if (!title) return;
    this.patch((s) => {
      const sessions = s.sessions.map((session) => {
        if (session.id !== sessionId) return session;
        const next = {
          ...session,
          title: title,
          detail: input.detail.trim() || session.detail,
          durationMin:
            input.durationMin != null && input.durationMin > 0
              ? Math.round(input.durationMin)
              : session.durationMin
        };
        return recomputeSession(next);
      });
      const session = sessions.find((x) => x.id === sessionId);
      const weekDays = session
        ? s.weekDays.map((day) =>
            day.date === session.date ? { ...day, title: session.title, detail: session.detail } : day
          )
        : s.weekDays;
      return { ...s, sessions, weekDays };
    });
  }

  addExerciseFromTemplate(
    sessionId: string,
    template: ExerciseTemplate,
    overrides?: Partial<Pick<SportExercise, 'sets' | 'reps' | 'loadKg' | 'restSec' | 'rpe'>>
  ): void {
    const sets = Math.max(1, Math.round(overrides?.sets ?? template.defaultSets));
    const reps = Math.max(1, Math.round(overrides?.reps ?? template.defaultReps));
    let loadKg = template.defaultLoadKg;
    if (overrides && 'loadKg' in overrides) {
      loadKg = overrides.loadKg ?? null;
    }
    this.patch((s) => ({
      ...s,
      sessions: s.sessions.map((session) => {
        if (session.id !== sessionId) return session;
        const exercise: SportExercise = {
          id: createId(),
          templateId: template.id,
          name: template.name,
          muscle: template.muscle,
          emoji: template.emoji,
          sets,
          reps,
          loadKg,
          restSec: overrides?.restSec != null ? Math.max(0, Math.round(overrides.restSec)) : template.defaultRestSec,
          rpe: overrides?.rpe != null ? Math.min(10, Math.max(1, Math.round(overrides.rpe))) : template.defaultRpe,
          done: false
        };
        return recomputeSession({ ...session, exercises: [...session.exercises, exercise] });
      })
    }));
  }

  updateExercise(
    sessionId: string,
    exerciseId: string,
    input: { sets?: number; reps?: number; loadKg?: number | null; restSec?: number; rpe?: number }
  ): void {
    this.patch((s) => ({
      ...s,
      sessions: s.sessions.map((session) => {
        if (session.id !== sessionId) return session;
        const exercises = session.exercises.map((ex) => {
          if (ex.id !== exerciseId) return ex;
          const sets =
            input.sets != null && Number.isFinite(input.sets)
              ? Math.max(1, Math.round(input.sets))
              : ex.sets;
          const reps =
            input.reps != null && Number.isFinite(input.reps)
              ? Math.max(1, Math.round(input.reps))
              : ex.reps;
          let loadKg = ex.loadKg;
          if ('loadKg' in input) {
            const raw = input.loadKg;
            loadKg = raw == null || !Number.isFinite(raw) || raw < 0 ? null : raw;
          }
          const restSec =
            input.restSec != null && Number.isFinite(input.restSec)
              ? Math.max(0, Math.round(input.restSec))
              : ex.restSec;
          const rpe =
            input.rpe != null && Number.isFinite(input.rpe)
              ? Math.min(10, Math.max(1, Math.round(input.rpe)))
              : ex.rpe;
          return { ...ex, sets, reps, loadKg, restSec, rpe };
        });
        return recomputeSession({ ...session, exercises });
      })
    }));
  }

  removeExercise(sessionId: string, exerciseId: string): void {
    this.patch((s) => ({
      ...s,
      sessions: s.sessions.map((session) => {
        if (session.id !== sessionId) return session;
        const exercises = session.exercises.filter((ex) => ex.id !== exerciseId);
        return recomputeSession({ ...session, exercises });
      })
    }));
  }

  toggleExercise(sessionId: string, exerciseId: string): void {
    this.patch((s) => ({
      ...s,
      sessions: s.sessions.map((session) =>
        session.id !== sessionId
          ? session
          : {
              ...session,
              exercises: session.exercises.map((ex) =>
                ex.id === exerciseId ? { ...ex, done: !ex.done } : ex
              )
            }
      )
    }));
  }

  completeSession(sessionId: string): void {
    this.patch((s) => ({
      ...s,
      sessions: s.sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              completed: true,
              exercises: session.exercises.map((ex) => ({ ...ex, done: true }))
            }
          : session
      ),
      weekDays: s.weekDays.map((day) => {
        const session = s.sessions.find((x) => x.id === sessionId);
        return session && day.date === session.date ? { ...day, completed: true } : day;
      }),
      weeklyGoal: {
        ...s.weeklyGoal,
        done: Math.min(s.weeklyGoal.target, s.weeklyGoal.done + 1)
      }
    }));
  }

  updateGoal(input: {
    type: GoalType;
    sex: SportSex;
    age: number;
    heightCm: number;
    weightKg: number;
    activity: ActivityLevel;
    weightMinKg: number;
    weightMaxKg: number;
    startLabel: string;
    endLabel: string;
  }): void {
    const energy = computeEnergy(input);
    const today = todayIso();
    const label = new Date(`${today}T12:00:00`).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    });

    this.patch((s) => {
      const last = s.weightHistory[s.weightHistory.length - 1];
      const weightHistory =
        last && Math.abs(last.kg - input.weightKg) < 0.05
          ? s.weightHistory.map((p, i) =>
              i === s.weightHistory.length - 1 ? { ...p, kg: input.weightKg } : p
            )
          : [...s.weightHistory, { date: today, label, kg: input.weightKg }];

      const span = Math.max(0.1, input.weightMaxKg - input.weightMinKg);
      const progressPct = Math.max(
        0,
        Math.min(100, Math.round(((input.weightKg - input.weightMinKg) / span) * 100))
      );

      return {
        ...s,
        goal: {
          ...s.goal,
          type: input.type,
          title: energy.title,
          sex: input.sex,
          age: input.age,
          heightCm: input.heightCm,
          weightKg: input.weightKg,
          activity: input.activity,
          weightMinKg: input.weightMinKg,
          weightMaxKg: input.weightMaxKg,
          startLabel: input.startLabel.trim() || s.goal.startLabel,
          endLabel: input.endLabel.trim() || s.goal.endLabel,
          progressPct,
          bmrKcal: energy.bmr,
          tdeeKcal: energy.tdee,
          targetKcal: energy.targetKcal
        },
        targets: energy.macros,
        avgTargets: energy.macros,
        weightHistory
      };
    });
  }

  private patch(updater: (s: SportState) => SportState): void {
    const next = updater(this.state());
    this.state.set(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
}

/** Icônes muscu — thèmes Ange / Démon. */
export const MUSCU_ICON = {
  haltere: 'assets/themes/ange/muscu/haltere.png',
  kettlebell: 'assets/themes/ange/muscu/kettlebell.png',
  banc: 'assets/themes/ange/muscu/banc.png',
  disques: 'assets/themes/ange/muscu/disques.png',
  shaker: 'assets/themes/ange/muscu/shaker.png',
  programme: 'assets/themes/ange/muscu/programme.png',
  trophee: 'assets/themes/ange/muscu/trophee.png'
} as const;

export const MUSCU_ICON_DEMON = {
  haltere: 'assets/themes/demon/muscu/haltere.png',
  kettlebell: 'assets/themes/demon/muscu/kettlebell.png',
  banc: 'assets/themes/demon/muscu/banc.png',
  disques: 'assets/themes/demon/muscu/disques.png',
  shaker: 'assets/themes/demon/muscu/shaker.png',
  programme: 'assets/themes/demon/muscu/programme.png',
  trophee: 'assets/themes/demon/muscu/trophee.png'
} as const;

const eteMuscu = (file: string) => `assets/themes/ete/muscu/${encodeURIComponent(file)}`;

/** Icônes Été — noms de fichiers d’origine (Design theme / ETE). */
export const MUSCU_ICON_ETE = {
  haltere: eteMuscu('Haltère doré sous le soleil tropical-1.png'),
  kettlebell: eteMuscu('Kettlebell tropical aux accents dorés-2.png'),
  banc: eteMuscu('Banc de musculation tropical doré-3.png'),
  disques: eteMuscu('Emblème fitness tropical aux disques dorés-4.png'),
  shaker: eteMuscu('Shaker tropical aux fleurs et coquillages.png'),
  programme: eteMuscu('Programme (2).png'),
  trophee: 'assets/themes/ete/muscu/trophee.png'
} as const;

export const MUSCU_ICON_AUTOMNE = {
  haltere: 'assets/themes/automne/muscu/haltere.png',
  kettlebell: 'assets/themes/automne/muscu/kettlebell.png',
  banc: 'assets/themes/automne/muscu/banc.png',
  disques: 'assets/themes/automne/muscu/disques.png',
  shaker: 'assets/themes/automne/muscu/shaker.png',
  programme: 'assets/themes/automne/muscu/programme.png',
  trophee: 'assets/themes/automne/muscu/trophee.png'
} as const;

export const MUSCU_ICON_PRINTEMPS = {
  haltere: 'assets/themes/printemps/muscu/haltere.png',
  kettlebell: 'assets/themes/printemps/muscu/kettlebell.png',
  banc: 'assets/themes/printemps/muscu/banc.png',
  disques: 'assets/themes/printemps/muscu/disques.png',
  shaker: 'assets/themes/printemps/muscu/shaker.png',
  programme: 'assets/themes/printemps/muscu/programme.png',
  trophee: 'assets/themes/printemps/muscu/trophee.png'
} as const;

export const MUSCU_ICON_HIVER = {
  haltere: 'assets/themes/hiver/muscu/haltere.png',
  kettlebell: 'assets/themes/hiver/muscu/kettlebell.png',
  banc: 'assets/themes/hiver/muscu/banc.png',
  disques: 'assets/themes/hiver/muscu/disques.png',
  shaker: 'assets/themes/hiver/muscu/shaker.png',
  programme: 'assets/themes/hiver/muscu/programme.png',
  trophee: 'assets/themes/hiver/muscu/trophee.png'
} as const;

export type MuscuIconKey = keyof typeof MUSCU_ICON;

export function muscuIconsForTheme():
  | typeof MUSCU_ICON
  | typeof MUSCU_ICON_DEMON
  | typeof MUSCU_ICON_ETE
  | typeof MUSCU_ICON_HIVER
  | typeof MUSCU_ICON_AUTOMNE
  | typeof MUSCU_ICON_PRINTEMPS {
  const t = document.documentElement.getAttribute('data-theme');
  if (t === 'demon') return MUSCU_ICON_DEMON;
  if (t === 'ete') return MUSCU_ICON_ETE;
  if (t === 'hiver') return MUSCU_ICON_HIVER;
  if (t === 'automne') return MUSCU_ICON_AUTOMNE;
  if (t === 'printemps') return MUSCU_ICON_PRINTEMPS;
  return MUSCU_ICON;
}

export function muscuIcon(key: MuscuIconKey): string {
  return resolveAssetUrl(muscuIconsForTheme()[key]);
}

export function kindIcon(kind: SportKind | null | undefined): string {
  switch (kind) {
    case 'musculation':
      return '🏋️';
    case 'course':
      return '🏃';
    case 'velo':
      return '🚴';
    case 'natation':
      return '🏊';
    case 'mobilite':
      return '🧘';
    default:
      return '⏸';
  }
}

/** Icône PNG muscu pour le type de séance. */
export function kindIconSrc(kind: SportKind | null | undefined): string {
  const icons = muscuIconsForTheme();
  let path: string = icons.programme;
  switch (kind) {
    case 'musculation':
      path = icons.haltere;
      break;
    case 'course':
      path = icons.programme;
      break;
    case 'velo':
      path = icons.kettlebell;
      break;
    case 'natation':
      path = icons.disques;
      break;
    case 'mobilite':
      path = icons.shaker;
      break;
  }
  return resolveAssetUrl(path);
}

/** Mappe un emoji d’exercice / record vers une icône muscu. */
export function exerciseIconSrc(emoji: string | null | undefined): string {
  const icons = muscuIconsForTheme();
  let path: string = icons.haltere;
  switch (emoji) {
    case '🏋️':
      path = icons.haltere;
      break;
    case '💪':
      path = icons.kettlebell;
      break;
    case '🦾':
      path = icons.disques;
      break;
    case '🤸':
      path = icons.banc;
      break;
    case '🏃':
      path = icons.programme;
      break;
    case '🥣':
    case '🍗':
    case '🥛':
    case '🐟':
      path = icons.shaker;
      break;
  }
  return resolveAssetUrl(path);
}

export function pct(current: number, target: number): number {
  if (!target) return 0;
  return Math.min(120, Math.round((current / target) * 100));
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  if (!m) return `${h} h`;
  return `${h} h ${String(m).padStart(2, '0')}`;
}

export function formatRest(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}'${String(s).padStart(2, '0')}`;
}
