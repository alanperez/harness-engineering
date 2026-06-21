// The contract between the harness (server) and the inspector (browser)

/**
 * Everything the harness does becomes an event on this stream.
 * The event log is the system, the UI never talks to the model or tools directly
 * 
 * The UI never talks tot he model or the tools directly. It only ever renders this stream
 */


export enum EventType {
    // workflow ( one agent run) begins /ends
    WorkflowStarted = "workflow.started",
    WorkflowCompleted = "workflow.completed",
    WorkflowFailed = "workflow.failed",

    // Model thinking out loud ( streamed token by token )
    ModelDelta = "model.delta",
    ModelCompleted = "model.completed",

    // tool call and its outcome
    ToolRequested = "tool.requested",
    ToolCompleted = "tool.completed",
    ToolFailed = "tool.failed",

    // Memory: old turns compacted into a running summary
    MemoryCompacted = "memory.compacted",
    
    // Orchestration: control handed from one agent to another
    AgentHandoff = "agent.handoff",

    // Supervision: the plan and each parallel sub agent
    PlanCreated = "plan.created",
    SubagentStarted = "subagent.started",
    SubagentCompleted = "subagent.completed",
    SubagentFailed = "subagent.failed",

    // Human in the loop: privileged action paused for approval
    ApprovalRequested = "approval.requested",
    ApprovalResolved = "approval.resolved",
    
    // Free form harness logging
    Log = "log",
}



export type EventInput = 
    | { type: EventType.WorkflowStarted; workflowId: string; input: string }
    | { type: EventType.WorkflowCompleted; workflowId: string; output: string }
    | { type: EventType.WorkflowFailed; workflowId: string; error: string }
    | { type: EventType.ModelDelta; workflowId: string; text: string}
    | { type: EventType.ModelCompleted; workflowId: string; text: string }
    | { type: EventType.ToolRequested; workflowId: string; toolCallId: string; name: string; args: unknown }
    | { type: EventType.ToolCompleted; workflowId: string; toolCallId: string; result: unknown }
    | { type: EventType.ToolFailed; workflowId: string; toolCallId: string; error: string }
    | { type: EventType.MemoryCompacted; workflowId: string; summarizedTurns: number; contextTokens: number; summary: string }
    | { type: EventType.AgentHandoff; workflowId: string; from: string; to: string; reason: string }
    | { type: EventType.PlanCreated; workflowId: string; steps: { id: string; agent: string; objective: string }[] }
    | { type: EventType.SubagentStarted; workflowId: string; stepId: string; agent: string; objective: string }
    | { type: EventType.SubagentCompleted; workflowId: string; stepId: string; agent: string; findings: string }
    | { type: EventType.SubagentFailed; workflowId: string; stepId: string; agent: string; error: string }
    | { type: EventType.ApprovalRequested; workflowId: string; toolCallId: string; action: string; args: unknown }
    | { type: EventType.ApprovalResolved; workflowId: string; toolCallId: string; approved: boolean; }
    | { type: EventType.Log; workflowId?: string; level: "info" | "warn" | "error"; message: string }

// Harness stamps every event with an id + timestamp when it emits
export type AgentEvent = EventInput & { id: string; ts: number };

// what harness code calls to push an event onto the stream
export type Emit = (event: EventInput) => void;

// Messages the browser sends back to the server ( over the same socket )
// `mode` picks the run time: the single agent loop ( default ) or the supervisor
export type ClientMessage = {
    type: "submit_task";
    input: string;
    mode?: "default" | "supervised"
};