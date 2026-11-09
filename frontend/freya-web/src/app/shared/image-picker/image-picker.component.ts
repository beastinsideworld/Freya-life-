import { Component, ElementRef, HostListener, input, output, signal, viewChild } from '@angular/core';

/** Limite fichier brut (photos téléphone souvent 4–12 Mo). */
const DEFAULT_MAX_BYTES = 20_000_000;
/** Taille max du data URL après compression (base64). */
const DEFAULT_MAX_DATA_URL = 8_000_000;
const MAX_EDGE = 1920;
const JPEG_QUALITY = 0.82;

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
  /** Taille max du fichier choisi (appareil photo inclus). */
  readonly maxBytes = input(DEFAULT_MAX_BYTES);

  readonly imageSelected = output<string>();
  readonly cleared = output<void>();
  readonly error = output<string>();

  readonly chooserOpen = signal(false);
  readonly busy = signal(false);
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

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.error.emit('Choisis une image (jpg, png, webp…).');
      return;
    }
    if (file.size > this.maxBytes()) {
      this.error.emit('Image trop lourde (max 20 Mo).');
      return;
    }

    this.busy.set(true);
    try {
      const dataUrl = await this.prepareImage(file);
      if (dataUrl.length > DEFAULT_MAX_DATA_URL) {
        this.error.emit('Image encore trop lourde après compression. Réessaie avec une photo plus légère.');
        return;
      }
      this.imageSelected.emit(dataUrl);
    } catch {
      this.error.emit('Impossible de lire cette image.');
    } finally {
      this.busy.set(false);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.chooserOpen()) return;
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.closeChooser();
    }
  }

  private prepareImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('read'));
      reader.onload = () => {
        const raw = String(reader.result ?? '');
        // Petites images : pas besoin de retraiter
        if (file.size <= 1_200_000 && raw.length <= 1_800_000) {
          resolve(raw);
          return;
        }
        const img = new Image();
        img.onload = () => {
          try {
            resolve(this.compressImage(img, file.type));
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error('decode'));
        img.src = raw;
      };
      reader.readAsDataURL(file);
    });
  }

  private compressImage(img: HTMLImageElement, mime: string): string {
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const width = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
    const height = Math.max(1, Math.round((img.naturalHeight || 1) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.drawImage(img, 0, 0, width, height);

    const preferJpeg = mime !== 'image/png' && mime !== 'image/webp';
    let out = preferJpeg
      ? canvas.toDataURL('image/jpeg', JPEG_QUALITY)
      : canvas.toDataURL(mime.includes('webp') ? 'image/webp' : 'image/png');

    // Si encore trop gros, forcer JPEG plus compressé
    if (out.length > DEFAULT_MAX_DATA_URL) {
      out = canvas.toDataURL('image/jpeg', 0.7);
    }
    if (out.length > DEFAULT_MAX_DATA_URL) {
      out = canvas.toDataURL('image/jpeg', 0.55);
    }
    return out;
  }
}
