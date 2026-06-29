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
// The description is what the LLM will see to decide if it needs to call this tool.
//  You would want to put something that hints at the agent when it should use this tool or what this tool does.
// again, you would need EVALS to measure what that is

// the input schema is basically the enforce schema. When the agent calls these tools, they must provide these arguments so that way when we execute the tool on behalf of the agent, we can use the arguments that the agent passed in and our code knows that it must follow this contract s othat way we dont get random arguments we cant do anything with

export const tools = {
    searchKnowledgeBase: tool({
        description: "Search the support knowledge base for relevant articles.",
        inputSchema: z.object({
            // telling the agent if it wants to use this tool, you must pass in a query field in this object. We describe the agent what type it is and what its for (using describe)
            // Helpful to add description to the input schema
            // if the goal is to make sure that the agent knows what that field is in the inputSchema, then yeah you def want to put a description in there. It can help improve the outputs of your agent.
            query: z.string().describe("what to look up"),
        }),
        // this is the actual tool call itself, this is what happens when it gets called
        // takes in the actual object that we defined in the input schema, the output is what we're going to feedback into the LLM
        execute: async ({ query }) => {
            // basic search across our knowledge base to find some hits, an in memory basic text search.
            // wouldnt do this in production just for this project
            const hits = Object.entries(KNOWLEDGE_BASE)
                .filter(([key]) => query.toLowerCase().includes(key))
                .map(([, article]) => article);
            // if we didn't get a match, have the LLM figure it our, or instead of "use your judgement". We could prompt the user by asking them if its correct or tell the user that you dont have sufficient entries. Its basically anything you want it to be or however you want to do it based on what is being built
            return { articles: hits.length ? hits : ["No exact match, use your judgement."] };
        },
    }),

    classifyItem: tool({
        description: "Classify a work item into a category.",
        inputSchema: z.object({
            itemId: z.string(),
            category: z.enum(["billing", "technical", "sales", "other"])
        }),
        execute: async ({ itemId, category }) => ({ ok: true, itemId, category})
    }),

    draftReply: tool({
        description: "Write a draft reply for a work item. Does not send anything.",
        inputSchema: z.object({
            itemId: z.string(),
            message: z.string()
        }),
        execute: async ({ itemId }) => ({ ok: true, draftId: `draft-${itemId}`})
    }),

    sendReply: tool({
        description: "Send the drafted reply to the customer. This really emails them.",
        inputSchema: z.object({
            itemId: z.string(),
            draftId: z.string(),
        }),
        // DANGEROUS: an irreversible side effect with zero confirmation
        execute: async ({ itemId, draftId }) => ({ sent: true, itemId, draftId }),
    })
}