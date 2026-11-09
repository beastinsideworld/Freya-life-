export type ThemeId =
  | 'freya'
  | 'feu'
  | 'eau'
  | 'vent'
  | 'glace'
  | 'electricite'
  | 'ange'
  | 'demon'
  | 'rouge'
  | 'or'
  | 'violet'
  | 'bleu'
  | 'vert'
  | 'rose'
  | 'noir'
  | 'ete'
  | 'automne'
  | 'hiver';

export interface ThemeOption {
  id: ThemeId;
  label: string;
  swatch: string;
}

export interface ThemeCategory {
  id: string;
  label: string;
  description: string;
  themes: ThemeOption[];
}

export const THEME_CATEGORIES: ThemeCategory[] = [
  {
    id: 'classique',
    label: 'Classique',
    description: 'Thème Freya noir/bordeaux — Playfair & Poppins.',
    themes: [{ id: 'freya', label: 'Freya Rose-gold', swatch: '#ff9caf' }]
  },
  {
    id: 'elements',
    label: 'Éléments',
    description: 'Feu, eau, vent, glace et électricité.',
    themes: [
      { id: 'feu', label: 'Feu', swatch: '#d4452f' },
      { id: 'eau', label: 'Eau', swatch: '#2f7fd4' },
      { id: 'vent', label: 'Vent', swatch: '#7ec8a3' },
      { id: 'glace', label: 'Glace', swatch: '#9fd4ef' },
      { id: 'electricite', label: 'Électricité', swatch: '#f0d23c' }
    ]
  },
  {
    id: 'celeste',
    label: 'Céleste',
    description: 'Anges et démons.',
    themes: [
      { id: 'ange', label: 'Ange', swatch: '#f3e6c8' },
      { id: 'demon', label: 'Démon', swatch: '#6b1020' }
    ]
  },
  {
    id: 'couleurs',
    label: 'Couleurs',
    description: 'Choix simple par couleur dominante.',
    themes: [
      { id: 'rouge', label: 'Rouge', swatch: '#c0392b' },
      { id: 'or', label: 'Or', swatch: '#d4af37' },
      { id: 'violet', label: 'Violet', swatch: '#7d3c98' },
      { id: 'bleu', label: 'Bleu', swatch: '#2980b9' },
      { id: 'vert', label: 'Vert', swatch: '#27ae60' },
      { id: 'rose', label: 'Rose', swatch: '#e091b3' },
      { id: 'noir', label: 'Noir', swatch: '#1a1a1a' }
    ]
  },
  {
    id: 'saisons',
    label: 'Saisons',
    description: 'Été, automne et hiver.',
    themes: [
      { id: 'ete', label: 'Été', swatch: '#f0a830' },
      { id: 'automne', label: 'Automne', swatch: '#c45c26' },
      { id: 'hiver', label: 'Hiver', swatch: '#6b8cae' }
    ]
  }
];

const ALL_THEME_IDS = new Set(THEME_CATEGORIES.flatMap((cat) => cat.themes.map((t) => t.id)));

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && ALL_THEME_IDS.has(value as ThemeId);
}

export function themeLabel(id: ThemeId): string {
  return findTheme(id)?.label ?? 'Freya';
}

export function findTheme(id: ThemeId): (ThemeOption & { categoryLabel: string }) | null {
  for (const category of THEME_CATEGORIES) {
    const found = category.themes.find((theme) => theme.id === id);
    if (found) {
      return { ...found, categoryLabel: category.label };
    }
  }
  return null;
}

/** Applique le thème courant sur <html> pour les styles futurs. */
export function applyTheme(themeId: ThemeId): void {
  const root = document.documentElement;
  root.dataset['theme'] = themeId;
  root.setAttribute('data-theme', themeId);
}
