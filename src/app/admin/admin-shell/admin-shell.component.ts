import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

// Back-office layout — deliberately not the customer TopNavigationComponent (no "Build Travel
// Kit"/Login CTAs belong here). The sidebar mirrors ProfileShellComponent's dashboard pattern,
// giving the admin their own "profile"-style area with Products/Popular Kits/Inventory sections.
@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.css',
})
export class AdminShellComponent {}
