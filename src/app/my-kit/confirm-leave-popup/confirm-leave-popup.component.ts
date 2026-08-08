import { Component, EventEmitter, Output } from '@angular/core';

// Custom replacement for window.confirm() when navigating away from an unsaved bare /my-kit
// quiz result via an in-app router link (confirm-leave.guard.ts) — window.confirm() works but
// looks like a browser chrome dialog, not this app. Visual chrome mirrors NewsletterPopupComponent
// (blurred backdrop + floating card).
@Component({
  selector: 'app-confirm-leave-popup',
  standalone: true,
  templateUrl: './confirm-leave-popup.component.html',
  styleUrl: './confirm-leave-popup.component.css',
})
export class ConfirmLeavePopupComponent {
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.cancelled.emit();
  }
}
