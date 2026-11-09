import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppSettings, loadSettings, saveSettings } from '../../core/app-settings';
import { AuthService } from '../../core/auth/auth.service';
import { FamilyService, FamilySummary } from '../../core/family.service';
import { Friend, SocialService, UserProfile } from '../../core/social.service';
import { ImagePickerComponent } from '../../shared/image-picker/image-picker.component';
import {
  THEME_CATEGORIES,
  ThemeId,
  applyTheme,
  findTheme
} from '../../core/themes';

@Component({
  selector: 'app-parametres',
  standalone: true,
  imports: [FormsModule, ImagePickerComponent],
  templateUrl: './parametres.component.html',
  styleUrl: './parametres.component.scss'
})
export class ParametresComponent implements OnInit {
  readonly saved = signal(false);
  readonly themeModalOpen = signal(false);
  readonly themeCategories = THEME_CATEGORIES;
  readonly selectedThemeId = signal<ThemeId>('freya');
  readonly currentTheme = computed(() => findTheme(this.selectedThemeId()));
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
    private readonly familyApi: FamilyService
  ) {}

  ngOnInit(): void {
    const settings = loadSettings();
    this.reminderEnabled = settings.reminderEnabled;
    this.reminderTime = settings.reminderTime;
    this.selectedThemeId.set(settings.themeId);
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

  selectTheme(themeId: ThemeId): void {
    this.selectedThemeId.set(themeId);
    applyTheme(themeId);
    this.themeModalOpen.set(false);
  }

  save(): void {
    const settings: AppSettings = {
      reminderEnabled: this.reminderEnabled,
      reminderTime: this.reminderTime || '20:00',
      themeId: this.selectedThemeId()
    };
    saveSettings(settings);
    this.saved.set(true);
    window.setTimeout(() => this.saved.set(false), 1800);
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
