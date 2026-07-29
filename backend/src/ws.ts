/**
 * WSS async channel — owner-scoped push of platform events to connected
 * clients (mobile app, web). Endpoint: /api/v1/ws (?token=<jwt> when auth is
 * on; anonymous in dev mode). Heartbeat pings keep proxies from idling out.
 *
 * Message envelope: { type, action, at, data } — e.g.
 *   { type: 'document', action: 'SIGNED', data: { id, code, status } }
 *   { type: 'batch',    action: 'BATCH_DISPATCHED', data: { id, name } }
 */
import type { WebSocket } from 'ws';

interface Client {
  socket: WebSocket;
  ownerId: string;
}

const clients = new Set<Client>();

export function addClient(socket: WebSocket, ownerId: string): void {
  const client: Client = { socket, ownerId };
  clients.add(client);
  socket.on('close', () => clients.delete(client));
  socket.send(
    JSON.stringify({ type: 'hello', action: 'CONNECTED', at: new Date().toISOString(), data: { ownerId } }),
  );
}

/** Push an event to every session of an owner (or to everyone with ownerId=null). */
export function push(
  ownerId: string | null,
  event: { type: string; action: string; data: Record<string, unknown> },
): void {
  const msg = JSON.stringify({ ...event, at: new Date().toISOString() });
  for (const c of clients) {
    if ((ownerId === null || c.ownerId === ownerId) && c.socket.readyState === c.socket.OPEN) {
      c.socket.send(msg);
    }
  }
}

export function connectionCount(): number {
  return clients.size;
}

// Heartbeat: close dead sockets, keep NATs/proxies warm.
setInterval(() => {
  for (const c of clients) {
    if (c.socket.readyState === c.socket.OPEN) c.socket.ping();
  }
}, 30_000).unref();
