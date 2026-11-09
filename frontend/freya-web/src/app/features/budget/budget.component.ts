import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import {
  BudgetAllocation,
  BudgetMonth,
  BudgetMovement,
  BudgetService,
  BudgetShare,
  SharedBudgetOwner
} from '../../core/budget.service';
import { Friend, SocialService } from '../../core/social.service';
import { createId } from '../../core/id';

@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './budget.component.html',
  styleUrl: './budget.component.scss'
})
export class BudgetComponent implements OnInit {
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly saved = signal(false);
  readonly shareOpen = signal(false);
  readonly year = signal(new Date().getFullYear());
  readonly month = signal(new Date().getMonth() + 1);
  readonly ownerUserId = signal<string | null>(null);
  readonly canEdit = signal(true);
  readonly ownerName = signal('Moi');
  readonly salary = signal(0);
  readonly note = signal('');
  readonly allocations = signal<BudgetAllocation[]>([]);
  readonly movements = signal<BudgetMovement[]>([]);
  readonly friends = signal<Friend[]>([]);
  readonly shares = signal<BudgetShare[]>([]);
  readonly sharedOwners = signal<SharedBudgetOwner[]>([]);

  draftAllocLabel = '';
  draftAllocAmount = '';
  draftAllocKind: 'spend' | 'save' = 'spend';
  draftMoveLabel = '';
  draftMoveAmount = '';
  draftMoveKind: 'expense' | 'saving' | 'income' = 'expense';
  draftMoveDate = this.todayIso();

  readonly monthLabel = computed(() => {
    const date = new Date(this.year(), this.month() - 1, 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  });

  readonly plannedSpend = computed(() =>
    this.allocations().filter((a) => a.kind !== 'save').reduce((sum, a) => sum + Number(a.plannedAmount || 0), 0)
  );
  readonly plannedSave = computed(() =>
    this.allocations().filter((a) => a.kind === 'save').reduce((sum, a) => sum + Number(a.plannedAmount || 0), 0)
  );
  readonly remaining = computed(() => Number(this.salary() || 0) - this.plannedSpend() - this.plannedSave());
  readonly spent = computed(() =>
    this.movements().filter((m) => m.kind === 'expense').reduce((sum, m) => sum + Number(m.amount || 0), 0)
  );
  readonly savedAmount = computed(() =>
    this.movements().filter((m) => m.kind === 'saving').reduce((sum, m) => sum + Number(m.amount || 0), 0)
  );

  constructor(
    private readonly budgetApi: BudgetService,
    private readonly social: SocialService,
    private readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    this.ownerUserId.set(null);
    this.reload();
    this.social.friends().subscribe({
      next: (list) => this.friends.set(list),
      error: () => this.friends.set([])
    });
    this.budgetApi.sharedWithMe().subscribe({
      next: (list) => this.sharedOwners.set(list),
      error: () => this.sharedOwners.set([])
    });
  }

  prevMonth(): void {
    if (this.month() === 1) {
      this.month.set(12);
      this.year.update((y) => y - 1);
    } else {
      this.month.update((m) => m - 1);
    }
    this.reload();
  }

  nextMonth(): void {
    if (this.month() === 12) {
      this.month.set(1);
      this.year.update((y) => y + 1);
    } else {
      this.month.update((m) => m + 1);
    }
    this.reload();
  }

  selectOwner(ownerId: string): void {
    this.ownerUserId.set(ownerId === 'me' ? null : ownerId);
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set('');
    this.budgetApi.getMonth(this.year(), this.month(), this.ownerUserId()).subscribe({
      next: (dto) => {
        this.applyMonth(dto);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger le budget.');
        this.loading.set(false);
      }
    });
  }

  addAllocation(): void {
    if (!this.canEdit()) return;
    const label = this.draftAllocLabel.trim();
    const amount = Number(this.draftAllocAmount.replace(',', '.'));
    if (!label || Number.isNaN(amount) || amount < 0) {
      this.error.set('Indique un libellé et un montant valides.');
      return;
    }
    this.allocations.update((list) => [
      ...list,
      { id: createId(), label, kind: this.draftAllocKind, plannedAmount: amount }
    ]);
    this.draftAllocLabel = '';
    this.draftAllocAmount = '';
    this.error.set('');
  }

  removeAllocation(id: string): void {
    if (!this.canEdit()) return;
    this.allocations.update((list) => list.filter((a) => a.id !== id));
  }

  addMovement(): void {
    if (!this.canEdit()) return;
    const label = this.draftMoveLabel.trim();
    const amount = Number(this.draftMoveAmount.replace(',', '.'));
    if (!label || Number.isNaN(amount) || amount < 0 || !this.draftMoveDate) {
      this.error.set('Indique un libellé, un montant et une date.');
      return;
    }
    this.movements.update((list) => [
      {
        id: createId(),
        label,
        kind: this.draftMoveKind,
        amount,
        date: this.draftMoveDate,
        note: null
      },
      ...list
    ]);
    this.draftMoveLabel = '';
    this.draftMoveAmount = '';
    this.error.set('');
  }

  removeMovement(id: string): void {
    if (!this.canEdit()) return;
    this.movements.update((list) => list.filter((m) => m.id !== id));
  }

  save(): void {
    if (!this.canEdit()) return;
    this.saving.set(true);
    this.error.set('');
    this.budgetApi
      .saveMonth({
        year: this.year(),
        month: this.month(),
        salary: Number(this.salary() || 0),
        note: this.note().trim() || null,
        allocations: this.allocations().map((a) => ({
          id: a.id,
          label: a.label,
          kind: a.kind,
          plannedAmount: Number(a.plannedAmount || 0)
        })),
        movements: this.movements().map((m) => ({
          id: m.id,
          label: m.label,
          kind: m.kind,
          amount: Number(m.amount || 0),
          date: m.date,
          note: m.note
        }))
      })
      .subscribe({
        next: (dto) => {
          this.applyMonth(dto);
          this.saving.set(false);
          this.saved.set(true);
          window.setTimeout(() => this.saved.set(false), 1600);
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'Enregistrement impossible.');
          this.saving.set(false);
        }
      });
  }

  openShare(): void {
    this.shareOpen.set(true);
    this.budgetApi.shares().subscribe({
      next: (list) => this.shares.set(list),
      error: () => this.shares.set([])
    });
  }

  closeShare(): void {
    this.shareOpen.set(false);
  }

  shareFor(friend: Friend): BudgetShare {
    return (
      this.shares().find((s) => s.viewerUserId === friend.userId) ?? {
        viewerUserId: friend.userId,
        viewerName: friend.displayName,
        shareSalary: false,
        shareAllocations: false,
        shareSavings: false,
        shareMovements: false
      }
    );
  }

  toggleShare(friend: Friend, key: 'shareSalary' | 'shareAllocations' | 'shareSavings' | 'shareMovements'): void {
    const current = this.shareFor(friend);
    const next = { ...current, [key]: !current[key] };
    this.budgetApi
      .upsertShare({
        viewerUserId: friend.userId,
        shareSalary: next.shareSalary,
        shareAllocations: next.shareAllocations,
        shareSavings: next.shareSavings,
        shareMovements: next.shareMovements
      })
      .subscribe({
        next: () => {
          this.shares.update((list) => {
            const without = list.filter((s) => s.viewerUserId !== friend.userId);
            if (!(next.shareSalary || next.shareAllocations || next.shareSavings || next.shareMovements)) {
              return without;
            }
            return [...without, { ...next, viewerName: friend.displayName }];
          });
        },
        error: (err) => this.error.set(err?.error?.message || 'Partage impossible.')
      });
  }

  money(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  private applyMonth(dto: BudgetMonth): void {
    this.canEdit.set(!!dto.canEdit);
    this.ownerName.set(dto.ownerName || this.auth.user()?.displayName || 'Moi');
    this.salary.set(Number(dto.salary || 0));
    this.note.set(dto.note || '');
    this.allocations.set(dto.allocations ?? []);
    this.movements.set(dto.movements ?? []);
  }

  private todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
