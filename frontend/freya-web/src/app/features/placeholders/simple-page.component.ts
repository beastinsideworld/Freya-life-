import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-simple-page',
  standalone: true,
  template: `
    <section class="page">
      <h1>{{ data()['title'] }}</h1>
      <p>{{ data()['subtitle'] }}</p>
    </section>
  `,
  styles: `
    .page {
      text-align: center;
      padding: 2rem 1rem;
    }
    h1 {
      font-family: var(--font-display);
      margin: 0 0 0.5rem;
    }
    p {
      color: var(--muted);
    }
  `
})
export class SimplePageComponent {
  private readonly route = inject(ActivatedRoute);
  readonly data = toSignal(this.route.data.pipe(map((d) => d)), { initialValue: {} as Record<string, string> });
}
