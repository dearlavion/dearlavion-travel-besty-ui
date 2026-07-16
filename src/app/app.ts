import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { TopNavigationComponent } from './common/top-navigation/top-navigation.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TopNavigationComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly router = inject(Router);

  // Admin gets its own minimal shell (AdminShellComponent) — the customer top nav's
  // "Build Travel Kit"/Login CTAs don't belong on back-office pages.
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly showTopNavigation = computed(() => !this.url().startsWith('/admin'));
}
