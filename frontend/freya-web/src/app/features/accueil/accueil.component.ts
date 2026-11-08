import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';

interface DashboardToday {
  date: string;
  time: string;
  temperatureC?: number | null;
  events: Array<{ title: string; startTime: string; endTime?: string | null }>;
  meals: Array<{ slot: string; title: string; done: boolean }>;
}

@Component({
  selector: 'app-accueil',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './accueil.component.html',
  styleUrl: './accueil.component.scss'
})
export class AccueilComponent implements OnInit {
  readonly data = signal<DashboardToday | null>(null);

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<DashboardToday>(`${environment.apiUrl}/dashboard/today`).subscribe({
      next: (dto) => this.data.set(dto),
      error: () =>
        this.data.set({
          date: new Date().toISOString().slice(0, 10),
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          temperatureC: 12,
          events: [],
          meals: []
        })
    });
  }

  formatDate(iso: string): string {
    return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
}
