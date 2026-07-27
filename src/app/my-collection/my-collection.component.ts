import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SavedKit, SavedKitsService } from '../my-kit/saved-kits.service';

// Dedicated browsing/management page for kits saved via /my-kit's "Save kit" action — reuses the
// existing SavedKitsService as-is, this component is purely a UI over it.
@Component({
  selector: 'app-my-collection',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './my-collection.component.html',
  styleUrl: './my-collection.component.css',
})
export class MyCollectionComponent {
  private readonly savedKitsService = inject(SavedKitsService);
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
    // /my-kit/:savedId resolves straight from SavedKitsService — stable and refresh-safe, so no
    // need to also stash it in TravelKitService (that's only for the quiz's identity-less flow).
    this.router.navigateByUrl(`/my-kit/${saved.id}`);
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
