import { Server, routePartykitRequest, type Connection, type WSMessage } from 'partyserver';

/**
 * Live cursors for the home screen, as a Cloudflare Worker with one Durable Object per room
 * (PartyServer). Every visitor joins the "home" room; each browser sends its pointer position as
 * a fraction of the window (0..1) and the room relays it to the others. Nothing is stored and
 * nothing identifies a visitor: only a random connection id.
 *
 * Deploy: `npx wrangler login`, then `npx wrangler deploy` (see wrangler.jsonc). Put the host it
 * prints in NEXT_PUBLIC_PARTYKIT_HOST.
 */
const MAX_VISITORS = 30;
const MIN_GAP_MS = 60; // faster updates from one visitor are dropped

type Spot = { x: number; y: number; at: number };
type Env = { Main: DurableObjectNamespace<Cursors> };

const unit = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : null);

export class Cursors extends Server<Env> {
  // where each connected visitor's pointer is (lives only as long as the room is awake)
  private spots = new Map<string, Spot>();

  onConnect(conn: Connection) {
    const others = [...this.getConnections()].filter((c) => c.id !== conn.id);
    if (others.length >= MAX_VISITORS) {
      // the room is full: this visitor simply sees no cursors
      conn.close(4000, 'full');
      return;
    }
    const peers = [...this.spots].filter(([id]) => id !== conn.id).map(([id, s]) => ({ id, x: s.x, y: s.y }));
    conn.send(JSON.stringify({ t: 'hello', id: conn.id, peers }));
  }

  onMessage(sender: Connection, message: WSMessage) {
    if (typeof message !== 'string' || message.length > 100) return;
    let data: { x?: unknown; y?: unknown; gone?: unknown };
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }
    // the pointer left the window (or the page went into first person)
    if (data.gone === true) {
      if (this.spots.delete(sender.id)) this.broadcast(JSON.stringify({ t: 'bye', id: sender.id }), [sender.id]);
      return;
    }
    const x = unit(data.x);
    const y = unit(data.y);
    if (x === null || y === null) return;
    const now = Date.now();
    const before = this.spots.get(sender.id);
    if (before && now - before.at < MIN_GAP_MS) return;
    this.spots.set(sender.id, { x, y, at: now });
    this.broadcast(JSON.stringify({ t: 'm', id: sender.id, x, y }), [sender.id]);
  }

  onClose(conn: Connection) {
    this.spots.delete(conn.id);
    this.broadcast(JSON.stringify({ t: 'bye', id: conn.id }), [conn.id]);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (await routePartykitRequest(request, env)) || new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
