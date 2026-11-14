import { Injectable, computed, signal } from '@angular/core';

const STORAGE_KEY = 'freya.ideaFab.v1';
const SIZE = 46;

export interface IdeaFabPosition {
  hidden: boolean;
  x: number;
  y: number;
}

function defaultPosition(): Pick<IdeaFabPosition, 'x' | 'y'> {
  const wide = window.innerWidth >= 1024;
  const right = wide ? 20 : 14;
  const top = wide ? 16 : 12;
  return {
    x: Math.max(8, window.innerWidth - right - SIZE),
    y: top
  };
}

function readPosition(): IdeaFabPosition {
  const fallback = { hidden: false, ...defaultPosition() };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<IdeaFabPosition>;
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return fallback;
    return {
      hidden: !!parsed.hidden,
      x: parsed.x,
      y: parsed.y
    };
  } catch {
    return fallback;
  }
}

@Injectable({ providedIn: 'root' })
export class IdeaFabStore {
  private readonly state = signal<IdeaFabPosition>(readPosition());

  readonly hidden = computed(() => this.state().hidden);
  readonly x = computed(() => this.state().x);
  readonly y = computed(() => this.state().y);

  move(x: number, y: number): void {
    const next = clamp(x, y);
    this.state.update((current) => ({ ...current, ...next }));
  }

  commit(x: number, y: number): void {
    const next = clamp(x, y);
    this.state.set({ hidden: false, ...next });
    this.persist();
  }

  hide(): void {
    this.state.update((current) => ({ ...current, hidden: true }));
    this.persist();
  }

  show(): void {
    this.state.set({ hidden: false, ...defaultPosition() });
    this.persist();
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
  }
}

export function clampFab(x: number, y: number): { x: number; y: number } {
  return clamp(x, y);
}

function clamp(x: number, y: number): { x: number; y: number } {
  const margin = 8;
  return {
    x: Math.min(Math.max(margin, x), Math.max(margin, window.innerWidth - SIZE - margin)),
    y: Math.min(Math.max(margin, y), Math.max(margin, window.innerHeight - SIZE - margin))
  };
}
