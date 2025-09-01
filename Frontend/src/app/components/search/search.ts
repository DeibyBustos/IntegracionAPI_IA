import { Component, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatResponse } from '../../services/chatService'; // <-- nombre estilo Angular

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, NgIf, HttpClientModule], // <-- FormsModule agregado
  templateUrl: './search.html',
  styleUrls: ['./search.css'],
})
export class SearchComponent {
  messageCtrl = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  loading = signal(false);
  reply = signal<string | null>(null);
  error = signal<string | null>(null);

  constructor(private api: ChatService) {}

  send() {
    this.error.set(null);
    this.reply.set(null);

    const message = this.messageCtrl.value.trim();
    console.log('[FRONT] valor input:', message);
    if (!message) return;

    const t0 = Date.now();
    console.group('%c[FRONT] POST /api/chat', 'color:#2563eb;font-weight:700;');
    console.log('→ payload:', { message });

    this.loading.set(true);
    this.messageCtrl.disable(); // mejor manejar disabled desde TS (evita changed-after-checked)

    this.api
      .chat(message, { system: 'Eres un asistente útil en español', temperature: 0.2, max_tokens: 300 })
      .subscribe({
        next: (res: ChatResponse) => {                      // <-- tipado
          console.log('← respuesta back:', res);
          console.log('⏱️ duración(ms):', Date.now() - t0);
          this.reply.set(res.output ?? '(sin respuesta)');
          this.messageCtrl.setValue('');
        },
        error: (e: unknown) => {
          console.error('✖ error back:', e);
          this.error.set(e instanceof Error ? e.message : 'Error en la petición');
        },
        complete: () => {
          console.groupEnd();
          this.loading.set(false);
          this.messageCtrl.enable();
        },
      });
  }
}
