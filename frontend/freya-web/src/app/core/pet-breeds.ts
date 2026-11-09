/** Races courantes (FR) pour saisie + filtre progressif. */
export const DOG_BREEDS: string[] = [
  'Affenpinscher',
  'Akita Inu',
  'American Staffordshire Terrier',
  'Beagle',
  'Berger Allemand',
  'Berger Australien',
  'Berger Belge Malinois',
  'Bichon Frisé',
  'Border Collie',
  'Bouledogue Français',
  'Boxer',
  'Brittany / Épagneul Breton',
  'Bull Terrier',
  'Cane Corso',
  'Caniche',
  'Cavalier King Charles',
  'Chihuahua',
  'Chow-Chow',
  'Cocker Spaniel',
  'Colley',
  'Dalmatien',
  'Dobermann',
  'Dogue Allemand',
  'Golden Retriever',
  'Husky Sibérien',
  'Jack Russell Terrier',
  'Labrador Retriever',
  'Leonberg',
  'Lévrier Afghan',
  'Malinois',
  'Mastiff',
  'Pinscher Nain',
  'Rottweiler',
  'Samoyède',
  'Schnauzer',
  'Setter Irlandais',
  'Shar Pei',
  'Shiba Inu',
  'Shih Tzu',
  'Staffordshire Bull Terrier',
  'Teckel',
  'Terre-Neuve',
  'West Highland White Terrier',
  'Yorkshire Terrier',
  'Croisé',
  'Autre'
];

export const CAT_BREEDS: string[] = [
  'Abyssin',
  'American Shorthair',
  'Angora Turc',
  'Bengal',
  'Birman',
  'British Shorthair',
  'Chartreux',
  'Européen',
  'Exotic Shorthair',
  'Maine Coon',
  'Manx',
  'Norvégien',
  'Persan',
  'Ragdoll',
  'Russian Blue',
  'Sacré de Birmanie',
  'Savannah',
  'Scottish Fold',
  'Siamois',
  'Sibérien',
  'Somali',
  'Sphynx',
  'Croisé',
  'Autre'
];

export const OTHER_BREEDS: string[] = ['Non renseigné', 'Autre'];

export function breedsForSpecies(species: string | null | undefined): string[] {
  const s = (species || '').trim().toLowerCase();
  if (s.includes('chat') || s.includes('félin') || s.includes('feline') || s === 'cat') {
    return CAT_BREEDS;
  }
  if (s.includes('chien') || s.includes('canin') || s === 'dog' || s.includes('chienne')) {
    return DOG_BREEDS;
  }
  return [...new Set([...DOG_BREEDS, ...CAT_BREEDS, ...OTHER_BREEDS])].sort((a, b) =>
    a.localeCompare(b, 'fr')
  );
}

export function filterBreeds(species: string | null | undefined, query: string): string[] {
  const q = query.trim().toLowerCase();
  const list = breedsForSpecies(species);
  if (!q) return list.slice(0, 12);
  return list.filter((b) => b.toLowerCase().includes(q)).slice(0, 12);
}
