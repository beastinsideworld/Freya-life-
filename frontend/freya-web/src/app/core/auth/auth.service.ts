import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AuthResponse {
  token: string;
  email: string;
  displayName: string;
  userId: string;
  friendCode: number;
  avatarUrl?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'freya.auth';
  private readonly state = signal<AuthResponse | null>(this.readStored());

  readonly user = this.state.asReadonly();
  readonly isAuthenticated = computed(() => !!this.state()?.token);

  constructor(private readonly http: HttpClient, private readonly router: Router) {}

  register(email: string, password: string, displayName: string) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, { email, password, displayName })
      .pipe(tap((res) => this.persist(res)));
  }

  login(email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap((res) => this.persist(res)));
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
    this.state.set(null);
    void this.router.navigateByUrl('/login');
  }

  token(): string | null {
    return this.state()?.token ?? null;
  }

  patchProfile(partial: Partial<AuthResponse>): void {
    const current = this.state();
    if (!current) return;
    this.persist({ ...current, ...partial });
  }

  private persist(res: AuthResponse): void {
    localStorage.setItem(this.storageKey, JSON.stringify(res));
    this.state.set(res);
  }

  private readStored(): AuthResponse | null {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as AuthResponse;
    } catch {
      return null;
    }
  }
}
