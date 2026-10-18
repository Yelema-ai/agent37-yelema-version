import { forgetPrincipal } from "@/lib/session";
import { pinnedWorkspaceId } from "@/lib/tenant";

// The menu's logo comes from `me`, kept a while per session: after the logo changed, the next page
// reads it again instead of showing the old one.
export async function logoChanged<T>(token: string, answer: T): Promise<T> {
  const workspace = await pinnedWorkspaceId();
  if (workspace) forgetPrincipal(workspace, token);
  return answer;
}
