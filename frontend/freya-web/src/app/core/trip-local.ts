import { createId } from './id';

const INSPIRATIONS_KEY = 'freya.voyages.inspirations.v2';
const INSPIRATIONS_KEY_V1 = 'freya.voyages.inspirations.v1';
const TRIP_EXTRAS_KEY = 'freya.voyages.extras.v1';

export interface InspirationPlace {
  id: string;
  title: string;
  photoUrl: string | null;
  amount: string;
  link: string;
  note: string;
  address: string;
}

export type InspirationListKey = 'restos' | 'hikes' | 'visits' | 'hotels' | 'transport';

export interface InspirationItem {
  id: string;
  title: string;
  hint: string;
  notes: string;
  restos: InspirationPlace[];
  hikes: InspirationPlace[];
  visits: InspirationPlace[];
  hotels: InspirationPlace[];
  transport: InspirationPlace[];
}

export interface TripChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface TripBudgetLine {
  id: string;
  label: string;
  amount: string;
}

export type TransportTripKind = 'aller' | 'retour' | 'aller-retour';
export type TransportMode = 'voiture' | 'train' | 'avion' | 'taxi';

export interface PrepIdea {
  id: string;
  label: string;
  place: string;
  departure: string;
  arrival: string;
  duration: string;
  price: string;
  note: string;
  tripKind?: TransportTripKind | null;
  modes?: TransportMode[];
}

export type PrepToolKey =
  | 'transport'
  | 'hebergement'
  | 'itineraire'
  | 'emporter'
  | 'budget'
  | 'repas'
  | 'cartes'
  | 'documents';

export interface TripExtras {
  checklist?: TripChecklistItem[];
  budget?: TripBudgetLine[];
  restos?: string[];
  hikes?: string[];
  visits?: string[];
  hotels?: string[];
  transport?: string[];
  prepTools?: Partial<Record<PrepToolKey, PrepIdea[]>>;
}

type TripExtrasMap = Record<string, TripExtras>;

const DEFAULT_INSPIRATIONS: InspirationItem[] = [
  {
    id: 'insp-italie',
    title: 'Italie',
    hint: 'Rome · Florence · Amalfi',
    notes: 'Art, pasta et dolce vita.',
    restos: [
      placeFromTitle('Trattoria Da Enzo', 'Via dei Vascellari 29, Rome'),
      placeFromTitle('Pizzeria Da Michele', 'Via Cesare Sersale 1, Naples')
    ],
    hikes: [placeFromTitle('Sentier des Dieux', 'Agerola, Côte amalfitaine')],
    visits: [
      placeFromTitle('Colisée', 'Piazza del Colosseo, Rome'),
      placeFromTitle('Galerie des Offices', 'Piazzale degli Uffizi, Florence'),
      placeFromTitle('Côte amalfitaine', 'Amalfi, Italie')
    ],
    hotels: [placeFromTitle('Hotel Artemide', 'Via Nazionale 22, Rome')],
    transport: [placeFromTitle('Train Rome → Florence', 'Roma Termini')]
  },
  {
    id: 'insp-islande',
    title: 'Islande',
    hint: 'Reykjavik · Cercle d’or',
    notes: 'Nature brute et sources chaudes.',
    restos: [placeFromTitle('Fish Market', 'Aðalstræti 12, Reykjavik')],
    hikes: [placeFromTitle('Reykjadalur', 'Hveragerði, Islande')],
    visits: [
      placeFromTitle('Geysir', 'Geysir, Islande'),
      placeFromTitle('Cascades de Gullfoss', 'Gullfoss, Islande'),
      placeFromTitle('Lagune bleue', 'Blue Lagoon, Grindavík')
    ],
    hotels: [placeFromTitle('CenterHotel Plaza', 'Aðalstræti 4, Reykjavik')],
    transport: [placeFromTitle('4x4 location', 'Keflavík Airport')]
  },
  {
    id: 'insp-japon',
    title: 'Japon',
    hint: 'Tokyo · Kyoto · Osaka',
    notes: 'Temples, street food et trains.',
    restos: [
      placeFromTitle('Ichiran', 'Shibuya, Tokyo'),
      placeFromTitle('Nishiki Market', 'Kyoto, Japon')
    ],
    hikes: [placeFromTitle('Mont Takao', 'Hachiōji, Tokyo')],
    visits: [
      placeFromTitle('Fushimi Inari', 'Kyoto, Japon'),
      placeFromTitle('Shibuya', 'Tokyo, Japon'),
      placeFromTitle('Osaka Castle', 'Osaka, Japon')
    ],
    hotels: [placeFromTitle('Capsule hotel Shinjuku', 'Shinjuku, Tokyo')],
    transport: [placeFromTitle('JR Pass', 'Japon')]
  },
  {
    id: 'insp-portugal',
    title: 'Portugal',
    hint: 'Porto · Lisbonne · Sintra',
    notes: 'Azulejos, pastéis et océan.',
    restos: [
      placeFromTitle('Taberna dos Mercadores', 'Rua dos Mercadores 36, Porto'),
      placeFromTitle('Cantinho do Avillez', 'Rua dos Duques de Bragança 7, Lisbonne'),
      placeFromTitle('Time Out Market', 'Av. 24 de Julho 49, Lisbonne')
    ],
    hikes: [
      placeFromTitle('Passadiços do Paiva', 'Arouca, Portugal'),
      placeFromTitle('Sentier des Sept Vallées Suspendues', 'Lagoa, Algarve')
    ],
    visits: [
      placeFromTitle('Tour de Belém', 'Av. Brasília, Lisbonne'),
      placeFromTitle('Palais de Pena', 'Sintra, Portugal'),
      placeFromTitle('Ribeira de Porto', 'Porto, Portugal')
    ],
    hotels: [
      placeFromTitle('HF Fénix Lisboa', 'Praça Marquês de Pombal 8, Lisbonne'),
      placeFromTitle('The Editory House Ribeira Porto', 'Rua da Fonte Taurina 18, Porto')
    ],
    transport: [
      placeFromTitle('Vol Bordeaux → Porto', 'Aéroport Francisco Sá Carneiro'),
      placeFromTitle('Train Porto → Lisbonne', 'Campanhã / Oriente')
    ]
  }
];

function placeFromTitle(title: string, address = ''): InspirationPlace {
  return {
    id: createId(),
    title,
    photoUrl: null,
    amount: '',
    link: '',
    note: '',
    address
  };
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizePlaceEntry(item: unknown): InspirationPlace | null {
  if (typeof item === 'string') {
    const title = item.trim();
    if (!title) return null;
    return placeFromTitle(title);
  }
  if (!item || typeof item !== 'object') return null;
  const raw = item as Partial<InspirationPlace> & { label?: string };
  const title = String(raw.title || raw.label || '').trim();
  if (!title) return null;
  return {
    id: raw.id || createId(),
    title,
    photoUrl: raw.photoUrl || null,
    amount: raw.amount || '',
    link: raw.link || '',
    note: raw.note || '',
    address: raw.address || ''
  };
}

function normalizePlaceList(items: unknown): InspirationPlace[] {
  if (!Array.isArray(items)) return [];
  return items.map(normalizePlaceEntry).filter((item): item is InspirationPlace => !!item);
}

function normalizeInspiration(item: any): InspirationItem {
  return {
    id: item.id || createId(),
    title: item.title || '',
    hint: item.hint || '',
    notes: item.notes || '',
    restos: normalizePlaceList(item.restos),
    hikes: normalizePlaceList(item.hikes),
    visits: normalizePlaceList(item.visits),
    hotels: normalizePlaceList(item.hotels),
    transport: normalizePlaceList(item.transport)
  };
}

export function loadInspirations(): InspirationItem[] {
  const stored = readJson<any[] | null>(INSPIRATIONS_KEY, null);
  if (stored?.length) {
    return stored.map(normalizeInspiration);
  }

  const legacy = readJson<any[] | null>(INSPIRATIONS_KEY_V1, null);
  if (legacy?.length) {
    const migrated = legacy.map(normalizeInspiration);
    saveInspirations(migrated);
    return migrated;
  }

  saveInspirations(DEFAULT_INSPIRATIONS);
  return DEFAULT_INSPIRATIONS.map((item) => ({
    ...item,
    restos: item.restos.map((place) => ({ ...place })),
    hikes: item.hikes.map((place) => ({ ...place })),
    visits: item.visits.map((place) => ({ ...place })),
    hotels: item.hotels.map((place) => ({ ...place })),
    transport: item.transport.map((place) => ({ ...place }))
  }));
}

export function saveInspirations(items: InspirationItem[]): void {
  localStorage.setItem(INSPIRATIONS_KEY, JSON.stringify(items));
}

export function loadTripExtras(): TripExtrasMap {
  return readJson<TripExtrasMap>(TRIP_EXTRAS_KEY, {});
}

export function saveTripExtras(map: TripExtrasMap): void {
  localStorage.setItem(TRIP_EXTRAS_KEY, JSON.stringify(map));
}

export function patchTripExtras(tripId: string, patch: TripExtras): TripExtras {
  const map = loadTripExtras();
  const next = { ...(map[tripId] ?? {}), ...patch };
  map[tripId] = next;
  saveTripExtras(map);
  return next;
}

export function normalizePlace(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function placeTokens(value: string): string[] {
  return value
    .split(/[·,;/|]+/)
    .map((part) => normalizePlace(part))
    .filter(Boolean);
}

export function inspirationMatchesTrip(
  inspiration: InspirationItem,
  trip: { title: string; places: string; subtitle: string }
): boolean {
  const inspTitle = normalizePlace(inspiration.title);
  if (!inspTitle) return false;

  const tripTokens = new Set([
    normalizePlace(trip.title),
    ...placeTokens(trip.places),
    ...placeTokens(trip.subtitle),
    ...placeTokens(inspiration.hint)
  ]);

  if (tripTokens.has(inspTitle)) return true;

  const haystack = normalizePlace(`${trip.title} ${trip.places} ${trip.subtitle}`);
  return haystack.includes(inspTitle) || inspTitle.includes(normalizePlace(trip.title));
}

export function parseListInput(value: string): string[] {
  return value
    .split(/[\n,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function mergeUnique(base: string[], incoming: string[]): string[] {
  const seen = new Set(base.map((item) => normalizePlace(item)));
  const next = [...base];
  for (const item of incoming) {
    const key = normalizePlace(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    next.push(item);
  }
  return next;
}

export function placeLabels(places: InspirationPlace[]): string[] {
  return places.map((place) => place.title).filter(Boolean);
}

export function mapsEmbedUrl(address: string): string {
  const query = address.trim();
  if (!query) return '';
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;
}

export function mapsOpenUrl(address: string): string {
  const query = address.trim();
  if (!query) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Builds an embeddable Google Maps directions URL chaining stops in order. */
export function mapsRouteEmbedUrl(points: string[]): string {
  const stops = points.map((point) => point.trim()).filter(Boolean);
  if (!stops.length) return '';
  if (stops.length === 1) return mapsEmbedUrl(stops[0]);

  const origin = encodeURIComponent(stops[0]);
  const rest = stops.slice(1).map(encodeURIComponent).join('+to:');
  return `https://maps.google.com/maps?f=d&saddr=${origin}&daddr=${rest}&output=embed`;
}

export function mapsRouteOpenUrl(points: string[]): string {
  const stops = points.map((point) => point.trim()).filter(Boolean);
  if (!stops.length) return '';
  if (stops.length === 1) return mapsOpenUrl(stops[0]);

  const origin = encodeURIComponent(stops[0]);
  const destination = encodeURIComponent(stops[stops.length - 1]);
  const waypoints = stops.slice(1, -1).map(encodeURIComponent).join('|');
  const base = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
  return waypoints ? `${base}&waypoints=${waypoints}` : base;
}

export function itineraryRoutePoints(ideas: PrepIdea[]): string[] {
  const points: string[] = [];
  for (const idea of ideas) {
    for (const stop of [idea.departure, idea.arrival]) {
      const value = (stop || '').trim();
      if (!value) continue;
      if (points.length && normalizePlace(points[points.length - 1]) === normalizePlace(value)) continue;
      points.push(value);
    }
  }
  return points;
}

export const INSPIRATION_LIST_LABELS: Record<InspirationListKey, string> = {
  restos: 'Restaurant',
  visits: 'Visite',
  hikes: 'Randonnée',
  hotels: 'Hôtel',
  transport: 'Transport'
};
