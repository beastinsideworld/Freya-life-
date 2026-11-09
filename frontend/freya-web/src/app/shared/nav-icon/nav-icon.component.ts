import { Component, computed, input } from '@angular/core';
import { NavTabId } from '../../core/nav-tabs';

const NAV_ICON_SRC: Record<NavTabId, string> = {
  accueil: 'assets/nav/accueil.png',
  planning: 'assets/nav/planning.png',
  repas: 'assets/nav/repas.png',
  voyages: 'assets/nav/voyages.png',
  tele: 'assets/nav/tele.png',
  chat: 'assets/nav/chat.png',
  budget: 'assets/nav/budget.png',
  sport: 'assets/nav/sport.png',
  animaux: 'assets/nav/animaux.png',
  parametres: 'assets/nav/parametres.png'
};

@Component({
  selector: 'app-nav-icon',
  standalone: true,
  template: `
    <img
      class="nav-img"
      [src]="src()"
      alt=""
      draggable="false"
    />
  `,
  styles: [
    `
      :host {
        display: grid;
        place-items: center;
        width: 100%;
        height: 100%;
        max-width: 1.55rem;
        max-height: 1.55rem;
      }

      .nav-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        /* Couleurs rose-gold natives du Design theme (fond déjà transparent) */
        user-select: none;
        pointer-events: none;
      }
    `
  ]
})
export class NavIconComponent {
  readonly name = input.required<NavTabId>();
  readonly src = computed(() => NAV_ICON_SRC[this.name()] ?? NAV_ICON_SRC.accueil);
}
