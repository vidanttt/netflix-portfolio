import type * as Party from 'partykit/server';

/**
 * Live cursors for the home screen (PartyKit). Every visitor joins one room; each browser
 * sends its pointer position as a fraction of the window (0..1) and the room relays it to the
 * others. Nothing is stored and nothing identifies a visitor: only a random connection id.
 *
 * Deploy with `npx partykit deploy` and put the host it prints in NEXT_PUBLIC_PARTYKIT_HOST.
 */
const MAX_VISITORS = 30;
const MIN_GAP_MS = 30; // faster updates from one visitor are dropped

type Spot = { x: number; y: number; at: number };

const unit = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : null);

export default class Cursors implements Party.Server {
  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection<Spot>) {
    const others = [...this.room.getConnections<Spot>()].filter((c) => c.id !== conn.id);
    if (others.length >= MAX_VISITORS) {
      // the room is full: this visitor simply sees no cursors
      conn.close(4000, 'full');
      return;
    }
    const peers = others.filter((c) => c.state).map((c) => ({ id: c.id, x: c.state!.x, y: c.state!.y }));
    conn.send(JSON.stringify({ t: 'hello', id: conn.id, peers }));
  }

  onMessage(message: string | ArrayBuffer | ArrayBufferView, sender: Party.Connection<Spot>) {
    if (typeof message !== 'string' || message.length > 100) return;
    let data: { x?: unknown; y?: unknown; gone?: unknown };
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }
    // the pointer left the window (or the page went into first person)
    if (data.gone === true) {
      sender.setState(null);
      this.room.broadcast(JSON.stringify({ t: 'bye', id: sender.id }), [sender.id]);
      return;
    }
    const x = unit(data.x);
    const y = unit(data.y);
    if (x === null || y === null) return;
    const now = Date.now();
    if (sender.state && now - sender.state.at < MIN_GAP_MS) return;
    sender.setState({ x, y, at: now });
    this.room.broadcast(JSON.stringify({ t: 'm', id: sender.id, x, y }), [sender.id]);
  }

  onClose(conn: Party.Connection) {
    this.room.broadcast(JSON.stringify({ t: 'bye', id: conn.id }), [conn.id]);
  }
}

Cursors satisfies Party.Worker;
