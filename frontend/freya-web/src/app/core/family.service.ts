import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { loadObjectives, loadRooms, loadTasks } from './planning-local';

export interface FamilySummary {
  id: string;
  name: string;
  inviteCode: number;
  memberCount: number;
  isOwner: boolean;
}

export interface FamilyMember {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface FamilyEvent {
  id: string;
  userId: string;
  ownerName: string;
  mine: boolean;
  title: string;
  date: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  kind: number;
  category: number;
}

export interface FamilyPlanItem {
  id: string;
  userId: string;
  ownerName: string;
  mine: boolean;
  title: string;
  meta: string;
  done: boolean;
  kind: 'objective' | 'habit' | 'task' | string;
  roomId: string | null;
}

export interface FamilyToday {
  familyId: string;
  familyName: string;
  members: FamilyMember[];
  events: FamilyEvent[];
  objectives: FamilyPlanItem[];
  habits: FamilyPlanItem[];
  tasks: FamilyPlanItem[];
}

@Injectable({ providedIn: 'root' })
export class FamilyService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list() {
    return this.http.get<FamilySummary[]>(`${this.base}/families`);
  }

  create(name: string) {
    return this.http.post<FamilySummary>(`${this.base}/families`, { name });
  }

  join(inviteCode: number) {
    return this.http.post<FamilySummary>(`${this.base}/families/join`, { inviteCode });
  }

  leave(familyId: string) {
    return this.http.delete<void>(`${this.base}/families/${familyId}/leave`);
  }

  today(familyId: string, date?: string) {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<FamilyToday>(`${this.base}/families/${familyId}/today`, { params });
  }

  events(familyId: string, from: string, to: string) {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<FamilyEvent[]>(`${this.base}/families/${familyId}/events`, { params });
  }

  syncPlanningSnapshot() {
    return this.http.put<void>(`${this.base}/planning/snapshot`, {
      objectivesJson: JSON.stringify(loadObjectives()),
      roomsJson: JSON.stringify(loadRooms()),
      tasksJson: JSON.stringify(loadTasks())
    });
  }
}
