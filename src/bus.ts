import { randomUUID } from "node:crypto";
import { db, eventLog } from "../harness/db";
import type { AgentEvent, EventInput, Emit } from "@shared/events";


/**
 * Tiny in-memory event bus
 * The harness emits events here
 * The WebSocket layer subscribes and forwards them to every connected inspector.
 * 
 * We keep a short ring buffer so a browser that connects late still sees the timeline so far.
 */

/**
 * 02 DURABLE EXECUTION
 * The harness event bus now has two jobs
 *  1. DURABLY persist every event to Postgres (so timeline survives the crash)
 *  2. broadcasts it live to the inspector.
 * 
 * `emit` is async now, we write to the database before we hand the event out.
 */


type Listener = ( event: AgentEvent ) => void;
const listeners = new Set<Listener>();
// 01
// export class EventBus {
//     private listeners = new Set<Listener>();
//     private buffer: AgentEvent[] = [];
//     private readonly max = 1000;

//     emit(input: EventInput): AgentEvent {
//         const event: AgentEvent = { ...input, id: randomUUID(), ts: Date.now() };
//         this.buffer.push(event);
//         if (this.buffer.length > this.max) this.buffer.shift();
//         for (const listener of this.listeners) listener(event);
//         return event;
//     }

//     subscribe(listener: Listener): () => void {
//         this.listeners.add(listener);
//         return () => this.listeners.delete(listener);
//     }

//     history(): AgentEvent[] {
//         return [...this.buffer];
//     }
// }

// // Hand the harness code a plain emit(...) function bound to this bus
// export function createEmitter(bus: EventBus): Emit {
//     return (input) => {
//         bus.emit(input);
//     }
// }

export function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export async function emit(input: EventInput): Promise<void> {
    const event: AgentEvent = { ...input, id: randomUUID(), ts: Date.now() };
    await db.insert(eventLog).values({ data: event }); // durabled, ordered by `seq`
    for (const listener of listeners) listener(event); // live
}

// full timeline so far, in order, reads back from Postgres on every connect
export async function history(): Promise<AgentEvent[]> {
    const rows = await db.select().from(eventLog).orderBy(eventLog.seq);
    return rows.map((row) => row.data)
}
