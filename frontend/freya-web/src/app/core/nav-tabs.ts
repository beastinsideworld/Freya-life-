export type NavTabId =
  | 'accueil'
  | 'planning'
  | 'repas'
  | 'voyages'
  | 'tele'
  | 'chat'
  | 'budget'
  | 'sport'
  | 'animaux'
  | 'parametres';

export interface NavTabDef {
  id: NavTabId;
  label: string;
  path: string;
  icon: string;
  /** Toujours visible, non désactivable. */
  locked?: boolean;
  badgeTarget?: 'planning' | 'voyages' | 'tele';
}

export const NAV_TABS: NavTabDef[] = [
  { id: 'accueil', label: 'Accueil', path: '/', icon: '⌂', locked: true },
  { id: 'planning', label: 'Planning', path: '/planning', icon: '▦', badgeTarget: 'planning' },
  { id: 'repas', label: 'Repas', path: '/repas', icon: '🍴' },
  { id: 'voyages', label: 'Voyages', path: '/voyages', icon: '✈', badgeTarget: 'voyages' },
  { id: 'tele', label: 'Télé', path: '/tele', icon: '📺', badgeTarget: 'tele' },
  { id: 'chat', label: 'Chat', path: '/chat', icon: '💬' },
  { id: 'budget', label: 'Finances', path: '/budget', icon: '💶' },
  { id: 'sport', label: 'Sport', path: '/sport', icon: '🏋️' },
  { id: 'animaux', label: 'Animaux', path: '/animaux', icon: '🐾' },
  { id: 'parametres', label: 'Paramètres', path: '/parametres', icon: '⚙', locked: true }
];

export const TOGGLEABLE_NAV_TABS = NAV_TABS.filter((tab) => !tab.locked);

export const DEFAULT_NAV_TAB_ORDER: NavTabId[] = TOGGLEABLE_NAV_TABS.map((tab) => tab.id);

export function isNavTabId(value: unknown): value is NavTabId {
  return typeof value === 'string' && NAV_TABS.some((tab) => tab.id === value);
}

/** Ordre des onglets déplaçables (hors Accueil / Paramètres). */
export function normalizeNavTabOrder(value: unknown): NavTabId[] {
  const defaults = DEFAULT_NAV_TAB_ORDER;
  const incoming = Array.isArray(value)
    ? value.filter((item): item is NavTabId => isNavTabId(item) && defaults.includes(item))
    : [];
  const seen = new Set<NavTabId>();
  const ordered: NavTabId[] = [];
  for (const id of incoming) {
    if (seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }
  for (const id of defaults) {
    if (!seen.has(id)) ordered.push(id);
  }
  return ordered;
}

export function tabById(id: NavTabId): NavTabDef | undefined {
  return NAV_TABS.find((tab) => tab.id === id);
}
