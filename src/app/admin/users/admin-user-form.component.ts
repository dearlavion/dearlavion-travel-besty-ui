import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminUser, AdminUserService, UserRole } from './admin-user.service';
import { ToastService } from '../../common/toast/toast.service';

interface UserFormModel {
  username: string; // only editable in create mode
  email: string;
  password: string; // only used in create mode
  firstname: string;
  lastname: string;
  phone: string;
  activeProfile: UserRole;
}

function emptyForm(): UserFormModel {
  return { username: '', email: '', password: '', firstname: '', lastname: '', phone: '', activeProfile: 'USER' };
}

// :username present in the route = edit mode, same toSignal(paramMap) + no-id-means-add pattern
// used by AdminProductItemFormComponent — except this service is stateless (no signal-store to
// wait on), so the edit-mode fetch is a plain one-shot HTTP call in the constructor rather than an
// effect() retried until async catalog data shows up.
@Component({
  selector: 'app-admin-user-form',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-user-form.component.html',
  styleUrl: './admin-user-form.component.css',
})
export class AdminUserFormComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(AdminUserService);
  private readonly toast = inject(ToastService);
  private readonly paramMap = toSignal(this.route.paramMap);

  protected readonly username = computed(() => this.paramMap()?.get('username') ?? null);
  protected readonly isEditMode = computed(() => this.username() !== null);

  protected readonly loading = signal(false);
  protected readonly notFound = signal(false);
  protected readonly submitting = signal(false);

  protected readonly form = signal<UserFormModel>(emptyForm());
  protected readonly loadedUser = signal<AdminUser | null>(null);
  protected readonly togglingActive = signal(false);

  protected readonly newPassword = signal('');
  protected readonly settingPassword = signal(false);

  constructor() {
    const username = this.username();
    if (!username) return;
    this.loading.set(true);
    this.userService.get(username).subscribe({
      next: (user) => {
        this.loadedUser.set(user);
        this.form.set({
          username: user.username,
          email: user.email ?? '',
          password: '',
          firstname: user.firstname ?? '',
          lastname: user.lastname ?? '',
          phone: user.phone ?? '',
          activeProfile: user.activeProfile ?? 'USER',
        });
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  protected updateField<K extends keyof UserFormModel>(key: K, value: UserFormModel[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  protected save(): void {
    const f = this.form();
    this.submitting.set(true);

    if (this.isEditMode()) {
      const username = this.username()!;
      this.userService
        .update(username, {
          email: f.email.trim() || undefined,
          firstname: f.firstname.trim() || undefined,
          lastname: f.lastname.trim() || undefined,
          phone: f.phone.trim() || undefined,
          activeProfile: f.activeProfile,
        })
        .subscribe({
          next: () => {
            this.submitting.set(false);
            this.toast.showAndReload('User updated');
          },
          error: () => {
            this.submitting.set(false);
            this.toast.error('Failed to update user');
          },
        });
      return;
    }

    this.userService
      .create({
        username: f.username.trim(),
        email: f.email.trim(),
        password: f.password,
        firstname: f.firstname.trim() || undefined,
        lastname: f.lastname.trim() || undefined,
        phone: f.phone.trim() || undefined,
        activeProfile: f.activeProfile,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.toast.showAndReload('User created', 'success', '/admin/users');
        },
        error: (err) => {
          this.submitting.set(false);
          this.toast.error(err?.error?.message ?? 'Failed to create user');
        },
      });
  }

  protected toggleActive(): void {
    const user = this.loadedUser();
    if (!user) return;
    const next = user.active === false;
    this.togglingActive.set(true);
    this.userService.setActive(user.username, next).subscribe({
      next: (updated) => {
        this.loadedUser.set(updated);
        this.togglingActive.set(false);
        this.toast.success(next ? 'User reactivated' : 'User deactivated');
      },
      error: () => {
        this.togglingActive.set(false);
        this.toast.error('Failed to update user status');
      },
    });
  }

  protected setNewPassword(): void {
    const username = this.username();
    const password = this.newPassword().trim();
    if (!username || !password) return;
    this.settingPassword.set(true);
    this.userService.setPassword(username, password).subscribe({
      next: () => {
        this.settingPassword.set(false);
        this.newPassword.set('');
        this.toast.success('Password updated');
      },
      error: () => {
        this.settingPassword.set(false);
        this.toast.error('Failed to update password');
      },
    });
  }
}
