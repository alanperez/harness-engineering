// This is agent is terrible, we tell it to send emails with no human in the loop.

// Not trying to create an effective agent, the main focus will be the harness.
// We just need an agent to use as a fixture to test our harness. 

// What the agent is told to do, the system prompt is part of the LLM, its foundational instruction that you as the developer who made the agent, not what the user instructs gives with a message
export const SYSTEM_PROMPT = `You are a support triage agent.

For each work item the user gives you:
1. Classify it with classifyItem.
2. Search the knowledge base with searchKnowledgeBase if it helps.
3. Draft a reply with draftReply.
4. Send the reply with sendReply.

Work through every item, then briefly summarize what you did.`;

// A sample task to try.
export const SAMPLE_TASK = `Handle these work items:
- item-1 (customer_message): "I was charged twice and need help."
- item-2 (bug_report): "The export button fails on Safari."
- item-3 (sales_request): "Can you send pricing for 50 seats?"`



