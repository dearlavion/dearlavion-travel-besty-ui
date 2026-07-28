import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}

const DISPLAY_MS = 2500;

// providedIn: 'root' — a single shared instance so a toast fired just before navigating (e.g. the
// admin item form redirecting back to the parent product after Save) still shows up on whatever
// page the user lands on, as long as an <app-toast /> is mounted somewhere still on screen.
// Generic, not admin-specific: any feature can inject this and call show()/success()/error() —
// the admin item form is just the first caller.
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly message = signal<ToastMessage | null>(null);

  show(text: string, type: ToastType = 'success'): void {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    const id = ++this.nextId;
    this.message.set({ id, text, type });
    this.timeoutId = setTimeout(() => {
      // Only clear if this is still the toast we scheduled — a newer show() call already replaced
      // it and owns its own timeout.
      if (this.message()?.id === id) this.message.set(null);
    }, DISPLAY_MS);
  }

  success(text: string): void {
    this.show(text, 'success');
  }

  error(text: string): void {
    this.show(text, 'error');
  }

  info(text: string): void {
    this.show(text, 'info');
  }
}
