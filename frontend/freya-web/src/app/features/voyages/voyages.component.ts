import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-voyages',
  standalone: true,
  templateUrl: './voyages.component.html',
  styleUrl: './voyages.component.scss'
})
export class VoyagesComponent implements OnInit {
  readonly trips = signal<any[]>([]);

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any[]>(`${environment.apiUrl}/trips`).subscribe({
      next: (items) => this.trips.set(items),
      error: () => this.trips.set([])
    });
  }

  countdown(daysUntil: number): string {
    if (daysUntil >= 0) {
      return `J-${daysUntil}`;
    }
    return `J+${Math.abs(daysUntil)}`;
  }
}
