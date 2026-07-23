import { Component, input, output } from '@angular/core';

// Shared Prev/Next pager for admin list pages (Products, Popular Kits, Inventory) — the host
// component owns its own page size, filtering/sorting, and slicing; this only renders the
// controls and reports which page the admin wants next. `currentPage`/`totalPages` are 0-indexed
// internally but displayed 1-indexed, matching how page numbers read everywhere else in the app.
@Component({
  selector: 'app-pagination',
  standalone: true,
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.css',
})
export class PaginationComponent {
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly pageChange = output<number>();

  protected prev(): void {
    this.pageChange.emit(this.currentPage() - 1);
  }

  protected next(): void {
    this.pageChange.emit(this.currentPage() + 1);
  }
}
