import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface BudgetAllocation {
  id: string;
  label: string;
  kind: 'spend' | 'save' | string;
  plannedAmount: number;
}

export interface BudgetMovement {
  id: string;
  label: string;
  kind: 'expense' | 'saving' | 'income' | string;
  amount: number;
  date: string;
  note: string | null;
  category: string | null;
  accountName: string | null;
}

export interface BudgetMonth {
  id: string;
  year: number;
  month: number;
  salary: number;
  note: string | null;
  allocations: BudgetAllocation[];
  movements: BudgetMovement[];
  canEdit: boolean;
  ownerName: string;
  ownerUserId: string;
}

export interface BudgetAccount {
  id: string;
  label: string;
  icon: string;
  balance: number;
  performancePct: number | null;
  sortOrder: number;
}

export interface BudgetProject {
  id: string;
  label: string;
  icon: string;
  targetAmount: number;
  savedAmount: number;
  monthlyContribution: number;
  archived: boolean;
  completedOn: string | null;
  sortOrder: number;
}

export interface BudgetShare {
  viewerUserId: string;
  viewerName: string;
  shareSalary: boolean;
  shareAllocations: boolean;
  shareSavings: boolean;
  shareMovements: boolean;
}

export interface SharedBudgetOwner {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getMonth(year: number, month: number, ownerUserId?: string | null) {
    let params = new HttpParams().set('year', year).set('month', month);
    if (ownerUserId) params = params.set('ownerUserId', ownerUserId);
    return this.http.get<BudgetMonth>(`${this.base}/budget/month`, { params });
  }

  saveMonth(payload: {
    year: number;
    month: number;
    salary: number;
    note: string | null;
    allocations: Array<{ id?: string; label: string; kind: string; plannedAmount: number }>;
    movements: Array<{
      id?: string;
      label: string;
      kind: string;
      amount: number;
      date: string;
      note?: string | null;
      category?: string | null;
      accountName?: string | null;
    }>;
  }) {
    return this.http.put<BudgetMonth>(`${this.base}/budget/month`, payload);
  }

  accounts(ownerUserId?: string | null) {
    let params = new HttpParams();
    if (ownerUserId) params = params.set('ownerUserId', ownerUserId);
    return this.http.get<BudgetAccount[]>(`${this.base}/budget/accounts`, { params });
  }

  saveAccounts(accounts: Array<{
    id?: string;
    label: string;
    icon: string;
    balance: number;
    performancePct?: number | null;
    sortOrder: number;
  }>) {
    return this.http.put<BudgetAccount[]>(`${this.base}/budget/accounts`, { accounts });
  }

  projects(ownerUserId?: string | null) {
    let params = new HttpParams();
    if (ownerUserId) params = params.set('ownerUserId', ownerUserId);
    return this.http.get<BudgetProject[]>(`${this.base}/budget/projects`, { params });
  }

  saveProjects(projects: Array<{
    id?: string;
    label: string;
    icon: string;
    targetAmount: number;
    savedAmount: number;
    monthlyContribution: number;
    archived: boolean;
    completedOn?: string | null;
    sortOrder: number;
  }>) {
    return this.http.put<BudgetProject[]>(`${this.base}/budget/projects`, { projects });
  }

  shares() {
    return this.http.get<BudgetShare[]>(`${this.base}/budget/shares`);
  }

  upsertShare(payload: {
    viewerUserId: string;
    shareSalary: boolean;
    shareAllocations: boolean;
    shareSavings: boolean;
    shareMovements: boolean;
  }) {
    return this.http.put<BudgetShare | null>(`${this.base}/budget/shares`, payload);
  }

  sharedWithMe() {
    return this.http.get<SharedBudgetOwner[]>(`${this.base}/budget/shared-with-me`);
  }
}
