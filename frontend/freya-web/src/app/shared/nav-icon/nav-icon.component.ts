import { afterNextRender, Component, computed, input, signal } from '@angular/core';
import { resolveAssetUrl } from '../../core/asset-url';
import { navIconsForFantasyTheme } from '../../core/theme-ange-icons';
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
        user-select: none;
        pointer-events: none;
      }

      :host-context([data-theme='ange']),
      :host-context([data-theme='demon']),
      :host-context([data-theme='ete']),
      :host-context([data-theme='hiver']) {
        max-width: 1.95rem;
        max-height: 1.95rem;
      }
    `
  ]
})
export class NavIconComponent {
  readonly name = input.required<NavTabId>();

  private readonly themeTick = signal(0);

  constructor() {
    afterNextRender(() => {
      const obs = new MutationObserver(() => this.themeTick.update((n) => n + 1));
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    });
  }

  readonly src = computed(() => {
    this.themeTick();
    const id = this.name();
    const fantasy = navIconsForFantasyTheme();
    const raw = fantasy
      ? (fantasy[id] ?? fantasy.accueil)
      : (NAV_ICON_SRC[id] ?? NAV_ICON_SRC.accueil);
    return resolveAssetUrl(raw);
  });
}
