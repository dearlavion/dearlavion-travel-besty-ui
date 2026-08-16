import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MasterDataService } from '../../common/master-data/master-data.service';
import { ToastService } from '../../common/toast/toast.service';
import { KitSettingsSave, KitSettingsTableComponent } from './kit-settings-table.component';

// Copy only — which collections exist comes from the live registry, not this list. An
// admin-created collection simply has no entry and shows its own label with no description.
const DESCRIPTIONS: Record<string, string> = {
  destination: 'Where a trip is headed.',
  season: 'What the weather will be like.',
  party: 'Who is traveling.',
  transportation: 'How they are getting there.',
  activity: 'What they will be doing.',
  kitCategory: 'Packing-list buckets — the survey\'s "what matters most" question.',
  duration: 'Trip length bands — the kit-sizing engine keys off these directly.',
  gender: 'Collected on the survey for sizing.',
  productCategory: 'What a product is — drives the shop card and the kit\'s breadth, never the survey.',
};

/**
 * Two lists over the same collections registry, because the survey and the product form ask
 * different things of a collection. `multiple` on the survey means "the shopper may pick several";
 * on the product form it means "the product may hold several" — and those genuinely differ (one
 * trip length per trip, several per product), which is why sharing one set of flags rendered Trip
 * length as a single-select on the product form.
 */
@Component({
  selector: 'app-admin-kit-settings',
  standalone: true,
  imports: [RouterLink, KitSettingsTableComponent],
  templateUrl: './admin-kit-settings.component.html',
  styleUrl: './admin-kit-settings.component.css',
})
export class AdminKitSettingsComponent {
  protected readonly masterData = inject(MasterDataService);
  private readonly toast = inject(ToastService);

  protected readonly descriptions = DESCRIPTIONS;

  protected readonly valueCounts = computed<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    for (const collection of this.masterData.collections()) {
      counts[collection.key] = this.masterData.forType(collection.key).length;
    }
    return counts;
  });

  // ── Survey ───────────────────────────────────────────────────────────────────────────────────
  protected saveSurvey(change: KitSettingsSave): void {
    this.masterData.updateKitSettings(change.order, change.sections);
    this.toast.showAndReload('Survey questions saved — /travel now asks in this order', 'success');
  }

  protected addToSurvey(key: string): void {
    this.masterData.updateKitSettings([...this.masterData.typeOrder(), key]);
    this.toast.showAndReload(`Added "${this.labelFor(key)}" to the survey`, 'success');
  }

  protected removeFromSurvey(key: string): void {
    this.masterData.updateKitSettings(this.masterData.typeOrder().filter((k) => k !== key));
    this.toast.showAndReload(
      `Removed "${this.labelFor(key)}" from the survey — the collection itself is untouched`,
      'success',
    );
  }

  // ── Product form ─────────────────────────────────────────────────────────────────────────────
  protected saveProductForm(change: KitSettingsSave): void {
    this.masterData.updateProductFormSettings(change.order, change.sections);
    this.toast.showAndReload('Product form fields saved', 'success');
  }

  protected addToProductForm(key: string): void {
    this.masterData.updateProductFormSettings([...this.masterData.productFormOrder(), key]);
    this.toast.showAndReload(`Added "${this.labelFor(key)}" to the product form`, 'success');
  }

  protected removeFromProductForm(key: string): void {
    // The product form's own save() still enforces these two, so removing either would leave a
    // product that can't be saved and no field to fix it with.
    if (key === 'productCategory' || key === 'kitCategory') {
      this.toast.show(`"${this.labelFor(key)}" is required to save a product and can't be removed`, 'error');
      return;
    }
    this.masterData.updateProductFormSettings(this.masterData.productFormOrder().filter((k) => k !== key));
    this.toast.showAndReload(`Removed "${this.labelFor(key)}" from the product form`, 'success');
  }

  private labelFor(key: string): string {
    return this.masterData.collections().find((c) => c.key === key)?.label ?? key;
  }
}
