import type { Plugin } from "@opencode-ai/plugin"

export const HandoffOnCompactPlugin: Plugin = async () => {
  return {
    "experimental.session.compacting": async (_input, output) => {
      output.context.push(`## OpsTeam handoff checklist
When summarizing this session for continuation, preserve these fields if known:
- Current user goal and the exact next action.
- Active client/project/environment (OpsTeam, Ana Gaming, simplesvet, personal, etc.).
- Current primary agent and any delegated agents/subagents used.
- Files created or modified, with why each matters.
- Commands run and their pass/fail result; include only non-secret outputs.
- Open todos, blockers, assumptions, and unresolved questions.
- Safety context for AWS/Kubernetes/Terraform: profile, region, context, namespace, workspace, and whether the last action was read-only.
- Verification still needed before declaring done.

Never include secret values. Refer to secrets only by store/name.`)
    },
  }
}
