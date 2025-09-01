import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export type ChatOptions = { system?: string; max_tokens?: number; temperature?: number; };
export type ChatResponse = { ok: boolean; output: string };

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
}
