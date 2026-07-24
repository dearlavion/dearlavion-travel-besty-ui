import { Pipe, PipeTransform, inject } from '@angular/core';
import { ProfileService } from '../profile/profile.service';
import { BASE_CURRENCY } from './currency';
import { ExchangeRateService } from './exchange-rate.service';

/**
 * Formats a catalog amount in the shopper's preferred currency. Catalog prices are stored in the
 * base currency (USD); this converts with the admin-managed rate table and formats via Intl.
 * Impure so it reflects live changes to the chosen currency / rates. Drop-in for `| currency`.
 */
@Pipe({ name: 'price', standalone: true, pure: false })
export class PricePipe implements PipeTransform {
  private readonly profile = inject(ProfileService);
  private readonly exchange = inject(ExchangeRateService);

  transform(amount: number | null | undefined, sourceCurrency: string = BASE_CURRENCY): string {
    if (amount == null) return '';
    const target = this.profile.currency();
    // Express the amount in the base currency first (all catalog prices are USD today), then convert.
    const inBase = sourceCurrency === BASE_CURRENCY ? amount : amount / this.exchange.rateFor(sourceCurrency);
    const converted = inBase * this.exchange.rateFor(target);
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: target }).format(converted);
  }
}
