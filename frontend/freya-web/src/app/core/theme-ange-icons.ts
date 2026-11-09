import { resolveAssetUrl } from './asset-url';
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

export function financeIcon(key: FinanceIconKey): string {
  return resolveAssetUrl(FINANCE_ICON[key]);
}

export function animauxIcon(key: AnimauxIconKey): string {
  return resolveAssetUrl(ANIMAUX_ICON[key]);
}

/** Mappe un emoji / libellé finance vers une icône PNG. */
export function financeEmojiIconSrc(emojiOrLabel: string | null | undefined): string {
  const v = (emojiOrLabel || '').trim();
  let path: string = FINANCE_ICON.portefeuille;
  switch (v) {
    case '💳':
    case 'Compte courant':
      path = FINANCE_ICON.carte;
      break;
    case '🐷':
    case '🪙':
    case 'Livret A':
    case 'Épargne perso':
      path = FINANCE_ICON.tirelire;
      break;
    case '📈':
    case 'PEA (ETF)':
      path = FINANCE_ICON.croissance;
      break;
    case '🎯':
    case '🏠':
    case '🌴':
    case '🛡':
    case '🚗':
    case '✈':
      path = FINANCE_ICON.cible;
      break;
    case '📅':
    case '🗓':
      path = FINANCE_ICON.calendrier;
      break;
    case '📊':
      path = FINANCE_ICON.graphique;
      break;
    case '⇄':
    case '↓':
    case '↑':
      path = FINANCE_ICON.transfert;
      break;
    case '💼':
    case 'Salaire':
      path = FINANCE_ICON.portefeuille;
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
      path = FINANCE_ICON.graphique;
      break;
    default:
      if (/livret|épargne|epargne/i.test(v)) path = FINANCE_ICON.tirelire;
      else if (/pea|etf|bourse|action/i.test(v)) path = FINANCE_ICON.croissance;
      else if (/courant|carte|compte/i.test(v)) path = FINANCE_ICON.carte;
  }
  return resolveAssetUrl(path);
}

/** Icône compagnon selon espèce / emoji. */
export function petAvatarIconSrc(species?: string | null, emoji?: string | null): string {
  const s = `${species || ''} ${emoji || ''}`.toLowerCase();
  let path: string = ANIMAUX_ICON.patte;
  if (/chat|🐱|🐈|😺|😸/.test(s)) path = ANIMAUX_ICON.chat;
  else if (/chien|🐶|🐕|🐩/.test(s)) path = ANIMAUX_ICON.chien;
  else if (/🐱|🐈|😺|😸/.test(emoji || '')) path = ANIMAUX_ICON.chat;
  else if (/🐶|🐕|🐩/.test(emoji || '')) path = ANIMAUX_ICON.chien;
  return resolveAssetUrl(path);
}

/** Mappe catégorie / emoji animaux vers icône PNG. */
export function animauxEmojiIconSrc(emojiOrLabel: string | null | undefined): string {
  const v = (emojiOrLabel || '').trim();
  let path: string = ANIMAUX_ICON.patte;
  switch (v) {
    case '🥣':
    case 'Alimentation':
      path = ANIMAUX_ICON.gamelle;
      break;
    case '🩺':
    case '💊':
    case 'Vétérinaire':
    case 'Soins / Traitements':
      path = ANIMAUX_ICON.soin;
      break;
    case '✂':
    case 'Toilettage':
      path = ANIMAUX_ICON.patte;
      break;
    case '📅':
      path = ANIMAUX_ICON.calendrier;
      break;
    case '🪙':
    case '📦':
    case 'Autres':
      path = ANIMAUX_ICON.bourse;
      break;
    case '❤':
    case '💗':
      path = ANIMAUX_ICON.soin;
      break;
    case '💉':
      path = ANIMAUX_ICON.vaccin;
      break;
  }
  return resolveAssetUrl(path);
}
