import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type EventKind = 'Task' | 'Objective' | 0 | 1;
export type EventCategory = 'Other' | 'Sport' | 'Work' | 'Meal' | 'Run' | 'Projects' | 'Social' | number;

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string | null;
  startTime: string;
  endTime?: string | null;
  allDay?: boolean;
  kind: EventKind;
  category: EventCategory;
}

export interface CreateEventPayload {
  title: string;
  date: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  allDay: boolean;
  kind: number;
  category: number;
}

@Injectable({ providedIn: 'root' })
export class EventsService {
  constructor(private readonly http: HttpClient) {}

  list(from: string, to: string) {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<CalendarEvent[]>(`${environment.apiUrl}/events`, { params });
  }

  create(payload: CreateEventPayload) {
    return this.http.post<CalendarEvent>(`${environment.apiUrl}/events`, payload);
  }

  update(id: string, payload: CreateEventPayload) {
    return this.http.put<CalendarEvent>(`${environment.apiUrl}/events/${id}`, payload);
  }
}
