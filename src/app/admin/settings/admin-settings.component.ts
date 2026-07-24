import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { isObservable } from 'rxjs';
import { BASE_CURRENCY, CURRENCY_OPTIONS } from '../../common/currency';
import { ExchangeRateService } from '../../common/exchange-rate.service';

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

  protected readonly base = BASE_CURRENCY;
  protected readonly options = CURRENCY_OPTIONS.filter((o) => o.code !== BASE_CURRENCY);
  protected readonly rates = signal<Record<string, number>>({ ...this.exchange.rates() });
  protected readonly saving = signal(false);
  protected readonly savedMessage = signal(false);

  private touched = false;

  constructor() {
    // Seed the editable form from the service (incl. the async-loaded live rates) until the admin
    // starts editing, so their changes are never clobbered by a late GET.
    effect(() => {
      const live = this.exchange.rates();
      if (!this.touched) this.rates.set({ ...live });
    });
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
        next: () => {
          this.saving.set(false);
          this.flash();
        },
        error: () => this.saving.set(false),
      });
    } else {
      this.flash();
    }
  }

  private flash(): void {
    this.touched = false;
    this.savedMessage.set(true);
    setTimeout(() => this.savedMessage.set(false), 2000);
  }
}
