// The job sheets of the site's Experts pages (yelema.ai/experts/…), copied word for word while the
// back office's catalogue does not carry them. A sheet here wins over the catalogue's for its expert;
// the others keep the catalogue's. A stopgap: delete an entry once the catalogue serves the same.
//
// Kouassi only for now, for approval before the other eleven.

export interface ExpertSheet {
  /** « Expert IA commercial ». */
  label: string;
  tagline: string;
  intro: string;
  mission: string;
  inAction: string;
  valueAdd: string;
  daily: string[];
  skills: { name: string; summary: string }[];
  deliverables: { label: string; summary: string }[];
  templates: string[];
  routines: { label: string; when: string }[];
  approval: string[];
  needs: string[];
  terrain: string;
  payments: string[];
  tools: { group: string; items: string[] }[];
  /** Where to reach the expert, as the site lists them. */
  channels: string[];
  why: string;
}

export const EXPERT_SHEETS: Record<string, ExpertSheet> = {
  kouassi: {
    label: "Expert IA commercial",
    tagline: "Il ne laisse jamais une opportunité refroidir.",
    intro: "Un agent IA formé au métier commercial, opéré par notre équipe.",
    mission:
      "Le développement commercial de bout en bout : trouver les bons prospects, les relancer au bon moment, préparer les devis et garder le pipeline vivant, du premier message à la signature.",
    inAction:
      "Un devis envoyé il y a 5 jours reste sans réponse. Kouassi relance avec un message personnalisé, propose un appel, et prévient le commercial que le prospect a rouvert le devis deux fois. L’affaire repart.",
    valueAdd:
      "Un pipeline toujours à jour et des relances jamais oubliées : mécaniquement, plus d’affaires signées, et des commerciaux qui passent leur temps à vendre.",
    daily: [
      "Qualifie les demandes entrantes (WhatsApp, e-mail, DM) et pose les bonnes questions",
      "Relance les devis en attente avec le ton juste, sans harceler",
      "Prend les rendez-vous et prépare les fiches commerciales",
      "Signale au dirigeant les affaires chaudes et celles qui coincent",
    ],
    skills: [
      { name: "Tableau de bord commercial", summary: "Suit le pipeline, les taux de conversion et les relances, mis à jour chaque semaine. Dans Excel, Power BI ou Google Sheets." },
      { name: "Client idéal (ICP)", summary: "Définit le profil d’entreprise à cibler en priorité à partir de votre activité." },
      { name: "Prospection B2B", summary: "Trouve et qualifie des profils d’entreprises correspondant à votre cible." },
      { name: "Séquences de relance", summary: "Rédige les messages d’approche J0, J3 et J7 personnalisés sur WhatsApp, e-mail et LinkedIn." },
      { name: "Tri des demandes entrantes", summary: "Classe les messages par intention et température, répond et pousse au rendez-vous." },
      { name: "Signaux d’achat", summary: "Repère les signaux (recrutement, expansion, lancement) qui indiquent qu’un compte est prêt." },
      { name: "Scoring & suivi des leads", summary: "Note chaque piste de 0 à 100 et relance, sans laisser mourir une opportunité." },
      { name: "Pricing local (FCFA)", summary: "Recommande une grille de prix avec benchmark régional UEMOA, en FCFA et USD." },
      { name: "Playbook de vente", summary: "Construit l’argumentaire et le pitch, pour le B2B formel comme informel." },
      { name: "Analytics des ventes", summary: "Teste les messages et suit le tunnel de conversion étape par étape." },
      { name: "Négociation et remise", summary: "Cadre la remise acceptable, prépare les contreparties et tient la marge." },
    ],
    deliverables: [
      { label: "Fiche client idéal", summary: "Le profil d’entreprise à viser en premier : secteur, taille, décideur, signes qui ne trompent pas." },
      { label: "Liste de 50 comptes cibles", summary: "Chaque compte qualifié, avec le nom du décideur, le bon canal et la raison de l’appeler maintenant." },
      { label: "Séquence de relance J0, J3, J7", summary: "Les messages prêts pour WhatsApp, e-mail et LinkedIn, personnalisés compte par compte." },
      { label: "Tri quotidien des demandes entrantes", summary: "Chaque message classé chaud, tiède ou froid, avec la réponse proposée et le rendez-vous à caler." },
      { label: "Pipeline noté de 0 à 100", summary: "Chaque affaire, son montant, son étape, sa note et sa prochaine action datée." },
      { label: "Grille de prix en F CFA", summary: "Vos prix comparés à ceux de la région UEMOA, avec la marge tenue à chaque palier." },
      { label: "Playbook des 20 objections", summary: "Les objections que vous entendez le plus, la réponse à chacune et ce qu’il vaut mieux éviter." },
      { label: "Note de négociation", summary: "La remise plafond, les contreparties à demander et le point où l’on se retire." },
      { label: "Point commercial du vendredi", summary: "Les affaires gagnées, perdues et bloquées de la semaine, et les trois priorités de la suivante." },
    ],
    templates: [
      "Compte rendu de visite",
      "Dossier de soumission",
      "Fiche de conditions revendeur",
      "Fiche de risque client",
      "Plan de tournée",
      "Point commercial hebdomadaire",
      "Proposition commerciale et devis",
    ],
    routines: [
      { label: "Envoie le point de fin de journée", when: "Chaque jour ouvré" },
      { label: "Envoie le rapport d’activité de la semaine", when: "Chaque semaine" },
      { label: "Relance un livrable remis resté sans retour depuis trois jours", when: "Deux fois par semaine" },
      { label: "Revient sur une question restée sans réponse depuis 48 heures", when: "Chaque jour ouvré" },
      { label: "Vérifie que chacun de ses accès répond", when: "Chaque jour" },
    ],
    approval: ["Envoi d’un devis ou d’un prix", "Remise au-delà du barème", "Engagement de délai auprès d’un client", "Prise de contact avec un compte stratégique"],
    needs: [
      "Catalogue et grille tarifaire",
      "Liste des clients et des prospects",
      "Historique des devis émis",
      "Conditions de remise autorisées",
      "Canaux par lesquels arrivent les demandes",
    ],
    terrain:
      "Il vend sur les canaux d’ici : la relation se noue sur WhatsApp, le devis se règle souvent en mobile money, et un grand compte impose son propre circuit de bon de commande. Il sait à quel moment un dossier se règle en espèces, combien de relances tient un acheteur avant de se fermer, et quels circuits d’achat exigent une commande signée.",
    payments: ["Orange Money", "MTN MoMo", "Wave", "Moov Money", "GIM-UEMOA"],
    tools: [
      { group: "Bureautique", items: ["Gmail", "Outlook", "PowerPoint", "Excel", "Google Sheets"] },
      { group: "CRM et prospection", items: ["HubSpot", "Salesforce", "Pipedrive", "Odoo", "LinkedIn", "Calendly"] },
      { group: "Données et tableaux de bord", items: ["Power BI"] },
      { group: "Outils d’ici", items: ["WhatsApp", "Wave", "Orange Money", "MTN MoMo", "Djamo"] },
    ],
    channels: ["Telegram", "Slack", "Teams", "E-mail", "Espace web"],
    why: "Une affaire se gagne au bon suivi, au bon moment. Kouassi tient ce suivi, pour que votre équipe garde son temps pour la vente.",
  },
};
