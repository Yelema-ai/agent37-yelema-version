import { backoffice } from "@/lib/backoffice";
import { loadCatalogue, matchCatalogue } from "@/lib/catalogue";
import { handleError, json } from "@/lib/http";
import type { OrgChart } from "@/lib/memory";
import { billingToken as adminToken } from "../billing/_admin";
import { noStore } from "../mail/_session";

// `GET /api/org` — for the workspace's admins: units, where each member and expert sits, and the
// exceptions. An expert is named as its member renamed it, else as the catalogue does.
export async function GET() {
  try {
    const [org, catalogue] = await Promise.all([backoffice.org(await adminToken()), loadCatalogue()]);
    const chart: OrgChart = {
      ...org,
      documents: org.documents ?? 0,
      units: org.units.map((u) => ({ ...u, documents: u.documents ?? 0 })),
      members: org.members.map((m) => ({
        ...m,
        units: m.units ?? [],
        experts: (m.experts ?? []).map((e) => ({ profile: e.profile, key: e.key, label: e.name ?? matchCatalogue(catalogue.experts, e.profile)?.name ?? e.profile })),
      })),
    };
    return noStore(json(chart));
  } catch (e) {
    return handleError(e);
  }
}
