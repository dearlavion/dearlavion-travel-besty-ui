import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminUser, AdminUserService, UserRole } from './admin-user.service';
import { PaginationComponent } from '../../common/pagination/pagination.component';
import { ToastService } from '../../common/toast/toast.service';

type StatusFilter = 'all' | 'active' | 'deactivated';
type RoleFilter = UserRole | 'all';

const PAGE_SIZE = 10;

// Every user for this tenant — fetches once and filters/paginates client-side, same convention as
// AdminOrdersComponent/AdminPaymentsComponent.
@Component({
  selector: 'app-admin-user-list',
  standalone: true,
  imports: [FormsModule, RouterLink, PaginationComponent],
  templateUrl: './admin-user-list.component.html',
  styleUrl: './admin-user-list.component.css',
})
export class AdminUserListComponent {
  private readonly userService = inject(AdminUserService);
  private readonly toast = inject(ToastService);

  protected readonly users = signal<AdminUser[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);

  protected readonly search = signal('');
  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly roleFilter = signal<RoleFilter>('all');
  protected readonly page = signal(0); // 0-indexed

  protected readonly pendingToggleUsername = signal<string | null>(null);

  constructor() {
    this.refresh();
  }

  private refresh(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.userService.list().subscribe({
      next: (res) => {
        this.users.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  protected readonly counts = computed(() => {
    const list = this.users();
    return {
      total: list.length,
      active: list.filter((u) => u.active !== false).length,
      deactivated: list.filter((u) => u.active === false).length,
    };
  });

  protected readonly filtered = computed<AdminUser[]>(() => {
    const sf = this.statusFilter();
    const rf = this.roleFilter();
    const term = this.search().trim().toLowerCase();
    let result = this.users();
    if (sf === 'active') result = result.filter((u) => u.active !== false);
    if (sf === 'deactivated') result = result.filter((u) => u.active === false);
    if (rf !== 'all') result = result.filter((u) => u.activeProfile === rf);
    if (term) {
      result = result.filter(
        (u) => u.username.toLowerCase().includes(term) || (u.email ?? '').toLowerCase().includes(term),
      );
    }
    return result;
  });

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));

  protected readonly currentPage = computed(() => Math.min(this.page(), this.totalPages() - 1));

  protected readonly pagedUsers = computed<AdminUser[]>(() => {
    const start = this.currentPage() * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  protected setSearch(term: string): void {
    this.search.set(term);
    this.page.set(0);
  }

  protected setStatusFilter(f: StatusFilter): void {
    this.statusFilter.set(f);
    this.page.set(0);
  }

  protected setRoleFilter(f: RoleFilter): void {
    this.roleFilter.set(f);
    this.page.set(0);
  }

  protected goToPage(page: number): void {
    this.page.set(Math.max(0, Math.min(page, this.totalPages() - 1)));
  }

  protected toggleActive(user: AdminUser): void {
    const next = user.active === false;
    this.pendingToggleUsername.set(user.username);
    this.userService.setActive(user.username, next).subscribe({
      next: (updated) => {
        this.users.update((list) => list.map((u) => (u.username === updated.username ? updated : u)));
        this.pendingToggleUsername.set(null);
        this.toast.success(next ? 'User reactivated' : 'User deactivated');
      },
      error: () => {
        this.pendingToggleUsername.set(null);
        this.toast.error('Failed to update user status');
      },
    });
  }
}
