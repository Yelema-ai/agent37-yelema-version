import { redirect } from "next/navigation";

// Modèles a rejoint Intégrations. La requête suit, pour un retour d'OpenRouter lancé avant le déplacement.
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) for (const one of [v].flat()) if (one !== undefined) query.append(k, one);
  const qs = query.toString();
  redirect(`/integrations/modeles${qs ? `?${qs}` : ""}`);
}
