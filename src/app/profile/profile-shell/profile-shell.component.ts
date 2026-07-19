import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ProfileService } from '../profile.service';

// Customer-facing dashboard shell (unlike AdminShellComponent, this keeps the normal storefront
// top nav — it's part of the regular shopping experience, not a back-office area).
@Component({
  selector: 'app-profile-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './profile-shell.component.html',
  styleUrl: './profile-shell.component.css',
})
export class ProfileShellComponent {
  protected readonly profileService = inject(ProfileService);
  protected readonly profile = this.profileService.profile;
}
