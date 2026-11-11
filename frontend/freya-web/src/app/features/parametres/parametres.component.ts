import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppSettings, loadSettings, saveSettings } from '../../core/app-settings';
import { AuthService } from '../../core/auth/auth.service';
import { FamilyService, FamilySummary } from '../../core/family.service';
import { NavPrefsService } from '../../core/nav-prefs.service';
import { NavTabId, TOGGLEABLE_NAV_TABS } from '../../core/nav-tabs';
import { Friend, SocialService, UserProfile } from '../../core/social.service';
import { ImagePickerComponent } from '../../shared/image-picker/image-picker.component';
import { resolveAssetUrl } from '../../core/asset-url';
import {
  THEME_CATEGORIES,
  ThemeId,
  ThemeOption,
  applyTheme,
  findTheme
} from '../../core/themes';
import { NavIconComponent } from '../../shared/nav-icon/nav-icon.component';

@Component({
  selector: 'app-parametres',
  standalone: true,
  imports: [FormsModule, ImagePickerComponent, NavIconComponent],
  templateUrl: './parametres.component.html',
  styleUrl: './parametres.component.scss'
})
export class ParametresComponent implements OnInit {
  readonly saved = signal(false);
  readonly themeModalOpen = signal(false);
  readonly navTabsModalOpen = signal(false);
  readonly themeCategories = THEME_CATEGORIES;
  readonly toggleableTabs = TOGGLEABLE_NAV_TABS;
  readonly selectedThemeId = signal<ThemeId>('ange');
  readonly currentTheme = computed(() => findTheme(this.selectedThemeId()));

  themePreviewSrc(theme: ThemeOption): string | null {
    return theme.preview ? resolveAssetUrl(theme.preview) : null;
  }
  readonly hiddenNavTabs = signal<NavTabId[]>([]);
  readonly navTabOrder = signal<NavTabId[]>([]);
  readonly orderedToggleableTabs = computed(() =>
    this.navTabOrder()
      .map((id) => this.toggleableTabs.find((tab) => tab.id === id))
      .filter((tab): tab is (typeof TOGGLEABLE_NAV_TABS)[number] => !!tab)
  );
  readonly visibleToggleableCount = computed(
    () => this.toggleableTabs.filter((tab) => !this.hiddenNavTabs().includes(tab.id)).length
  );
  readonly draggingTabId = signal<NavTabId | null>(null);
  readonly dragOverTabId = signal<NavTabId | null>(null);
  private longPressTimer: number | null = null;
  private longPressId: NavTabId | null = null;
  readonly profile = signal<UserProfile | null>(null);
  readonly friends = signal<Friend[]>([]);
  readonly families = signal<FamilySummary[]>([]);
  readonly friendError = signal('');
  readonly friendSuccess = signal('');
  readonly friendBusy = signal(false);
  readonly familyError = signal('');
  readonly familySuccess = signal('');
  readonly familyBusy = signal(false);
  readonly profileError = signal('');
  readonly codeCopied = signal(false);
  readonly familyCodeCopied = signal<string | null>(null);
  readonly avatarBusy = signal(false);

  reminderEnabled = true;
  reminderTime = '20:00';
  friendCodeInput = '';
  familyNameInput = '';
  familyCodeInput = '';

  constructor(
    private readonly auth: AuthService,
    private readonly social: SocialService,
    private readonly familyApi: FamilyService,
    private readonly navPrefs: NavPrefsService
  ) {}

  ngOnInit(): void {
    const settings = loadSettings();
    this.reminderEnabled = settings.reminderEnabled;
    this.reminderTime = settings.reminderTime;
    this.selectedThemeId.set(settings.themeId);
    this.hiddenNavTabs.set(settings.hiddenNavTabs ?? []);
    this.navTabOrder.set(settings.navTabOrder ?? []);
    this.navPrefs.refresh();
    this.loadProfile();
    this.loadFriends();
    this.loadFamilies();
  }

  loadProfile(): void {
    this.social.me().subscribe({
      next: (profile) => this.applyProfile(profile),
      error: () => {
        const local = this.auth.user();
        if (local) {
          this.profile.set({
            userId: local.userId,
            email: local.email,
            displayName: local.displayName,
            friendCode: local.friendCode ?? 0,
            avatarUrl: local.avatarUrl ?? null
          });
        }
      }
    });
  }

  loadFriends(): void {
    this.social.friends().subscribe({
      next: (list) => this.friends.set(list),
      error: () => this.friends.set([])
    });
  }

  loadFamilies(): void {
    this.familyApi.list().subscribe({
      next: (list) => this.families.set(list),
      error: () => this.families.set([])
    });
  }

  formattedCode(code: number | null | undefined): string {
    if (!code) return '------';
    return String(code).padStart(6, '0');
  }

  async copyFamilyCode(family: FamilySummary): Promise<void> {
    const code = this.formattedCode(family.inviteCode);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const input = document.createElement('textarea');
        input.value = code;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      this.familyCodeCopied.set(family.id);
      window.setTimeout(() => this.familyCodeCopied.set(null), 1600);
    } catch {
      this.familyError.set('Impossible de copier le code famille.');
    }
  }

  createFamily(): void {
    const name = this.familyNameInput.trim();
    this.familyError.set('');
    this.familySuccess.set('');
    if (name.length < 2) {
      this.familyError.set('Indique un nom de famille.');
      return;
    }
    this.familyBusy.set(true);
    this.familyApi.create(name).subscribe({
      next: (family) => {
        this.families.update((list) =>
          [...list, family].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
        );
        this.familyNameInput = '';
        this.familySuccess.set(`Famille « ${family.name} » créée. Code ${this.formattedCode(family.inviteCode)}.`);
        this.familyBusy.set(false);
      },
      error: (err) => {
        this.familyError.set(err?.error?.message || 'Création impossible.');
        this.familyBusy.set(false);
      }
    });
  }

  joinFamily(): void {
    const raw = this.familyCodeInput.replace(/\D/g, '');
    const code = Number(raw);
    this.familyError.set('');
    this.familySuccess.set('');
    if (!raw || raw.length !== 6 || Number.isNaN(code)) {
      this.familyError.set('Entre un code famille à 6 chiffres.');
      return;
    }
    this.familyBusy.set(true);
    this.familyApi.join(code).subscribe({
      next: (family) => {
        this.families.update((list) =>
          list.some((f) => f.id === family.id)
            ? list
            : [...list, family].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
        );
        this.familyCodeInput = '';
        this.familySuccess.set(`Tu as rejoint « ${family.name} ».`);
        this.familyBusy.set(false);
      },
      error: (err) => {
        this.familyError.set(err?.error?.message || 'Impossible de rejoindre cette famille.');
        this.familyBusy.set(false);
      }
    });
  }

  leaveFamily(family: FamilySummary): void {
    this.familyApi.leave(family.id).subscribe({
      next: () => this.families.update((list) => list.filter((f) => f.id !== family.id)),
      error: () => this.familyError.set('Impossible de quitter cette famille.')
    });
  }

  async copyFriendCode(): Promise<void> {
    const code = this.formattedCode(this.profile()?.friendCode);
    if (!code || code === '------') return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const input = document.createElement('textarea');
        input.value = code;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      this.codeCopied.set(true);
      window.setTimeout(() => this.codeCopied.set(false), 1600);
    } catch {
      this.profileError.set('Impossible de copier l’ID.');
    }
  }

  onAvatarSelected(dataUrl: string): void {
    this.saveAvatar(dataUrl);
  }

  clearAvatar(): void {
    this.saveAvatar(null);
  }

  addFriend(): void {
    const raw = this.friendCodeInput.replace(/\D/g, '');
    const code = Number(raw);
    this.friendError.set('');
    this.friendSuccess.set('');

    if (!raw || raw.length !== 6 || Number.isNaN(code)) {
      this.friendError.set('Entre un code ami à 6 chiffres.');
      return;
    }

    this.friendBusy.set(true);
    this.social.addFriend(code).subscribe({
      next: (friend) => {
        this.friends.update((list) =>
          list.some((f) => f.userId === friend.userId)
            ? list
            : [...list, friend].sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr'))
        );
        this.friendCodeInput = '';
        this.friendSuccess.set(`${friend.displayName} a été ajouté·e.`);
        this.friendBusy.set(false);
      },
      error: (err) => {
        this.friendError.set(err?.error?.message || 'Impossible d’ajouter cet ami.');
        this.friendBusy.set(false);
      }
    });
  }

  removeFriend(friend: Friend): void {
    this.social.removeFriend(friend.userId).subscribe({
      next: () => this.friends.update((list) => list.filter((f) => f.userId !== friend.userId)),
      error: () => this.friendError.set('Impossible de retirer cet ami.')
    });
  }

  logout(): void {
    this.auth.logout();
  }

  openThemeModal(): void {
    this.themeModalOpen.set(true);
  }

  closeThemeModal(): void {
    this.themeModalOpen.set(false);
  }

  openNavTabsModal(): void {
    this.navTabsModalOpen.set(true);
  }

  closeNavTabsModal(): void {
    this.clearLongPress();
    this.draggingTabId.set(null);
    this.dragOverTabId.set(null);
    this.navTabsModalOpen.set(false);
  }

  isNavTabVisible(id: NavTabId): boolean {
    return !this.hiddenNavTabs().includes(id);
  }

  toggleNavTab(id: NavTabId, visible: boolean): void {
    const next = visible
      ? this.hiddenNavTabs().filter((tabId) => tabId !== id)
      : [...new Set([...this.hiddenNavTabs(), id])];
    this.hiddenNavTabs.set(next);
    this.persistSettings();
    this.navPrefs.setHidden(next);
  }

  moveNavTab(id: NavTabId, direction: -1 | 1): void {
    const list = [...this.navTabOrder()];
    const index = list.indexOf(id);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    this.applyOrder(list);
  }

  canMoveUp(id: NavTabId): boolean {
    return this.navTabOrder().indexOf(id) > 0;
  }

  canMoveDown(id: NavTabId): boolean {
    const list = this.navTabOrder();
    return list.indexOf(id) >= 0 && list.indexOf(id) < list.length - 1;
  }

  onTabPointerDown(id: NavTabId, event: PointerEvent): void {
    if ((event.target as HTMLElement | null)?.closest('input,button')) return;
    this.clearLongPress();
    this.longPressId = id;
    this.longPressTimer = window.setTimeout(() => {
      if (this.longPressId !== id) return;
      this.draggingTabId.set(id);
      this.dragOverTabId.set(id);
      if (navigator.vibrate) navigator.vibrate(18);
    }, 420);
  }

  onTabPointerEnter(id: NavTabId): void {
    if (!this.draggingTabId() || this.draggingTabId() === id) return;
    this.dragOverTabId.set(id);
  }

  onTabPointerUp(): void {
    const from = this.draggingTabId();
    const to = this.dragOverTabId();
    this.clearLongPress();
    if (from && to && from !== to) {
      const list = [...this.navTabOrder()];
      const fromIndex = list.indexOf(from);
      const toIndex = list.indexOf(to);
      if (fromIndex >= 0 && toIndex >= 0) {
        list.splice(fromIndex, 1);
        list.splice(toIndex, 0, from);
        this.applyOrder(list);
      }
    }
    this.draggingTabId.set(null);
    this.dragOverTabId.set(null);
  }

  onTabPointerCancel(): void {
    this.clearLongPress();
    this.draggingTabId.set(null);
    this.dragOverTabId.set(null);
  }

  private applyOrder(list: NavTabId[]): void {
    this.navTabOrder.set(list);
    this.navPrefs.setOrder(list);
    this.persistSettings();
  }

  private clearLongPress(): void {
    if (this.longPressTimer != null) {
      window.clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    this.longPressId = null;
  }

  selectTheme(themeId: ThemeId): void {
    this.selectedThemeId.set(themeId);
    applyTheme(themeId);
    this.persistSettings();
    this.themeModalOpen.set(false);
  }

  save(): void {
    this.persistSettings();
    this.saved.set(true);
    window.setTimeout(() => this.saved.set(false), 1800);
  }

  private persistSettings(): void {
    const settings: AppSettings = {
      reminderEnabled: this.reminderEnabled,
      reminderTime: this.reminderTime || '20:00',
      themeId: this.selectedThemeId(),
      hiddenNavTabs: this.hiddenNavTabs(),
      navTabOrder: this.navTabOrder()
    };
    saveSettings(settings);
  }

  private saveAvatar(avatarUrl: string | null): void {
    this.profileError.set('');
    this.avatarBusy.set(true);
    this.social.updateProfile({ avatarUrl }).subscribe({
      next: (profile) => {
        this.applyProfile(profile);
        this.avatarBusy.set(false);
      },
      error: (err) => {
        this.profileError.set(err?.error?.message || 'Impossible de mettre à jour la photo.');
        this.avatarBusy.set(false);
      }
    });
  }

  private applyProfile(profile: UserProfile): void {
    this.profile.set(profile);
    this.auth.patchProfile({
      userId: profile.userId,
      email: profile.email,
      displayName: profile.displayName,
      friendCode: profile.friendCode,
      avatarUrl: profile.avatarUrl
    });
  }
}
