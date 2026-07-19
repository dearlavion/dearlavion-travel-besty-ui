import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PopularKitsService } from './popular-kits.service';

@Component({
  selector: 'app-admin-popular-kits',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-popular-kits.component.html',
  styleUrl: './admin-popular-kits.component.css',
})
export class AdminPopularKitsComponent {
  protected readonly popularKits = inject(PopularKitsService);
  protected readonly confirmingDeleteId = signal<string | null>(null);

  protected requestDelete(id: string): void {
    this.confirmingDeleteId.set(id);
  }

  protected cancelDelete(): void {
    this.confirmingDeleteId.set(null);
  }

  protected confirmDelete(id: string): void {
    this.popularKits.deleteKit(id);
    this.confirmingDeleteId.set(null);
  }
}
