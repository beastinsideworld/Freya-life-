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
  { id: 'sport', label: 'Sport', path: '/sport', icon: '🏃' },
  { id: 'animaux', label: 'Animaux', path: '/animaux', icon: '🐾' },
  { id: 'parametres', label: 'Paramètres', path: '/parametres', icon: '⚙', locked: true }
];

export const TOGGLEABLE_NAV_TABS = NAV_TABS.filter((tab) => !tab.locked);

export function isNavTabId(value: unknown): value is NavTabId {
  return typeof value === 'string' && NAV_TABS.some((tab) => tab.id === value);
}
