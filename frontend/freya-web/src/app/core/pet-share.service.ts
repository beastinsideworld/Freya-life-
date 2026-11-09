import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Pet } from './pets.store';

export interface PetShareCreated {
  token: string;
  ownerName: string;
  createdAtUtc: string;
}

export interface PetShareView {
  token: string;
  ownerName: string;
  petPayloadJson: string;
  createdAtUtc: string;
}

@Injectable({ providedIn: 'root' })
export class PetShareService {
  private readonly http = inject(HttpClient);

  create(pet: Pet) {
    return this.http.post<PetShareCreated>(`${environment.apiUrl}/pets/shares`, {
      petPayloadJson: JSON.stringify(pet)
    });
  }

  get(token: string) {
    return this.http.get<PetShareView>(`${environment.apiUrl}/pets/shares/${encodeURIComponent(token)}`);
  }

  shareUrl(token: string): string {
    return `${window.location.origin}/partage/animaux/${token}`;
  }
}
