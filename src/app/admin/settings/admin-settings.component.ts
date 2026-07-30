import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { isObservable } from 'rxjs';
import { BASE_CURRENCY, CURRENCY_OPTIONS } from '../../common/currency';
import { ExchangeRateService } from '../../common/exchange-rate.service';
import { StoreSettingsService } from '../../common/store-settings.service';
import { ToastService } from '../../common/toast/toast.service';

// Admin Settings → Currency Exchange Rates. Rates are "units per 1 USD" (the base). The base row
// is locked at 1; every other supported currency gets an editable rate.
@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.css',
})
export class AdminSettingsComponent {
  private readonly exchange = inject(ExchangeRateService);
  private readonly storeSettings = inject(StoreSettingsService);
  private readonly toast = inject(ToastService);

  protected readonly base = BASE_CURRENCY;
  protected readonly options = CURRENCY_OPTIONS.filter((o) => o.code !== BASE_CURRENCY);
  protected readonly rates = signal<Record<string, number>>({ ...this.exchange.rates() });
  protected readonly saving = signal(false);

  protected readonly freeShippingMinimum = signal(this.storeSettings.freeShippingMinimum());
  protected readonly savingShipping = signal(false);

  private touched = false;
  private shippingTouched = false;

  constructor() {
    // Seed the editable form from the service (incl. the async-loaded live rates) until the admin
    // starts editing, so their changes are never clobbered by a late GET.
    effect(() => {
      const live = this.exchange.rates();
      if (!this.touched) this.rates.set({ ...live });
    });
    // Same guard for the free-shipping threshold (loaded async from GET /store-settings).
    effect(() => {
      const live = this.storeSettings.freeShippingMinimum();
      if (!this.shippingTouched) this.freeShippingMinimum.set(live);
    });
  }

  protected setFreeShippingMinimum(value: number): void {
    this.shippingTouched = true;
    this.freeShippingMinimum.set(Math.max(0, Number(value) || 0));
  }

  protected saveShipping(): void {
    const result = this.storeSettings.update({ freeShippingMinimum: this.freeShippingMinimum() });
    if (isObservable(result)) {
      this.savingShipping.set(true);
      result.subscribe({
        next: () => this.toast.showAndReload('Free shipping updated'),
        error: () => {
          this.savingShipping.set(false);
          this.toast.error('Failed to save free shipping');
        },
      });
    } else {
      this.toast.showAndReload('Free shipping updated');
    }
  }

  protected setRate(code: string, value: number): void {
    this.touched = true;
    this.rates.update((r) => ({ ...r, [code]: Number(value) || 0 }));
  }

  protected save(): void {
    const result = this.exchange.updateRates(this.rates());
    if (isObservable(result)) {
      this.saving.set(true);
      result.subscribe({
        next: () => this.toast.showAndReload('Exchange rates updated'),
        error: () => {
          this.saving.set(false);
          this.toast.error('Failed to save exchange rates');
        },
      });
    } else {
      this.toast.showAndReload('Exchange rates updated');
    }
  }
}
