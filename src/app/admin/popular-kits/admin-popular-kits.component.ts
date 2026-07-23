import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PopularKitsService, PopularKit } from './popular-kits.service';
import { PaginationComponent } from '../../common/pagination/pagination.component';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-admin-popular-kits',
  standalone: true,
  imports: [FormsModule, RouterLink, PaginationComponent],
  templateUrl: './admin-popular-kits.component.html',
  styleUrl: './admin-popular-kits.component.css',
})
export class AdminPopularKitsComponent {
  protected readonly popularKits = inject(PopularKitsService);
  protected readonly confirmingDeleteId = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly page = signal(0); // 0-indexed

  // Search-matched — the full result set before pagination slices it, so page-count math reads
  // off this rather than the visible page alone.
  protected readonly filtered = computed<PopularKit[]>(() => {
    const term = this.search().trim().toLowerCase();
    const list = this.popularKits.kits();
    if (!term) return list;
    return list.filter(
      (k) =>
        k.name.toLowerCase().includes(term) ||
        k.tag.toLowerCase().includes(term) ||
        k.id.toLowerCase().includes(term),
    );
  });

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));

  // Clamps in the same read — deleting the last kit on the last page (or a search narrowing the
  // result set) falls back to the new last page instead of showing a blank grid.
  protected readonly currentPage = computed(() => Math.min(this.page(), this.totalPages() - 1));

  protected readonly pagedKits = computed<PopularKit[]>(() => {
    const start = this.currentPage() * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  protected setSearch(term: string): void {
    this.search.set(term);
    this.page.set(0); // a new search invalidates whatever page the admin was on
  }

  protected goToPage(page: number): void {
    this.page.set(Math.max(0, Math.min(page, this.totalPages() - 1)));
  }

  protected requestDelete(id: string): void {
    this.confirmingDeleteId.set(id);
  }

  protected cancelDelete(): void {
    this.confirmingDeleteId.set(null);
  }

  protected confirmDelete(id: string): void {
    this.popularKits.deleteKit(id);
    this.confirmingDeleteId.set(null);
  }
}
