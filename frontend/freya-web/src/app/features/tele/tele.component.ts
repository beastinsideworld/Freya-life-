import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { createId } from '../../core/id';

type TeleCategory = 'audiovisuel' | 'jeu' | 'manga' | 'activite';
type MediaType = 'film' | 'serie' | 'docu';

interface TeleItem {
  id: string;
  title: string;
  category: TeleCategory;
  mediaType?: MediaType;
  note: string;
  done: boolean;
  createdAt: string;
}

const TELE_KEY = 'freya.tele.items';

@Component({
  selector: 'app-tele',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './tele.component.html',
  styleUrl: './tele.component.scss'
})
export class TeleComponent implements OnInit {
  readonly category = signal<TeleCategory>('audiovisuel');
  readonly items = signal<TeleItem[]>([]);
  readonly showForm = signal(false);
  readonly editingItem = signal<TeleItem | null>(null);

  readonly categories: Array<{ id: TeleCategory; label: string; hint: string }> = [
    { id: 'audiovisuel', label: 'Film / Série / Docu', hint: 'Ce que tu vois à la télé ou en pub' },
    { id: 'jeu', label: 'Jeu', hint: 'Jeux vidéo, jeux de société…' },
    { id: 'manga', label: 'Manga', hint: 'Manga, anime, webtoon…' },
    { id: 'activite', label: 'Activité', hint: 'Sorties, ateliers, idées à tester' }
  ];

  readonly mediaTypes: Array<{ id: MediaType; label: string }> = [
    { id: 'film', label: 'Film' },
    { id: 'serie', label: 'Série' },
    { id: 'docu', label: 'Docu' }
  ];

  title = '';
  note = '';
  mediaType: MediaType = 'film';
  editTitle = '';
  editNote = '';
  editMediaType: MediaType = 'film';
  editCategory: TeleCategory = 'audiovisuel';

  readonly filteredItems = computed(() =>
    this.items()
      .filter((item) => item.category === this.category())
      .sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt.localeCompare(a.createdAt))
  );

  readonly currentCategory = computed(
    () => this.categories.find((cat) => cat.id === this.category()) ?? this.categories[0]
  );

  ngOnInit(): void {
    this.items.set(this.loadItems());
  }

  setCategory(id: TeleCategory): void {
    this.category.set(id);
    this.showForm.set(false);
    this.editingItem.set(null);
  }

  toggleForm(): void {
    this.editingItem.set(null);
    this.showForm.update((v) => !v);
  }

  addItem(): void {
    const title = this.title.trim();
    if (!title) return;

    const item: TeleItem = {
      id: createId(),
      title,
      category: this.category(),
      mediaType: this.category() === 'audiovisuel' ? this.mediaType : undefined,
      note: this.note.trim(),
      done: false,
      createdAt: new Date().toISOString()
    };

    this.items.update((list) => [item, ...list]);
    this.persist();
    this.title = '';
    this.note = '';
    this.mediaType = 'film';
    this.showForm.set(false);
  }

  openEditor(item: TeleItem, ev?: Event): void {
    ev?.stopPropagation();
    this.showForm.set(false);
    this.editingItem.set(item);
    this.editTitle = item.title;
    this.editNote = item.note;
    this.editCategory = item.category;
    this.editMediaType = item.mediaType ?? 'film';
  }

  closeEditor(): void {
    this.editingItem.set(null);
  }

  saveEdit(): void {
    const current = this.editingItem();
    const title = this.editTitle.trim();
    if (!current || !title) return;

    this.items.update((list) =>
      list.map((item) =>
        item.id === current.id
          ? {
              ...item,
              title,
              note: this.editNote.trim(),
              category: this.editCategory,
              mediaType: this.editCategory === 'audiovisuel' ? this.editMediaType : undefined
            }
          : item
      )
    );
    this.persist();
    this.editingItem.set(null);
  }

  toggleDone(id: string): void {
    this.items.update((list) =>
      list.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
    this.persist();
  }

  removeItem(id: string): void {
    this.items.update((list) => list.filter((item) => item.id !== id));
    this.persist();
    if (this.editingItem()?.id === id) this.editingItem.set(null);
  }

  mediaLabel(type?: MediaType): string {
    return this.mediaTypes.find((item) => item.id === type)?.label ?? '';
  }

  private loadItems(): TeleItem[] {
    try {
      const raw = localStorage.getItem(TELE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as TeleItem[];
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch {
      /* ignore */
    }

    return [
      {
        id: '1',
        title: 'The Bear',
        category: 'audiovisuel',
        mediaType: 'serie',
        note: 'Vu en pub, saison 3',
        done: false,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        title: 'Zelda Tears of the Kingdom',
        category: 'jeu',
        note: 'Soldes Switch',
        done: false,
        createdAt: new Date().toISOString()
      },
      {
        id: '3',
        title: 'One Piece',
        category: 'manga',
        note: 'Reprendre au tome 100',
        done: false,
        createdAt: new Date().toISOString()
      },
      {
        id: '4',
        title: 'Atelier poterie',
        category: 'activite',
        note: 'Pub Instagram Bordeaux',
        done: false,
        createdAt: new Date().toISOString()
      }
    ];
  }

  private persist(): void {
    localStorage.setItem(TELE_KEY, JSON.stringify(this.items()));
  }
}
