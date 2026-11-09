import { Component, ElementRef, HostListener, input, output, signal, viewChild } from '@angular/core';

@Component({
  selector: 'app-image-picker',
  standalone: true,
  templateUrl: './image-picker.component.html',
  styleUrl: './image-picker.component.scss'
})
export class ImagePickerComponent {
  readonly imageUrl = input<string | null | undefined>('');
  readonly label = input('Photo');
  readonly addLabel = input('+ Ajouter une photo');
  readonly maxBytes = input(2_500_000);

  readonly imageSelected = output<string>();
  readonly cleared = output<void>();
  readonly error = output<string>();

  readonly chooserOpen = signal(false);
  private readonly galleryInput = viewChild<ElementRef<HTMLInputElement>>('galleryInput');
  private readonly cameraInput = viewChild<ElementRef<HTMLInputElement>>('cameraInput');

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  openChooser(): void {
    this.chooserOpen.set(true);
  }

  closeChooser(): void {
    this.chooserOpen.set(false);
  }

  pickGallery(): void {
    this.closeChooser();
    queueMicrotask(() => this.galleryInput()?.nativeElement.click());
  }

  pickCamera(): void {
    this.closeChooser();
    queueMicrotask(() => this.cameraInput()?.nativeElement.click());
  }

  clear(): void {
    this.closeChooser();
    this.cleared.emit();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.error.emit('Choisis une image (jpg, png, webp…).');
      return;
    }
    if (file.size > this.maxBytes()) {
      this.error.emit('Image trop lourde (max 2,5 Mo).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => this.imageSelected.emit(String(reader.result ?? ''));
    reader.onerror = () => this.error.emit('Impossible de lire cette image.');
    reader.readAsDataURL(file);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.chooserOpen()) return;
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.closeChooser();
    }
  }
}
