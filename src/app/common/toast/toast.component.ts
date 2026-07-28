import { Component, inject } from '@angular/core';
import { ToastService, ToastType } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
})
export class ToastComponent {
  protected readonly toast = inject(ToastService);
  protected readonly icons: Record<ToastType, string> = { success: '✓', error: '✕', info: 'ℹ' };
}
