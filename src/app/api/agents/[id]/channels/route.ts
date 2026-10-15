import { requireAgentAccess } from "@/lib/auth";
import { handleError, json } from "@/lib/http";
import { listPlatforms } from "@/lib/hermes-messaging";
import { isConnectableChannel, neutralizeHarnessName, sortChannels } from "@/lib/channels";
import type { ChannelsResponse, MessagingPlatform } from "@/lib/channels";
import { currentInstance } from "@/lib/session";

// Slow by nature: this is one exec into the instance, and a sleeping agent is woken first.
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

// Every messaging channel this agent supports, with its live state and the credentials it wants.
// Read-only, so any workspace member can see what the agent is connected to.
export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await requireAgentAccess(id);

    const [platforms, instance] = await Promise.all([listPlatforms(id), currentInstance().catch(() => null)]);
    const response: ChannelsResponse = {
      channels: sortChannels(platforms).filter(isConnectableChannel).map(rebrand),
      // The address to give Microsoft: the back office opened it on this instance (the member's own).
      teams_endpoint: instance?.id === id ? (instance.channels?.teams?.endpoint ?? null) : null,
    };
    return json(response);
  } catch (e) {
    return handleError(e);
  }
}

// The harness describes its channels in English; the featured ones get a French line.
const CHANNEL_DESCRIPTIONS: Record<string, string> = {
  teams: "Écrivez à vos experts depuis Microsoft Teams, en message privé ou dans vos équipes.",
  slack: "Écrivez à vos experts depuis Slack, en message privé ou dans vos canaux.",
  discord: "Écrivez à vos experts depuis Discord, en message privé ou sur vos serveurs.",
  google_chat: "Écrivez à vos experts depuis Google Chat, en message privé ou dans vos espaces.",
};

function rebrand(channel: MessagingPlatform): MessagingPlatform {
  return {
    ...channel,
    description: CHANNEL_DESCRIPTIONS[channel.id] ?? neutralizeHarnessName(channel.description),
    env_vars: channel.env_vars.map((field) => ({
      ...field,
      description: neutralizeHarnessName(field.description),
      help: neutralizeHarnessName(field.help),
    })),
  };
}
