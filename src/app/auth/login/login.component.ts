import { Component, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthOverlayComponent } from '../../common/auth-overlay/auth-overlay.component';
import { AuthService } from '../auth.service';
import { environment } from '../../../environments/environment';

// Mock mode (yarn start): no real backend — submit just simulates a short request and lands back
// on the homepage. Real-backend mode (yarn start:dev): the store-engine backend delegates JWT
// verification to a separate auth-service this app doesn't talk to, so there's no real
// email/password flow here yet — instead pick which dev-auth-stub identity to become (see
// AuthService).
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
  protected readonly isRealBackend = !environment.useMockData;

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  protected submit(form: NgForm): void {
    if (!form.valid) {
      return;
    }
    this.submitting.set(true);
    setTimeout(() => this.router.navigate(['/']), 500);
  }

  protected loginAsAdmin(): void {
    this.authService.loginAs('u9', 'admin');
    this.router.navigate(['/']);
  }

  protected loginAsTraveler(): void {
    this.authService.loginAs('u1', 'traveler');
    this.router.navigate(['/']);
  }
}
