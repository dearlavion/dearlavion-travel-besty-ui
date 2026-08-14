import { Component, ElementRef, HostListener, computed, inject, input, output, signal } from '@angular/core';

/**
 * A compact toggle button that opens an options panel — same interaction Shop's Season/Destination
 * filters use, extracted here so admin forms with several tag-style fields (product form's
 * Seasons/Destinations/Party/Activities/Transportation) don't each reimplement it. Parent owns
 * selection state; this only renders + emits which value was clicked.
 *
 * <p>Set {@code multiple} to false for a pick-one field (product form's Kit Category): options
 * become radios, the panel closes on choice, and the 'All' sentinel is dropped — it means
 * "unrestricted", which makes no sense when exactly one value is required.
 */
@Component({
  selector: 'app-multi-select-dropdown',
  standalone: true,
  templateUrl: './multi-select-dropdown.component.html',
  styleUrl: './multi-select-dropdown.component.css',
})
export class MultiSelectDropdownComponent {
  private readonly elementRef = inject(ElementRef);

  readonly options = input<string[]>([]);
  readonly selected = input<string[]>([]);
  // Shown on the button when nothing is selected — Shop uses "All" (unrestricted); callers with a
  // different empty-state meaning (e.g. "None") can override.
  readonly emptyLabel = input('All');
  /** false = pick exactly one (radios, panel closes on choice, no 'All' sentinel). */
  readonly multiple = input(true);
  readonly toggleValue = output<string>();

  // Always offered as an explicit choice, on top of "nothing selected" already meaning
  // unrestricted — lets an admin deliberately tag a product 'All' (some real-backend catalog data
  // uses the literal tag rather than an empty array; see product-item-query.ts's tagMatch()).
  // Mutual exclusivity with specific picks is the caller's toggle handler's job (see
  // toggleWithAllSentinel() in admin-product-form.component.ts), same split of responsibility as
  // TravelComponent's own Destination 'All' sentinel.
  protected readonly displayOptions = computed(() =>
    this.multiple() ? ['All', ...this.options()] : this.options(),
  );

  protected readonly open = signal(false);

  protected readonly buttonLabel = computed(() => {
    const sel = this.selected();
    return sel.length > 0 ? sel.join(', ') : this.emptyLabel();
  });

  protected toggleOpen(): void {
    this.open.update((v) => !v);
  }

  protected isSelected(value: string): boolean {
    return this.selected().includes(value);
  }

  protected onToggleValue(value: string): void {
    this.toggleValue.emit(value);
    // Single-select is a completed choice, so the panel has nothing left to offer; multi-select
    // stays open so several values can be picked in one go.
    if (!this.multiple()) this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }
}
