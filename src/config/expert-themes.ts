// The themes at the top of Recruter, in this order, and who is in each (catalogue key or first
// name). A stopgap, like the hover videos: the back office already pilots this through its
// catalogue (`categories` in order, and a `category` on each expert), and the gallery follows it as
// soon as every expert has one. Until then, this list. Delete it once the back office sends them.
export const EXPERT_THEMES: { key: string; label: string; experts: string[] }[] = [
  { key: "direction", label: "Direction", experts: ["djeneba"] },
  { key: "ventes", label: "Ventes & Relation client", experts: ["kouassi", "awa"] },
  { key: "marketing", label: "Marketing & Design", experts: ["fatima", "koffi"] },
  { key: "finance", label: "Comptabilité & Finance", experts: ["mamadou", "alioune"] },
  { key: "rh", label: "RH", experts: ["fatou", "adjoua"] },
  { key: "legal", label: "Légal", experts: ["ibrahim"] },
  { key: "operations", label: "Opérations & Données", experts: ["salif", "nadia"] },
];
