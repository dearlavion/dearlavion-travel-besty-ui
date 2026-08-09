import { Component, computed, inject, input, OnDestroy, output, signal } from '@angular/core';
import { MediaFolder, MediaUploadService } from '../../admin/media/media-upload.service';
import { StoreSettingsService } from '../store-settings.service';
import { ToastService } from '../toast/toast.service';

/** Drop-in replacement for a plain "paste an image URL" text input — keeps the text input (so
 * pasting an existing URL still works unchanged) and adds a file picker. Picking a file does NOT
 * upload it right away: it's staged locally (an object-URL preview, immediately visible) and only
 * actually uploaded when the parent form calls {@link commitUpload}, normally from its own save()
 * — so nothing hits storage for a form the admin abandons without saving. Parent forms only change
 * how this field renders; their save()/DTO logic just needs to await commitUpload() first.
 *
 * Upload destination (Media Storage vs Google Drive) always follows the admin-wide
 * StoreSettingsService.defaultMediaProvider() setting — no per-field override, so there's one
 * place (Admin Settings) to change it rather than a dropdown on every photo slot. Google Drive's
 * hotlink format is Google's unofficial, undocumented embed pattern (unlike Media Storage's real
 * public object-storage URLs), so it isn't guaranteed to keep working. */
@Component({
  selector: 'app-image-upload-field',
  standalone: true,
  templateUrl: './image-upload-field.component.html',
  styleUrl: './image-upload-field.component.css',
})
export class ImageUploadFieldComponent implements OnDestroy {
  readonly value = input<string>('');
  readonly folder = input.required<MediaFolder>();
  readonly placeholder = input('https://... or upload a file');

  readonly valueChange = output<string>();

  private readonly mediaUpload = inject(MediaUploadService);
  private readonly toast = inject(ToastService);
  private readonly storeSettings = inject(StoreSettingsService);

  protected readonly uploading = signal(false);
  protected readonly target = computed(() => this.storeSettings.defaultMediaProvider());
  protected readonly pendingFileName = signal<string | null>(null);

  // Drives both the tooltip/aria-label and the icon on the upload button — one source of truth
  // instead of repeating this three-way state check in the template.
  protected readonly uploadLabel = computed(() =>
    this.uploading() ? 'Uploading…' : this.pendingFileName() ? 'Change file' : 'Upload photo',
  );

  private pendingFile: File | null = null;
  private previewUrl: string | null = null;

  ngOnDestroy(): void {
    // A picked-but-never-saved file's preview URL would otherwise leak for the page's lifetime.
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
  }

  protected onTextChange(url: string): void {
    this.clearPending();
    this.valueChange.emit(url);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // clears the picker so selecting the same file again still fires (change)
    if (!file) return;

    const maxKb = this.storeSettings.maxImageSizeKb();
    if (file.size > maxKb * 1024) {
      this.toast.error(`Image must be under ${maxKb}KB.`);
      return;
    }

    this.clearPending();
    this.pendingFile = file;
    this.pendingFileName.set(file.name);
    this.previewUrl = URL.createObjectURL(file);
    this.valueChange.emit(this.previewUrl);
  }

  /** True while a file has been picked but not yet uploaded — the parent's save() should call
   * commitUpload() on every field reporting true before persisting the form. */
  hasPendingUpload(): boolean {
    return this.pendingFile !== null;
  }

  /** Actually uploads a staged file (no-op if nothing's pending) and emits the real URL in place
   * of the local object-URL preview. Returns the field's current value either way. */
  async commitUpload(): Promise<string> {
    const file = this.pendingFile;
    if (!file) return this.value();

    this.uploading.set(true);
    try {
      const url =
        this.target() === 'drive'
          ? await this.mediaUpload.uploadViaGoogleDrive(file)
          : await this.mediaUpload.uploadViaMediaService(file, this.folder());
      this.clearPending();
      this.valueChange.emit(url);
      return url;
    } catch {
      this.toast.error('Upload failed — please try again.');
      throw new Error('image upload failed');
    } finally {
      this.uploading.set(false);
    }
  }

  private clearPending(): void {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = null;
    this.pendingFile = null;
    this.pendingFileName.set(null);
  }
}
