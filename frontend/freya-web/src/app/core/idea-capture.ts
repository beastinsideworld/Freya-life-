import { Injectable, computed, signal } from '@angular/core';
import { createId } from './id';
import { AuthService } from './auth/auth.service';
import {
  InspirationItem,
  InspirationListKey,
  InspirationPlace,
  loadInspirations,
  saveInspirations
} from './trip-local';
import {
  loadObjectives,
  loadRooms,
  loadTasks,
  saveObjectives,
  saveRooms,
  saveTasks,
  toIsoDate
} from './planning-local';

export type IdeaDestination =
  | 'voyage'
  | 'film'
  | 'jeu'
  | 'manga'
  | 'activite'
  | 'objectif'
  | 'habitude'
  | 'tache';

export type VoyagePlaceKind = InspirationListKey;

export type BadgeTarget = 'voyages' | 'tele' | 'planning';

export interface IdeaBadge {
  id: string;
  target: BadgeTarget;
  title: string;
  detail: string;
  createdBy: string;
  createdAt: string;
}

export interface CaptureIdeaInput {
  title: string;
  note?: string;
  destination: IdeaDestination | '';
  voyageKind?: VoyagePlaceKind | null;
  country?: string;
}

const TELE_KEY = 'freya.tele.items.v2';
const BADGES_KEY = 'freya.idea.badges.v1';

@Injectable({ providedIn: 'root' })
export class IdeaCaptureService {
  private readonly badgesSignal = signal<IdeaBadge[]>(this.readBadges());

  readonly badges = this.badgesSignal.asReadonly();

  readonly visibleBadges = computed(() => {
    const userId = this.auth.user()?.userId ?? '';
    return this.badgesSignal().filter((badge) => badge.createdBy !== userId);
  });

  readonly badgeCountByTarget = computed(() => {
    const map: Record<BadgeTarget, number> = { voyages: 0, tele: 0, planning: 0 };
    for (const badge of this.visibleBadges()) {
      map[badge.target] += 1;
    }
    return map;
  });

  constructor(private readonly auth: AuthService) {}

  destinationOptions(): Array<{ id: IdeaDestination; label: string }> {
    return [
      { id: 'voyage', label: 'Voyage' },
      { id: 'film', label: 'Film' },
      { id: 'jeu', label: 'Jeu' },
      { id: 'manga', label: 'Manga' },
      { id: 'activite', label: 'Activité' },
      { id: 'objectif', label: 'Objectif' },
      { id: 'habitude', label: 'Habitude' },
      { id: 'tache', label: 'Tâche' }
    ];
  }

  voyageKindOptions(): Array<{ id: VoyagePlaceKind; label: string }> {
    return [
      { id: 'restos', label: 'Restaurant' },
      { id: 'visits', label: 'Endroit à visiter' },
      { id: 'hotels', label: 'Hôtel' },
      { id: 'hikes', label: 'Randonnée' },
      { id: 'transport', label: 'Transport' }
    ];
  }

  countrySuggestions(): string[] {
    return loadInspirations()
      .map((item) => item.title)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'fr'));
  }

  capture(input: CaptureIdeaInput): { ok: true; message: string } | { ok: false; message: string } {
    const title = input.title.trim();
    if (!title) return { ok: false, message: 'Indique une idée.' };

    const destination = input.destination || 'tache';
    const note = (input.note ?? '').trim();
    const userId = this.auth.user()?.userId ?? 'local';

    switch (destination) {
      case 'voyage':
        return this.captureVoyage(title, note, input.voyageKind, input.country, userId);
      case 'film':
        this.addTeleItem(title, note, 'audiovisuel', 'film');
        this.pushBadge('tele', title, 'Film · À découvrir', userId);
        return { ok: true, message: 'Idée ajoutée aux films.' };
      case 'jeu':
        this.addTeleItem(title, note, 'jeu');
        this.pushBadge('tele', title, 'Jeu · À découvrir', userId);
        return { ok: true, message: 'Idée ajoutée aux jeux.' };
      case 'manga':
        this.addTeleItem(title, note, 'manga');
        this.pushBadge('tele', title, 'Manga · À découvrir', userId);
        return { ok: true, message: 'Idée ajoutée aux mangas.' };
      case 'activite':
        this.addTeleItem(title, note, 'activite');
        this.pushBadge('tele', title, 'Activité · À faire', userId);
        return { ok: true, message: 'Idée ajoutée aux activités.' };
      case 'objectif':
        this.addObjective(title);
        this.pushBadge('planning', title, 'Nouvel objectif', userId);
        return { ok: true, message: 'Idée ajoutée aux objectifs.' };
      case 'habitude':
        this.addHabit(title);
        this.pushBadge('planning', title, 'Nouvelle habitude', userId);
        return { ok: true, message: 'Idée ajoutée aux habitudes.' };
      case 'tache':
      default:
        this.addTask(title);
        this.pushBadge('planning', title, 'Nouvelle tâche', userId);
        return { ok: true, message: 'Idée ajoutée aux tâches.' };
    }
  }

  dismissTarget(target: BadgeTarget): void {
    const userId = this.auth.user()?.userId ?? '';
    const next = this.badgesSignal().filter(
      (badge) => !(badge.target === target && badge.createdBy !== userId)
    );
    this.badgesSignal.set(next);
    this.persistBadges();
  }

  dismissBadge(id: string): void {
    this.badgesSignal.update((list) => list.filter((badge) => badge.id !== id));
    this.persistBadges();
  }

  private captureVoyage(
    title: string,
    note: string,
    kind: VoyagePlaceKind | null | undefined,
    countryRaw: string | undefined,
    userId: string
  ): { ok: true; message: string } | { ok: false; message: string } {
    if (!kind) return { ok: false, message: 'Choisis un type (restaurant, hôtel…).' };
    const country = (countryRaw ?? '').trim();
    if (!country) return { ok: false, message: 'Indique ou choisis un pays.' };

    const inspirations = loadInspirations();
    const matchIndex = inspirations.findIndex(
      (item) => item.title.trim().toLowerCase() === country.toLowerCase()
    );

    const place: InspirationPlace = {
      id: createId(),
      title,
      photoUrl: null,
      amount: '',
      link: '',
      note,
      address: ''
    };

    if (matchIndex >= 0) {
      const current = inspirations[matchIndex];
      inspirations[matchIndex] = {
        ...current,
        [kind]: [...(current[kind] ?? []), place]
      };
      saveInspirations(inspirations);
      this.pushBadge('voyages', title, `${country} · Inspiration`, userId);
      return { ok: true, message: `Ajouté à ${country}.` };
    }

    const created: InspirationItem = {
      id: createId(),
      title: country,
      hint: 'Créé depuis une idée',
      notes: '',
      restos: [],
      hikes: [],
      visits: [],
      hotels: [],
      transport: [],
      [kind]: [place]
    };
    saveInspirations([created, ...inspirations]);
    this.pushBadge('voyages', title, `${country} · Nouvelle inspiration`, userId);
    return { ok: true, message: `Pays « ${country} » créé dans Inspirations.` };
  }

  private addTeleItem(
    title: string,
    note: string,
    category: 'audiovisuel' | 'jeu' | 'manga' | 'activite',
    mediaType?: 'film' | 'serie' | 'docu'
  ): void {
    const items = this.readTele();
    items.unshift({
      id: createId(),
      title,
      category,
      mediaType: category === 'audiovisuel' ? mediaType ?? 'film' : undefined,
      note,
      status: 'discover',
      createdAt: new Date().toISOString()
    });
    localStorage.setItem(TELE_KEY, JSON.stringify(items));
  }

  private addObjective(title: string): void {
    const items = loadObjectives();
    items.unshift({
      id: createId(),
      title,
      date: toIsoDate(new Date()),
      repeat: 'once',
      done: false
    });
    saveObjectives(items);
  }

  private addHabit(title: string): void {
    const rooms = loadRooms();
    if (!rooms.length) {
      const room = {
        id: createId(),
        name: 'Idées',
        tasks: [
          {
            id: createId(),
            title,
            date: toIsoDate(new Date()),
            repeat: 'once' as const,
            done: false
          }
        ]
      };
      saveRooms([room]);
      return;
    }
    const first = rooms[0];
    rooms[0] = {
      ...first,
      tasks: [
        {
          id: createId(),
          title,
          date: toIsoDate(new Date()),
          repeat: 'once',
          done: false
        },
        ...first.tasks
      ]
    };
    saveRooms(rooms);
  }

  private addTask(title: string): void {
    const items = loadTasks();
    items.unshift({ id: createId(), title, done: false });
    saveTasks(items);
  }

  private pushBadge(target: BadgeTarget, title: string, detail: string, createdBy: string): void {
    const badge: IdeaBadge = {
      id: createId(),
      target,
      title,
      detail,
      createdBy,
      createdAt: new Date().toISOString()
    };
    this.badgesSignal.update((list) => [badge, ...list].slice(0, 50));
    this.persistBadges();
  }

  private readTele(): any[] {
    try {
      const raw = localStorage.getItem(TELE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private readBadges(): IdeaBadge[] {
    try {
      const raw = localStorage.getItem(BADGES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private persistBadges(): void {
    localStorage.setItem(BADGES_KEY, JSON.stringify(this.badgesSignal()));
  }
}
