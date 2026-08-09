import { Component, effect, inject, input, output, signal } from '@angular/core';
import { MediaFolder, MediaUploadService, UploadTarget } from '../../admin/media/media-upload.service';
import { StoreSettingsService } from '../store-settings.service';
import { ToastService } from '../toast/toast.service';

/** Drop-in replacement for a plain "paste an image URL" text input — keeps the text input (so
 * pasting an existing URL still works unchanged) and adds a file picker that uploads the file and
 * fills the same field with the resulting URL. Parent forms only change how this field renders;
 * their save()/DTO logic is untouched since the emitted value is always a plain URL string.
 *
 * Media Storage is the default target — Google Drive is offered as a secondary option, but its
 * hotlink format is Google's unofficial, undocumented embed pattern (unlike Media Storage's real
 * public object-storage URLs), so it isn't guaranteed to keep working. */
@Component({
  selector: 'app-image-upload-field',
  standalone: true,
  templateUrl: './image-upload-field.component.html',
  styleUrl: './image-upload-field.component.css',
})
export class ImageUploadFieldComponent {
  readonly value = input<string>('');
  readonly folder = input.required<MediaFolder>();
  readonly placeholder = input('https://... or upload a file');

  readonly valueChange = output<string>();

  private readonly mediaUpload = inject(MediaUploadService);
  private readonly toast = inject(ToastService);
  private readonly storeSettings = inject(StoreSettingsService);

  protected readonly uploading = signal(false);
  protected readonly target = signal<UploadTarget>('s3');

  private targetTouched = false;

  constructor() {
    // Default the per-field target selector from the admin's global setting until this instance
    // is explicitly changed, mirroring the touched-guard pattern in AdminSettingsComponent.
    effect(() => {
      const def = this.storeSettings.defaultMediaProvider();
      if (!this.targetTouched) this.target.set(def);
    });
  }

  protected onTextChange(url: string): void {
    this.valueChange.emit(url);
  }

  protected onTargetChange(target: string): void {
    this.targetTouched = true;
    this.target.set(target as UploadTarget);
  }

  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // clears the picker so selecting the same file again still fires (change)
    if (!file) return;

    const maxKb = this.storeSettings.maxImageSizeKb();
    if (file.size > maxKb * 1024) {
      this.toast.error(`Image must be under ${maxKb}KB.`);
      return;
    }

    this.uploading.set(true);
    try {
      const url =
        this.target() === 'drive'
          ? await this.mediaUpload.uploadViaGoogleDrive(file, this.folder())
          : await this.mediaUpload.uploadViaMediaService(file, this.folder());
      this.valueChange.emit(url);
    } catch {
      this.toast.error('Upload failed — please try again.');
    } finally {
      this.uploading.set(false);
    }
  }
}
