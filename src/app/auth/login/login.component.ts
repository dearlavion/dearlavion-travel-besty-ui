import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthOverlayComponent } from '../../common/auth-overlay/auth-overlay.component';
import { AuthService } from '../auth.service';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../common/toast/toast.service';

// Real-backend mode (yarn start:dev): submit logs in against auth-service-v2 via AuthService.login().
// Mock mode (yarn start): no backend — pick a local stub identity (admin/traveler) to become.
// Either way, arriving here via requireLoginGuard (e.g. from /admin or /profile) carries a
// ?returnUrl so we land back where the user started instead of always going home.
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, AuthOverlayComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  email = '';
  password = '';
  protected readonly submitting = signal(false);
  protected readonly error = signal('');
  protected readonly isRealBackend = !environment.useMockData;

  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  // Respects an explicit returnUrl (e.g. requireLoginGuard sent you here from a specific page)
  // first; otherwise sends admins straight to the admin dashboard instead of the storefront home.
  private postLoginUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl) return returnUrl;
    return this.authService.isAdmin() ? '/admin' : '/';
  }

  protected submit(form: NgForm): void {
    if (!form.valid) {
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    this.authService.login(this.email, this.password).subscribe({
      next: () => this.toast.showAndReload('Logged in successfully', 'success', this.postLoginUrl()),
      error: (err) => {
        this.submitting.set(false);
        const message = err?.status === 401 ? 'Invalid email or password.' : 'Could not log in. Please try again.';
        // Kept alongside the toast (not swapped for it) — this one stays put next to the fields
        // until the next attempt, rather than fading after 3s like the toast does.
        this.error.set(message);
        this.toast.error(message);
      },
    });
  }

  protected loginAsAdmin(): void {
    this.authService.loginAs('u9', 'admin', 'ADMIN');
    this.toast.showAndReload('Logged in successfully', 'success', this.postLoginUrl());
  }

  protected loginAsTraveler(): void {
    this.authService.loginAs('u1', 'traveler', 'USER');
    this.toast.showAndReload('Logged in successfully', 'success', this.postLoginUrl());
  }
}
