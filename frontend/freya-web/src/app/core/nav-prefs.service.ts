import { Injectable, computed, signal } from '@angular/core';
import { loadSettings } from './app-settings';
import {
  NAV_TABS,
  NavTabDef,
  NavTabId,
  TOGGLEABLE_NAV_TABS,
  normalizeNavTabOrder,
  tabById
} from './nav-tabs';

@Injectable({ providedIn: 'root' })
export class NavPrefsService {
  private readonly hidden = signal<NavTabId[]>(loadSettings().hiddenNavTabs ?? []);
  private readonly order = signal<NavTabId[]>(normalizeNavTabOrder(loadSettings().navTabOrder));

  readonly visibleTabs = computed(() => {
    const hidden = new Set(this.hidden());
    const middle = this.order()
      .map((id) => tabById(id))
      .filter((tab): tab is NavTabDef => !!tab && !hidden.has(tab.id));
    const accueil = NAV_TABS.find((tab) => tab.id === 'accueil')!;
    const parametres = NAV_TABS.find((tab) => tab.id === 'parametres')!;
    return [accueil, ...middle, parametres];
  });

  readonly orderedToggleableTabs = computed(() =>
    this.order()
      .map((id) => tabById(id))
      .filter((tab): tab is NavTabDef => !!tab)
  );

  readonly toggleableTabs = TOGGLEABLE_NAV_TABS;

  isVisible(id: NavTabId): boolean {
    const tab = tabById(id);
    if (!tab || tab.locked) return true;
    return !this.hidden().includes(id);
  }

  refresh(): void {
    const settings = loadSettings();
    this.hidden.set(settings.hiddenNavTabs ?? []);
    this.order.set(normalizeNavTabOrder(settings.navTabOrder));
  }

  setHidden(hiddenNavTabs: NavTabId[]): void {
    this.hidden.set([...hiddenNavTabs]);
  }

  setOrder(navTabOrder: NavTabId[]): void {
    this.order.set(normalizeNavTabOrder(navTabOrder));
  }

  moveTab(id: NavTabId, direction: -1 | 1): void {
    const list = [...this.order()];
    const index = list.indexOf(id);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    this.order.set(list);
  }

  moveTabTo(id: NavTabId, toIndex: number): void {
    const list = [...this.order()];
    const from = list.indexOf(id);
    if (from < 0) return;
    const clamped = Math.max(0, Math.min(list.length - 1, toIndex));
    if (from === clamped) return;
    list.splice(from, 1);
    list.splice(clamped, 0, id);
    this.order.set(list);
  }
}
