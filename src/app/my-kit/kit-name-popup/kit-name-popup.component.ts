import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

// Asks for a kit name before "Email my kit" / "Download PDF" — the name becomes the email
// subject ("Travel Besty, Your {name} Travel Kit is here") and the PDF's file name. Prefilled
// with the kit's current title (if any) so an already-named saved kit is a one-click confirm.
@Component({
  selector: 'app-kit-name-popup',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './kit-name-popup.component.html',
  styleUrl: './kit-name-popup.component.css',
})
export class KitNamePopupComponent implements OnInit {
  @Input() initialName = '';
  @Output() confirmed = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  protected readonly name = signal('');

  ngOnInit(): void {
    this.name.set(this.initialName);
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.cancelled.emit();
  }

  protected confirm(): void {
    this.confirmed.emit(this.name().trim());
  }
}
