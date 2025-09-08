import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export type ChatOptions = {
  system?: string;
  max_tokens?: number;
  temperature?: number;
};

export type ChatResponse = { ok: boolean; output: string };
export type UploadResp   = { ok: true; docId: string; name: string; chunkCount: number };
export type AskResp      = { ok: true; answer: string; contextUsed: string[] };

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private base = 'http://localhost:3000/api';

  
  chat(message: string, opts?: ChatOptions): Observable<ChatResponse> {
    const body = { message, ...opts };
    return this.http.post<ChatResponse>(`${this.base}/chat`, body).pipe(
      tap({
        next: res => console.log('[FRONT][service] OK:', res),
        error: err => console.error('[FRONT][service] ERROR:', err),
      })
    );
  }

  // 🔹 Subir archivo
  upload(file: File): Observable<UploadResp> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<UploadResp>(`${this.base}/files`, form).pipe(
      tap({
        next: res => console.log('[FRONT][upload] OK:', res),
        error: err => console.error('[FRONT][upload] ERROR:', err),
      })
    );
  }

  // 🔹 Hacer preguntas sobre un documento
  ask(docId: string, question: string, opts?: ChatOptions): Observable<AskResp> {
    return this.http.post<AskResp>(`${this.base}/files/${docId}/ask`, { question, ...opts }).pipe(
      tap({
        next: res => console.log('[FRONT][ask] OK:', res),
        error: err => console.error('[FRONT][ask] ERROR:', err),
      })
    );
  }
}
