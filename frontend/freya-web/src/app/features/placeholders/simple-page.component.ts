import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-simple-page',
  standalone: true,
  template: `
    <section class="page">
      <header class="hero">
        <h1>{{ data()['title'] }}</h1>
        <p class="sub">{{ data()['subtitle'] }}</p>
      </header>
      <div class="panel">
        <p class="empty">Écran prévu dans la navigation Freya. Contenu détaillé à venir.</p>
      </div>
    </section>
  `,
  styles: `
    .page { display: flex; flex-direction: column; gap: 0.85rem; }
  `
})
export class SimplePageComponent {
  private readonly route = inject(ActivatedRoute);
  readonly data = toSignal(this.route.data.pipe(map((d) => d as Record<string, string>)), {
    initialValue: {} as Record<string, string>
  });
}
