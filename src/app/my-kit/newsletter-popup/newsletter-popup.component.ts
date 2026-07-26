import { Component, EventEmitter, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

// Small, optional opt-in popup shown alongside My Kit's "Download PDF" action. Visual chrome
// mirrors AuthOverlayComponent (blurred backdrop + floating card), but closes via an @Output()
// instead of routerLink since this isn't its own route — either "Subscribe" or "No thanks" just
// tells the parent to proceed with the download either way; subscribing is never a gate on it.
@Component({
  selector: 'app-newsletter-popup',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './newsletter-popup.component.html',
  styleUrl: './newsletter-popup.component.css',
})
export class NewsletterPopupComponent {
  @Output() subscribe = new EventEmitter<string>();
  @Output() dismissed = new EventEmitter<void>();

  protected readonly email = signal('');

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.dismissed.emit();
  }

  protected confirmSubscribe(): void {
    const value = this.email().trim();
    if (!value) return;
    this.subscribe.emit(value);
  }

  protected skip(): void {
    this.dismissed.emit();
  }
}
