import { Component, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { CartService } from '../../cart/cart.service';

@Component({
  selector: 'app-top-navigation',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './top-navigation.component.html',
  styleUrl: './top-navigation.component.css',
})
export class TopNavigationComponent {
  protected readonly cart = inject(CartService);
  protected readonly mobileMenuOpen = signal(false);

  constructor(router: Router) {
    // Closes the mobile menu automatically whenever a navigation completes — covers cases like
    // browser back/forward, not just the explicit (click) handler on each link.
    router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.mobileMenuOpen.set(false);
    });
  }

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  // Closes on any click outside the nav (backdrop tap), mirroring the pattern already used for
  // Shop's filter dropdowns.
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.topnav')) {
      this.mobileMenuOpen.set(false);
    }
  }
}
