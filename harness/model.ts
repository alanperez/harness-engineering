import { openai } from "@ai-sdk/openai";

// Provider reads OPEN API KEY from environment at request time, server loads it from .dev.vars on startup
export const model = openai("gpt-5-mini");