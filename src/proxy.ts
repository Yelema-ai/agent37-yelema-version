import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // api/composio-mcp, api/memory-mcp, api/yele-mcp and api/stt are the instances' traffic: no browser session, their own token.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/composio-mcp|api/memory-mcp|api/yele-mcp|api/stt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)",
  ],
};
