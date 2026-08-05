import { Component, ElementRef, HostListener, computed, inject, input, output, signal } from '@angular/core';

/**
 * A compact toggle button that opens a checkbox panel — same interaction Shop's Season/Destination
 * filters use, extracted here so admin forms with several tag-style multi-select fields (product
 * form's Seasons/Destinations/Party/Activities/Transportation) don't each reimplement it. Parent
 * owns selection state; this only renders + emits which value was clicked.
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
  readonly toggleValue = output<string>();

  // Always offered as an explicit choice, on top of "nothing selected" already meaning
  // unrestricted — lets an admin deliberately tag a product 'All' (some real-backend catalog data
  // uses the literal tag rather than an empty array; see product-item-query.ts's tagMatch()).
  // Mutual exclusivity with specific picks is the caller's toggle handler's job (see
  // toggleWithAllSentinel() in admin-product-form.component.ts), same split of responsibility as
  // TravelComponent's own Destination 'All' sentinel.
  protected readonly displayOptions = computed(() => ['All', ...this.options()]);

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
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }
}
