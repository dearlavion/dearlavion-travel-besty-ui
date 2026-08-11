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
  order: number;
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
  // Add mode keeps re-deriving the default order until the admin types their own — real mode's
  // values() arrives async, so a one-shot derivation on the first effect run would settle on 0 (an
  // empty collection) and make every new value jump to the top of the list.
  private readonly orderTouched = signal(false);

  constructor() {
    effect(() => {
      if (!this.isEditMode()) {
        // Add mode: default to the end of the list so a new option doesn't jump the queue.
        if (this.orderTouched()) return;
        const rows = this.masterData.forType(this.collectionKey());
        const nextOrder = rows.length ? Math.max(...rows.map((r) => r.order)) + 1 : 0;
        this.form.update((f) => (f.order === nextOrder ? f : { ...f, order: nextOrder }));
        return;
      }

      if (this.formLoaded) return;
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
    if (key === 'order') this.orderTouched.set(true);
    this.form.update((f) => ({ ...f, [key]: value }));
  }

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
      order: Number(f.order) || 0,
      emoji: f.emoji.trim() || undefined,
      subtext: f.subtext.trim() || undefined,
    };

    const id = this.editingId();
    if (id) {
      this.masterData.update(id, patch);
      this.toast.showAndReload('Value updated', 'success', this.collectionUrl());
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
