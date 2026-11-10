import { afterNextRender, Component, ElementRef, HostListener, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { fantasyCalendrierSrc } from '../../core/theme-fantasy';

interface DayCell {
  iso: string | null;
  day: number | null;
  outside: boolean;
  today: boolean;
  selected: boolean;
}

@Component({
  selector: 'app-date-picker',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePickerComponent),
      multi: true
    }
  ],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.scss'
})
export class DatePickerComponent implements ControlValueAccessor {
  readonly open = signal(false);
  readonly value = signal('');
  readonly viewYear = signal(new Date().getFullYear());
  readonly viewMonth = signal(new Date().getMonth());
  readonly cells = signal<DayCell[]>([]);
  readonly disabled = signal(false);

  readonly weekdays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  private readonly themeTick = signal(0);

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor(private readonly host: ElementRef<HTMLElement>) {
    this.refreshCells();
    afterNextRender(() => {
      const obs = new MutationObserver(() => this.themeTick.update((n) => n + 1));
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    });
  }

  calendrierIconSrc(): string | null {
    this.themeTick();
    return fantasyCalendrierSrc();
  }

  writeValue(value: string | null): void {
    const next = value ?? '';
    this.value.set(next);
    if (next) {
      const parsed = this.parseIso(next);
      if (parsed) {
        this.viewYear.set(parsed.getFullYear());
        this.viewMonth.set(parsed.getMonth());
      }
    }
    this.refreshCells();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  displayValue(): string {
    const iso = this.value();
    if (!iso) return 'Choisir une date';
    const date = this.parseIso(iso);
    if (!date) return iso;
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  monthLabel(): string {
    const date = new Date(this.viewYear(), this.viewMonth(), 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  toggle(): void {
    if (this.disabled()) return;
    this.open.update((v) => !v);
    if (this.open()) {
      const current = this.parseIso(this.value());
      if (current) {
        this.viewYear.set(current.getFullYear());
        this.viewMonth.set(current.getMonth());
        this.refreshCells();
      }
      this.onTouched();
    }
  }

  prevMonth(): void {
    const month = this.viewMonth() - 1;
    if (month < 0) {
      this.viewMonth.set(11);
      this.viewYear.update((y) => y - 1);
    } else {
      this.viewMonth.set(month);
    }
    this.refreshCells();
  }

  nextMonth(): void {
    const month = this.viewMonth() + 1;
    if (month > 11) {
      this.viewMonth.set(0);
      this.viewYear.update((y) => y + 1);
    } else {
      this.viewMonth.set(month);
    }
    this.refreshCells();
  }

  selectDay(cell: DayCell): void {
    if (!cell.iso || cell.outside) return;
    this.value.set(cell.iso);
    this.onChange(cell.iso);
    this.open.set(false);
    this.refreshCells();
  }

  clear(): void {
    this.value.set('');
    this.onChange('');
    this.open.set(false);
    this.refreshCells();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  private refreshCells(): void {
    const year = this.viewYear();
    const month = this.viewMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = this.toIso(new Date());
    const selected = this.value();
    const cells: DayCell[] = [];

    for (let i = 0; i < offset; i++) {
      cells.push({ iso: null, day: null, outside: true, today: false, selected: false });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const iso = this.toIso(new Date(year, month, day));
      cells.push({
        iso,
        day,
        outside: false,
        today: iso === today,
        selected: iso === selected
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ iso: null, day: null, outside: true, today: false, selected: false });
    }

    this.cells.set(cells);
  }

  private toIso(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private parseIso(iso: string): Date | null {
    const parts = iso.split('-').map(Number);
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
}
