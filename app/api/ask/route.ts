import { NextRequest } from 'next/server';
import { ASSISTANT_INSTRUCTIONS } from '@/lib/assistantFacts';

/**
 * The developer terminal's AI assistant. Free tier of Google's Gemini API (Interactions API).
 * The key lives only on the server: set GEMINI_API_KEY in .env.local and in Vercel.
 * GEMINI_MODEL is optional (defaults to the free Gemini 3.5 Flash-Lite).
 *
 * Body: { messages: [{ role: 'user' | 'model', text: string }] } (the last one is the question).
 * Reply: the answer as a plain-text stream.
 */

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

const MAX_TURNS = 8; // conversation memory sent along (user + model messages)
const MAX_CHARS = 500; // per message
const PER_MINUTE = 8; // per visitor
const PER_DAY = 80; // per visitor

// Best-effort limits per server instance (resets when the instance restarts): enough to stop
// one visitor from burning through the free quota.
const hits = new Map<string, number[]>();
function allowed(ip: string): boolean {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < day);
  const lastMinute = recent.filter((t) => now - t < 60_000).length;
  if (lastMinute >= PER_MINUTE || recent.length >= PER_DAY) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // never let the table grow without bound
  return true;
}

const text = (body: string, status = 200) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });

type Turn = { role: 'user' | 'model'; text: string };

function parseTurns(body: unknown): Turn[] | null {
  const list = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(list) || list.length === 0) return null;
  const turns: Turn[] = [];
  for (const m of list.slice(-MAX_TURNS)) {
    const role = (m as Turn)?.role;
    const value = (m as Turn)?.text;
    if ((role !== 'user' && role !== 'model') || typeof value !== 'string' || !value.trim()) return null;
    turns.push({ role, text: value.slice(0, MAX_CHARS) });
  }
  if (turns[turns.length - 1].role !== 'user') return null;
  // the conversation has to start with the visitor
  while (turns.length && turns[0].role !== 'user') turns.shift();
  return turns;
}

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return text("The assistant isn't set up yet.", 503);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return text('Send a question.', 400);
  }
  const turns = parseTurns(body);
  if (!turns) return text('Send a question.', 400);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'anon';
  if (!allowed(ip)) return text("You've asked a lot in a short time. Try again in a minute.", 429);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  let upstream: Response;
  try {
    upstream = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        system_instruction: ASSISTANT_INSTRUCTIONS,
        input: turns.map((t) => ({
          type: t.role === 'user' ? 'user_input' : 'model_output',
          content: [{ type: 'text', text: t.text }],
        })),
        generation_config: { max_output_tokens: 400, thinking_level: 'minimal' },
        store: false,
        stream: true,
      }),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    return text("The assistant couldn't be reached. Try again in a moment.", 502);
  }

  if (!upstream.ok || !upstream.body) {
    clearTimeout(timer);
    console.error('ask: Gemini returned', upstream.status, (await upstream.text().catch(() => '')).slice(0, 300));
    const busy = upstream.status === 429;
    return text(busy ? 'The assistant is busy right now (free quota reached). Try again later.' : "The assistant couldn't answer that. Try again.", busy ? 429 : 502);
  }

  // Relay only the text deltas of the server-sent events as a plain-text stream.
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(out) {
      let buffer = '';
      let wrote = false;
      const handle = (data: string) => {
        if (!data || data === '[DONE]') return;
        let event: { event_type?: string; delta?: { type?: string; text?: string }; error?: { message?: string } };
        try {
          event = JSON.parse(data);
        } catch {
          return;
        }
        if (event.event_type === 'step.delta' && event.delta?.type === 'text' && event.delta.text) {
          out.enqueue(encoder.encode(event.delta.text));
          wrote = true;
        } else if (event.event_type === 'error') {
          console.error('ask: stream error', event.error?.message);
          out.enqueue(encoder.encode(wrote ? ' …(cut off)' : "The assistant couldn't answer that. Try again."));
          wrote = true;
        }
      };
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
          let cut = buffer.indexOf('\n\n');
          while (cut !== -1) {
            const chunk = buffer.slice(0, cut);
            buffer = buffer.slice(cut + 2);
            const data = chunk
              .split('\n')
              .filter((line) => line.startsWith('data:'))
              .map((line) => line.slice(5).trim())
              .join('');
            handle(data);
            cut = buffer.indexOf('\n\n');
          }
        }
        if (!wrote) out.enqueue(encoder.encode("I don't have an answer for that. Try asking another way."));
      } catch {
        if (!wrote) out.enqueue(encoder.encode("The assistant couldn't answer that. Try again."));
      } finally {
        clearTimeout(timer);
        out.close();
      }
    },
    cancel() {
      clearTimeout(timer);
      controller.abort();
    },
  });

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
