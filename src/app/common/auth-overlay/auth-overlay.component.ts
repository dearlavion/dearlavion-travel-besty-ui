import { Component, Input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

// Shared floating-popup chrome for the auth pages (login/signup/forgot-password) — blurred
// backdrop + centered card. Content is projected so each page only owns its own form. Always
// closes back to '/' since none of these pages have a "previous page" concept worth tracking.
@Component({
  selector: 'app-auth-overlay',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './auth-overlay.component.html',
  styleUrl: './auth-overlay.component.css',
})
export class AuthOverlayComponent {
  @Input() eyebrow = '';
  @Input() title = '';

  constructor(private router: Router) {}

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.router.navigate(['/']);
    }
  }
}
