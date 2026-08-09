import { DOCUMENT } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../auth/auth.service';

// Back-office layout — deliberately not the customer TopNavigationComponent (no "Build Travel
// Kit"/Login CTAs belong here). The sidebar mirrors ProfileShellComponent's dashboard pattern,
// giving the admin their own "profile"-style area with Products/Popular Kits/Inventory sections.
// The confirmation popup (<app-toast/>) is mounted once at the app root (app.html), not here —
// it covers every route that way, admin included.
@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.css',
})
export class AdminShellComponent {
  // Users is the one nav item backed by requireAdminGuard (a more sensitive surface than the rest
  // of /admin, which today only requires login) — hidden for non-admins so the sidebar doesn't
  // show a link that would just bounce them to /login on click.
  protected readonly auth = inject(AuthService);

  // Nav collapses into a hamburger menu below the .admin-sidebar/.admin-nav breakpoint (see CSS) —
  // this signal only matters at that width; desktop always shows the nav regardless of its value.
  protected readonly mobileMenuOpen = signal(false);

  constructor() {
    // Auto-close on navigation (link clicks, back/forward) so the menu doesn't stay open over the
    // new page — simpler and more robust than a (click) handler on every individual nav link.
    inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationStart))
      .subscribe(() => this.mobileMenuOpen.set(false));

    // Lock body scroll while the full-screen mobile menu is open — otherwise the page behind it
    // (invisible but still in the layout) keeps scrolling with it, which reads as broken/janky
    // rather than a proper native-feeling menu. No-op on desktop since the menu is never "open"
    // there in any way that matters (its .open class has no effect above the mobile breakpoint).
    const document = inject(DOCUMENT);
    effect(() => {
      document.body.style.overflow = this.mobileMenuOpen() ? 'hidden' : '';
    });
  }

  protected toggleMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }
}
