import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SavedKit, SavedKitsService } from '../my-kit/saved-kits.service';
import { TravelKitService } from '../travel/travel-kit.service';

// Dedicated browsing/management page for kits saved via /my-kit's "Save kit" action — reuses the
// existing SavedKitsService/TravelKitService as-is, this component is purely a UI over them.
@Component({
  selector: 'app-my-collection',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './my-collection.component.html',
  styleUrl: './my-collection.component.css',
})
export class MyCollectionComponent {
  private readonly savedKitsService = inject(SavedKitsService);
  private readonly travelKitService = inject(TravelKitService);
  private readonly router = inject(Router);

  protected readonly kits = this.savedKitsService.kits;
  protected readonly confirmingDeleteId = signal<string | null>(null);

  protected savedDateLabel(saved: SavedKit): string {
    return new Date(saved.savedAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  protected loadKit(saved: SavedKit): void {
    this.travelKitService.setKit(saved.kit);
    this.router.navigateByUrl('/my-kit');
  }

  protected requestDelete(id: string): void {
    this.confirmingDeleteId.set(id);
  }

  protected cancelDelete(): void {
    this.confirmingDeleteId.set(null);
  }

  protected confirmDelete(id: string): void {
    this.savedKitsService.delete(id);
    this.confirmingDeleteId.set(null);
  }
}
