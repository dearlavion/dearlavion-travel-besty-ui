import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ToastComponent } from '../../common/toast/toast.component';

// Back-office layout — deliberately not the customer TopNavigationComponent (no "Build Travel
// Kit"/Login CTAs belong here). The sidebar mirrors ProfileShellComponent's dashboard pattern,
// giving the admin their own "profile"-style area with Products/Popular Kits/Inventory sections.
// <app-toast/> is mounted here (not per-page) so a toast fired right before a redirect — e.g. the
// item form's Save navigating back to the parent product — still renders on the destination page,
// since this shell itself isn't destroyed by an in-admin navigation.
@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ToastComponent],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.css',
})
export class AdminShellComponent {}
