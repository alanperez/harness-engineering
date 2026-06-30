import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { pgTable, bigserial, jsonb } from "drizzle-orm/pg-core";
import type { AgentEvent } from "@shared/events";

// Durable Event Log Table

const connectionString = process.env.DATABASE_URL;

if(!connectionString) {
    throw new Error("DATABASE URL is not set in env var");
}

// postgres.js connection ( Neon requires SSL, carried in the URL )
// We keep the pool small, this is the durable event log, not a high traffic app database
const client = postgres(connectionString, { max: 5 });
export const db = drizzle(client);

// Initially the event stream lived in a memory array that would vanish on restart.
// Every event is a row so the inspector can replay the whole timeline. Including work that happened to before a crash.
export const eventLog = pgTable("event_log", {
    seq: bigserial("seq", { mode: "number" }).primaryKey(), // global order
    data: jsonb("data").$type<AgentEvent>().notNull(),
})

// Create table on boot. Keeps the workshop migration free, in a real app we would use Drizzle migrations instead.
export async function ensureSchema(): Promise<void> {
    await client `
        CREATE TABLE IF NOT EXISTS event_log (
            seq bigserial PRIMARY KEY,
            data jsonb NOT NULL
        )
    ;`
}