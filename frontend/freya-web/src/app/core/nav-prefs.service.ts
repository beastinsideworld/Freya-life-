import { Injectable, computed, signal } from '@angular/core';
import { loadSettings } from './app-settings';
import { NAV_TABS, NavTabId, TOGGLEABLE_NAV_TABS } from './nav-tabs';

@Injectable({ providedIn: 'root' })
export class NavPrefsService {
  private readonly hidden = signal<NavTabId[]>(loadSettings().hiddenNavTabs ?? []);

  readonly visibleTabs = computed(() => {
    const hidden = new Set(this.hidden());
    return NAV_TABS.filter((tab) => tab.locked || !hidden.has(tab.id));
  });

  readonly toggleableTabs = TOGGLEABLE_NAV_TABS;

  isVisible(id: NavTabId): boolean {
    const tab = NAV_TABS.find((item) => item.id === id);
    if (!tab || tab.locked) return true;
    return !this.hidden().includes(id);
  }

  refresh(): void {
    this.hidden.set(loadSettings().hiddenNavTabs ?? []);
  }

  setHidden(hiddenNavTabs: NavTabId[]): void {
    this.hidden.set([...hiddenNavTabs]);
  }
}
