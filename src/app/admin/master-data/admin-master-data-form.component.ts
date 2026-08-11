import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  MASTER_DATA_COLLECTIONS,
  MasterDataService,
  MasterDataValue,
} from '../../common/master-data/master-data.service';
import { ToastService } from '../../common/toast/toast.service';
import { FIXED_CARDINALITY_TYPES } from './fixed-cardinality-types';

interface MasterDataFormModel {
  value: string;
  // Null while the number input is empty — validated before save, never written as-is.
  order: number | null;
  emoji: string;
  subtext: string;
}

// Add/edit/delete one master-data value, opened by clicking a value on
// AdminMasterDataDetailComponent (or its "+ Add value" button). Writes go through
// MasterDataService, the same optimistic create/update/delete Kit Settings uses.
@Component({
  selector: 'app-admin-master-data-form',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-master-data-form.component.html',
  styleUrl: './admin-master-data-form.component.css',
})
export class AdminMasterDataFormComponent {
  private readonly masterData = inject(MasterDataService);
  private readonly toast = inject(ToastService);
  private readonly paramMap = toSignal(inject(ActivatedRoute).paramMap);

  protected readonly collectionKey = computed(() => this.paramMap()?.get('key') ?? '');
  protected readonly collection = computed(
    () => MASTER_DATA_COLLECTIONS.find((c) => c.key === this.collectionKey()) ?? null,
  );

  // The list route registers 'master-data/:key/new' ahead of 'master-data/:key/:id', so a literal
  // 'new' never reaches here as an id.
  protected readonly editingId = computed(() => this.paramMap()?.get('id') ?? null);
  protected readonly isEditMode = computed(() => this.editingId() !== null);

  protected readonly collectionUrl = computed(() => `/admin/master-data/${this.collectionKey()}`);

  protected readonly allowDelete = computed(() => !FIXED_CARDINALITY_TYPES.has(this.collectionKey()));

  protected readonly existing = computed<MasterDataValue | null>(() => {
    const id = this.editingId();
    return id ? (this.masterData.values().find((v) => v.id === id) ?? null) : null;
  });

  // Real mode fills values() asynchronously, so "no match" only means *not found* once the
  // collection has actually loaded something — otherwise the page would flash a false "not found"
  // on a direct link/reload straight onto this URL (same trap AdminPopularKitFormComponent
  // documents).
  private readonly collectionLoaded = computed(() => this.masterData.forType(this.collectionKey()).length > 0);
  protected readonly loading = computed(() => this.isEditMode() && !this.existing() && !this.collectionLoaded());
  protected readonly notFound = computed(
    () => !this.collection() || (this.isEditMode() && this.collectionLoaded() && !this.existing()),
  );

  protected readonly form = signal<MasterDataFormModel>({ value: '', order: 0, emoji: '', subtext: '' });
  protected readonly confirmingDelete = signal(false);
  protected readonly saving = signal(false);

  private formLoaded = false;

  // Add mode's order isn't shown or editable — a new value always goes to the end of the list.
  // Derived live (not frozen at page load) because real mode fills values() asynchronously, and
  // read again at save time so what gets written reflects the latest cached rows.
  protected readonly nextOrder = computed(() => {
    const rows = this.masterData.forType(this.collectionKey());
    return rows.length ? Math.max(...rows.map((r) => r.order)) + 1 : 0;
  });

  constructor() {
    // Edit mode only — add mode starts blank and takes its order from nextOrder() on save.
    effect(() => {
      if (!this.isEditMode() || this.formLoaded) return;
      const existing = this.existing();
      if (!existing) return;
      this.formLoaded = true;
      this.form.set({
        value: existing.value,
        order: existing.order,
        emoji: existing.emoji ?? '',
        subtext: existing.subtext ?? '',
      });
    });
  }

  protected updateField<K extends keyof MasterDataFormModel>(key: K, value: MasterDataFormModel[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  // The positions this collection actually occupies, in display order — the only choices the Order
  // dropdown offers. Every one is taken by definition, so picking another value's position swaps
  // the two (see save()) instead of creating a duplicate; the set of order numbers in the
  // collection is invariant, which also keeps sparse orders (0, 3, 7) working.
  protected readonly orderOptions = computed<{ order: number; label: string }[]>(() => {
    const editingId = this.editingId();
    return this.masterData.forType(this.collectionKey()).map((row) => ({
      order: row.order,
      label: row.id === editingId ? `${row.order} — current position` : `${row.order} — swap with "${row.value}"`,
    }));
  });

  /** The value currently holding the chosen position, if it isn't this one — the swap partner. */
  protected readonly swapTarget = computed<MasterDataValue | null>(() => {
    const order = this.form().order;
    if (order === null) return null;
    const editingId = this.editingId();
    return (
      this.masterData.forType(this.collectionKey()).find((v) => v.id !== editingId && v.order === Number(order)) ?? null
    );
  });

  protected save(): void {
    const f = this.form();
    const value = f.value.trim();
    if (!value) {
      this.toast.error('Value is required');
      return;
    }

    this.saving.set(true);
    const patch = {
      value,
      // Add mode takes the auto position; edit mode keeps whatever the admin typed.
      order: this.isEditMode() ? Number(f.order) : this.nextOrder(),
      emoji: f.emoji.trim() || undefined,
      subtext: f.subtext.trim() || undefined,
    };

    const id = this.editingId();
    if (id) {
      // Moving to an occupied position hands this row's old position to whoever was there, rather
      // than leaving both on the same number (which would make their relative order arbitrary).
      const swap = this.swapTarget();
      const previousOrder = this.existing()?.order;
      if (swap && previousOrder !== undefined) {
        this.masterData.update(swap.id, { order: previousOrder });
      }
      this.masterData.update(id, patch);
      this.toast.showAndReload(
        swap ? `Value updated — swapped position with "${swap.value}"` : 'Value updated',
        'success',
        this.collectionUrl(),
      );
    } else {
      this.masterData.create({ type: this.collectionKey(), ...patch });
      this.toast.showAndReload('Value added', 'success', this.collectionUrl());
    }
  }

  protected requestDelete(): void {
    this.confirmingDelete.set(true);
  }

  protected cancelDelete(): void {
    this.confirmingDelete.set(false);
  }

  protected confirmDelete(): void {
    const id = this.editingId();
    if (!id) return;
    this.masterData.delete(id);
    this.toast.showAndReload('Value removed', 'success', this.collectionUrl());
  }
}
