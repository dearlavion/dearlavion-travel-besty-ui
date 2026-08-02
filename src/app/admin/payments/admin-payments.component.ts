import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Payment, PaymentMethod, PaymentService, PaymentStatus } from '../../payment/payment.service';
import { ToastService } from '../../common/toast/toast.service';
import { PaginationComponent } from '../../common/pagination/pagination.component';

type PaymentFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'all';
type PendingAction = { id: string; kind: 'approve' | 'reject' };

const METHOD_LABELS: Record<PaymentMethod, string> = {
  GCASH: 'GCash',
  MAYA: 'Maya',
  MARIBANK: 'Maribank',
  CARD: 'Card',
};

const PAGE_SIZE = 10;

// The verification queue: every submitted proof of payment, reviewed here before an order is
// allowed to ship. Fetches the full list once (mirrors AdminInventoryComponent's fetch-all +
// client-filter idiom) rather than re-hitting the backend on every chip click.
@Component({
  selector: 'app-admin-payments',
  standalone: true,
  imports: [FormsModule, DecimalPipe, RouterLink, PaginationComponent],
  templateUrl: './admin-payments.component.html',
  styleUrl: './admin-payments.component.css',
})
export class AdminPaymentsComponent {
  private readonly paymentService = inject(PaymentService);
  private readonly toast = inject(ToastService);

  protected readonly payments = signal<Payment[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);

  protected readonly filter = signal<PaymentFilter>('PENDING');
  protected readonly search = signal('');
  protected readonly page = signal(0); // 0-indexed

  protected readonly pendingAction = signal<PendingAction | null>(null);
  protected readonly actionNote = signal('');
  protected readonly submittingAction = signal(false);

  protected readonly methodLabels = METHOD_LABELS;

  constructor() {
    this.refresh();
  }

  private refresh(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.paymentService.list().subscribe({
      next: (res) => {
        this.payments.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  protected readonly counts = computed(() => {
    const list = this.payments();
    return {
      pending: list.filter((p) => p.status === 'PENDING').length,
      approved: list.filter((p) => p.status === 'APPROVED').length,
      rejected: list.filter((p) => p.status === 'REJECTED').length,
      total: list.length,
    };
  });

  protected readonly filtered = computed<Payment[]>(() => {
    const f = this.filter();
    const term = this.search().trim().toLowerCase();
    let result = this.payments();
    if (f !== 'all') result = result.filter((p) => p.status === f);
    if (term) {
      result = result.filter(
        (p) =>
          (p.orderReference ?? p.orderId).toLowerCase().includes(term) ||
          p.referenceNumber.toLowerCase().includes(term),
      );
    }
    // Oldest pending first — that's the actual review queue order.
    return [...result].sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
  });

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));

  protected readonly currentPage = computed(() => Math.min(this.page(), this.totalPages() - 1));

  protected readonly pagedPayments = computed<Payment[]>(() => {
    const start = this.currentPage() * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  protected setFilter(f: PaymentFilter): void {
    this.filter.set(f);
    this.pendingAction.set(null);
    this.page.set(0);
  }

  protected setSearch(term: string): void {
    this.search.set(term);
    this.page.set(0);
  }

  protected goToPage(page: number): void {
    this.page.set(Math.max(0, Math.min(page, this.totalPages() - 1)));
  }

  protected requestAction(id: string, kind: 'approve' | 'reject'): void {
    this.pendingAction.set({ id, kind });
    this.actionNote.set('');
  }

  protected cancelAction(): void {
    this.pendingAction.set(null);
    this.actionNote.set('');
  }

  protected confirmAction(): void {
    const action = this.pendingAction();
    if (!action) return;
    this.submittingAction.set(true);
    const note = this.actionNote().trim() || undefined;
    const call = action.kind === 'approve' ? this.paymentService.approve(action.id, note) : this.paymentService.reject(action.id, note);
    call.subscribe({
      next: () => {
        this.toast.showAndReload(action.kind === 'approve' ? 'Payment approved' : 'Payment rejected');
      },
      error: () => {
        this.submittingAction.set(false);
        this.toast.error('Failed to update payment');
      },
    });
  }

  protected statusLabel(status: PaymentStatus): string {
    if (status === 'PENDING') return 'Pending review';
    if (status === 'APPROVED') return 'Approved';
    return 'Rejected';
  }

  protected submittedLabel(payment: Payment): string {
    if (!payment.createdAt) return '';
    return new Date(payment.createdAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  protected reviewedLabel(payment: Payment): string {
    if (!payment.reviewedAt) return '';
    return new Date(payment.reviewedAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
