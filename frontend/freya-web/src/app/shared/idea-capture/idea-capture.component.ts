import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IdeaCaptureService,
  IdeaDestination,
  VoyagePlaceKind
} from '../../core/idea-capture';
import { IdeaFabStore } from '../../core/idea-fab.store';

@Component({
  selector: 'app-idea-capture',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './idea-capture.component.html',
  styleUrl: './idea-capture.component.scss'
})
export class IdeaCaptureComponent {
  private readonly ideas = inject(IdeaCaptureService);
  readonly fab = inject(IdeaFabStore);

  readonly open = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly dragging = signal(false);
  readonly overDrop = signal(false);
  readonly destinations = this.ideas.destinationOptions();
  readonly voyageKinds = this.ideas.voyageKindOptions();
  readonly countries = computed(() => this.ideas.countrySuggestions());

  title = '';
  note = '';
  destination: IdeaDestination | '' = '';
  voyageKind: VoyagePlaceKind | '' = '';
  country = '';

  private drag: {
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null = null;
  private suppressClick = false;

  openModal(): void {
    this.error.set('');
    this.success.set('');
    this.open.set(true);
  }

  closeModal(): void {
    this.open.set(false);
  }

  onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    this.drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: this.fab.x(),
      originY: this.fab.y(),
      moved: false
    };
    this.dragging.set(true);
    this.overDrop.set(false);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    const dx = event.clientX - this.drag.startX;
    const dy = event.clientY - this.drag.startY;
    if (Math.hypot(dx, dy) > 6) this.drag.moved = true;
    const x = this.drag.originX + dx;
    const y = this.drag.originY + dy;
    this.fab.move(x, y);
    this.overDrop.set(this.hitsDrop(this.fab.x(), this.fab.y()));
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    const moved = this.drag.moved;
    const remove = moved && this.hitsDrop(this.fab.x(), this.fab.y());
    this.drag = null;
    this.dragging.set(false);
    this.overDrop.set(false);
    if (remove) {
      this.suppressClick = true;
      this.fab.hide();
      return;
    }
    if (moved) {
      this.suppressClick = true;
      this.fab.commit(this.fab.x(), this.fab.y());
    }
  }

  onClick(event: MouseEvent): void {
    if (this.suppressClick) {
      event.preventDefault();
      event.stopPropagation();
      this.suppressClick = false;
      return;
    }
    this.openModal();
  }

  private hitsDrop(x: number, y: number): boolean {
    const zone = document.querySelector('.idea-drop');
    if (!(zone instanceof HTMLElement)) return false;
    const rect = zone.getBoundingClientRect();
    const centerX = x + 23;
    const centerY = y + 23;
    return centerX >= rect.left && centerX <= rect.right && centerY >= rect.top && centerY <= rect.bottom;
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
