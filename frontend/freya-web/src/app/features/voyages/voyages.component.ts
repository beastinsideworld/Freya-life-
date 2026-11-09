import { Component, OnInit, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { createId } from '../../core/id';
import {
  INSPIRATION_LIST_LABELS,
  InspirationItem,
  InspirationListKey,
  InspirationPlace,
  PrepIdea,
  PrepToolKey,
  TransportMode,
  TransportTripKind,
  TripBudgetLine,
  TripChecklistItem,
  inspirationMatchesTrip,
  loadInspirations,
  loadTripExtras,
  itineraryRoutePoints,
  mapsEmbedUrl,
  mapsOpenUrl,
  mapsRouteEmbedUrl,
  mapsRouteOpenUrl,
  mergeUnique,
  patchTripExtras,
  placeLabels,
  saveInspirations
} from '../../core/trip-local';
import { DatePickerComponent } from '../../shared/date-picker/date-picker.component';
import { ImagePickerComponent } from '../../shared/image-picker/image-picker.component';

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
  prepTools: Partial<Record<PrepToolKey, PrepIdea[]>>;
}

@Component({
  selector: 'app-voyages',
  standalone: true,
  imports: [FormsModule, DatePickerComponent, ImagePickerComponent],
  templateUrl: './voyages.component.html',
  styleUrl: './voyages.component.scss'
})
export class VoyagesComponent implements OnInit {
  readonly tab = signal<TripTab>('mes');
  readonly selectedTripId = signal<string | null>(null);
  readonly selectedInspirationId = signal<string | null>(null);
  readonly detailSection = signal<DetailSection>('outils');
  readonly trips = signal<TripDetail[]>([]);
  readonly inspirations = signal<InspirationItem[]>([]);
  readonly tripModalOpen = signal(false);
  readonly tripSaving = signal(false);
  readonly tripFormError = signal('');
  readonly inspirationModalOpen = signal(false);
  readonly inspirationFormError = signal('');
  readonly inspirationAppliedMsg = signal('');
  readonly selectedTool = signal<{ key: PrepToolKey; title: string; sub: string } | null>(null);
  readonly placeFormKey = signal<InspirationListKey | null>(null);
  readonly placeFormError = signal('');
  readonly prepFormError = signal('');
  readonly prepMapQuery = signal('');
  readonly prepMapExpanded = signal(false);
  readonly listLabels = INSPIRATION_LIST_LABELS;
  private prepMapTimer: ReturnType<typeof setTimeout> | null = null;
  checklistDraft = '';
  budgetLabelDraft = '';
  budgetAmountDraft = '';
  prepLabelDraft = '';
  prepPlaceDraft = '';
  prepDepartureDraft = '';
  prepArrivalDraft = '';
  prepDurationDraft = '';
  prepPriceDraft = '';
  prepNoteDraft = '';
  prepTripKind: TransportTripKind = 'aller-retour';
  prepModes: Record<TransportMode, boolean> = {
    voiture: false,
    train: false,
    avion: false,
    taxi: false
  };
  inspirationNotesDraft = '';

  readonly tripKindOptions: Array<{ value: TransportTripKind; label: string }> = [
    { value: 'aller', label: 'Aller' },
    { value: 'retour', label: 'Retour' },
    { value: 'aller-retour', label: 'Aller-retour' }
  ];

  readonly modeOptions: Array<{ value: TransportMode; label: string }> = [
    { value: 'voiture', label: 'Voiture' },
    { value: 'train', label: 'Train' },
    { value: 'avion', label: 'Avion' },
    { value: 'taxi', label: 'Taxi' }
  ];

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
    notes: ''
  };

  placeForm = {
    title: '',
    photoUrl: '' as string,
    amount: '',
    link: '',
    note: '',
    address: ''
  };

  readonly tools: Array<{ key: PrepToolKey; title: string; sub: string }> = [
    { key: 'transport', title: 'Transport', sub: 'Vols, trains, location' },
    { key: 'hebergement', title: 'Hébergement', sub: 'Hôtels, Airbnb' },
    { key: 'itineraire', title: 'Itinéraire', sub: 'Activités, visites' },
    { key: 'emporter', title: 'À emporter', sub: 'Valise, documents' },
    { key: 'budget', title: 'Budget', sub: 'Dépenses, suivi' },
    { key: 'repas', title: 'Repas', sub: 'Adresses, idées' },
    { key: 'cartes', title: 'Cartes', sub: 'Hors ligne, repères' },
    { key: 'documents', title: 'Documents', sub: 'Passeport, billets' }
  ];

  readonly selectedToolIdeas = computed(() => {
    const trip = this.selectedTrip();
    const tool = this.selectedTool();
    if (!trip || !tool) return [] as PrepIdea[];
    return trip.prepTools[tool.key] ?? [];
  });

  readonly selectedToolTotal = computed(() => {
    const ideas = this.selectedToolIdeas();
    return this.sumPrices(ideas.map((idea) => idea.price));
  });

  readonly itineraryPoints = computed(() => itineraryRoutePoints(this.selectedToolIdeas()));

  readonly itineraryMapSrc = computed(() => {
    const url = mapsRouteEmbedUrl(this.itineraryPoints());
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  readonly selectedTripTotal = computed(() => {
    const trip = this.selectedTrip();
    return trip ? this.budgetTotal(trip.budget) : 0;
  });

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

  readonly selectedInspiration = computed(
    () => this.inspirations().find((item) => item.id === this.selectedInspirationId()) ?? null
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
      const total = this.budgetTotal(trip.budget);
      if (total > 0) {
        lines.push({
          id: `${trip.id}-total`,
          label: `${trip.title} · Total`,
          amount: this.formatAmount(total)
        });
      }
    }
    return lines;
  });

  readonly globalBudgetTotal = computed(() =>
    this.upcomingTrips().reduce((sum, trip) => sum + this.budgetTotal(trip.budget), 0)
  );

  private pendingTripId: string | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly sanitizer: DomSanitizer,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.inspirations.set(loadInspirations());
    this.pendingTripId = this.route.snapshot.queryParamMap.get('trip');
    this.route.queryParamMap.subscribe((params) => {
      const tripId = params.get('trip');
      if (!tripId) return;
      this.pendingTripId = tripId;
      this.tryOpenPendingTrip();
    });
    this.http.get<any[]>(`${environment.apiUrl}/trips`).subscribe({
      next: (items) => {
        const mapped = (items ?? []).map((item) => this.syncBudgetFromPrep(this.mapApiTrip(item)));
        this.trips.set(mapped.length ? mapped : this.demoTrips().map((trip) => this.syncBudgetFromPrep(trip)));
        this.tryOpenPendingTrip();
      },
      error: () => {
        this.trips.set(this.demoTrips().map((trip) => this.syncBudgetFromPrep(trip)));
        this.tryOpenPendingTrip();
      }
    });
  }

  private tryOpenPendingTrip(): void {
    const tripId = this.pendingTripId;
    if (!tripId) return;
    const trip = this.trips().find((item) => item.id === tripId);
    if (!trip) return;
    this.openTrip(trip);
    this.pendingTripId = null;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { trip: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  formatAmount(value: number): string {
    return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`;
  }

  toolTotal(trip: TripDetail, key: PrepToolKey): number {
    return this.sumPrices((trip.prepTools[key] ?? []).map((idea) => idea.price));
  }

  setTab(tab: TripTab): void {
    this.tab.set(tab);
    this.selectedTripId.set(null);
    this.selectedInspirationId.set(null);
    this.detailSection.set('outils');
    this.inspirationAppliedMsg.set('');
  }

  openTrip(trip: TripDetail): void {
    this.selectedInspirationId.set(null);
    this.selectedTripId.set(trip.id);
    this.detailSection.set('outils');
    this.selectedTool.set(null);
    this.inspirationAppliedMsg.set('');
    this.checklistDraft = '';
    this.budgetLabelDraft = '';
    this.budgetAmountDraft = '';
  }

  openInspiration(item: InspirationItem): void {
    this.selectedTripId.set(null);
    this.selectedInspirationId.set(item.id);
    this.inspirationNotesDraft = item.notes;
    this.closePlaceForm();
  }

  closeDetail(): void {
    this.selectedTripId.set(null);
    this.selectedInspirationId.set(null);
    this.selectedTool.set(null);
    this.closePlaceForm();
    this.detailSection.set('outils');
    this.inspirationAppliedMsg.set('');
  }

  openPlaceForm(key: InspirationListKey): void {
    this.placeFormKey.set(key);
    this.placeFormError.set('');
    this.placeForm = {
      title: '',
      photoUrl: '',
      amount: '',
      link: '',
      note: '',
      address: ''
    };
  }

  closePlaceForm(): void {
    this.placeFormKey.set(null);
    this.placeFormError.set('');
  }

  onPlacePhotoSelected(dataUrl: string): void {
    this.placeForm.photoUrl = dataUrl;
    this.placeFormError.set('');
  }

  clearPlacePhoto(): void {
    this.placeForm.photoUrl = '';
  }

  mapsEmbed(address: string): SafeResourceUrl | null {
    const url = mapsEmbedUrl(address);
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  }

  mapsLink(address: string): string {
    return mapsOpenUrl(address);
  }

  itineraryMapsLink(): string {
    return mapsRouteOpenUrl(this.itineraryPoints());
  }

  placeFormTitle(): string {
    const key = this.placeFormKey();
    return key ? `Ajouter · ${this.listLabels[key]}` : 'Ajouter';
  }

  setDetailSection(section: DetailSection): void {
    this.detailSection.set(section);
    this.selectedTool.set(null);
  }

  openTool(tool: { key: PrepToolKey; title: string; sub: string }): void {
    this.selectedTool.set(tool);
    this.prepFormError.set('');
    this.prepMapExpanded.set(false);
    this.resetPrepForm();
  }

  closeTool(): void {
    this.selectedTool.set(null);
    this.prepMapExpanded.set(false);
    if (this.prepMapTimer) {
      clearTimeout(this.prepMapTimer);
      this.prepMapTimer = null;
    }
  }

  onPrepPlaceTyped(value: string): void {
    this.prepPlaceDraft = value;
    if (this.prepMapTimer) clearTimeout(this.prepMapTimer);
    this.prepMapTimer = setTimeout(() => {
      this.prepMapQuery.set(value.trim());
    }, 450);
  }

  expandPrepMap(): void {
    if (!this.prepMapQuery().trim() && !this.prepPlaceDraft.trim()) return;
    if (!this.prepMapQuery().trim()) this.prepMapQuery.set(this.prepPlaceDraft.trim());
    this.prepMapExpanded.set(true);
  }

  closePrepMap(): void {
    this.prepMapExpanded.set(false);
  }

  prepMapSrc(): SafeResourceUrl | null {
    return this.mapsEmbed(this.prepMapQuery() || this.prepPlaceDraft.trim());
  }

  selectedModes(): TransportMode[] {
    return this.modeOptions
      .map((option) => option.value)
      .filter((mode) => this.prepModes[mode]);
  }

  tripKindLabel(kind?: TransportTripKind | null): string {
    return this.tripKindOptions.find((option) => option.value === kind)?.label ?? '';
  }

  modesLabel(modes?: TransportMode[]): string {
    if (!modes?.length) return '';
    return modes
      .map((mode) => this.modeOptions.find((option) => option.value === mode)?.label ?? mode)
      .join(' · ');
  }

  addPrepIdea(): void {
    const trip = this.selectedTrip();
    const tool = this.selectedTool();
    if (!trip || !tool) return;

    const modes = tool.key === 'transport' ? this.selectedModes() : [];
    if (tool.key === 'transport' && modes.length === 0) {
      this.prepFormError.set('Choisis au moins un moyen de transport.');
      return;
    }

    const usesRoute = tool.key === 'transport' || tool.key === 'itineraire';
    const departure = usesRoute ? this.prepDepartureDraft.trim() : '';
    const arrival = usesRoute ? this.prepArrivalDraft.trim() : '';
    const duration = tool.key === 'itineraire' ? this.prepDurationDraft.trim() : '';

    if (tool.key === 'itineraire' && (!departure || !arrival)) {
      this.prepFormError.set('Indique un départ et une arrivée.');
      return;
    }

    let label = this.prepLabelDraft.trim();
    if (!label && tool.key === 'itineraire') {
      label = `${departure} → ${arrival}`;
    }
    if (!label) {
      this.prepFormError.set('Indique une idée / option.');
      return;
    }
    this.prepFormError.set('');

    const place = usesRoute
      ? [departure, arrival].filter(Boolean).join(' → ')
      : this.prepPlaceDraft.trim();

    const idea: PrepIdea = {
      id: createId(),
      label,
      place,
      departure,
      arrival,
      duration,
      price: tool.key === 'itineraire' ? '' : this.prepPriceDraft.trim(),
      note: this.prepNoteDraft.trim(),
      tripKind: tool.key === 'transport' ? this.prepTripKind : null,
      modes: tool.key === 'transport' ? modes : []
    };

    this.trips.update((list) =>
      list.map((item) => {
        if (item.id !== trip.id) return item;
        const current = item.prepTools[tool.key] ?? [];
        const next = this.syncBudgetFromPrep({
          ...item,
          prepTools: {
            ...item.prepTools,
            [tool.key]: [...current, idea]
          }
        });
        this.persistExtras(next);
        return next;
      })
    );

    this.resetPrepForm();
  }

  private resetPrepForm(): void {
    this.prepLabelDraft = '';
    this.prepPlaceDraft = '';
    this.prepDepartureDraft = '';
    this.prepArrivalDraft = '';
    this.prepDurationDraft = '';
    this.prepPriceDraft = '';
    this.prepNoteDraft = '';
    this.prepTripKind = 'aller-retour';
    this.prepModes = {
      voiture: false,
      train: false,
      avion: false,
      taxi: false
    };
    this.prepMapQuery.set('');
    this.prepMapExpanded.set(false);
  }

  removePrepIdea(ideaId: string): void {
    const trip = this.selectedTrip();
    const tool = this.selectedTool();
    if (!trip || !tool) return;

    this.trips.update((list) =>
      list.map((item) => {
        if (item.id !== trip.id) return item;
        const next = this.syncBudgetFromPrep({
          ...item,
          prepTools: {
            ...item.prepTools,
            [tool.key]: (item.prepTools[tool.key] ?? []).filter((idea) => idea.id !== ideaId)
          }
        });
        this.persistExtras(next);
        return next;
      })
    );
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

  onTripPhotoSelected(dataUrl: string): void {
    this.tripForm.coverUrl = dataUrl;
    this.tripFormError.set('');
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
        const trip = this.syncBudgetFromPrep(this.mapApiTrip({ ...created, ...payload, id: created?.id }));
        this.trips.update((list) => [trip, ...list.filter((item) => item.id !== trip.id)]);
        this.persistExtras(trip);
        this.tripSaving.set(false);
        this.tripModalOpen.set(false);
      },
      error: () => {
        const trip = this.syncBudgetFromPrep({
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
          budget: [],
          prepTools: {}
        });
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
      notes: ''
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
      restos: [],
      visits: [],
      hikes: [],
      hotels: [],
      transport: []
    };

    this.inspirations.update((list) => {
      const next = [item, ...list];
      saveInspirations(next);
      return next;
    });
    this.inspirationModalOpen.set(false);
    this.openInspiration(item);
  }

  submitPlaceForm(): void {
    const key = this.placeFormKey();
    const inspirationId = this.selectedInspirationId();
    const title = this.placeForm.title.trim();
    if (!key || !inspirationId) return;
    if (!title) {
      this.placeFormError.set('Indique un nom.');
      return;
    }

    const place: InspirationPlace = {
      id: createId(),
      title,
      photoUrl: this.placeForm.photoUrl || null,
      amount: this.placeForm.amount.trim(),
      link: this.placeForm.link.trim(),
      note: this.placeForm.note.trim(),
      address: this.placeForm.address.trim()
    };

    this.inspirations.update((list) => {
      const next = list.map((item) => {
        if (item.id !== inspirationId) return item;
        return {
          ...item,
          [key]: [place, ...item[key]]
        };
      });
      saveInspirations(next);
      return next;
    });
    this.closePlaceForm();
  }

  removeInspirationItem(key: InspirationListKey, placeId: string): void {
    const inspirationId = this.selectedInspirationId();
    if (!inspirationId) return;

    this.inspirations.update((list) => {
      const next = list.map((item) => {
        if (item.id !== inspirationId) return item;
        return {
          ...item,
          [key]: item[key].filter((entry) => entry.id !== placeId)
        };
      });
      saveInspirations(next);
      return next;
    });
  }

  saveInspirationNotes(): void {
    const inspirationId = this.selectedInspirationId();
    if (!inspirationId) return;

    this.inspirations.update((list) => {
      const next = list.map((item) =>
        item.id === inspirationId ? { ...item, notes: this.inspirationNotesDraft.trim() } : item
      );
      saveInspirations(next);
      return next;
    });
  }

  applyInspiration(inspiration: InspirationItem): void {
    const trip = this.selectedTrip();
    if (!trip) return;

    this.trips.update((list) =>
      list.map((item) => {
        if (item.id !== trip.id) return item;
        const next: TripDetail = {
          ...item,
          restos: mergeUnique(item.restos, placeLabels(inspiration.restos)),
          hikes: mergeUnique(item.hikes, placeLabels(inspiration.hikes)),
          visits: mergeUnique(item.visits, placeLabels(inspiration.visits)),
          hotels: mergeUnique(item.hotels, placeLabels(inspiration.hotels)),
          transport: mergeUnique(item.transport, placeLabels(inspiration.transport))
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

  private syncBudgetFromPrep(trip: TripDetail): TripDetail {
    const toolTitles = new Set(this.tools.map((tool) => this.normalizeLabel(tool.title)));
    const manual = trip.budget.filter(
      (line) => !line.id.startsWith('auto-') && !toolTitles.has(this.normalizeLabel(line.label))
    );

    const autoLines: TripBudgetLine[] = [];
    for (const tool of this.tools) {
      if (tool.key === 'budget' || tool.key === 'itineraire') continue;
      const total = this.toolTotal(trip, tool.key);
      if (total <= 0) continue;
      autoLines.push({
        id: `auto-${tool.key}`,
        label: tool.title,
        amount: this.formatAmount(total)
      });
    }

    return {
      ...trip,
      budget: [...autoLines, ...manual]
    };
  }

  private budgetTotal(lines: TripBudgetLine[]): number {
    return this.sumPrices(lines.map((line) => line.amount));
  }

  private sumPrices(values: string[]): number {
    return values.reduce((sum, value) => sum + this.parseAmount(value), 0);
  }

  private parseAmount(value: string): number {
    const cleaned = String(value ?? '')
      .replace(/\s/g, '')
      .replace(/[^\d,.-]/g, '')
      .replace(',', '.');
    if (!cleaned) return 0;
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private normalizeLabel(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
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
      transport: trip.transport,
      prepTools: trip.prepTools
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
      budget: extras?.budget ?? demo?.budget ?? this.defaultBudget(),
      prepTools: extras?.prepTools ?? demo?.prepTools ?? {}
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
        ],
        prepTools: {}
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
        ],
        prepTools: {}
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
        ],
        prepTools: {}
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
        transport: extras.transport ?? trip.transport,
        prepTools: extras.prepTools ?? trip.prepTools
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
