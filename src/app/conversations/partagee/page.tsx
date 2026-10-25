import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SharedConversation } from "@/components/chat/SharedConversation";

// A conversation a colleague shared by link: sign-in first (and back here), then read-only.
export default async function SharedConversationPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const { user } = await getSession();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/conversations/partagee?c=${c ?? ""}`)}`);
  return <SharedConversation token={c ?? ""} />;
}
