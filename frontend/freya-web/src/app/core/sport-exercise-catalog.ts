import { SportKind, SportDisciplineId } from './sport.store';

export interface ExerciseTemplate {
  id: string;
  name: string;
  muscle: string;
  emoji: string;
  defaultSets: number;
  defaultReps: number;
  defaultLoadKg: number | null;
  defaultRestSec: number;
  defaultRpe: number;
}

const T = (
  id: string,
  name: string,
  muscle: string,
  emoji: string,
  sets = 3,
  reps = 10,
  loadKg: number | null = null,
  restSec = 90,
  rpe = 7
): ExerciseTemplate => ({
  id,
  name,
  muscle,
  emoji,
  defaultSets: sets,
  defaultReps: reps,
  defaultLoadKg: loadKg,
  defaultRestSec: restSec,
  defaultRpe: rpe
});

const MUSCU: ExerciseTemplate[] = [
  T('mp-bench', 'Développé couché', 'Pectoraux', '🏋️', 4, 8, 60),
  T('mp-incline', 'Développé incliné', 'Pectoraux', '🏋️', 3, 10, 45),
  T('mp-squat', 'Squat', 'Jambes', '🦵', 4, 8, 80),
  T('mp-deadlift', 'Soulevé de terre', 'Chaîne postérieure', '💪', 4, 5, 100, 180, 8),
  T('mp-row', 'Rowing barre', 'Dos', '💪', 4, 8, 50),
  T('mp-pull', 'Tirage vertical', 'Dos', '💪', 3, 10, 45),
  T('mp-ohp', 'Développé militaire', 'Épaules', '🏋️', 3, 10, 35),
  T('mp-lat', 'Élévations latérales', 'Épaules', '🦾', 3, 15, 8, 60, 7),
  T('mp-curl', 'Curl biceps', 'Bras', '💪', 3, 12, 12, 60),
  T('mp-triceps', 'Extensions triceps', 'Bras', '🦾', 3, 12, 20, 60)
];

const FORCE = [
  ...MUSCU,
  T('f-squat-5', 'Squat 5×5', 'Jambes', '🦵', 5, 5, 90, 180, 8),
  T('f-bench-5', 'Bench 5×5', 'Pectoraux', '🏋️', 5, 5, 70, 180, 8)
];

const COURSE: ExerciseTemplate[] = [
  T('ru-warm', 'Échauffement 10 min', 'Cardio', '🏃', 1, 1, null, 0, 5),
  T('ru-easy', 'Footing zone 2', 'Endurance', '🏃', 1, 1, null, 0, 6),
  T('ru-tempo', 'Séance tempo 20 min', 'Endurance', '⏱️', 1, 1, null, 0, 7),
  T('ru-interval', 'Fractionné 6×400 m', 'VMA', '⚡', 6, 1, null, 120, 8),
  T('ru-long', 'Sortie longue', 'Endurance', '🏃', 1, 1, null, 0, 6),
  T('ru-cool', 'Retour au calme', 'Récup', '🧘', 1, 1, null, 0, 4)
];

const NATATION: ExerciseTemplate[] = [
  T('sw-warm', 'Échauffement 200 m', 'Échauffement', '🏊', 1, 1, null, 60, 5),
  T('sw-crawl', 'Crawl 8×50 m', 'Brasse', '🏊', 8, 1, null, 45, 7),
  T('sw-back', 'Dos 4×50 m', 'Dos', '🏊', 4, 1, null, 45, 7),
  T('sw-breast', 'Brasse 4×50 m', 'Brasse', '🏊', 4, 1, null, 45, 6),
  T('sw-pull', 'Brasse coulée / pull', 'Dos', '💪', 4, 1, null, 60, 7),
  T('sw-cool', 'Récup 100 m cool', 'Récup', '🧘', 1, 1, null, 0, 4)
];

const VELO: ExerciseTemplate[] = [
  T('bi-warm', 'Échauffement 10 min', 'Cardio', '🚴', 1, 1, null, 0, 5),
  T('bi-z2', 'Zone 2 40 min', 'Endurance', '🚴', 1, 1, null, 0, 6),
  T('bi-interval', 'Intervalles 8×2 min', 'VMA', '⚡', 8, 1, null, 120, 8),
  T('bi-hill', 'Côtes 6 répétitions', 'Force', '🚴', 6, 1, null, 180, 8),
  T('bi-cool', 'Retour calme', 'Récup', '🧘', 1, 1, null, 0, 4)
];

const YOGA: ExerciseTemplate[] = [
  T('yo-flow', 'Salutation au soleil', 'Full body', '🧘', 3, 1, null, 30, 5),
  T('yo-hip', 'Ouverture hanches', 'Hanches', '🤸', 1, 1, null, 0, 5),
  T('yo-back', 'Mobilité dos', 'Dos', '🧘', 1, 1, null, 0, 5),
  T('yo-balance', 'Équilibre (arbre)', 'Stabilité', '🧘', 2, 1, null, 30, 5),
  T('yo-relax', 'Relaxation / shavasana', 'Récup', '😌', 1, 1, null, 0, 3)
];

const BOXE: ExerciseTemplate[] = [
  T('bx-warm', 'Échauffement shadow', 'Échauffement', '🥊', 1, 1, null, 0, 5),
  T('bx-jab', 'Enchaînement jab-cross', 'Technique', '🥊', 5, 3, null, 60, 7),
  T('bx-bag', 'Sac 3×3 min', 'Conditioning', '🥊', 3, 1, null, 60, 8),
  T('bx-foot', 'Travail pieds', 'Agilité', '👟', 4, 1, null, 45, 7),
  T('bx-core', 'Gainage combat', 'Core', '💪', 3, 1, null, 45, 7)
];

const VR: ExerciseTemplate[] = [
  T('vr-warm', 'Échauffement VR 5 min', 'Échauffement', '🥽', 1, 1, null, 0, 5),
  T('vr-beatsaber', 'Beat Saber — session', 'Cardio', '🎵', 1, 1, null, 0, 7),
  T('vr-fitxr', 'FitXR — boxing', 'Cardio', '🥊', 1, 1, null, 0, 8),
  T('vr-supernatural', 'Supernatural — workout', 'Full body', '✨', 1, 1, null, 0, 7),
  T('vr-cool', 'Étirements debout', 'Récup', '🧘', 1, 1, null, 0, 4)
];

const MOBILITE: ExerciseTemplate[] = [
  T('mo-cat', 'Chat-vache', 'Colonne', '🐈', 2, 10, null, 30, 4),
  T('mo-hip-90', 'Mobilité 90/90', 'Hanches', '🤸', 2, 8, null, 30, 5),
  T('mo-shoulder', 'Dislocations bande', 'Épaules', '🦾', 3, 12, null, 45, 5),
  T('mo-ham', 'Étirement ischios', 'Jambes', '🦵', 2, 45, null, 30, 4),
  T('mo-foam', 'Rouleau foam roller', 'Récup', '🧘', 1, 1, null, 0, 4)
];

const HIIT: ExerciseTemplate[] = [
  T('hi-warm', 'Échauffement 5 min', 'Cardio', '⚡', 1, 1, null, 0, 5),
  T('hi-circuit', 'Circuit 4 tours', 'Full body', '🔥', 4, 1, null, 60, 8),
  T('hi-burpee', 'Burpees 5×10', 'Conditioning', '💥', 5, 10, null, 60, 8),
  T('hi-tabata', 'Tabata 8×20 s', 'VMA', '⏱️', 8, 1, null, 10, 9),
  T('hi-cool', 'Retour calme', 'Récup', '🧘', 1, 1, null, 0, 4)
];

const GENERIC: ExerciseTemplate[] = [
  T('gen-warm', 'Échauffement', 'Préparation', '🏅', 1, 1, null, 0, 5),
  T('gen-main', 'Bloc principal', 'Séance', '🏋️', 1, 1, null, 0, 7),
  T('gen-cool', 'Retour au calme', 'Récup', '🧘', 1, 1, null, 0, 4)
];

const BY_DISCIPLINE: Partial<Record<SportDisciplineId | string, ExerciseTemplate[]>> = {
  musculation: MUSCU,
  force: FORCE,
  course: COURSE,
  marche: COURSE,
  natation: NATATION,
  velo: VELO,
  yoga: YOGA,
  boxe: BOXE,
  mobilite: MOBILITE,
  hiit: HIIT,
  vr_beatsaber: VR,
  vr_boxvr: VR,
  vr_fitxr: VR,
  vr_supernatural: VR,
  escalade: [
    T('cl-warm', 'Échauffement doigts / épaules', 'Préparation', '🧗', 1, 1, null, 0, 5),
    T('cl-bloc', 'Bloc 20 min', 'Bloc', '🧗', 1, 1, null, 0, 8),
    T('cl-pull', 'Tractions', 'Dos', '💪', 4, 6, null, 120, 7),
    ...MOBILITE.slice(0, 2)
  ],
  tennis: [
    T('te-warm', 'Échauffement raquette', 'Préparation', '🎾', 1, 1, null, 0, 5),
    T('te-drill', 'Drills fond de court', 'Technique', '🎾', 4, 1, null, 60, 7),
    T('te-match', 'Jeu libre / sets', 'Match', '🎾', 1, 1, null, 0, 7)
  ],
  football: [
    T('fb-warm', 'Échauffement ballon', 'Préparation', '⚽', 1, 1, null, 0, 5),
    T('fb-tech', 'Technique passes', 'Technique', '⚽', 4, 1, null, 45, 6),
    T('fb-match', 'Match / jeu réduit', 'Match', '⚽', 1, 1, null, 0, 8)
  ],
  custom: GENERIC
};

const BY_KIND: Record<SportKind, ExerciseTemplate[]> = {
  musculation: MUSCU,
  course: COURSE,
  velo: VELO,
  natation: NATATION,
  mobilite: MOBILITE,
  autre: GENERIC
};

export function exerciseTemplatesForDay(
  disciplineId: string | null | undefined,
  kind: SportKind | null | undefined
): ExerciseTemplate[] {
  if (disciplineId && BY_DISCIPLINE[disciplineId]?.length) {
    return BY_DISCIPLINE[disciplineId]!;
  }
  if (kind && BY_KIND[kind]?.length) {
    return BY_KIND[kind];
  }
  return GENERIC;
}

export function filterExerciseTemplates(
  templates: ExerciseTemplate[],
  query: string
): ExerciseTemplate[] {
  const q = query.trim().toLowerCase();
  if (!q) return templates;
  return templates.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.muscle.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q)
  );
}
