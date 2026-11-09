import { ThemeId, applyTheme, isThemeId } from './themes';
import { NavTabId, isNavTabId } from './nav-tabs';

export interface AppSettings {
  /** Si false, aucun popup de rappel des tâches non faites. */
  reminderEnabled: boolean;
  /** Heure locale HH:mm pour afficher le rappel. */
  reminderTime: string;
  /** Identifiant du thème d’apparence. */
  themeId: ThemeId;
  /** Onglets masqués dans la navigation (hors Accueil / Paramètres). */
  hiddenNavTabs: NavTabId[];
}

const SETTINGS_KEY = 'freya.settings.v1';
const REMINDER_SHOWN_KEY = 'freya.reminder.lastShown.v1';
const REMINDER_SNOOZED_KEY = 'freya.reminder.snoozed.v1';

const DEFAULT_SETTINGS: AppSettings = {
  reminderEnabled: true,
  reminderTime: '20:00',
  themeId: 'freya',
  hiddenNavTabs: []
};

function normalizeHiddenTabs(value: unknown): NavTabId[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is NavTabId => isNavTabId(item) && item !== 'accueil' && item !== 'parametres');
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      reminderEnabled: parsed.reminderEnabled !== false,
      reminderTime: /^\d{2}:\d{2}$/.test(String(parsed.reminderTime ?? ''))
        ? String(parsed.reminderTime)
        : DEFAULT_SETTINGS.reminderTime,
      themeId: isThemeId(parsed.themeId) ? parsed.themeId : DEFAULT_SETTINGS.themeId,
      hiddenNavTabs: normalizeHiddenTabs(parsed.hiddenNavTabs)
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  applyTheme(settings.themeId);
}

export function initThemeFromSettings(): void {
  applyTheme(loadSettings().themeId);
}

export function reminderShownToday(todayIso: string): boolean {
  return localStorage.getItem(REMINDER_SHOWN_KEY) === todayIso;
}

export function markReminderShown(todayIso: string): void {
  localStorage.setItem(REMINDER_SHOWN_KEY, todayIso);
}

export function loadSnoozedIds(todayIso: string): Set<string> {
  try {
    const raw = localStorage.getItem(REMINDER_SNOOZED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return new Set(parsed[todayIso] ?? []);
  } catch {
    return new Set();
  }
}

export function snoozeReminderItem(todayIso: string, id: string): void {
  try {
    const raw = localStorage.getItem(REMINDER_SNOOZED_KEY);
    const parsed = (raw ? JSON.parse(raw) : {}) as Record<string, string[]>;
    const list = new Set(parsed[todayIso] ?? []);
    list.add(id);
    parsed[todayIso] = [...list];
    localStorage.setItem(REMINDER_SNOOZED_KEY, JSON.stringify(parsed));
  } catch {
    localStorage.setItem(REMINDER_SNOOZED_KEY, JSON.stringify({ [todayIso]: [id] }));
  }
}
