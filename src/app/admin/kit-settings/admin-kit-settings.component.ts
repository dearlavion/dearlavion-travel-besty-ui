import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MasterDataService, MasterDataType, MasterDataValue } from '../../common/master-data/master-data.service';
import { ToastService } from '../../common/toast/toast.service';

interface KitSettingsSection {
  axis: MasterDataType;
  title: string;
  description: string;
  // Duration is fixed at exactly 3 rows (backend rejects add/delete for it, see taxonomy.controller.ts)
  // — its section only allows renaming an existing row's value/subtext.
  allowAddDelete: boolean;
  showEmoji: boolean; // only destination/season currently render a taxonomy row's emoji anywhere
  showSubtext: boolean; // only duration currently renders a taxonomy row's subtext anywhere
}

// Per-axis metadata (title, description, which fields to show) — unordered. Display order is
// driven separately by taxonomy.axisOrder() (see the `sections` computed below), so the section
// cards can be drag-and-drop reordered without touching this config.
const SECTION_CONFIG: KitSettingsSection[] = [
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
    description: 'Trip length bands — fixed at exactly 4. Rename the label or the helper text; adding or removing bands isn\'t supported, since the kit-sizing engine keys off them directly.',
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
  protected readonly masterData = inject(MasterDataService);
  private readonly toast = inject(ToastService);

  // Section cards render in masterData.typeOrder()'s order — reordering here is what a shopper
  // actually sees as the /travel survey's step order (see TravelComponent.orderedAxes()), so the
  // two never disagree. Falls back to appending any axis SECTION_CONFIG defines that typeOrder()
  // hasn't caught up to yet (defensive — shouldn't normally happen).
  protected readonly sections = computed<KitSettingsSection[]>(() => {
    const order = this.masterData.typeOrder();
    const byAxis = new Map(SECTION_CONFIG.map((s) => [s.axis, s]));
    const ordered = order.map((axis) => byAxis.get(axis as MasterDataType)).filter((s): s is KitSettingsSection => !!s);
    const seen = new Set(ordered.map((s) => s.axis));
    return [...ordered, ...SECTION_CONFIG.filter((s) => !seen.has(s.axis))];
  });

  protected rowsFor(axis: MasterDataType): MasterDataValue[] {
    return this.masterData.forType(axis);
  }

  // ── Section reordering (drag-and-drop) — reorders which axis section appears first, distinct
  // from moveUp()/moveDown() below which reorder the *values within* one axis. ──────────────────
  protected readonly draggedAxis = signal<MasterDataType | null>(null);

  protected onSectionDragStart(axis: MasterDataType): void {
    this.draggedAxis.set(axis);
  }

  protected onSectionDragOver(event: DragEvent): void {
    event.preventDefault(); // required for (drop) to fire at all
  }

  protected onSectionDrop(targetAxis: MasterDataType): void {
    const dragged = this.draggedAxis();
    this.draggedAxis.set(null);
    if (!dragged || dragged === targetAxis) return;

    const order = [...this.masterData.typeOrder()];
    const fromIndex = order.indexOf(dragged);
    const toIndex = order.indexOf(targetAxis);
    if (fromIndex === -1 || toIndex === -1) return;

    order.splice(fromIndex, 1);
    order.splice(toIndex, 0, dragged);
    this.masterData.updateTypeOrder(order);
    this.toast.show('Section order updated — the survey now asks in this order too', 'success');
  }

  protected onSectionDragEnd(): void {
    this.draggedAxis.set(null);
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
    this.masterData.update(id, { value: trimmed });
  }

  protected renameEmoji(id: string, emoji: string): void {
    this.masterData.update(id, { emoji: emoji.trim() || undefined });
  }

  protected renameSubtext(id: string, subtext: string): void {
    this.masterData.update(id, { subtext: subtext.trim() || undefined });
  }

  protected moveUp(axis: MasterDataType, row: MasterDataValue): void {
    const rows = this.rowsFor(axis);
    const idx = rows.findIndex((r) => r.id === row.id);
    if (idx <= 0) return;
    const above = rows[idx - 1];
    this.masterData.update(row.id, { order: above.order });
    this.masterData.update(above.id, { order: row.order });
  }

  protected moveDown(axis: MasterDataType, row: MasterDataValue): void {
    const rows = this.rowsFor(axis);
    const idx = rows.findIndex((r) => r.id === row.id);
    if (idx === -1 || idx >= rows.length - 1) return;
    const below = rows[idx + 1];
    this.masterData.update(row.id, { order: below.order });
    this.masterData.update(below.id, { order: row.order });
  }

  protected addValue(axis: MasterDataType): void {
    const value = this.draftFor(axis).trim();
    if (!value) return;
    const rows = this.rowsFor(axis);
    const nextOrder = rows.length ? Math.max(...rows.map((r) => r.order)) + 1 : 0;
    this.masterData.create({ type: axis, value, order: nextOrder });
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
    this.masterData.delete(id);
    this.confirmingDeleteId.set(null);
    this.toast.show('Removed', 'success');
  }
}
