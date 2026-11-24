import { Injectable, inject } from '@angular/core';
import { ApiClient } from './http-api';
import { ApiError } from './api-error';

/** Respuesta de POST /files/presign-upload (fase01.md §3.8). */
interface PresignResponse {
  readonly file_id: string;
  readonly upload_url: string;
  readonly method: 'PUT';
  readonly headers: Readonly<Record<string, string>>;
  readonly expires_at: string;
}

export interface UploadTarget {
  /** Módulo dueño del archivo (`tenant`, y en fases siguientes `tasks`, `guests`…). */
  readonly module: string;
  /** Tipo dentro del módulo (`logo`, `before`, `id_front`…). */
  readonly kind: string;
  readonly entityType?: string;
  readonly entityId?: string;
}

/**
 * Subida de archivos a S3 en tres pasos: el backend registra el archivo y
 * firma una URL PUT con tipo y tamaño exactos; el navegador sube directo a S3
 * (el archivo no pasa por la API); el backend confirma con HEAD.
 * Devuelve el id del archivo para asociarlo (p. ej. `logo_file_id`).
 */
@Injectable({ providedIn: 'root' })
export class FilesApi {
  private readonly http = inject(ApiClient);

  async upload(file: File, target: UploadTarget, onProgress?: (pct: number) => void): Promise<string> {
    const presign = await this.http.post<PresignResponse>('/files/presign-upload', {
      module: target.module,
      kind: target.kind,
      content_type: file.type,
      size: file.size,
      filename: file.name,
      entity_type: target.entityType,
      entity_id: target.entityId,
    });
    await put(presign, file, onProgress);
    await this.http.post(`/files/${presign.file_id}/confirm`);
    return presign.file_id;
  }

  /** URL de descarga firmada (5 minutos). */
  async url(fileId: string): Promise<string> {
    const res = await this.http.get<{ url: string }>(`/files/${fileId}/url`);
    return res.url;
  }
}

/** PUT con progreso (fetch no informa el avance de la subida). */
function put(p: PresignResponse, file: File, onProgress?: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(p.method, p.upload_url);
    for (const [k, v] of Object.entries(p.headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new ApiError(xhr.status, 'No se pudo subir el archivo. Intenta de nuevo.'));
    xhr.onerror = () => reject(new ApiError(0, 'No se pudo subir el archivo: revisa tu conexión.'));
    xhr.send(file);
  });
}
