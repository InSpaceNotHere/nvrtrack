import type { Organization } from "@/types/command-center";

export type FirstRunState = "schema_missing" | "create_workspace" | "ready";

export function resolveFirstRunState(input: {
  schemaReady: boolean;
  organization: Organization | null;
}): FirstRunState {
  if (!input.schemaReady) {
    return "schema_missing";
  }
  if (!input.organization) {
    return "create_workspace";
  }
  return "ready";
}
