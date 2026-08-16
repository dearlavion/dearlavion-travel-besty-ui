import { Component, computed, input, output } from '@angular/core';
import { MasterDataCollection, SectionSettings } from '../../common/master-data/master-data.service';
import { MultiSelectDropdownComponent } from '../../common/multi-select-dropdown/multi-select-dropdown.component';

/**
 * One master-data collection rendered as a product tagging field. The product form loops over the
 * live collections registry and renders this per collection, so registering or deleting a
 * collection in Master Data adds or removes a field here with no code change.
 *
 * <p>Shape comes from that collection's Kit Settings row: `multiple` decides multi- vs
 * single-select, and a required question can't offer the 'All' sentinel — for those, empty means
 * "not chosen yet" rather than "applies to all". The parent owns the values and the meaning of a
 * toggle; this only renders and reports which value was clicked.
 */
@Component({
  selector: 'app-product-tag-field',
  standalone: true,
  imports: [MultiSelectDropdownComponent],
  template: `
    <div class="dropdown-field">
      <span class="dropdown-field-label">{{ label() }}</span>
      <app-multi-select-dropdown
        [options]="options()"
        [selected]="selected()"
        [multiple]="settings().multiple"
        [allowAll]="allowAll()"
        [emptyLabel]="emptyLabel()"
        (toggleValue)="toggleValue.emit($event)"
      />
      @if (hint(); as hintText) {
        <small class="dropdown-field-hint">{{ hintText }}</small>
      }
    </div>
  `,
  styles: [
    `
      .dropdown-field {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 0;
      }
      .dropdown-field-label {
        font-size: 12.5px;
        font-weight: 700;
        color: var(--color-ink-soft);
      }
      .dropdown-field-hint {
        font-size: 12px;
        color: var(--color-ink-soft);
      }
    `,
  ],
})
export class ProductTagFieldComponent {
  readonly collection = input.required<MasterDataCollection>();
  readonly options = input<string[]>([]);
  readonly selected = input<string[]>([]);
  readonly settings = input.required<SectionSettings>();
  /** Optional per-collection copy; falls back to a sentence built from the collection's own label. */
  readonly description = input<string | null>(null);
  readonly hint = input<string | null>(null);
  readonly toggleValue = output<string>();

  // 'All' means "unrestricted", which is incoherent for a question the admin must answer — there,
  // an empty list means "not chosen yet" instead.
  protected readonly allowAll = computed(() => !this.settings().required);

  protected readonly label = computed(
    () => this.description() ?? `${this.collection().label} — which ${this.collection().label.toLowerCase()} this product suits`,
  );

  protected readonly emptyLabel = computed(() => {
    if (this.settings().required) return this.settings().multiple ? 'Choose one or more...' : 'Choose one...';
    return this.settings().multiple ? 'All' : 'Any';
  });
}
