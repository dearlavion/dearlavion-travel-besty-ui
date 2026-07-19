import { Component, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  Order,
  OrderStatus,
  ORDER_STATUS_STEPS,
  OrdersService,
  computeOrderStatus,
  orderStatusStepIndex,
} from '../../checkout/orders.service';

@Component({
  selector: 'app-track-packages',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './track-packages.component.html',
  styleUrl: './track-packages.component.css',
})
export class TrackPackagesComponent {
  private readonly ordersService = inject(OrdersService);

  protected readonly orders = this.ordersService.orders;
  protected readonly statusSteps = ORDER_STATUS_STEPS;

  protected status(order: Order): OrderStatus {
    return computeOrderStatus(order.placedAt);
  }

  protected stepIndex(order: Order): number {
    return orderStatusStepIndex(this.status(order));
  }

  protected placedDateLabel(order: Order): string {
    return new Date(order.placedAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
