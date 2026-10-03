---
description: Instruct model on how and when to offload tasks to specialized sub-agents
---

# Sub-Agent Offloading Policy

When facing multi-step, complex, or distinct specialized workloads, you SHOULD delegate tasks using the `task` tool rather than doing everything serially in the main turn.

## Available Specialized Sub-Agents

1. **`architect`**:
   - Use for high-level system design, complex refactoring plans, edge-case evaluations, and deep code reviews.
   - Automatically routed to high-reasoning models via the Jev judge.

2. **`coder`**:
   - Use for targeted implementation, mechanical bug fixes, and edits following established repo conventions.
   - Automatically routed to fast, efficient coding models.

3. **`researcher`**:
   - Use for read-only codebase exploration, grepping/globbing across unfamiliar directories, and finding declarations.
   - Automatically routed to fast, cheap exploration models.

## How to Delegate

Invoke the `task` tool with `context` and `tasks[]`:
```json
{
  "context": "High-level goal and interface contracts",
  "tasks": [
    {
      "agent": "coder",
      "task": "Implement the endpoint in ...",
      "solutionSpace": "one fix: follow existing pattern"
    }
  ]
}
```

The underlying router dynamically uses the **Jev System One AI Judge** to select the best model (OpenRouter or native) for the job.
