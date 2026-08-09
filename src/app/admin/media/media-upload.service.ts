import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type MediaFolder = 'products' | 'popular-kits';
export type UploadTarget = 's3' | 'drive';

interface UploadUrlResponse {
  uploadUrl: string;
  mediaKey: string | null;
  expiresAt: string;
  publicUrl: string | null;
}

interface DriveFinalizeResponse {
  publicUrl: string;
  fileId: string;
}

/** Admin file-upload for product/kit photos. Both targets go through store-engine's admin-gated
 * broker (dearlavion-media-service has no auth of its own) to get an upload URL, then the browser
 * PUTs the file bytes directly to that URL — store-engine never sees the file bytes either way:
 * - Media Storage (default, "s3"): the URL is a presigned MinIO PUT. Its host isn't one of
 *   auth.interceptor.ts's known backends, so no bearer token gets attached to that PUT — the
 *   presigned URL carries its own auth.
 * - Google Drive ("drive"): the URL is a Drive resumable-upload session URI (also not a known
 *   backend, same reasoning). Unlike S3, Drive returns the created file's metadata (including its
 *   id) in the PUT response body, and the file isn't public yet — a second call to the broker's
 *   finalize endpoint is needed to grant "anyone with the link" access and get the real URL. */
@Injectable({ providedIn: 'root' })
export class MediaUploadService {
  private readonly http = inject(HttpClient);

  async uploadViaMediaService(file: File, folder: MediaFolder): Promise<string> {
    // Must match exactly what MinIO's presigned URL was signed with (media-service binds the
    // presign to this exact contentType/size) — captured once and reused, not re-derived.
    const contentType = file.type || 'application/octet-stream';

    const { uploadUrl, publicUrl } = await firstValueFrom(
      this.http.post<UploadUrlResponse>(`${environment.apiUrl}/admin/media/upload-url`, {
        fileName: file.name,
        contentType,
        fileSize: file.size,
        folder,
        provider: 's3',
      }),
    );

    // responseType 'text' — MinIO returns an empty body on a successful PUT; parsing it as JSON
    // (HttpClient's default) would throw even though the upload itself succeeded.
    await firstValueFrom(
      this.http.put(uploadUrl, file, { headers: { 'Content-Type': contentType }, responseType: 'text' }),
    );

    return publicUrl!;
  }

  async uploadViaGoogleDrive(file: File, folder: MediaFolder): Promise<string> {
    const contentType = file.type || 'application/octet-stream';

    const { uploadUrl } = await firstValueFrom(
      this.http.post<UploadUrlResponse>(`${environment.apiUrl}/admin/media/upload-url`, {
        fileName: file.name,
        contentType,
        fileSize: file.size,
        folder,
        provider: 'drive',
      }),
    );

    // Drive's resumable-upload PUT, sent whole in one shot (fine for the small images admins
    // upload here), returns the completed file's resource — we only need its id.
    const uploaded = await firstValueFrom(
      this.http.put<{ id: string }>(uploadUrl, file, { headers: { 'Content-Type': contentType } }),
    );

    const { publicUrl } = await firstValueFrom(
      this.http.post<DriveFinalizeResponse>(`${environment.apiUrl}/admin/media/drive/finalize`, {
        fileId: uploaded.id,
      }),
    );

    return publicUrl;
  }
}
