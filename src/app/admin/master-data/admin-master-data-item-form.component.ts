import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastService } from '../../common/toast/toast.service';
import { MASTER_DATA_COLLECTIONS, MasterDataItem, MasterDataService } from './master-data.service';

interface FormState {
  value: string;
  order: number;
  emoji: string;
  subtext: string;
}

const EMPTY_FORM: FormState = { value: '', order: 0, emoji: '', subtext: '' };

@Component({
  selector: 'app-admin-master-data-item-form',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-master-data-item-form.component.html',
  styleUrl: './admin-master-data-item-form.component.css',
})
export class AdminMasterDataItemFormComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly masterData = inject(MasterDataService);
  private readonly toast = inject(ToastService);

  protected readonly collectionPath = signal(this.route.snapshot.paramMap.get('collection') ?? '');
  protected readonly itemId = signal(this.route.snapshot.paramMap.get('id') ?? '');
  protected readonly collectionLabel = computed(
    () => MASTER_DATA_COLLECTIONS.find((c) => c.path === this.collectionPath())?.label ?? this.collectionPath(),
  );
  // Duration's `code` is display-only here — never sent by updateItem(), see MasterDataService.
  protected readonly code = signal<string | null | undefined>(null);

  protected readonly loaded = signal(false);
  protected readonly notFound = signal(false);
  protected readonly saving = signal(false);
  protected readonly form = signal<FormState>(EMPTY_FORM);

  constructor() {
    this.masterData.getItems(this.collectionPath()).subscribe({
      next: (items) => {
        const item = items.find((i: MasterDataItem) => i.id === this.itemId());
        if (!item) {
          this.notFound.set(true);
        } else {
          this.code.set(item.code);
          this.form.set({
            value: item.value,
            order: item.order,
            emoji: item.emoji ?? '',
            subtext: item.subtext ?? '',
          });
        }
        this.loaded.set(true);
      },
      error: () => {
        this.notFound.set(true);
        this.loaded.set(true);
      },
    });
  }

  protected updateField<K extends keyof FormState>(field: K, value: FormState[K]): void {
    this.form.update((f) => ({ ...f, [field]: value }));
  }

  protected save(): void {
    const f = this.form();
    this.saving.set(true);
    this.masterData
      .updateItem(this.collectionPath(), this.itemId(), {
        value: f.value,
        order: Number(f.order),
        emoji: f.emoji || null,
        subtext: f.subtext || null,
      })
      .subscribe({
        next: () => {
          this.toast.showAndReload('Saved', 'success', `/admin/master/${this.collectionPath()}`);
        },
        error: () => {
          this.saving.set(false);
          this.toast.error('Could not save — please try again.');
        },
      });
  }
}
