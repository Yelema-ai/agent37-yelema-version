import type { MemberRoom } from "./types";

// Places shown to a client admin: the subscription's users and the enterprise chat's seats. Pure, so
// `node --test` runs it as is.

/** « 6 / 10 utilisateurs », or the count alone when the subscription has no cap. */
export function quotaLabel(q: MemberRoom["quota"]): string {
  const unit = (n: number) => (n > 1 ? "utilisateurs" : "utilisateur");
  return q.allowed == null ? `${q.used} ${unit(q.used)}` : `${q.used} / ${q.allowed} ${unit(q.allowed)}`;
}

/** Why an admin cannot invite right now, or null when they can. */
export function inviteBlocked(room: MemberRoom): string | null {
  if (!room.enterpriseOpen) return "L’espace entreprise n’est pas encore ouvert : contactez Yelema.";
  if (room.quota.allowed != null && room.quota.used >= room.quota.allowed) return "Tous les utilisateurs de votre abonnement sont pris : contactez Yelema pour en ajouter.";
  if (room.seats && room.seats.used >= room.seats.cap) return "Le chat d’entreprise est complet : contactez Yelema pour l’agrandir.";
  return null;
}
