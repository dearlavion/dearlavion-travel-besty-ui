import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TaxonomyAxis, TaxonomyService, TaxonomyValue } from '../../common/taxonomy.service';
import { ToastService } from '../../common/toast/toast.service';

interface KitSettingsSection {
  axis: TaxonomyAxis;
  title: string;
  description: string;
  // Duration is fixed at exactly 3 rows (backend rejects add/delete for it, see taxonomy.controller.ts)
  // — its section only allows renaming an existing row's value/subtext.
  allowAddDelete: boolean;
  showEmoji: boolean; // only destination/season currently render a taxonomy row's emoji anywhere
  showSubtext: boolean; // only duration currently renders a taxonomy row's subtext anywhere
}

const SECTIONS: KitSettingsSection[] = [
  {
    axis: 'destination',
    title: 'Destination',
    description: 'Where a trip is headed — powers the /travel survey and product tagging.',
    allowAddDelete: true,
    showEmoji: true,
    showSubtext: false,
  },
  {
    axis: 'season',
    title: 'Season',
    description: 'What the weather will be like — powers the /travel survey and product tagging.',
    allowAddDelete: true,
    showEmoji: true,
    showSubtext: false,
  },
  {
    axis: 'party',
    title: 'Party',
    description: 'Who is traveling — powers the /travel survey and product tagging.',
    allowAddDelete: true,
    showEmoji: false,
    showSubtext: false,
  },
  {
    axis: 'transportation',
    title: 'Transportation',
    description: 'How they are getting there — powers the /travel survey and product tagging.',
    allowAddDelete: true,
    showEmoji: false,
    showSubtext: false,
  },
  {
    axis: 'activity',
    title: 'Activities',
    description: 'What they will be doing — powers the /travel survey and product tagging.',
    allowAddDelete: true,
    showEmoji: false,
    showSubtext: false,
  },
  {
    axis: 'kitCategory',
    title: 'Kit Category',
    description: 'Packing-list buckets — powers the survey\'s "what matters most" question and product tagging.',
    allowAddDelete: true,
    showEmoji: false,
    showSubtext: false,
  },
  {
    axis: 'duration',
    title: 'Duration',
    description: 'Trip length bands — fixed at exactly 3. Rename the label or the helper text; adding or removing bands isn\'t supported, since the kit-sizing engine keys off them directly.',
    allowAddDelete: false,
    showEmoji: false,
    showSubtext: true,
  },
  {
    axis: 'gender',
    title: 'Gender',
    description: 'Collected on the survey for sizing — not yet tied to product tagging.',
    allowAddDelete: true,
    showEmoji: false,
    showSubtext: false,
  },
];

@Component({
  selector: 'app-admin-kit-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-kit-settings.component.html',
  styleUrl: './admin-kit-settings.component.css',
})
export class AdminKitSettingsComponent {
  protected readonly taxonomy = inject(TaxonomyService);
  private readonly toast = inject(ToastService);

  protected readonly sections = SECTIONS;

  protected rowsFor(axis: TaxonomyAxis): TaxonomyValue[] {
    return this.taxonomy.forAxis(axis);
  }

  protected readonly confirmingDeleteId = signal<string | null>(null);

  // One new-value draft per axis, keyed by axis — reset to '' after a successful add.
  private readonly newValueDrafts = signal<Record<string, string>>({});

  protected draftFor(axis: string): string {
    return this.newValueDrafts()[axis] ?? '';
  }

  protected setDraft(axis: string, value: string): void {
    this.newValueDrafts.update((d) => ({ ...d, [axis]: value }));
  }

  protected renameValue(id: string, value: string): void {
    const trimmed = value.trim();
    if (!trimmed) return;
    this.taxonomy.update(id, { value: trimmed });
  }

  protected renameEmoji(id: string, emoji: string): void {
    this.taxonomy.update(id, { emoji: emoji.trim() || undefined });
  }

  protected renameSubtext(id: string, subtext: string): void {
    this.taxonomy.update(id, { subtext: subtext.trim() || undefined });
  }

  protected moveUp(axis: TaxonomyAxis, row: TaxonomyValue): void {
    const rows = this.rowsFor(axis);
    const idx = rows.findIndex((r) => r.id === row.id);
    if (idx <= 0) return;
    const above = rows[idx - 1];
    this.taxonomy.update(row.id, { order: above.order });
    this.taxonomy.update(above.id, { order: row.order });
  }

  protected moveDown(axis: TaxonomyAxis, row: TaxonomyValue): void {
    const rows = this.rowsFor(axis);
    const idx = rows.findIndex((r) => r.id === row.id);
    if (idx === -1 || idx >= rows.length - 1) return;
    const below = rows[idx + 1];
    this.taxonomy.update(row.id, { order: below.order });
    this.taxonomy.update(below.id, { order: row.order });
  }

  protected addValue(axis: TaxonomyAxis): void {
    const value = this.draftFor(axis).trim();
    if (!value) return;
    const rows = this.rowsFor(axis);
    const nextOrder = rows.length ? Math.max(...rows.map((r) => r.order)) + 1 : 0;
    this.taxonomy.create({ axis, value, order: nextOrder });
    this.setDraft(axis, '');
    this.toast.show(`Added "${value}"`, 'success');
  }

  protected requestDelete(id: string): void {
    this.confirmingDeleteId.set(id);
  }

  protected cancelDelete(): void {
    this.confirmingDeleteId.set(null);
  }

  protected confirmDelete(id: string): void {
    this.taxonomy.delete(id);
    this.confirmingDeleteId.set(null);
    this.toast.show('Removed', 'success');
  }
}
