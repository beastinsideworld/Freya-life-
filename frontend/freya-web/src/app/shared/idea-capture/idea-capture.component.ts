import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IdeaCaptureService,
  IdeaDestination,
  VoyagePlaceKind
} from '../../core/idea-capture';

@Component({
  selector: 'app-idea-capture',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './idea-capture.component.html',
  styleUrl: './idea-capture.component.scss'
})
export class IdeaCaptureComponent {
  private readonly ideas = inject(IdeaCaptureService);

  readonly open = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly destinations = this.ideas.destinationOptions();
  readonly voyageKinds = this.ideas.voyageKindOptions();
  readonly countries = computed(() => this.ideas.countrySuggestions());

  title = '';
  note = '';
  destination: IdeaDestination | '' = '';
  voyageKind: VoyagePlaceKind | '' = '';
  country = '';

  openModal(): void {
    this.error.set('');
    this.success.set('');
    this.open.set(true);
  }

  closeModal(): void {
    this.open.set(false);
  }

  onDestinationChange(): void {
    if (this.destination !== 'voyage') {
      this.voyageKind = '';
      this.country = '';
    }
  }

  submit(): void {
    this.error.set('');
    this.success.set('');
    const result = this.ideas.capture({
      title: this.title,
      note: this.note,
      destination: this.destination,
      voyageKind: this.voyageKind || null,
      country: this.country
    });

    if (!result.ok) {
      this.error.set(result.message);
      return;
    }

    this.success.set(result.message);
    this.title = '';
    this.note = '';
    this.destination = '';
    this.voyageKind = '';
    this.country = '';
    window.setTimeout(() => {
      this.success.set('');
      this.closeModal();
    }, 900);
  }
}
