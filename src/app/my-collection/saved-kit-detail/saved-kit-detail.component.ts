import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { SavedKit, SavedKitsService } from '../../my-kit/saved-kits.service';

// Reached from a card on /profile/collection — /profile/collection/:id, where :id is the same
// slugified-name id SavedKitsService.save() assigns at creation (see that file's comment).
@Component({
  selector: 'app-saved-kit-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './saved-kit-detail.component.html',
  styleUrl: './saved-kit-detail.component.css',
})
export class SavedKitDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly savedKits = inject(SavedKitsService);
  private readonly paramMap = toSignal(this.route.paramMap);

  private readonly id = computed(() => this.paramMap()?.get('id') ?? '');

  protected readonly kit = computed<SavedKit | undefined>(() =>
    this.savedKits.kits().find((k) => k.id === this.id()),
  );

  // Reactive, not a one-shot flag set in the constructor — real mode's list loads async (a direct
  // visit/refresh here has nothing loaded yet), so a plain check would get permanently stuck
  // showing "not found" even after the data arrives. `savedKits.loaded()` tells "still loading"
  // apart from "genuinely doesn't exist" — same pattern AdminProductFormComponent's `notFound` uses.
  protected readonly notFound = computed(() => this.savedKits.loaded() && !this.kit());

  protected readonly confirmingDelete = signal(false);

  protected savedDateLabel(saved: SavedKit): string {
    return new Date(saved.savedAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  protected loadKit(): void {
    const saved = this.kit();
    if (!saved) return;
    this.router.navigateByUrl(`/my-kit/${saved.id}`);
  }

  protected requestDelete(): void {
    this.confirmingDelete.set(true);
  }

  protected cancelDelete(): void {
    this.confirmingDelete.set(false);
  }

  protected confirmDelete(): void {
    const saved = this.kit();
    if (!saved) return;
    this.savedKits.delete(saved.id);
    this.router.navigateByUrl('/profile/collection');
  }
}
