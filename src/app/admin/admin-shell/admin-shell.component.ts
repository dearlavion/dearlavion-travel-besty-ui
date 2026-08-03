import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
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
}
