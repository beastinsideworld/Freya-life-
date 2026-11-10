import { resolveAssetUrl } from './asset-url';
import { activeFantasyTheme } from './theme-fantasy';
import { NavTabId } from './nav-tabs';

/** Icônes barre du bas — thème Ange (Design theme / Ange / icone barre du bas). */
export const NAV_ANGE_ICON: Record<NavTabId, string> = {
  accueil: 'assets/nav/ange/accueil.png',
  planning: 'assets/nav/ange/planning.png',
  repas: 'assets/nav/ange/repas.png',
  voyages: 'assets/nav/ange/voyages.png',
  tele: 'assets/nav/ange/tele.png',
  chat: 'assets/nav/ange/chat.png',
  budget: 'assets/nav/ange/budget.png',
  sport: 'assets/nav/ange/sport.png',
  animaux: 'assets/nav/ange/animaux.png',
  parametres: 'assets/nav/ange/parametres.png'
};

/** Icônes barre du bas — thème Démon (Design theme / Demon / icone barre du bas → nav/demon). */
export const NAV_DEMON_ICON: Record<NavTabId, string> = {
  accueil: 'assets/nav/demon/accueil.png',
  planning: 'assets/nav/demon/planning.png',
  repas: 'assets/nav/demon/repas.png',
  voyages: 'assets/nav/demon/voyages.png',
  tele: 'assets/nav/demon/tele.png',
  chat: 'assets/nav/demon/chat.png',
  budget: 'assets/nav/demon/budget.png',
  sport: 'assets/nav/demon/sport.png',
  animaux: 'assets/nav/demon/animaux.png',
  parametres: 'assets/nav/demon/parametres.png'
};

/** Icônes barre du bas — thème Hiver (or/rose-gold → bleu glace). */
export const NAV_HIVER_ICON: Record<NavTabId, string> = {
  accueil: 'assets/nav/hiver/accueil.png',
  planning: 'assets/nav/hiver/planning.png',
  repas: 'assets/nav/hiver/repas.png',
  voyages: 'assets/nav/hiver/voyages.png',
  tele: 'assets/nav/hiver/tele.png',
  chat: 'assets/nav/hiver/chat.png',
  budget: 'assets/nav/hiver/budget.png',
  sport: 'assets/nav/hiver/sport.png',
  animaux: 'assets/nav/hiver/animaux.png',
  parametres: 'assets/nav/hiver/parametres.png'
};

export function navIconsForFantasyTheme(): Record<NavTabId, string> | null {
  const t = activeFantasyTheme();
  if (t === 'ange') return NAV_ANGE_ICON;
  if (t === 'demon') return NAV_DEMON_ICON;
  if (t === 'hiver') return NAV_HIVER_ICON;
  return null;
}

/** Icônes Ange — Finance (Design theme / Ange / finance). */
export const FINANCE_ICON = {
  graphique: 'assets/themes/ange/finance/graphique.png',
  transfert: 'assets/themes/ange/finance/transfert.png',
  cible: 'assets/themes/ange/finance/cible.png',
  calendrier: 'assets/themes/ange/finance/calendrier.png',
  carte: 'assets/themes/ange/finance/carte.png',
  tirelire: 'assets/themes/ange/finance/tirelire.png',
  croissance: 'assets/themes/ange/finance/croissance.png',
  portefeuille: 'assets/themes/ange/finance/portefeuille.png'
} as const;

export type FinanceIconKey = keyof typeof FINANCE_ICON;

/** Icônes Ange — Animaux (Design theme / Ange / animaux). */
export const ANIMAUX_ICON = {
  patte: 'assets/themes/ange/animaux/patte.png',
  bourse: 'assets/themes/ange/animaux/bourse.png',
  calendrier: 'assets/themes/ange/animaux/calendrier.png',
  chien: 'assets/themes/ange/animaux/chien.png',
  chat: 'assets/themes/ange/animaux/chat.png',
  vaccin: 'assets/themes/ange/animaux/vaccin.png',
  gamelle: 'assets/themes/ange/animaux/gamelle.png',
  soin: 'assets/themes/ange/animaux/soin.png'
} as const;

export type AnimauxIconKey = keyof typeof ANIMAUX_ICON;

/** Icônes Démon — Finance. */
export const FINANCE_ICON_DEMON = {
  graphique: 'assets/themes/demon/finance/graphique.png',
  transfert: 'assets/themes/demon/finance/transfert.png',
  cible: 'assets/themes/demon/finance/cible.png',
  calendrier: 'assets/themes/demon/finance/calendrier.png',
  carte: 'assets/themes/demon/finance/carte.png',
  tirelire: 'assets/themes/demon/finance/tirelire.png',
  croissance: 'assets/themes/demon/finance/croissance.png',
  portefeuille: 'assets/themes/demon/finance/portefeuille.png'
} as const;

/** Icônes Démon — Animaux. */
export const ANIMAUX_ICON_DEMON = {
  patte: 'assets/themes/demon/animaux/patte.png',
  bourse: 'assets/themes/demon/animaux/bourse.png',
  calendrier: 'assets/themes/demon/animaux/calendrier.png',
  chien: 'assets/themes/demon/animaux/chien.png',
  chat: 'assets/themes/demon/animaux/chat.png',
  vaccin: 'assets/themes/demon/animaux/vaccin.png',
  gamelle: 'assets/themes/demon/animaux/gamelle.png',
  soin: 'assets/themes/demon/animaux/soin.png'
} as const;

/** Icônes Été — Finance. */
export const FINANCE_ICON_ETE = {
  graphique: 'assets/themes/ete/finance/graphique.png',
  transfert: 'assets/themes/ete/finance/transfert.png',
  cible: 'assets/themes/ete/finance/cible.png',
  calendrier: 'assets/themes/ete/finance/calendrier.png',
  carte: 'assets/themes/ete/finance/carte.png',
  tirelire: 'assets/themes/ete/finance/tirelire.png',
  croissance: 'assets/themes/ete/finance/croissance.png',
  portefeuille: 'assets/themes/ete/finance/portefeuille.png'
} as const;

/** Icônes Hiver — Finance. */
export const FINANCE_ICON_HIVER = {
  graphique: 'assets/themes/hiver/finance/graphique.png',
  transfert: 'assets/themes/hiver/finance/transfert.png',
  cible: 'assets/themes/hiver/finance/cible.png',
  calendrier: 'assets/themes/hiver/finance/calendrier.png',
  carte: 'assets/themes/hiver/finance/carte.png',
  tirelire: 'assets/themes/hiver/finance/tirelire.png',
  croissance: 'assets/themes/hiver/finance/croissance.png',
  portefeuille: 'assets/themes/hiver/finance/portefeuille.png'
} as const;

/** Icônes Automne — Finance. */
export const FINANCE_ICON_AUTOMNE = {
  graphique: 'assets/themes/automne/finance/graphique.png',
  transfert: 'assets/themes/automne/finance/transfert.png',
  cible: 'assets/themes/automne/finance/cible.png',
  calendrier: 'assets/themes/automne/finance/calendrier.png',
  carte: 'assets/themes/automne/finance/carte.png',
  tirelire: 'assets/themes/automne/finance/tirelire.png',
  croissance: 'assets/themes/automne/finance/croissance.png',
  portefeuille: 'assets/themes/automne/finance/portefeuille.png'
} as const;

/** Icônes repas (créneaux) — défaut or. */
export const MEAL_SLOT_ICON = {
  Breakfast: 'assets/meals/petit-dejeuner.png',
  Lunch: 'assets/meals/dejeuner.png',
  Snack: 'assets/meals/collation.png',
  Dinner: 'assets/meals/diner.png'
} as const;

/** Icônes repas Hiver — onglet Repas, fond sombre : trait glace clair. */
export const MEAL_SLOT_ICON_HIVER = {
  Breakfast: 'assets/themes/hiver/meals/petit-dejeuner.png',
  Lunch: 'assets/themes/hiver/meals/dejeuner.png',
  Snack: 'assets/themes/hiver/meals/collation.png',
  Dinner: 'assets/themes/hiver/meals/diner.png'
} as const;

/** Icônes repas Hiver — Accueil, fond neige clair : trait bleu glaçon foncé. */
export const MEAL_SLOT_ICON_HIVER_ACCUEIL = {
  Breakfast: 'assets/themes/hiver/meals/accueil/petit-dejeuner.png',
  Lunch: 'assets/themes/hiver/meals/accueil/dejeuner.png',
  Snack: 'assets/themes/hiver/meals/accueil/collation.png',
  Dinner: 'assets/themes/hiver/meals/accueil/diner.png'
} as const;

export type MealSlotIconKey = keyof typeof MEAL_SLOT_ICON;

export function mealSlotIcon(slot: MealSlotIconKey, place: 'accueil' | 'page' = 'page'): string {
  if (activeFantasyTheme() === 'hiver') {
    const set = place === 'accueil' ? MEAL_SLOT_ICON_HIVER_ACCUEIL : MEAL_SLOT_ICON_HIVER;
    return resolveAssetUrl(set[slot]);
  }
  return resolveAssetUrl(MEAL_SLOT_ICON[slot]);
}

/** Icônes Hiver — Animaux. */
export const ANIMAUX_ICON_HIVER = {
  patte: 'assets/themes/hiver/animaux/patte.webp',
  bourse: 'assets/themes/hiver/animaux/bourse.webp',
  calendrier: 'assets/themes/hiver/animaux/calendrier.webp',
  chien: 'assets/themes/hiver/animaux/chien.webp',
  chat: 'assets/themes/hiver/animaux/chat.webp',
  vaccin: 'assets/themes/hiver/animaux/vaccin.webp',
  gamelle: 'assets/themes/hiver/animaux/gamelle.webp',
  soin: 'assets/themes/hiver/animaux/soin.webp'
} as const;

/** Icônes Automne — Animaux. */
export const ANIMAUX_ICON_AUTOMNE = {
  patte: 'assets/themes/automne/animaux/patte.png',
  bourse: 'assets/themes/automne/animaux/bourse.png',
  calendrier: 'assets/themes/automne/animaux/calendrier.png',
  chien: 'assets/themes/automne/animaux/chien.png',
  chat: 'assets/themes/automne/animaux/chat.png',
  vaccin: 'assets/themes/automne/animaux/vaccin.png',
  gamelle: 'assets/themes/automne/animaux/gamelle.png',
  soin: 'assets/themes/automne/animaux/soin.png'
} as const;

/** Icônes Été — Animaux. */
export const ANIMAUX_ICON_ETE = {
  patte: 'assets/themes/ete/animaux/patte.png',
  bourse: 'assets/themes/ete/animaux/bourse.png',
  calendrier: 'assets/themes/ete/animaux/calendrier.png',
  chien: 'assets/themes/ete/animaux/chien.png',
  chat: 'assets/themes/ete/animaux/chat.png',
  vaccin: 'assets/themes/ete/animaux/vaccin.png',
  gamelle: 'assets/themes/ete/animaux/gamelle.png',
  soin: 'assets/themes/ete/animaux/soin.png'
} as const;

export type FinanceIconMap =
  | typeof FINANCE_ICON
  | typeof FINANCE_ICON_DEMON
  | typeof FINANCE_ICON_ETE
  | typeof FINANCE_ICON_HIVER
  | typeof FINANCE_ICON_AUTOMNE;
export type AnimauxIconMap =
  | typeof ANIMAUX_ICON
  | typeof ANIMAUX_ICON_DEMON
  | typeof ANIMAUX_ICON_ETE
  | typeof ANIMAUX_ICON_HIVER
  | typeof ANIMAUX_ICON_AUTOMNE;

export function financeIconsForTheme(): FinanceIconMap {
  const t = activeFantasyTheme();
  if (t === 'demon') return FINANCE_ICON_DEMON;
  if (t === 'ete') return FINANCE_ICON_ETE;
  if (t === 'hiver') return FINANCE_ICON_HIVER;
  if (t === 'automne') return FINANCE_ICON_AUTOMNE;
  return FINANCE_ICON;
}

export function animauxIconsForTheme(): AnimauxIconMap {
  const t = activeFantasyTheme();
  if (t === 'demon') return ANIMAUX_ICON_DEMON;
  if (t === 'ete') return ANIMAUX_ICON_ETE;
  if (t === 'hiver') return ANIMAUX_ICON_HIVER;
  if (t === 'automne') return ANIMAUX_ICON_AUTOMNE;
  return ANIMAUX_ICON;
}

export function financeIcon(key: FinanceIconKey): string {
  return resolveAssetUrl(financeIconsForTheme()[key]);
}

export function animauxIcon(key: AnimauxIconKey): string {
  return resolveAssetUrl(animauxIconsForTheme()[key]);
}

/** Mappe un emoji / libellé finance vers une icône PNG. */
export function financeEmojiIconSrc(emojiOrLabel: string | null | undefined): string {
  const icons = financeIconsForTheme();
  const v = (emojiOrLabel || '').trim();
  let path: string = icons.portefeuille;
  switch (v) {
    case '💳':
    case 'Compte courant':
      path = icons.carte;
      break;
    case '🐷':
    case '🪙':
    case 'Livret A':
    case 'Épargne perso':
      path = icons.tirelire;
      break;
    case '📈':
    case 'PEA (ETF)':
      path = icons.croissance;
      break;
    case '🎯':
    case '🏠':
    case '🌴':
    case '🛡':
    case '🚗':
    case '✈':
      path = icons.cible;
      break;
    case '📅':
    case '🗓':
      path = icons.calendrier;
      break;
    case '📊':
      path = icons.graphique;
      break;
    case '⇄':
    case '↓':
    case '↑':
      path = icons.transfert;
      break;
    case '💼':
    case 'Salaire':
      path = icons.portefeuille;
      break;
    case '🛒':
    case 'Alimentation':
    case 'Logement':
    case 'Transport':
    case 'Assurances':
    case 'Sport':
    case 'Loisirs & sorties':
    case 'Télécom':
    case 'Autres':
    case '📦':
    case 'Aides':
    case 'Activité':
    case 'Avantages':
      path = icons.graphique;
      break;
    default:
      if (/livret|épargne|epargne/i.test(v)) path = icons.tirelire;
      else if (/pea|etf|bourse|action/i.test(v)) path = icons.croissance;
      else if (/courant|carte|compte/i.test(v)) path = icons.carte;
  }
  return resolveAssetUrl(path);
}

/** Icône compagnon selon espèce / emoji. */
export function petAvatarIconSrc(species?: string | null, emoji?: string | null): string {
  const icons = animauxIconsForTheme();
  const s = `${species || ''} ${emoji || ''}`.toLowerCase();
  let path: string = icons.patte;
  if (/chat|🐱|🐈|😺|😸/.test(s)) path = icons.chat;
  else if (/chien|🐶|🐕|🐩/.test(s)) path = icons.chien;
  else if (/🐱|🐈|😺|😸/.test(emoji || '')) path = icons.chat;
  else if (/🐶|🐕|🐩/.test(emoji || '')) path = icons.chien;
  return resolveAssetUrl(path);
}

/** Mappe catégorie / emoji animaux vers icône PNG. */
export function animauxEmojiIconSrc(emojiOrLabel: string | null | undefined): string {
  const icons = animauxIconsForTheme();
  const v = (emojiOrLabel || '').trim();
  let path: string = icons.patte;
  switch (v) {
    case '🥣':
    case 'Alimentation':
      path = icons.gamelle;
      break;
    case '🩺':
    case '💊':
    case 'Vétérinaire':
    case 'Soins / Traitements':
      path = icons.soin;
      break;
    case '✂':
    case 'Toilettage':
      path = icons.patte;
      break;
    case '📅':
      path = icons.calendrier;
      break;
    case '🪙':
    case '📦':
    case 'Autres':
      path = icons.bourse;
      break;
    case '❤':
    case '💗':
      path = icons.soin;
      break;
    case '💉':
      path = icons.vaccin;
      break;
  }
  return resolveAssetUrl(path);
}
