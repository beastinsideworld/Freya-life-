import { Component, OnInit, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { createId } from '../../core/id';
import {
  InspirationItem,
  TripBudgetLine,
  TripChecklistItem,
  inspirationMatchesTrip,
  loadInspirations,
  loadTripExtras,
  mergeUnique,
  parseListInput,
  patchTripExtras,
  saveInspirations
} from '../../core/trip-local';
import { DatePickerComponent } from '../../shared/date-picker/date-picker.component';

type TripTab = 'mes' | 'inspirations' | 'budget';
type DetailSection = 'outils' | 'checklist' | 'budget' | 'infos';

interface TripDetail {
  id: string;
  title: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  daysUntil: number;
  coverUrl: string | null;
  places: string;
  restos: string[];
  hikes: string[];
  visits: string[];
  hotels: string[];
  transport: string[];
  checklist: TripChecklistItem[];
  budget: TripBudgetLine[];
}

@Component({
  selector: 'app-voyages',
  standalone: true,
  imports: [FormsModule, DatePickerComponent],
  templateUrl: './voyages.component.html',
  styleUrl: './voyages.component.scss'
})
export class VoyagesComponent implements OnInit {
  readonly tab = signal<TripTab>('mes');
  readonly selectedTripId = signal<string | null>(null);
  readonly detailSection = signal<DetailSection>('outils');
  readonly trips = signal<TripDetail[]>([]);
  readonly inspirations = signal<InspirationItem[]>([]);
  readonly tripModalOpen = signal(false);
  readonly tripSaving = signal(false);
  readonly tripFormError = signal('');
  readonly inspirationModalOpen = signal(false);
  readonly inspirationFormError = signal('');
  readonly inspirationAppliedMsg = signal('');
  checklistDraft = '';
  budgetLabelDraft = '';
  budgetAmountDraft = '';

  tripForm = {
    title: '',
    places: '',
    startDate: '',
    endDate: '',
    coverUrl: '' as string
  };

  inspirationForm = {
    title: '',
    hint: '',
    notes: '',
    restos: '',
    visits: '',
    hikes: '',
    hotels: '',
    transport: ''
  };

  readonly tools = [
    { title: 'Transport', sub: 'Vols, trains, location' },
    { title: 'Hébergement', sub: 'Hôtels, Airbnb' },
    { title: 'Itinéraire', sub: 'Activités, visites' },
    { title: 'À emporter', sub: 'Valise, documents' },
    { title: 'Budget', sub: 'Dépenses, suivi' },
    { title: 'Repas', sub: 'Adresses, idées' },
    { title: 'Cartes', sub: 'Hors ligne, repères' },
    { title: 'Documents', sub: 'Passeport, billets' }
  ];

  readonly upcomingTrips = computed(() => {
    const today = this.toIso(new Date());
    return this.trips()
      .filter((trip) => trip.endDate >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  });

  readonly pastTrips = computed(() => {
    const today = this.toIso(new Date());
    return this.trips()
      .filter((trip) => trip.endDate < today)
      .sort((a, b) => b.endDate.localeCompare(a.endDate));
  });

  readonly selectedTrip = computed(
    () => this.trips().find((trip) => trip.id === this.selectedTripId()) ?? null
  );

  readonly matchedInspirations = computed(() => {
    const trip = this.selectedTrip();
    if (!trip) return [] as InspirationItem[];
    return this.inspirations().filter((item) => inspirationMatchesTrip(item, trip));
  });

  readonly globalBudget = computed(() => {
    const lines: Array<{ id: string; label: string; amount: string }> = [];
    for (const trip of this.upcomingTrips()) {
      for (const line of trip.budget) {
        lines.push({
          id: `${trip.id}-${line.id}`,
          label: `${trip.title} · ${line.label}`,
          amount: line.amount
        });
      }
    }
    return lines;
  });

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.inspirations.set(loadInspirations());
    this.http.get<any[]>(`${environment.apiUrl}/trips`).subscribe({
      next: (items) => {
        const mapped = (items ?? []).map((item) => this.mapApiTrip(item));
        this.trips.set(mapped.length ? mapped : this.demoTrips());
      },
      error: () => this.trips.set(this.demoTrips())
    });
  }

  setTab(tab: TripTab): void {
    this.tab.set(tab);
    this.selectedTripId.set(null);
    this.detailSection.set('outils');
    this.inspirationAppliedMsg.set('');
  }

  openTrip(trip: TripDetail): void {
    this.selectedTripId.set(trip.id);
    this.detailSection.set('outils');
    this.inspirationAppliedMsg.set('');
    this.checklistDraft = '';
    this.budgetLabelDraft = '';
    this.budgetAmountDraft = '';
  }

  closeDetail(): void {
    this.selectedTripId.set(null);
    this.detailSection.set('outils');
    this.inspirationAppliedMsg.set('');
  }

  setDetailSection(section: DetailSection): void {
    this.detailSection.set(section);
  }

  openTripModal(): void {
    const today = this.toIso(new Date());
    const nextWeek = this.toIso(this.addDays(new Date(), 7));
    this.tripForm = {
      title: '',
      places: '',
      startDate: today,
      endDate: nextWeek,
      coverUrl: ''
    };
    this.tripFormError.set('');
    this.tripModalOpen.set(true);
  }

  closeTripModal(): void {
    if (this.tripSaving()) return;
    this.tripModalOpen.set(false);
    this.tripFormError.set('');
  }

  onTripPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.tripFormError.set('Choisis une image (jpg, png, webp…).');
      return;
    }
    if (file.size > 2_500_000) {
      this.tripFormError.set('Image trop lourde (max 2,5 Mo).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.tripForm.coverUrl = String(reader.result ?? '');
      this.tripFormError.set('');
    };
    reader.onerror = () => this.tripFormError.set('Impossible de lire cette image.');
    reader.readAsDataURL(file);
  }

  clearTripPhoto(): void {
    this.tripForm.coverUrl = '';
  }

  submitTrip(): void {
    const title = this.tripForm.title.trim();
    const places = this.tripForm.places.trim();
    if (!title) {
      this.tripFormError.set('Indique un nom pour le voyage.');
      return;
    }
    if (!places) {
      this.tripFormError.set('Indique un endroit / destination.');
      return;
    }
    if (!this.tripForm.startDate || !this.tripForm.endDate) {
      this.tripFormError.set('Choisis les dates de départ et de retour.');
      return;
    }
    if (this.tripForm.endDate < this.tripForm.startDate) {
      this.tripFormError.set('La date de retour doit être après le départ.');
      return;
    }

    this.tripSaving.set(true);
    this.tripFormError.set('');
    const payload = {
      title,
      startDate: this.tripForm.startDate,
      endDate: this.tripForm.endDate,
      coverUrl: this.tripForm.coverUrl || null,
      subtitle: places
    };

    this.http.post<any>(`${environment.apiUrl}/trips`, payload).subscribe({
      next: (created) => {
        const trip = this.mapApiTrip({ ...created, ...payload, id: created?.id });
        this.trips.update((list) => [trip, ...list.filter((item) => item.id !== trip.id)]);
        this.persistExtras(trip);
        this.tripSaving.set(false);
        this.tripModalOpen.set(false);
      },
      error: () => {
        const trip: TripDetail = {
          id: createId(),
          title: payload.title,
          subtitle: places,
          places,
          startDate: payload.startDate,
          endDate: payload.endDate,
          coverUrl: payload.coverUrl,
          daysUntil: this.daysUntil(payload.startDate),
          restos: [],
          hikes: [],
          visits: [],
          hotels: [],
          transport: [],
          checklist: this.defaultChecklist(),
          budget: this.defaultBudget()
        };
        this.trips.update((list) => [trip, ...list]);
        this.persistExtras(trip);
        this.tripSaving.set(false);
        this.tripModalOpen.set(false);
      }
    });
  }

  openInspirationModal(): void {
    this.inspirationForm = {
      title: '',
      hint: '',
      notes: '',
      restos: '',
      visits: '',
      hikes: '',
      hotels: '',
      transport: ''
    };
    this.inspirationFormError.set('');
    this.inspirationModalOpen.set(true);
  }

  closeInspirationModal(): void {
    this.inspirationModalOpen.set(false);
    this.inspirationFormError.set('');
  }

  submitInspiration(): void {
    const title = this.inspirationForm.title.trim();
    if (!title) {
      this.inspirationFormError.set('Indique une ville ou un pays.');
      return;
    }

    const item: InspirationItem = {
      id: createId(),
      title,
      hint: this.inspirationForm.hint.trim() || title,
      notes: this.inspirationForm.notes.trim(),
      restos: parseListInput(this.inspirationForm.restos),
      visits: parseListInput(this.inspirationForm.visits),
      hikes: parseListInput(this.inspirationForm.hikes),
      hotels: parseListInput(this.inspirationForm.hotels),
      transport: parseListInput(this.inspirationForm.transport)
    };

    this.inspirations.update((list) => {
      const next = [item, ...list];
      saveInspirations(next);
      return next;
    });
    this.inspirationModalOpen.set(false);
  }

  applyInspiration(inspiration: InspirationItem): void {
    const trip = this.selectedTrip();
    if (!trip) return;

    this.trips.update((list) =>
      list.map((item) => {
        if (item.id !== trip.id) return item;
        const next: TripDetail = {
          ...item,
          restos: mergeUnique(item.restos, inspiration.restos),
          hikes: mergeUnique(item.hikes, inspiration.hikes),
          visits: mergeUnique(item.visits, inspiration.visits),
          hotels: mergeUnique(item.hotels, inspiration.hotels),
          transport: mergeUnique(item.transport, inspiration.transport)
        };
        this.persistExtras(next);
        return next;
      })
    );

    this.inspirationAppliedMsg.set(`Inspiration « ${inspiration.title} » ajoutée aux infos du voyage.`);
    this.detailSection.set('infos');
  }

  toggleChecklistItem(tripId: string, itemId: string): void {
    this.trips.update((list) =>
      list.map((trip) => {
        if (trip.id !== tripId) return trip;
        const next = {
          ...trip,
          checklist: trip.checklist.map((item) =>
            item.id === itemId ? { ...item, done: !item.done } : item
          )
        };
        this.persistExtras(next);
        return next;
      })
    );
  }

  addChecklistItem(tripId: string): void {
    const label = this.checklistDraft.trim();
    if (!label) return;

    this.trips.update((list) =>
      list.map((trip) => {
        if (trip.id !== tripId) return trip;
        const next = {
          ...trip,
          checklist: [...trip.checklist, { id: createId(), label, done: false }]
        };
        this.persistExtras(next);
        return next;
      })
    );
    this.checklistDraft = '';
  }

  addBudgetLine(tripId: string): void {
    const label = this.budgetLabelDraft.trim();
    const amount = this.budgetAmountDraft.trim() || '—';
    if (!label) return;

    this.trips.update((list) =>
      list.map((trip) => {
        if (trip.id !== tripId) return trip;
        const next = {
          ...trip,
          budget: [...trip.budget, { id: createId(), label, amount }]
        };
        this.persistExtras(next);
        return next;
      })
    );
    this.budgetLabelDraft = '';
    this.budgetAmountDraft = '';
  }

  countdown(daysUntil: number): string {
    if (daysUntil > 0) return `J - ${daysUntil}`;
    if (daysUntil === 0) return 'Aujourd’hui';
    return `Passé · J + ${Math.abs(daysUntil)}`;
  }

  formatDates(startDate: string, endDate: string): string {
    const start = this.parseIso(startDate);
    const end = this.parseIso(endDate);
    if (!start || !end) return `${startDate} – ${endDate}`;
    const sameMonth = start.getMonth() === end.getMonth();
    const startLabel = start.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: sameMonth ? undefined : 'long'
    });
    const endLabel = end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    return `${startLabel} – ${endLabel}`;
  }

  private persistExtras(trip: TripDetail): void {
    patchTripExtras(trip.id, {
      checklist: trip.checklist,
      budget: trip.budget,
      restos: trip.restos,
      hikes: trip.hikes,
      visits: trip.visits,
      hotels: trip.hotels,
      transport: trip.transport
    });
  }

  private mapApiTrip(item: any): TripDetail {
    const demo = this.demoTrips().find((trip) => trip.title === item.title);
    const startDate = String(item.startDate).slice(0, 10);
    const endDate = String(item.endDate).slice(0, 10);
    const subtitle = item.subtitle || demo?.subtitle || '';
    const id = String(item.id ?? createId());
    const extras = loadTripExtras()[id];

    return {
      id,
      title: item.title,
      subtitle,
      startDate,
      endDate,
      coverUrl: item.coverUrl || demo?.coverUrl || null,
      daysUntil: this.daysUntil(startDate),
      places: subtitle || demo?.places || '',
      restos: extras?.restos ?? demo?.restos ?? [],
      hikes: extras?.hikes ?? demo?.hikes ?? [],
      visits: extras?.visits ?? demo?.visits ?? [],
      hotels: extras?.hotels ?? demo?.hotels ?? [],
      transport: extras?.transport ?? demo?.transport ?? [],
      checklist: extras?.checklist ?? demo?.checklist ?? this.defaultChecklist(),
      budget: extras?.budget ?? demo?.budget ?? this.defaultBudget()
    };
  }

  private demoTrips(): TripDetail[] {
    return [
      {
        id: 'portugal',
        title: 'Portugal',
        subtitle: 'Porto · Lisbonne · Sintra',
        places: 'Porto · Lisbonne · Sintra',
        startDate: '2026-08-03',
        endDate: '2026-08-15',
        coverUrl: null,
        daysUntil: this.daysUntil('2026-08-03'),
        restos: ['Taberna dos Mercadores', 'Cantinho do Avillez', 'Time Out Market'],
        hikes: ['Passadiços do Paiva', 'Sentier des Sept Vallées Suspendues'],
        visits: ['Tour de Belém', 'Palais de Pena', 'Ribeira de Porto'],
        hotels: ['HF Fénix Lisboa', 'The Editory House Ribeira Porto'],
        transport: ['Vol Bordeaux → Porto', 'Train Porto → Lisbonne', 'Tram / métro'],
        checklist: this.defaultChecklist(),
        budget: [
          { id: createId(), label: 'Hébergement', amount: '620 €' },
          { id: createId(), label: 'Transport', amount: '180 €' },
          { id: createId(), label: 'Repas', amount: '260 €' },
          { id: createId(), label: 'Activités', amount: '140 €' }
        ]
      },
      {
        id: 'corse',
        title: 'Corse',
        subtitle: 'Bastia · Calvi',
        places: 'Bastia · Calvi',
        startDate: '2026-08-20',
        endDate: '2026-08-25',
        coverUrl: null,
        daysUntil: this.daysUntil('2026-08-20'),
        restos: ['A Casarella', 'Le Pirate'],
        hikes: ['Sentier des douaniers', 'Capu Rossu'],
        visits: ['Citadelle de Calvi', 'Réserve de Scandola'],
        hotels: ['Hôtel La Villa', 'Casa di Mà'],
        transport: ['Vol Bordeaux → Bastia', 'Voiture de location'],
        checklist: this.defaultChecklist(),
        budget: [
          { id: createId(), label: 'Hébergement', amount: '480 €' },
          { id: createId(), label: 'Transport', amount: '220 €' },
          { id: createId(), label: 'Repas', amount: '190 €' },
          { id: createId(), label: 'Activités', amount: '90 €' }
        ]
      },
      {
        id: 'barcelone-archive',
        title: 'Barcelone',
        subtitle: 'Gotique · Sagrada Família',
        places: 'Barcelone',
        startDate: '2025-05-10',
        endDate: '2025-05-14',
        coverUrl: null,
        daysUntil: this.daysUntil('2025-05-10'),
        restos: ['Tickets'],
        hikes: [],
        visits: ['Park Güell', 'Sagrada Família'],
        hotels: ['Hotel Casa Fuster'],
        transport: ['Vol Bordeaux → Barcelone'],
        checklist: this.defaultChecklist(),
        budget: [
          { id: createId(), label: 'Hébergement', amount: '390 €' },
          { id: createId(), label: 'Transport', amount: '160 €' }
        ]
      }
    ].map((trip) => {
      const extras = loadTripExtras()[trip.id];
      if (!extras) return trip;
      return {
        ...trip,
        checklist: extras.checklist ?? trip.checklist,
        budget: extras.budget ?? trip.budget,
        restos: extras.restos ?? trip.restos,
        hikes: extras.hikes ?? trip.hikes,
        visits: extras.visits ?? trip.visits,
        hotels: extras.hotels ?? trip.hotels,
        transport: extras.transport ?? trip.transport
      };
    });
  }

  private defaultChecklist(): TripChecklistItem[] {
    return [
      { id: createId(), label: 'Passeport', done: false },
      { id: createId(), label: 'Billets', done: false },
      { id: createId(), label: 'Valise', done: false },
      { id: createId(), label: 'Assurance', done: false },
      { id: createId(), label: 'Hébergement confirmé', done: false }
    ];
  }

  private defaultBudget(): TripBudgetLine[] {
    return [
      { id: createId(), label: 'Hébergement', amount: '—' },
      { id: createId(), label: 'Transport', amount: '—' },
      { id: createId(), label: 'Repas', amount: '—' },
      { id: createId(), label: 'Activités', amount: '—' }
    ];
  }

  private daysUntil(iso: string): number {
    const target = this.parseIso(iso);
    if (!target) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86400000);
  }

  private parseIso(iso: string): Date | null {
    const parts = iso.split('-').map(Number);
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  private toIso(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }
}
