import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { createId } from '../../core/id';
import { environment } from '../../../environments/environment';
import { NavIconComponent } from '../../shared/nav-icon/nav-icon.component';

type TeleCategory = 'audiovisuel' | 'jeu' | 'manga' | 'activite';
type MediaType = 'film' | 'serie' | 'docu';
/** discover = à découvrir / à faire · progress = en cours · done = terminé / fait */
type TeleStatus = 'discover' | 'progress' | 'done';

interface TeleItem {
  id: string;
  title: string;
  category: TeleCategory;
  mediaType?: MediaType;
  note: string;
  status: TeleStatus;
  createdAt: string;
}

interface StatusSection {
  id: TeleStatus;
  label: string;
  items: TeleItem[];
}

const TELE_KEY = 'freya.tele.items.v2';
const TELE_KEY_LEGACY = 'freya.tele.items';

@Component({
  selector: 'app-tele',
  standalone: true,
  imports: [FormsModule, NavIconComponent],
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
  status: TeleStatus = 'discover';
  editTitle = '';
  editNote = '';
  editMediaType: MediaType = 'film';
  editCategory: TeleCategory = 'audiovisuel';
  editStatus: TeleStatus = 'discover';

  readonly filteredItems = computed(() =>
    this.items()
      .filter((item) => item.category === this.category())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  );

  readonly statusSections = computed((): StatusSection[] => {
    const items = this.filteredItems();
    const defs = this.statusDefsFor(this.category());
    return defs.map((def) => ({
      ...def,
      items: items.filter((item) => item.status === def.id)
    }));
  });

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
    this.status = 'discover';
  }

  statusDefsFor(category: TeleCategory): Array<{ id: TeleStatus; label: string }> {
    if (category === 'activite') {
      return [
        { id: 'discover', label: 'À faire' },
        { id: 'done', label: 'Fait' }
      ];
    }
    return [
      { id: 'discover', label: 'À découvrir' },
      { id: 'progress', label: 'En cours' },
      { id: 'done', label: 'Terminé' }
    ];
  }

  statusLabel(status: TeleStatus, category: TeleCategory = this.category()): string {
    return this.statusDefsFor(category).find((item) => item.id === status)?.label ?? status;
  }

  toggleForm(): void {
    this.editingItem.set(null);
    this.status = 'discover';
    this.showForm.update((v) => !v);
  }

  addItem(): void {
    const title = this.title.trim();
    if (!title) return;

    const status =
      this.category() === 'activite' && this.status === 'progress' ? 'discover' : this.status;

    const item: TeleItem = {
      id: createId(),
      title,
      category: this.category(),
      mediaType: this.category() === 'audiovisuel' ? this.mediaType : undefined,
      note: this.note.trim(),
      status,
      createdAt: new Date().toISOString()
    };

    this.items.update((list) => [item, ...list]);
    this.persist();
    this.title = '';
    this.note = '';
    this.mediaType = 'film';
    this.status = 'discover';
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
    this.editStatus = item.status;
  }

  closeEditor(): void {
    this.editingItem.set(null);
  }

  saveEdit(): void {
    const current = this.editingItem();
    const title = this.editTitle.trim();
    if (!current || !title) return;

    let status = this.editStatus;
    if (this.editCategory === 'activite' && status === 'progress') {
      status = 'discover';
    }

    this.items.update((list) =>
      list.map((item) =>
        item.id === current.id
          ? {
              ...item,
              title,
              note: this.editNote.trim(),
              category: this.editCategory,
              mediaType: this.editCategory === 'audiovisuel' ? this.editMediaType : undefined,
              status
            }
          : item
      )
    );
    this.persist();
    this.editingItem.set(null);
  }

  setItemStatus(id: string, status: TeleStatus, ev?: Event): void {
    ev?.stopPropagation();
    this.items.update((list) =>
      list.map((item) => (item.id === id ? { ...item, status } : item))
    );
    this.persist();
  }

  cycleStatus(item: TeleItem, ev?: Event): void {
    ev?.stopPropagation();
    const defs = this.statusDefsFor(item.category);
    const index = defs.findIndex((def) => def.id === item.status);
    const next = defs[(index + 1) % defs.length]?.id ?? 'discover';
    this.setItemStatus(item.id, next);
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
    const fromV2 = this.readRaw(TELE_KEY);
    if (fromV2.length) return fromV2.map((item) => this.normalizeItem(item));

    const fromLegacy = this.readRaw(TELE_KEY_LEGACY);
    if (fromLegacy.length) {
      const migrated = fromLegacy.map((item) => this.normalizeItem(item));
      localStorage.setItem(TELE_KEY, JSON.stringify(migrated));
      return migrated;
    }

    return environment.useDemoData ? this.demoItems() : [];
  }

  private readRaw(key: string): any[] {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private normalizeItem(raw: any): TeleItem {
    const category = (raw.category as TeleCategory) || 'audiovisuel';
    let status: TeleStatus = raw.status;
    if (status !== 'discover' && status !== 'progress' && status !== 'done') {
      status = raw.done ? 'done' : 'discover';
    }
    if (category === 'activite' && status === 'progress') {
      status = 'discover';
    }
    return {
      id: String(raw.id ?? createId()),
      title: String(raw.title ?? 'Sans titre'),
      category,
      mediaType: category === 'audiovisuel' ? raw.mediaType : undefined,
      note: String(raw.note ?? ''),
      status,
      createdAt: String(raw.createdAt ?? new Date().toISOString())
    };
  }

  private demoItems(): TeleItem[] {
    const now = new Date().toISOString();
    return [
      {
        id: '1',
        title: 'The Bear',
        category: 'audiovisuel',
        mediaType: 'serie',
        note: 'Vu en pub, saison 3',
        status: 'progress',
        createdAt: now
      },
      {
        id: '1b',
        title: 'Dune 2',
        category: 'audiovisuel',
        mediaType: 'film',
        note: 'À voir en salle',
        status: 'discover',
        createdAt: now
      },
      {
        id: '2',
        title: 'Zelda Tears of the Kingdom',
        category: 'jeu',
        note: 'Soldes Switch',
        status: 'progress',
        createdAt: now
      },
      {
        id: '2b',
        title: 'Hades II',
        category: 'jeu',
        note: 'Early access',
        status: 'discover',
        createdAt: now
      },
      {
        id: '3',
        title: 'One Piece',
        category: 'manga',
        note: 'Reprendre au tome 100',
        status: 'progress',
        createdAt: now
      },
      {
        id: '3b',
        title: 'Chainsaw Man',
        category: 'manga',
        note: 'Partie 2',
        status: 'discover',
        createdAt: now
      },
      {
        id: '4',
        title: 'Atelier poterie',
        category: 'activite',
        note: 'Pub Instagram Bordeaux',
        status: 'discover',
        createdAt: now
      },
      {
        id: '4b',
        title: 'Expo photo',
        category: 'activite',
        note: 'Musée dimanche dernier',
        status: 'done',
        createdAt: now
      }
    ];
  }

  private persist(): void {
    localStorage.setItem(TELE_KEY, JSON.stringify(this.items()));
  }
}
