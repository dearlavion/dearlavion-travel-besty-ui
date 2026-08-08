import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CURRENCY_OPTIONS } from '../../common/currency';
import { ProfileService } from '../profile.service';
import { AuthService } from '../../auth/auth.service';
import { ToastService } from '../../common/toast/toast.service';

const AVATAR_OPTIONS = ['🧳', '🌷', '🏖️', '⛰️', '🏙️', '😎', '🐨', '🦊'];

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './profile-settings.component.html',
  styleUrl: './profile-settings.component.css',
})
export class ProfileSettingsComponent {
  private readonly profileService = inject(ProfileService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly avatarOptions = AVATAR_OPTIONS;
  protected readonly currencyOptions = CURRENCY_OPTIONS;
  // Read-only — the real account username (auth-service's own identifier), not the cosmetic
  // ProfileService displayName. Usernames aren't renameable (they're the login/lookup key).
  protected readonly username = () => this.auth.user()?.username ?? '';
  protected readonly selectedAvatar = signal(this.profileService.profile().avatar);
  protected readonly selectedCurrency = signal(this.profileService.profile().currency);

  protected readonly email = signal(this.auth.user()?.email ?? '');
  protected readonly savingEmail = signal(false);

  // If the email changed, that call must succeed before the bundled profile save + reload runs —
  // otherwise a rejected email (e.g. backend down) would get silently swallowed by the reload,
  // with no way for the user to see or retry it.
  protected save(): void {
    const nextEmail = this.email().trim();
    const emailChanged = !!nextEmail && nextEmail !== this.auth.user()?.email;

    if (!emailChanged) {
      this.commitProfileAndReload();
      return;
    }

    this.savingEmail.set(true);
    this.auth.updateEmail(nextEmail).subscribe({
      next: () => {
        this.savingEmail.set(false);
        this.commitProfileAndReload();
      },
      error: () => {
        this.savingEmail.set(false);
        this.toast.error('Could not update email. Please try again.');
      },
    });
  }

  private commitProfileAndReload(): void {
    this.profileService.update({
      avatar: this.selectedAvatar(),
      currency: this.selectedCurrency(),
    });
    this.toast.showAndReload('Profile updated');
  }
}
