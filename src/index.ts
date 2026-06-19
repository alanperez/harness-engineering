import { config } from "dotenv";
config ({ path: ".dev.vars" });

import express from "express";
import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
const app = express();
const PORT = 3000;

app.get("/health", (_req, res) => {
    res.json({ ok: true })
});

app.listen(PORT, () => {
    console.log(`Listening to port ${PORT}`)
})

