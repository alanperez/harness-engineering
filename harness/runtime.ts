import { randomUUID } from "node:crypto";
import { EventType, type Emit } from "@shared/events";

import {streamText} from "ai"; // goes to our llm provider with our messages and stream the response back, going stream to stream in the ui token by token
import type { ModelMessage } from "ai";
import { model } from "./model";
import {tools} from './tools';
import { SYSTEM_PROMPT } from "./system-prompt";

// Safety cap so a confused model can't loop forever (you can think of a step as a turn or a loop)
const MAX_STEPS = 10;

// THE BRITTLE/BAD AGENT
// This is a script with an LLM in the middle. It works in a demo and dies in production multiiple ways:
//
// - the `messages` array lives in memory -> crashes which is total loss
// - tools run with no mediation -> `sendReply` just fires
// history only grows -> context bloat
// one agent does everything -> no specialization


export async function runAgent(opts: { input: string; emit: Emit }): Promise<void> {
    const { input, emit } = opts;
    const workflowId = randomUUID();

    emit({ type: EventType.WorkflowStarted, workflowId, input});

    // Don't need to use the message array anymore, best to manage your own history
    const messages: ModelMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: input }
    ];

    let step = 0;
    while (step < MAX_STEPS) {
        // dont have to await since we are streaming it as itcomes in
        const result = streamText({ model, messages, tools });  // calling the LLM
        
        // handling the streaming
        for await ( const part of result.fullStream) {
            // we want to detect which type of part it is when the openai api starts streaming, it starts sending off different types of chunks
            // each chunk is a different type like a text delta (token), tool call, results, error, etcc.
            // we want to handle each one of those in order to emit a specific event for our ui to show our user.
            // million diff ways to do implement, doing it this way for this project.
            switch(part.type) {
                case 'text-delta':
                    // websocket, forwards the stream to a node base stream and we're just converting it into a websocket stream (transport layer)
                    emit({ type: EventType.ModelDelta, workflowId, text: part.text })
                    break;
                case  'tool-call':
                    emit({
                        type: EventType.ToolRequested,
                        workflowId,
                        toolCallId: part.toolCallId,
                        name: part.toolName,
                        args: part.input,
                    })
                    break;
                case 'tool-result':
                    emit({
                        type: EventType.ToolCompleted,
                        workflowId,
                        toolCallId: part.toolCallId,
                        result: part.output
                    })
                    break;
                case 'error':
                    emit({ type: EventType.WorkflowFailed, workflowId, error: String(part.error)})
                return;
            }
        }

        // append the models messages, including any tool results to history
        messages.push(...(await result.response).messages);

        // No more tool calls meansthe model answered, so we're done
        const toolCalls = await result.toolCalls;
        if (toolCalls.length === 0) {
            const text = await result.text;
            emit({ type: EventType.ModelCompleted, workflowId, text });
            emit({ type: EventType.WorkflowCompleted, workflowId, output: text});
            return; 
        }

        step++;
    }

    // emit({
    //     type: EventType.Log,
    //     workflowId,
    //     level: "warn",
    //     message:
    //         "No agent yet."
    // });

    // emit({ type: EventType.WorkflowCompleted, workflowId, output: "(no agent implemented yet)" });

    emit({
        type: EventType.WorkflowFailed,
        workflowId,
        error: `Hit the ${MAX_STEPS} step limit without finishing.`
    });
}