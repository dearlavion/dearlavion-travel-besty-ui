import { Component, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthOverlayComponent } from '../../common/auth-overlay/auth-overlay.component';

// No real backend yet (per this project's mockup-data-only scope) — submit just simulates a
// short request and lands back on the homepage, same spirit as the rest of the app's mock data.
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

  constructor(private router: Router) {}

  protected submit(form: NgForm): void {
    if (!form.valid) {
      return;
    }
    this.submitting.set(true);
    setTimeout(() => this.router.navigate(['/']), 500);
  }
}
