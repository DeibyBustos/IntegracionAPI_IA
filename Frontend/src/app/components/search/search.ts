import { Component, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { NgIf, NgFor } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MarkdownComponent } from 'ngx-markdown'; 


import { ChatService, ChatResponse } from '../../services/chatService';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, NgIf, NgFor, HttpClientModule, MarkdownComponent],
  templateUrl: './search.html',
  styleUrls: ['./search.css'],
})
export class SearchComponent {
  
  messageCtrl = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  
  loading = signal(false);
  reply   = signal<string | null>(null);
  error   = signal<string | null>(null);

  
  mode    = signal<'general' | 'doc'>('general');
  docId   = signal<string | null>(null);
  docName = signal<string | null>(null);
  context = signal<string[]>([]);

  constructor(private api: ChatService) {}

  onMode(m: 'general' | 'doc') {
    this.mode.set(m);
    this.reply.set(null);
    this.context.set([]);
  }

  
  onFile(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) return;

    this.loading.set(true);
    this.api.upload(f).subscribe({
      next: (r) => {
        this.docId.set(r.docId);
        this.docName.set(r.name);
        this.reply.set(null);
        this.context.set([]);
        console.log('[FRONT] upload OK:', r);
      },
      error: (e) => {
        console.error('[FRONT] upload ERR:', e);
        this.error.set(e instanceof Error ? e.message : 'Error subiendo archivo');
      },
      complete: () => this.loading.set(false),
    });
  }

  
  send() {
    this.error.set(null);
    this.reply.set(null);
    this.context.set([]);

    const q = this.messageCtrl.value.trim();
    if (!q) return;

    console.group('%c[FRONT] Envío', 'color:#2563eb;font-weight:700;');
    console.log('modo:', this.mode());
    console.log('payload:', { q, docId: this.docId() });

    this.loading.set(true);
    this.messageCtrl.disable();

    if (this.mode() === 'doc' && this.docId()) {
      
      this.api.ask(this.docId()!, q, { temperature: 0.2, max_tokens: 350 }).subscribe({
        next: (r) => {
          this.reply.set(r.answer ?? '(sin respuesta)');
          this.context.set(r.contextUsed ?? []);
          this.messageCtrl.setValue('');
          console.log('respuesta [ASK]:', r);
        },
        error: (e: unknown) => {
          console.error('error [ASK]:', e);
          this.error.set(e instanceof Error ? e.message : 'Error en la petición');
        },
        complete: () => {
          console.groupEnd();
          this.loading.set(false);
          this.messageCtrl.enable();
        },
      });
    } else {
      
      this.api.chat(q, { system: 'Eres un asistente útil en español', temperature: 0.2, max_tokens: 300 }).subscribe({
        next: (r: ChatResponse) => {
          this.reply.set(r.output ?? '(sin respuesta)');
          this.context.set([]);
          this.messageCtrl.setValue('');
          console.log('respuesta [CHAT]:', r);
        },
        error: (e: unknown) => {
          console.error('error [CHAT]:', e);
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
}
