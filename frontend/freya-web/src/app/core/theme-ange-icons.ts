import { NavTabId } from './nav-tabs';

/** Icônes barre du bas — thème Ange (Design theme / Ange / icone barre du bas). */
export const NAV_ANGE_ICON: Record<NavTabId, string> = {
  accueil: '/assets/nav/ange/accueil.png',
  planning: '/assets/nav/ange/planning.png',
  repas: '/assets/nav/ange/repas.png',
  voyages: '/assets/nav/ange/voyages.png',
  tele: '/assets/nav/ange/tele.png',
  chat: '/assets/nav/ange/chat.png',
  budget: '/assets/nav/ange/budget.png',
  sport: '/assets/nav/ange/sport.png',
  animaux: '/assets/nav/ange/animaux.png',
  parametres: '/assets/nav/ange/parametres.png'
};

/** Icônes Ange — Finance (Design theme / Ange / finance). */
export const FINANCE_ICON = {
  graphique: '/assets/themes/ange/finance/graphique.png',
  transfert: '/assets/themes/ange/finance/transfert.png',
  cible: '/assets/themes/ange/finance/cible.png',
  calendrier: '/assets/themes/ange/finance/calendrier.png',
  carte: '/assets/themes/ange/finance/carte.png',
  tirelire: '/assets/themes/ange/finance/tirelire.png',
  croissance: '/assets/themes/ange/finance/croissance.png',
  portefeuille: '/assets/themes/ange/finance/portefeuille.png'
} as const;

export type FinanceIconKey = keyof typeof FINANCE_ICON;

/** Icônes Ange — Animaux (Design theme / Ange / animaux). */
export const ANIMAUX_ICON = {
  patte: '/assets/themes/ange/animaux/patte.png',
  bourse: '/assets/themes/ange/animaux/bourse.png',
  calendrier: '/assets/themes/ange/animaux/calendrier.png',
  chien: '/assets/themes/ange/animaux/chien.png',
  chat: '/assets/themes/ange/animaux/chat.png',
  vaccin: '/assets/themes/ange/animaux/vaccin.png',
  gamelle: '/assets/themes/ange/animaux/gamelle.png',
  soin: '/assets/themes/ange/animaux/soin.png'
} as const;

export type AnimauxIconKey = keyof typeof ANIMAUX_ICON;

export function financeIcon(key: FinanceIconKey): string {
  return FINANCE_ICON[key];
}

export function animauxIcon(key: AnimauxIconKey): string {
  return ANIMAUX_ICON[key];
}

/** Mappe un emoji / libellé finance vers une icône PNG. */
export function financeEmojiIconSrc(emojiOrLabel: string | null | undefined): string {
  const v = (emojiOrLabel || '').trim();
  switch (v) {
    case '💳':
    case 'Compte courant':
      return FINANCE_ICON.carte;
    case '🐷':
    case '🪙':
    case 'Livret A':
    case 'Épargne perso':
      return FINANCE_ICON.tirelire;
    case '📈':
    case 'PEA (ETF)':
      return FINANCE_ICON.croissance;
    case '🎯':
    case '🏠':
    case '🌴':
    case '🛡':
    case '🚗':
    case '✈':
      return FINANCE_ICON.cible;
    case '📅':
    case '🗓':
      return FINANCE_ICON.calendrier;
    case '📊':
      return FINANCE_ICON.graphique;
    case '⇄':
    case '↓':
    case '↑':
      return FINANCE_ICON.transfert;
    case '💼':
    case 'Salaire':
      return FINANCE_ICON.portefeuille;
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
      return FINANCE_ICON.graphique;
    default:
      if (/livret|épargne|epargne/i.test(v)) return FINANCE_ICON.tirelire;
      if (/pea|etf|bourse|action/i.test(v)) return FINANCE_ICON.croissance;
      if (/courant|carte|compte/i.test(v)) return FINANCE_ICON.carte;
      return FINANCE_ICON.portefeuille;
  }
}

/** Icône compagnon selon espèce / emoji. */
export function petAvatarIconSrc(species?: string | null, emoji?: string | null): string {
  const s = `${species || ''} ${emoji || ''}`.toLowerCase();
  if (/chat|🐱|🐈|😺|😸/.test(s)) return ANIMAUX_ICON.chat;
  if (/chien|🐶|🐕|🐩/.test(s)) return ANIMAUX_ICON.chien;
  if (/🐱|🐈|😺|😸/.test(emoji || '')) return ANIMAUX_ICON.chat;
  if (/🐶|🐕|🐩/.test(emoji || '')) return ANIMAUX_ICON.chien;
  return ANIMAUX_ICON.patte;
}

/** Mappe catégorie / emoji animaux vers icône PNG. */
export function animauxEmojiIconSrc(emojiOrLabel: string | null | undefined): string {
  const v = (emojiOrLabel || '').trim();
  switch (v) {
    case '🥣':
    case 'Alimentation':
      return ANIMAUX_ICON.gamelle;
    case '🩺':
    case '💊':
    case 'Vétérinaire':
    case 'Soins / Traitements':
      return ANIMAUX_ICON.soin;
    case '✂':
    case 'Toilettage':
      return ANIMAUX_ICON.patte;
    case '📅':
      return ANIMAUX_ICON.calendrier;
    case '🪙':
    case '📦':
    case 'Autres':
      return ANIMAUX_ICON.bourse;
    case '❤':
    case '💗':
      return ANIMAUX_ICON.soin;
    case '💉':
      return ANIMAUX_ICON.vaccin;
    default:
      return ANIMAUX_ICON.patte;
  }
}
