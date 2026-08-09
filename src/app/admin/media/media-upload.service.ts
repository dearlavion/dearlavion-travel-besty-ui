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

interface DriveUploadResponse {
  publicUrl: string;
  fileId: string;
}

/** Admin file-upload for product/kit photos. The two targets use different patterns:
 * - Media Storage (default, "s3"): store-engine's admin-gated broker returns a presigned MinIO PUT
 *   URL, and the browser PUTs the file bytes directly to it — store-engine never sees the bytes.
 *   That URL's host isn't one of auth.interceptor.ts's known backends, so no bearer token gets
 *   attached to that PUT either — the presigned URL carries its own auth.
 * - Google Drive ("drive"): uploaded as one multipart POST to the broker instead of a direct PUT.
 *   Drive's resumable-upload API does return a session URI the browser could PUT to directly (like
 *   the S3 path), but that PUT's response is missing Access-Control-Allow-Origin — the browser
 *   blocks reading it even though Drive does create the file. So this path is proxied: the broker
 *   (and media-service behind it) does the actual Drive upload server-side and hands back the
 *   public URL directly. */
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
      }),
    );

    // responseType 'text' — MinIO returns an empty body on a successful PUT; parsing it as JSON
    // (HttpClient's default) would throw even though the upload itself succeeded.
    await firstValueFrom(
      this.http.put(uploadUrl, file, { headers: { 'Content-Type': contentType }, responseType: 'text' }),
    );

    return publicUrl!;
  }

  async uploadViaGoogleDrive(file: File): Promise<string> {
    const form = new FormData();
    form.append('file', file, file.name);

    const { publicUrl } = await firstValueFrom(
      this.http.post<DriveUploadResponse>(`${environment.apiUrl}/admin/media/drive/upload`, form),
    );

    return publicUrl;
  }
}
