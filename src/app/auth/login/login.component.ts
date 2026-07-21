import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthOverlayComponent } from '../../common/auth-overlay/auth-overlay.component';
import { AuthService } from '../auth.service';
import { environment } from '../../../environments/environment';

// Real-backend mode (yarn start:dev): submit logs in against auth-service-v2 via AuthService.login().
// Mock mode (yarn start): no backend — pick a local stub identity (admin/traveler) to become.
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

  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  protected submit(form: NgForm): void {
    if (!form.valid) {
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    this.authService.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.status === 401 ? 'Invalid email or password.' : 'Could not log in. Please try again.');
      },
    });
  }

  protected loginAsAdmin(): void {
    this.authService.loginAs('u9', 'admin', 'ADMIN');
    this.router.navigate(['/']);
  }

  protected loginAsTraveler(): void {
    this.authService.loginAs('u1', 'traveler', 'USER');
    this.router.navigate(['/']);
  }
}
