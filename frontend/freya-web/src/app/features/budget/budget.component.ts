import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';
import {
  BudgetAccount,
  BudgetAllocation,
  BudgetMonth,
  BudgetMovement,
  BudgetProject,
  BudgetService,
  BudgetShare,
  SharedBudgetOwner
} from '../../core/budget.service';
import { Friend, SocialService } from '../../core/social.service';
import { createId } from '../../core/id';
import { environment } from '../../../environments/environment';
import { resolveAssetUrl } from '../../core/asset-url';
import { FINANCE_ICON, financeEmojiIconSrc } from '../../core/theme-ange-icons';

type FinanceTab = 'synthese' | 'mouvements' | 'projets';
type MoveFilter = 'all' | 'income' | 'expense';

interface HistoryPoint {
  key: string;
  label: string;
  income: number;
  expense: number;
}

interface CategorySlice {
  category: string;
  icon: string;
  amount: number;
  pct: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  Logement: '🏠',
  Alimentation: '🛒',
  Transport: '⛽',
  Assurances: '🛡',
  Sport: '🏋️',
  'Loisirs & sorties': '🎭',
  Télécom: '📱',
  Autres: '📦',
  Salaire: '💼',
  Aides: '🏛',
  Activité: '🚒',
  Avantages: '🍽'
};

@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './budget.component.html',
  styleUrl: './budget.component.scss'
})
export class BudgetComponent implements OnInit {
  readonly icons = FINANCE_ICON;
  readonly assetUrl = resolveAssetUrl;
  readonly financeEmojiIconSrc = financeEmojiIconSrc;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly saved = signal(false);
  readonly shareOpen = signal(false);
  readonly moveFormOpen = signal(false);
  readonly accountFormOpen = signal(false);
  readonly projectFormOpen = signal(false);
  readonly projectMoneyOpen = signal(false);
  readonly projectMoneyTarget = signal<BudgetProject | null>(null);
  readonly projectMoneyMode = signal<'add' | 'remove'>('add');
  readonly incomesOpen = signal(true);
  readonly expensesOpen = signal(true);
  readonly archivedOpen = signal(true);
  readonly tab = signal<FinanceTab>('synthese');
  readonly moveFilter = signal<MoveFilter>('all');
  readonly year = signal(new Date().getFullYear());
  readonly month = signal(new Date().getMonth() + 1);
  readonly ownerUserId = signal<string | null>(null);
  readonly canEdit = signal(true);
  readonly ownerName = signal('Moi');
  readonly salary = signal(0);
  readonly note = signal('');
  readonly allocations = signal<BudgetAllocation[]>([]);
  readonly movements = signal<BudgetMovement[]>([]);
  readonly accounts = signal<BudgetAccount[]>([]);
  readonly projects = signal<BudgetProject[]>([]);
  readonly history = signal<HistoryPoint[]>([]);
  readonly friends = signal<Friend[]>([]);
  readonly shares = signal<BudgetShare[]>([]);
  readonly sharedOwners = signal<SharedBudgetOwner[]>([]);

  draftMoveLabel = '';
  draftMoveAmount = '';
  draftMoveKind: 'expense' | 'saving' | 'income' = 'expense';
  draftMoveDate = this.todayIso();
  draftMoveCategory = 'Autres';
  draftMoveAccount = 'Compte courant';

  draftAccountLabel = '';
  draftAccountBalance = '';
  draftAccountIcon = '💳';

  draftProjectLabel = '';
  draftProjectTarget = '';
  draftProjectSaved = '';
  draftProjectMonthly = '';
  draftProjectIcon = '🎯';
  draftProjectMoneyAmount = '';

  readonly monthLabel = computed(() => {
    const date = new Date(this.year(), this.month() - 1, 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  });

  readonly incomes = computed(() => this.movements().filter((m) => m.kind === 'income'));
  readonly expenses = computed(() => this.movements().filter((m) => m.kind === 'expense'));
  readonly incomeTotal = computed(() => this.incomes().reduce((s, m) => s + Number(m.amount || 0), 0));
  readonly expenseTotal = computed(() => this.expenses().reduce((s, m) => s + Number(m.amount || 0), 0));
  readonly upcoming = computed(() =>
    this.allocations()
      .filter((a) => a.kind === 'spend')
      .reduce((s, a) => s + Number(a.plannedAmount || 0), 0)
  );
  readonly salairesRecus = computed(() => (this.incomeTotal() > 0 ? this.incomeTotal() : Number(this.salary() || 0)));
  readonly resteAVivre = computed(() => this.salairesRecus() - this.expenseTotal());

  readonly filteredIncomes = computed(() => {
    if (this.moveFilter() === 'expense') return [];
    return this.incomes();
  });
  readonly filteredExpenses = computed(() => {
    if (this.moveFilter() === 'income') return [];
    return this.expenses();
  });

  readonly expenseBreakdown = computed((): CategorySlice[] => {
    const map = new Map<string, number>();
    for (const m of this.expenses()) {
      const cat = (m.category || 'Autres').trim() || 'Autres';
      map.set(cat, (map.get(cat) || 0) + Number(m.amount || 0));
    }
    const total = this.expenseTotal() || 1;
    const known = Object.keys(CATEGORY_ICONS);
    const rows = [...map.entries()].map(([category, amount]) => ({
      category,
      icon: CATEGORY_ICONS[category] || '📦',
      amount,
      pct: (amount / total) * 100
    }));
    rows.sort((a, b) => {
      const ai = known.indexOf(a.category);
      const bi = known.indexOf(b.category);
      if (ai === -1 && bi === -1) return b.amount - a.amount;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return rows;
  });

  readonly donutGradient = computed(() => {
    const slices = this.expenseBreakdown();
    if (!slices.length) return 'conic-gradient(var(--bg-card) 0 100%)';
    const colors = [
      'var(--chart-1)',
      'var(--chart-2)',
      'var(--chart-3)',
      'var(--champagne)',
      'var(--accent-deep)',
      'var(--contour)',
      'var(--rose-bright)',
      'var(--powder)'
    ];
    let cursor = 0;
    const parts: string[] = [];
    slices.forEach((slice, i) => {
      const next = cursor + slice.pct;
      parts.push(`${colors[i % colors.length]} ${cursor}% ${next}%`);
      cursor = next;
    });
    if (cursor < 100) parts.push(`var(--bg-card) ${cursor}% 100%`);
    return `conic-gradient(${parts.join(', ')})`;
  });

  readonly historyMax = computed(() => {
    const vals = this.history().flatMap((h) => [h.income, h.expense]);
    return Math.max(2500, ...vals, 1);
  });

  readonly activeProjects = computed(() => this.projects().filter((p) => !p.archived));
  readonly archivedProjects = computed(() => this.projects().filter((p) => p.archived));
  readonly totalSavedProjects = computed(() =>
    this.activeProjects().reduce((s, p) => s + Number(p.savedAmount || 0), 0)
  );

  readonly categoryOptions = Object.keys(CATEGORY_ICONS);
  readonly accountNameOptions = computed(() => {
    const fromAccounts = this.accounts().map((a) => a.label);
    return fromAccounts.length ? fromAccounts : ['Compte courant', 'Livret A', 'PEA (ETF)', 'Épargne perso'];
  });

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

  setTab(tab: FinanceTab): void {
    this.tab.set(tab);
  }

  setMoveFilter(filter: MoveFilter): void {
    this.moveFilter.set(filter);
  }

  selectOwner(ownerId: string): void {
    this.ownerUserId.set(ownerId === 'me' ? null : ownerId);
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set('');
    const owner = this.ownerUserId();
    forkJoin({
      month: this.budgetApi.getMonth(this.year(), this.month(), owner),
      accounts: this.budgetApi.accounts(owner).pipe(catchError(() => of([] as BudgetAccount[]))),
      projects: this.budgetApi.projects(owner).pipe(catchError(() => of([] as BudgetProject[]))),
      history: this.loadHistory(owner)
    }).subscribe({
      next: ({ month, accounts, projects, history }) => {
        this.applyMonth(month);
        this.accounts.set(accounts);
        this.projects.set(projects);
        this.history.set(this.withDemoHistory(history));
        if (month.canEdit) {
          this.ensureDemoSeed(month, accounts, projects);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les finances.');
        this.loading.set(false);
      }
    });
  }

  openMoveForm(kind: 'expense' | 'income' | 'saving' = 'expense'): void {
    this.draftMoveLabel = '';
    this.draftMoveAmount = '';
    this.draftMoveKind = kind;
    this.draftMoveDate = this.todayIso();
    this.draftMoveCategory = kind === 'income' ? 'Salaire' : 'Autres';
    this.draftMoveAccount = this.accountNameOptions()[0] || 'Compte courant';
    this.moveFormOpen.set(true);
  }

  closeMoveForm(): void {
    this.moveFormOpen.set(false);
  }

  addMovement(): void {
    if (!this.canEdit()) return;
    const label = this.draftMoveLabel.trim();
    const amount = Number(String(this.draftMoveAmount).replace(',', '.'));
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
        note: null,
        category: this.draftMoveCategory || null,
        accountName: this.draftMoveAccount || null
      },
      ...list
    ]);
    this.moveFormOpen.set(false);
    this.persistMonth();
  }

  removeMovement(id: string): void {
    if (!this.canEdit()) return;
    this.movements.update((list) => list.filter((m) => m.id !== id));
    this.persistMonth();
  }

  openAccountForm(): void {
    this.draftAccountLabel = '';
    this.draftAccountBalance = '';
    this.draftAccountIcon = '💳';
    this.accountFormOpen.set(true);
  }

  closeAccountForm(): void {
    this.accountFormOpen.set(false);
  }

  addAccount(): void {
    if (!this.canEdit()) return;
    const label = this.draftAccountLabel.trim();
    const balance = Number(String(this.draftAccountBalance).replace(',', '.'));
    if (!label || Number.isNaN(balance)) {
      this.error.set('Indique un nom et un solde.');
      return;
    }
    const next = [
      ...this.accounts(),
      {
        id: createId(),
        label,
        icon: this.draftAccountIcon || '💳',
        balance,
        performancePct: null,
        sortOrder: this.accounts().length
      }
    ];
    this.accounts.set(next);
    this.accountFormOpen.set(false);
    this.persistAccounts(next);
  }

  removeAccount(id: string): void {
    if (!this.canEdit()) return;
    const next = this.accounts().filter((a) => a.id !== id);
    this.accounts.set(next);
    this.persistAccounts(next);
  }

  openProjectForm(): void {
    this.draftProjectLabel = '';
    this.draftProjectTarget = '';
    this.draftProjectSaved = '0';
    this.draftProjectMonthly = '';
    this.draftProjectIcon = '🎯';
    this.projectFormOpen.set(true);
  }

  closeProjectForm(): void {
    this.projectFormOpen.set(false);
  }

  addProject(): void {
    if (!this.canEdit()) return;
    const label = this.draftProjectLabel.trim();
    const target = Number(String(this.draftProjectTarget).replace(',', '.'));
    const saved = Number(String(this.draftProjectSaved).replace(',', '.'));
    const monthly = Number(String(this.draftProjectMonthly).replace(',', '.'));
    if (!label || Number.isNaN(target) || target <= 0 || Number.isNaN(saved) || Number.isNaN(monthly)) {
      this.error.set('Indique un projet, un objectif et une épargne mensuelle.');
      return;
    }
    const next = [
      ...this.projects(),
      {
        id: createId(),
        label,
        icon: this.draftProjectIcon || '🎯',
        targetAmount: target,
        savedAmount: Math.max(0, saved),
        monthlyContribution: Math.max(0, monthly),
        archived: false,
        completedOn: null,
        sortOrder: this.projects().length
      }
    ];
    this.projects.set(next);
    this.projectFormOpen.set(false);
    this.persistProjects(next);
  }

  removeProject(id: string): void {
    if (!this.canEdit()) return;
    const next = this.projects().filter((p) => p.id !== id);
    this.projects.set(next);
    this.persistProjects(next);
  }

  openProjectMoney(project: BudgetProject, mode: 'add' | 'remove'): void {
    this.projectMoneyTarget.set(project);
    this.projectMoneyMode.set(mode);
    this.draftProjectMoneyAmount = '';
    this.projectMoneyOpen.set(true);
  }

  closeProjectMoney(): void {
    this.projectMoneyOpen.set(false);
    this.projectMoneyTarget.set(null);
  }

  applyProjectMoney(): void {
    if (!this.canEdit()) return;
    const project = this.projectMoneyTarget();
    if (!project) return;
    const amount = Number(String(this.draftProjectMoneyAmount).replace(',', '.'));
    if (Number.isNaN(amount) || amount <= 0) {
      this.error.set('Indique un montant valide.');
      return;
    }
    const delta = this.projectMoneyMode() === 'add' ? amount : -amount;
    const next = this.projects().map((p) => {
      if (p.id !== project.id) return p;
      const savedAmount = Math.max(0, Number(p.savedAmount || 0) + delta);
      const archived = savedAmount >= Number(p.targetAmount || 0) && Number(p.targetAmount || 0) > 0;
      return {
        ...p,
        savedAmount,
        archived: archived ? true : p.archived,
        completedOn: archived && !p.completedOn ? this.todayIso() : p.completedOn
      };
    });
    this.projects.set(next);
    this.projectMoneyOpen.set(false);
    this.projectMoneyTarget.set(null);
    this.persistProjects(next);
  }

  projectPct(project: BudgetProject): number {
    const target = Number(project.targetAmount || 0);
    if (target <= 0) return 0;
    return Math.min(100, Math.round((Number(project.savedAmount || 0) / target) * 100));
  }

  projectMonthsLeft(project: BudgetProject): number | null {
    const remaining = Number(project.targetAmount || 0) - Number(project.savedAmount || 0);
    const monthly = Number(project.monthlyContribution || 0);
    if (remaining <= 0) return 0;
    if (monthly <= 0) return null;
    return Math.ceil(remaining / monthly);
  }

  barHeight(value: number): string {
    return `${Math.max(4, (value / this.historyMax()) * 100)}%`;
  }

  money(value: number, digits = 2): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value || 0);
  }

  moneySigned(value: number): string {
    const formatted = this.money(Math.abs(value));
    if (value > 0) return `+${formatted}`;
    if (value < 0) return `-${formatted}`;
    return formatted;
  }

  formatMoveDate(iso: string): string {
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    const raw = d.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  categoryIcon(category: string | null | undefined): string {
    if (!category) return '📦';
    return CATEGORY_ICONS[category] || '📦';
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

  private persistMonth(): void {
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
          note: m.note,
          category: m.category,
          accountName: m.accountName
        }))
      })
      .subscribe({
        next: (dto) => {
          this.applyMonth(dto);
          this.saving.set(false);
          this.saved.set(true);
          window.setTimeout(() => this.saved.set(false), 1400);
          this.refreshHistoryOnly();
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'Enregistrement impossible.');
          this.saving.set(false);
        }
      });
  }

  private persistAccounts(list: BudgetAccount[]): void {
    if (!this.canEdit()) return;
    this.budgetApi
      .saveAccounts(
        list.map((a, i) => ({
          id: a.id,
          label: a.label,
          icon: a.icon,
          balance: Number(a.balance || 0),
          performancePct: a.performancePct,
          sortOrder: i
        }))
      )
      .subscribe({
        next: (saved) => this.accounts.set(saved),
        error: () => this.error.set('Impossible d’enregistrer les comptes.')
      });
  }

  private persistProjects(list: BudgetProject[]): void {
    if (!this.canEdit()) return;
    this.budgetApi
      .saveProjects(
        list.map((p, i) => ({
          id: p.id,
          label: p.label,
          icon: p.icon,
          targetAmount: Number(p.targetAmount || 0),
          savedAmount: Number(p.savedAmount || 0),
          monthlyContribution: Number(p.monthlyContribution || 0),
          archived: !!p.archived,
          completedOn: p.completedOn,
          sortOrder: i
        }))
      )
      .subscribe({
        next: (saved) => this.projects.set(saved),
        error: () => this.error.set('Impossible d’enregistrer les projets.')
      });
  }

  private ensureDemoSeed(month: BudgetMonth, accounts: BudgetAccount[], projects: BudgetProject[]): void {
    if (!environment.useDemoData) return;

    const emptyMonth =
      Number(month.salary || 0) === 0 &&
      (month.movements?.length ?? 0) === 0 &&
      (month.allocations?.length ?? 0) === 0;
    const needsAccounts = accounts.length === 0;
    const needsProjects = projects.length === 0;
    if (!emptyMonth && !needsAccounts && !needsProjects) return;

    if (needsAccounts) {
      const demoAccounts = this.demoAccounts();
      this.accounts.set(demoAccounts);
      this.persistAccounts(demoAccounts);
    }
    if (needsProjects) {
      const demoProjects = this.demoProjects();
      this.projects.set(demoProjects);
      this.persistProjects(demoProjects);
    }
    if (emptyMonth) {
      this.salary.set(2066);
      this.allocations.set([
        { id: createId(), label: 'Loyer à venir', kind: 'spend', plannedAmount: 545 }
      ]);
      this.movements.set(this.demoMovements());
      this.persistMonth();
    }
  }

  private demoAccounts(): BudgetAccount[] {
    return [
      { id: createId(), label: 'Compte courant', icon: '💳', balance: 1245.8, performancePct: null, sortOrder: 0 },
      { id: createId(), label: 'Livret A', icon: '🐷', balance: 10000, performancePct: null, sortOrder: 1 },
      { id: createId(), label: 'PEA (ETF)', icon: '📈', balance: 4320, performancePct: 8.4, sortOrder: 2 },
      { id: createId(), label: 'Épargne perso', icon: '🪙', balance: 10000, performancePct: null, sortOrder: 3 }
    ];
  }

  private demoProjects(): BudgetProject[] {
    return [
      {
        id: createId(),
        label: 'Projet immobilier – Coursan',
        icon: '🏠',
        targetAmount: 90000,
        savedAmount: 38000,
        monthlyContribution: 1200,
        archived: false,
        completedOn: null,
        sortOrder: 0
      },
      {
        id: createId(),
        label: 'Vacances Portugal',
        icon: '🌴',
        targetAmount: 2000,
        savedAmount: 1200,
        monthlyContribution: 200,
        archived: false,
        completedOn: null,
        sortOrder: 1
      },
      {
        id: createId(),
        label: 'Fonds d’urgence',
        icon: '🛡',
        targetAmount: 6000,
        savedAmount: 3500,
        monthlyContribution: 300,
        archived: false,
        completedOn: null,
        sortOrder: 2
      },
      {
        id: createId(),
        label: 'Voiture / Apport',
        icon: '🚗',
        targetAmount: 8000,
        savedAmount: 4000,
        monthlyContribution: 400,
        archived: false,
        completedOn: null,
        sortOrder: 3
      },
      {
        id: createId(),
        label: 'Voyage Japon',
        icon: '✈',
        targetAmount: 3000,
        savedAmount: 3000,
        monthlyContribution: 0,
        archived: true,
        completedOn: '2024-09-15',
        sortOrder: 4
      }
    ];
  }

  private demoMovements(): BudgetMovement[] {
    const y = this.year();
    const m = String(this.month()).padStart(2, '0');
    return [
      {
        id: createId(),
        label: 'Alternance',
        kind: 'income',
        amount: 1700,
        date: `${y}-${m}-02`,
        note: null,
        category: 'Salaire',
        accountName: 'Compte courant'
      },
      {
        id: createId(),
        label: 'APL',
        kind: 'income',
        amount: 286,
        date: `${y}-${m}-05`,
        note: null,
        category: 'Aides',
        accountName: 'Compte courant'
      },
      {
        id: createId(),
        label: 'Pompier volontaire',
        kind: 'income',
        amount: 80,
        date: `${y}-${m}-10`,
        note: null,
        category: 'Activité',
        accountName: 'Compte courant'
      },
      {
        id: createId(),
        label: 'Titres restaurant',
        kind: 'income',
        amount: 0,
        date: `${y}-${m}-01`,
        note: null,
        category: 'Avantages',
        accountName: 'Compte courant'
      },
      {
        id: createId(),
        label: 'Loyer',
        kind: 'expense',
        amount: 545,
        date: `${y}-${m}-01`,
        note: null,
        category: 'Logement',
        accountName: 'Compte courant'
      },
      {
        id: createId(),
        label: 'Courses',
        kind: 'expense',
        amount: 175,
        date: `${y}-${m}-08`,
        note: null,
        category: 'Alimentation',
        accountName: 'Compte courant'
      },
      {
        id: createId(),
        label: 'Carburant',
        kind: 'expense',
        amount: 128,
        date: `${y}-${m}-12`,
        note: null,
        category: 'Transport',
        accountName: 'Compte courant'
      },
      {
        id: createId(),
        label: 'Assurance auto',
        kind: 'expense',
        amount: 62,
        date: `${y}-${m}-03`,
        note: null,
        category: 'Assurances',
        accountName: 'Compte courant'
      },
      {
        id: createId(),
        label: 'Salle de sport',
        kind: 'expense',
        amount: 39,
        date: `${y}-${m}-04`,
        note: null,
        category: 'Sport',
        accountName: 'Compte courant'
      },
      {
        id: createId(),
        label: 'Téléphone',
        kind: 'expense',
        amount: 19.99,
        date: `${y}-${m}-06`,
        note: null,
        category: 'Télécom',
        accountName: 'Compte courant'
      },
      {
        id: createId(),
        label: 'Sorties',
        kind: 'expense',
        amount: 74.5,
        date: `${y}-${m}-15`,
        note: null,
        category: 'Loisirs & sorties',
        accountName: 'Compte courant'
      }
    ];
  }

  private loadHistory(owner: string | null): Observable<HistoryPoint[]> {
    const points: Array<{ year: number; month: number; label: string; key: string }> = [];
    let y = this.year();
    let m = this.month();
    for (let i = 0; i < 6; i++) {
      const date = new Date(y, m - 1, 1);
      points.unshift({
        year: y,
        month: m,
        key: `${y}-${m}`,
        label: date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
      });
      m -= 1;
      if (m < 1) {
        m = 12;
        y -= 1;
      }
    }

    return forkJoin(
      points.map((p) =>
        this.budgetApi.getMonth(p.year, p.month, owner).pipe(
          catchError(() => of({ movements: [] as BudgetMovement[] } as BudgetMonth)),
          map((dto) => {
            const income = (dto.movements ?? [])
              .filter((mv) => mv.kind === 'income')
              .reduce((sum, mv) => sum + Number(mv.amount || 0), 0);
            const expense = (dto.movements ?? [])
              .filter((mv) => mv.kind === 'expense')
              .reduce((sum, mv) => sum + Number(mv.amount || 0), 0);
            return {
              key: p.key,
              label: p.label.charAt(0).toUpperCase() + p.label.slice(1),
              income,
              expense
            } satisfies HistoryPoint;
          })
        )
      )
    ).pipe(catchError(() => of([] as HistoryPoint[])));
  }

  private refreshHistoryOnly(): void {
    this.loadHistory(this.ownerUserId()).subscribe({
      next: (history) => this.history.set(this.withDemoHistory(history)),
      error: () => undefined
    });
  }

  private withDemoHistory(history: HistoryPoint[]): HistoryPoint[] {
    if (!environment.useDemoData || !history.length) return history;
    const hasAny = history.some((h) => h.income > 0 || h.expense > 0);
    if (hasAny) return history;
    const income = this.incomeTotal() || this.salairesRecus() || 2066;
    const expense = this.expenseTotal() || 1323.5;
    return history.map((h, index) => {
      const wave = 1 - (history.length - 1 - index) * 0.04;
      return {
        ...h,
        income: Math.round(income * wave),
        expense: Math.round(expense * (0.92 + (index % 3) * 0.03))
      };
    });
  }

  private applyMonth(dto: BudgetMonth): void {
    this.canEdit.set(!!dto.canEdit);
    this.ownerName.set(dto.ownerName || this.auth.user()?.displayName || 'Moi');
    this.salary.set(Number(dto.salary || 0));
    this.note.set(dto.note || '');
    this.allocations.set(dto.allocations ?? []);
    this.movements.set(
      (dto.movements ?? []).map((m) => ({
        ...m,
        category: m.category ?? null,
        accountName: m.accountName ?? null
      }))
    );
  }

  private todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
