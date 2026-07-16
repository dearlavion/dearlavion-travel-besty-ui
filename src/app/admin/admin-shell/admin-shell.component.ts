import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

// Minimal back-office layout — deliberately not the customer TopNavigationComponent
// (no "Build Travel Kit"/Login CTAs belong here).
@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.css',
})
export class AdminShellComponent {}
