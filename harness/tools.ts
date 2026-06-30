// The tools the agent can call
// A fake but realistic support triage tool.
// This will run with no mediation, meaning it'll email the customer the instant the model asks, No Sandbox, policy or approval which is a bad idea.

import {tool} from "ai";
import { z } from "zod";

// basic knowledge base that the agent can reference for some of the tools it has.
// Corpus of information, corpus of information, think of it as a wiki that an agent can use as to reference information. Instead of stuffing it all into context that will eat up all your tokens in every turn. You can have the knowledge base be external and then the agent can query that knowledge base through any mechanism you want, rag or a classic search or w.e you want. 
// Run book for the agent to follow in certain situations, this is where evals would come in since you would need evals for this context in order to measure its effects on the outputs of the agents that are using them.
const KNOWLEDGE_BASE: Record<string, string> = {
    billing: "Double charges are duplicate authorization that drops off in 3-5 days. If it already settled, refund immediately",
    refund: "Refunds post in 5-10 business days. Pro accounts can be expedited.",
    export: "The Safari export failure is a known bug (TICKET-4412). Workaround: use Chrome or the CSV export.",
    pricing: "Team plans are $20/seat/mo with a volume discount at 25+ seats. For 50+ seats, send the pricing PDF.",
};


// Object of tools that the agent will have access too
// Removing execute function, the harness runs each tool itself, so every call can be wrapped in its own DBOS step and run exactly once.
export const tools = {
    searchKnowledgeBase: tool({
        description: "Search the support knowledge base for relevant articles.",
        inputSchema: z.object({
            // telling the agent if it wants to use this tool, you must pass in a query field in this object. We describe the agent what type it is and what its for (using describe)
            // Helpful to add description to the input schema
            // if the goal is to make sure that the agent knows what that field is in the inputSchema, then yeah you def want to put a description in there. It can help improve the outputs of your agent.
            query: z.string().describe("what to look up"),
        }),
    }),

    classifyItem: tool({
        description: "Classify a work item into a category.",
        inputSchema: z.object({
            itemId: z.string(),
            category: z.enum(["billing", "technical", "sales", "other"])
        }),
    }),

    draftReply: tool({
        description: "Write a draft reply for a work item. Does not send anything.",
        inputSchema: z.object({
            itemId: z.string(),
            message: z.string()
        }),
    }),

    sendReply: tool({
        description: "Send the drafted reply to the customer. This really emails them.",
        inputSchema: z.object({
            itemId: z.string(),
            draftId: z.string(),
        }),
    })
}

// harness owned executor. No sandbox or approval gate yet
// each call runs inside DBOS step
// finished side effect susch `sendReply` is checkpointed and never repeated after a crash
export async function runTool(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
    switch(name) {
        case "searchKnowledgeBase": {
            const query = String(args.query ?? "").toLowerCase();
            const hits = Object.entries(KNOWLEDGE_BASE)
                .filter(([key]) => query.includes(key))
                .map(([, article]) => article);
            return { articles: hits.length ? hits: ["No exact match, use your judgement."]}
        }
        case "classifyItem":
            return { ok: true, itemId: args.itemId, category: args.category };
        case "draftReply":
            return { ok: true, draftId: `draft-${args.itemId}` };
        case "sendReply":
            return { ok: true, itemId: args.itemId, draftId: args.draftId };
        default:
            throw new Error(`unknown tool: ${name}`);
    }
}