import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { OrderShipping, OrdersService } from '../checkout/orders.service';

export type PaymentMethod = 'CARD' | 'GCASH' | 'MAYA' | 'MARIBANK';
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Payment {
  id: string;
  orderId: string;
  orderReference?: string;
  // Denormalized from the order at submission time — where to ship it. Absent for payments
  // submitted before this field existed, or (real mode) if the order itself has no shipping.
  shipping?: OrderShipping;
  method: PaymentMethod;
  amount: number;
  currency: string;
  referenceNumber: string;
  proofImageUrl: string;
  status: PaymentStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  userId?: string;
  createdAt?: string;
}

export interface SubmitPaymentInput {
  orderId: string;
  method: PaymentMethod;
  amount: number;
  currency?: string;
  referenceNumber: string;
  proofImageUrl: string;
}

export const PAYMENT_METHODS: { code: PaymentMethod; label: string }[] = [
  { code: 'GCASH', label: 'GCash' },
  { code: 'MAYA', label: 'Maya' },
  { code: 'MARIBANK', label: 'Maribank' },
  { code: 'CARD', label: 'Card' },
];

const STORAGE_KEY = 'travel-besty-payments';
const CUSTOMER_BASE = `${environment.paymentUrl}/payments`;
const ADMIN_BASE = `${environment.paymentUrl}/admin/payments`;

function loadStored(): Payment[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Payment[];
  } catch {
    return [];
  }
}

/**
 * Manual proof-of-payment flow. Real-backend mode talks to the payment-service; mock mode keeps a
 * localStorage-backed store so the app works offline (same pattern as OrdersService/CartService).
 */
@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly orders = inject(OrdersService);

  /** The signed-in customer's own payments (for showing status on Track Packages). */
  readonly myPayments = signal<Payment[]>(environment.useMockData ? loadStored() : []);

  constructor() {
    if (!environment.useMockData && this.auth.token()) this.refreshMine();
  }

  refreshMine(): void {
    if (environment.useMockData) {
      this.myPayments.set(loadStored());
      return;
    }
    this.http.get<Payment[]>(CUSTOMER_BASE).subscribe({ next: (res) => this.myPayments.set(res), error: () => {} });
  }

  /** Latest payment for a given order (by orderId or order reference), for status display. */
  forOrder(orderIdOrRef: string): Payment | undefined {
    return this.myPayments().find((p) => p.orderId === orderIdOrRef || p.orderReference === orderIdOrRef);
  }

  submit(input: SubmitPaymentInput): Observable<Payment> {
    if (environment.useMockData) {
      // Real mode gets shipping for free (denormalized server-side from the order at submission
      // time, see payment-service's create()) — mock mode has no such backend, so look the
      // placed order up locally the same way it's stored (OrdersService.orders()).
      const shipping = this.orders.orders().find((o) => o.id === input.orderId)?.shipping;
      const payment: Payment = {
        id: `${Date.now()}`,
        orderId: input.orderId,
        orderReference: input.orderId,
        shipping,
        method: input.method,
        amount: input.amount,
        currency: input.currency ?? 'PHP',
        referenceNumber: input.referenceNumber,
        proofImageUrl: input.proofImageUrl,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
      this.persistMock([payment, ...loadStored()]);
      this.myPayments.set(loadStored());
      return of(payment);
    }
    return this.http.post<Payment>(CUSTOMER_BASE, input).pipe(tap(() => this.refreshMine()));
  }

  // ---- employee (admin) ----

  list(status?: PaymentStatus): Observable<Payment[]> {
    if (environment.useMockData) {
      const all = loadStored();
      return of(status ? all.filter((p) => p.status === status) : all);
    }
    const url = status ? `${ADMIN_BASE}?status=${status}` : ADMIN_BASE;
    return this.http.get<Payment[]>(url);
  }

  approve(id: string, note?: string): Observable<Payment> {
    return this.review(id, 'approve', 'APPROVED', note);
  }

  reject(id: string, note?: string): Observable<Payment> {
    return this.review(id, 'reject', 'REJECTED', note);
  }

  private review(id: string, action: 'approve' | 'reject', status: PaymentStatus, note?: string): Observable<Payment> {
    if (environment.useMockData) {
      const all = loadStored().map((p) =>
        p.id === id ? { ...p, status, reviewedBy: this.auth.user()?.username, reviewedAt: new Date().toISOString(), reviewNote: note } : p,
      );
      this.persistMock(all);
      this.myPayments.set(loadStored());
      return of(all.find((p) => p.id === id)!);
    }
    return this.http.post<Payment>(`${ADMIN_BASE}/${id}/${action}`, { note });
  }

  private persistMock(payments: Payment[]): void {
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payments));
  }
}
