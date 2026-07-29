import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CURRENCY_OPTIONS } from '../../common/currency';
import { ProfileService } from '../profile.service';
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
  private readonly toast = inject(ToastService);

  protected readonly avatarOptions = AVATAR_OPTIONS;
  protected readonly currencyOptions = CURRENCY_OPTIONS;
  protected readonly displayName = signal(this.profileService.profile().displayName);
  protected readonly selectedAvatar = signal(this.profileService.profile().avatar);
  protected readonly selectedCurrency = signal(this.profileService.profile().currency);

  protected save(): void {
    this.profileService.update({
      displayName: this.displayName().trim() || 'Traveler',
      avatar: this.selectedAvatar(),
      currency: this.selectedCurrency(),
    });
    this.toast.showAndReload('Profile updated');
  }
}
