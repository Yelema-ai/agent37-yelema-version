import {
  Calculator,
  Compass,
  Handshake,
  Headset,
  Layers,
  Megaphone,
  Package,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Expert } from "@/lib/types";

// The cycle an Expert belongs to, as one word beside its name (Leslie, 30/10: « le petit mot de chaque
// expert, c'est le nom du cycle »). The back office sends the cycle's own label (« Marketing
// événementiel »): it is read to one of the seven cycles Yelema sells, in the order of its offer,
// matched most specific first. Djénéba heads every cycle: « Direction ». Any other cycle keeps its
// label and comes after them, with a neutral stack.
const CYCLES: { re: RegExp; name: string; icon: LucideIcon }[] = [
  { re: /invest|portefeuille/, name: "Investissement", icon: TrendingUp },
  { re: /client|fid[eé]lisation/, name: "Service client", icon: Headset },
  { re: /commercial|vente/, name: "Commercial", icon: Handshake },
  { re: /marketing|communication/, name: "Marketing", icon: Megaphone },
  { re: /\brh\b|talent|ressources humaines/, name: "RH", icon: Users },
  { re: /financ|compta/, name: "Finance", icon: Calculator },
  { re: /op[eé]ration|logistique|achat|stock/, name: "Opérations", icon: Package },
];
const ORDER = ["Commercial", "Marketing", "RH", "Finance", "Service client", "Investissement", "Opérations"];

export const isDjeneba = (e: { catalogueKey?: string | null; profileId: string }) =>
  (e.catalogueKey ?? e.profileId).toLowerCase().includes("djeneba");

/** One of the seven cycles for a back-office label, or the label itself. */
export function cycleKind(label: string): { name: string; icon: LucideIcon; rank: number } {
  const l = label.toLowerCase();
  const k = CYCLES.find((c) => c.re.test(l));
  return k ? { name: k.name, icon: k.icon, rank: ORDER.indexOf(k.name) } : { name: label, icon: Layers, rank: ORDER.length };
}

/** « Direction » for Djénéba, the cycle's name for the others, nothing when the back office says none. */
export function expertCycle(e: Pick<Expert, "profileId" | "catalogueKey" | "cycle">): { name: string; icon: LucideIcon } | null {
  if (isDjeneba(e)) return { name: "Direction", icon: Compass };
  return e.cycle ? cycleKind(e.cycle.label) : null;
}
