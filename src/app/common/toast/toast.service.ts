import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}

const DISPLAY_MS = 3000;

// providedIn: 'root' — a single shared instance, so any feature can inject this and call
// show()/success()/error()/showAndReload() rather than rolling its own ad-hoc "saved!" UI.
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

  // For every admin CRUD action: shows the full-screen confirmation for its whole 3s lifetime —
  // held on the current, still-live page — and only *then* reloads (or navigates to `url` first),
  // so the admin always gets the full confirmation before the page flashes/swaps out from under
  // them, rather than the reload cutting it short. `url` lands on a different page first (e.g.
  // back to a parent list after a delete); omit it to reload the current URL in place.
  showAndReload(text: string, type: ToastType = 'success', url?: string): void {
    this.show(text, type);
    if (typeof window === 'undefined') return;
    setTimeout(() => {
      if (url) {
        window.location.href = url;
      } else {
        window.location.reload();
      }
    }, DISPLAY_MS);
  }
}
