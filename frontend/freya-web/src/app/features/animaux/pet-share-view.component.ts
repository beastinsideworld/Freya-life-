import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PetShareService } from '../../core/pet-share.service';
import { Pet, PetsStore } from '../../core/pets.store';

@Component({
  selector: 'app-pet-share-view',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="page share-page">
      <header class="hero">
        <div class="icon" aria-hidden="true">🐾</div>
        <h1>Profil animal</h1>
        <p class="sub">Partagé par {{ ownerName() || 'un utilisateur Freya' }}</p>
      </header>

      @if (loading()) {
        <p class="empty">Chargement…</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
        <a routerLink="/login" class="btn primary">Se connecter à Freya</a>
      } @else if (pet()) {
        @let p = pet()!;
        <section class="panel profile">
          <div class="row">
            <span class="avatar" aria-hidden="true">{{ p.photoEmoji }}</span>
            <div>
              <h2>{{ p.name }} {{ p.sex === 'F' ? '♀' : '♂' }}</h2>
              <p>{{ p.species }} - {{ p.breed }}</p>
              <p class="muted">{{ ageLabel(p) }} ({{ birthLabel(p) }})</p>
            </div>
          </div>
        </section>

        <section class="panel">
          <h3>Identité</h3>
          <p>Puce : {{ p.chip || '—' }}</p>
          <p>Assurance : {{ p.insurance ? 'Oui' : 'Non' }}</p>
        </section>

        <section class="panel">
          <h3>Alimentation</h3>
          <p>{{ p.foodBrand || 'Non renseigné' }}</p>
          <p class="muted">
            @if (p.mealsPerDay) {
              {{ p.mealsPerDay }} repas / jour
              @if (p.mealGrams) { • {{ p.mealGrams }} g }
            } @else {
              —
            }
          </p>
        </section>

        <section class="panel">
          <h3>Poids</h3>
          <p>{{ p.weightKg ? (p.weightKg.toFixed(1).replace('.', ',') + ' kg') : '—' }}</p>
          @if (p.weightDeltaKg) {
            <p class="muted">
              {{ p.weightDeltaKg > 0 ? '+' : '' }}{{ p.weightDeltaKg.toFixed(1).replace('.', ',') }} kg sur 1 mois
            </p>
          }
        </section>

        @if (p.notes) {
          <section class="panel">
            <h3>Notes</h3>
            <p>{{ p.notes }}</p>
          </section>
        }

        <a routerLink="/animaux" class="btn primary wide">Ouvrir Freya Animaux</a>
      }
    </section>
  `,
  styles: `
    .share-page { display: flex; flex-direction: column; gap: 0.85rem; max-width: 520px; margin: 0 auto; }
    .profile .row { display: flex; gap: 0.85rem; align-items: center; }
    .avatar {
      width: 4.2rem; height: 4.2rem; border-radius: 0.95rem; display: grid; place-items: center;
      border: 1px solid var(--border); background: rgba(255,255,255,0.04); font-size: 2rem;
    }
    h2 { margin: 0; font-size: 1.6rem; }
    h3 { margin: 0 0 0.45rem; font-size: 1rem; color: var(--gold); }
    .muted, .empty { color: var(--muted); }
    .error { color: var(--accent); }
    .panel p { margin: 0.25rem 0; }
    .btn.wide { text-align: center; }
  `
})
export class PetShareViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PetShareService);
  private readonly pets = inject(PetsStore);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly ownerName = signal('');
  readonly pet = signal<Pet | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token') || '';
    if (!token) {
      this.error.set('Lien invalide.');
      this.loading.set(false);
      return;
    }

    this.api.get(token).subscribe({
      next: (dto) => {
        this.ownerName.set(dto.ownerName);
        try {
          this.pet.set(JSON.parse(dto.petPayloadJson) as Pet);
        } catch {
          this.error.set('Profil illisible.');
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Ce lien de partage est introuvable ou a expiré.');
        this.loading.set(false);
      }
    });
  }

  ageLabel(pet: Pet): string {
    return this.pets.ageLabel(pet);
  }

  birthLabel(pet: Pet): string {
    return this.pets.birthLabel(pet);
  }
}
