import { McpOauthReturn } from "@/components/integrations/McpOauthReturn";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

// Where an MCP server's OAuth provider sends the browser back (`redirect_uri` of every space). The
// page only relays `code`/`state` to the user's own instance through the back office, then closes.
export default async function McpOauthReturnPage({ searchParams }: Props) {
  const q = await searchParams;
  return <McpOauthReturn query={{ code: first(q.code), state: first(q.state), iss: first(q.iss), error: first(q.error) }} />;
}
