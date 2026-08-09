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
  protected readonly shippingFee = signal(this.storeSettings.shippingFee());
  protected readonly savingShipping = signal(false);

  protected readonly defaultMediaProvider = signal(this.storeSettings.defaultMediaProvider());
  protected readonly maxImageSizeKb = signal(this.storeSettings.maxImageSizeKb());
  protected readonly savingMediaProvider = signal(false);

  private touched = false;
  private shippingTouched = false;
  private mediaProviderTouched = false;

  constructor() {
    // Seed the editable form from the service (incl. the async-loaded live rates) until the admin
    // starts editing, so their changes are never clobbered by a late GET.
    effect(() => {
      const live = this.exchange.rates();
      if (!this.touched) this.rates.set({ ...live });
    });
    // Same guard for the free-shipping threshold/fee (loaded async from GET /store-settings).
    effect(() => {
      const min = this.storeSettings.freeShippingMinimum();
      const fee = this.storeSettings.shippingFee();
      if (!this.shippingTouched) {
        this.freeShippingMinimum.set(min);
        this.shippingFee.set(fee);
      }
    });
    // Same guard for the default upload destination + max upload size (one form, one save button).
    effect(() => {
      const provider = this.storeSettings.defaultMediaProvider();
      const maxKb = this.storeSettings.maxImageSizeKb();
      if (!this.mediaProviderTouched) {
        this.defaultMediaProvider.set(provider);
        this.maxImageSizeKb.set(maxKb);
      }
    });
  }

  protected setFreeShippingMinimum(value: number): void {
    this.shippingTouched = true;
    this.freeShippingMinimum.set(Math.max(0, Number(value) || 0));
  }

  protected setShippingFee(value: number): void {
    this.shippingTouched = true;
    this.shippingFee.set(Math.max(0, Number(value) || 0));
  }

  protected saveShipping(): void {
    const result = this.storeSettings.update({
      freeShippingMinimum: this.freeShippingMinimum(),
      shippingFee: this.shippingFee(),
    });
    if (isObservable(result)) {
      this.savingShipping.set(true);
      result.subscribe({
        next: () => this.toast.showAndReload('Shipping settings updated'),
        error: () => {
          this.savingShipping.set(false);
          this.toast.error('Failed to save shipping settings');
        },
      });
    } else {
      this.toast.showAndReload('Shipping settings updated');
    }
  }

  protected setDefaultMediaProvider(value: string): void {
    this.mediaProviderTouched = true;
    this.defaultMediaProvider.set(value === 'drive' ? 'drive' : 's3');
  }

  protected setMaxImageSizeKb(value: number): void {
    this.mediaProviderTouched = true;
    this.maxImageSizeKb.set(Math.max(1, Number(value) || 30));
  }

  protected saveMediaProvider(): void {
    const result = this.storeSettings.update({
      defaultMediaProvider: this.defaultMediaProvider(),
      maxImageSizeKb: this.maxImageSizeKb(),
    });
    if (isObservable(result)) {
      this.savingMediaProvider.set(true);
      result.subscribe({
        next: () => this.toast.showAndReload('Upload destination updated'),
        error: () => {
          this.savingMediaProvider.set(false);
          this.toast.error('Failed to save upload destination');
        },
      });
    } else {
      this.toast.showAndReload('Upload destination updated');
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
