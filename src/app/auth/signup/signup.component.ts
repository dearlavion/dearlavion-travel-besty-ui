import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthOverlayComponent } from '../../common/auth-overlay/auth-overlay.component';
import { AuthService } from '../auth.service';
import { environment } from '../../../environments/environment';

// Real-backend mode (yarn start:dev): registers against auth-service-v2 (no session — user logs
// in afterward). Mock mode (yarn start): no backend, just simulates a short request.
@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, RouterLink, AuthOverlayComponent],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
})
export class SignupComponent {
  username = '';
  email = '';
  password = '';
  protected readonly submitting = signal(false);
  protected readonly done = signal(false);
  protected readonly error = signal('');

  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  protected submit(form: NgForm): void {
    if (!form.valid) {
      return;
    }
    this.submitting.set(true);
    this.error.set('');

    if (!environment.useMockData) {
      this.authService.register(this.username, this.email, this.password).subscribe({
        next: () => {
          this.submitting.set(false);
          this.done.set(true);
          setTimeout(() => this.router.navigate(['/login']), 1400);
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(err?.status === 409 ? 'That username or email is already taken.' : 'Could not sign up. Please try again.');
        },
      });
      return;
    }

    setTimeout(() => {
      this.submitting.set(false);
      this.done.set(true);
      setTimeout(() => this.router.navigate(['/login']), 1400);
    }, 500);
  }
}
