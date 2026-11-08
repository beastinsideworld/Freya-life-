import { createId } from './id';

const INSPIRATIONS_KEY = 'freya.voyages.inspirations.v1';
const TRIP_EXTRAS_KEY = 'freya.voyages.extras.v1';

export interface InspirationItem {
  id: string;
  title: string;
  hint: string;
  notes: string;
  restos: string[];
  hikes: string[];
  visits: string[];
  hotels: string[];
  transport: string[];
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

export interface TripExtras {
  checklist?: TripChecklistItem[];
  budget?: TripBudgetLine[];
  restos?: string[];
  hikes?: string[];
  visits?: string[];
  hotels?: string[];
  transport?: string[];
}

type TripExtrasMap = Record<string, TripExtras>;

const DEFAULT_INSPIRATIONS: InspirationItem[] = [
  {
    id: 'insp-italie',
    title: 'Italie',
    hint: 'Rome · Florence · Amalfi',
    notes: 'Art, pasta et dolce vita.',
    restos: ['Trattoria Da Enzo', 'Pizzeria Da Michele'],
    hikes: ['Sentier des Dieux'],
    visits: ['Colisée', 'Galerie des Offices', 'Côte amalfitaine'],
    hotels: ['Hotel Artemide'],
    transport: ['Train Rome → Florence']
  },
  {
    id: 'insp-islande',
    title: 'Islande',
    hint: 'Reykjavik · Cercle d’or',
    notes: 'Nature brute et sources chaudes.',
    restos: ['Fish Market'],
    hikes: ['Reykjadalur'],
    visits: ['Geysir', 'Cascades de Gullfoss', 'Lagune bleue'],
    hotels: ['CenterHotel Plaza'],
    transport: ['4x4 location']
  },
  {
    id: 'insp-japon',
    title: 'Japon',
    hint: 'Tokyo · Kyoto · Osaka',
    notes: 'Temples, street food et trains.',
    restos: ['Ichiran', 'Nishiki Market'],
    hikes: ['Mont Takao'],
    visits: ['Fushimi Inari', 'Shibuya', 'Osaka Castle'],
    hotels: ['Capsule hotel Shinjuku'],
    transport: ['JR Pass']
  },
  {
    id: 'insp-portugal',
    title: 'Portugal',
    hint: 'Porto · Lisbonne · Sintra',
    notes: 'Azulejos, pastéis et océan.',
    restos: ['Taberna dos Mercadores', 'Cantinho do Avillez', 'Time Out Market'],
    hikes: ['Passadiços do Paiva', 'Sentier des Sept Vallées Suspendues'],
    visits: ['Tour de Belém', 'Palais de Pena', 'Ribeira de Porto'],
    hotels: ['HF Fénix Lisboa', 'The Editory House Ribeira Porto'],
    transport: ['Vol Bordeaux → Porto', 'Train Porto → Lisbonne']
  }
];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadInspirations(): InspirationItem[] {
  const stored = readJson<InspirationItem[] | null>(INSPIRATIONS_KEY, null);
  if (!stored?.length) {
    saveInspirations(DEFAULT_INSPIRATIONS);
    return DEFAULT_INSPIRATIONS.map((item) => ({ ...item }));
  }
  return stored.map((item) => ({
    id: item.id || createId(),
    title: item.title || '',
    hint: item.hint || '',
    notes: item.notes || '',
    restos: item.restos ?? [],
    hikes: item.hikes ?? [],
    visits: item.visits ?? [],
    hotels: item.hotels ?? [],
    transport: item.transport ?? []
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
