import { Component, computed, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminStatsService, ProductItemStat } from './admin-stats.service';
import { ProductItemService } from '../../shop/product-item.service';

const TOP_N = 10;

// Best/least performing product items by units sold across placed orders — one fetched list,
// sliced from both ends, rather than two separate requests.
@Component({
  selector: 'app-admin-statistics',
  standalone: true,
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './admin-statistics.component.html',
  styleUrl: './admin-statistics.component.css',
})
export class AdminStatisticsComponent {
  protected readonly statsService = inject(AdminStatsService);
  private readonly productItems = inject(ProductItemService);

  constructor() {
    // Mock mode's stats are computed locally from the full item catalog + this browser's own
    // order history — needs the catalog loaded first.
    this.productItems.ensureCatalogLoaded();
    this.statsService.load();
  }

  protected readonly totalUnitsSold = computed(() =>
    this.statsService.stats().reduce((sum, s) => sum + s.unitsSold, 0),
  );

  protected readonly bestPerforming = computed<ProductItemStat[]>(() =>
    [...this.statsService.stats()].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, TOP_N),
  );

  // Ascending by units sold — zero-sales items (never ordered at all) surface first, which is the
  // most actionable "least popular" signal, not just "sold the fewest units among things that sold".
  protected readonly leastPopular = computed<ProductItemStat[]>(() =>
    [...this.statsService.stats()].sort((a, b) => a.unitsSold - b.unitsSold).slice(0, TOP_N),
  );
}
