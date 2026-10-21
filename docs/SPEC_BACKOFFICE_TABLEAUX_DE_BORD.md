# Spécification Technique : Intégration Back-Office des Tableaux de Bord Métier

Ce document détaille les routes, le modèle de données et la logique de sécurité mis en place sur le frontend (`agent37-yelema-version`) pour le partage et la consultation des tableaux de bord métier des experts Yelema, afin de permettre au développeur du Back-Office d'intégrer et centraliser cette logique.

---

## 1. Contexte & Architecture actuelle

Chaque expert métier (Adjoua, Mamadou, Fatima, etc.) dispose d'un **Tableau de Bord interactif** généré à partir des données réelles de l'entreprise et publié sur un service d'hébergement (ex. Render).

Actuellement, dans le frontend / BFF :
* L'état du tableau est stocké temporairement dans le fichier d'état de l'instance de l'agent : `Livrables/{Expert}/_memoire/state/tableau-de-bord-metier.json`.
* **Objectif de l'intégration Back-Office :** Déplacer la persistance des droits de partage et le contrôle d'accès dans la base de données et l'API centrale du Back-Office.

---

## 2. Routes créées et modifiées dans le Frontend / BFF

### A. Route de consultation sécurisée (Garde du corps)
* **Route BFF :** `GET /api/dashboards/shared?agentId={id}&profile={profile}`
* **Fichier :** `src/app/api/dashboards/shared/route.ts`
* **Rôle :** Appelé par la page `/dashboards/view` lorsqu'un utilisateur clique sur un lien partagé.
* **Fonctionnement :**
  1. Identifie l'utilisateur via sa session (Backoffice ou Supabase).
  2. Récupère les règles d'accès du tableau (`public`, `workspace` ou `emails`).
  3. Applique les contrôles d'accès :
     * **Mode Public :** Retourne `200 OK` avec le lien direct du tableau à tout le monde.
     * **Mode Espace Mstudio (Workspace) :**
       * Si non connecté $\rightarrow$ `401 Unauthorized` (`{ ok: false, reason: "login_required" }`).
       * Si connecté mais d'un autre espace $\rightarrow$ `403 Forbidden` (`{ ok: false, reason: "forbidden" }`).
       * Si membre du workspace $\rightarrow$ `200 OK`.
     * **Mode Personnes ciblées (Emails) :**
       * Si non connecté $\rightarrow$ `401 Unauthorized`.
       * Si connecté mais email hors liste $\rightarrow$ `403 Forbidden`.
       * Si email autorisé $\rightarrow$ `200 OK`.

### B. Route d'administration des droits (Modification par l'expert / admin)
* **Route BFF :** `PATCH /api/agents/{id}/experts/{profile}/dashboard`
* **Fichier :** `src/app/api/agents/[id]/experts/[profile]/dashboard/route.ts`
* **Rôle :** Enregistre les changements de visibilité effectués dans la modale de partage.
* **Payload reçu :**
  ```json
  {
    "acces": "public" | "workspace" | "emails",
    "allowedEmails": ["leslie@mstudio.vc", "direction@mstudio.vc"]
  }
  ```
* **Réponse :**
  ```json
  {
    "ok": true,
    "acces": "emails",
    "allowedEmails": ["leslie@mstudio.vc", "direction@mstudio.vc"]
  }
  ```

### C. Route de lecture d'état
* **Route BFF :** `GET /api/agents/{id}/experts/{profile}/dashboard`
* **Rôle :** Récupère les informations complètes du tableau de bord pour l'affichage interne (dans le chat de l'expert).
* **Réponse type :**
  ```json
  {
    "available": true,
    "title": "Tableau de bord recrutement",
    "role": "Recrutement et talents",
    "lien": "https://mstudio-frames.onrender.com/share/frame/adffbb51-58c5-413e-a329-b6c3af1dc3a4",
    "maj": "2026-10-21T16:55:00Z",
    "acces": "workspace",
    "allowedEmails": ["eir@mstudio.vc", "leslie@mstudio.vc"],
    "pdfPath": "Livrables/Adjoua/Tableau-de-bord/2026-10-21/2026-10-21_tableau-de-bord-recrutement.pdf",
    "htmlPath": "Livrables/Adjoua/Tableau-de-bord/2026-10-21/2026-10-21_tableau-de-bord-recrutement.html"
  }
  ```

### D. Page de visualisation
* **Route :** `/dashboards/view?agentId={id}&profile={profile}`
* **Fichier :** `src/app/dashboards/view/page.tsx`
* **Comportement :**
  * Si accès accordé : affiche le tableau en plein écran avec barre d'en-tête Mstudio et boutons d'export PDF/HTML.
  * Si `login_required` : affiche un écran sécurisé de connexion invitant à se connecter à Mstudio.
  * Si `forbidden` : affiche un écran d'accès restreint avec l'adresse e-mail active.

---

## 3. Endpoints recommandés pour le Back-Office

Pour que le Back-Office prenne le relais de manière native, voici les routes API à implémenter côté Back-Office :

### 1. `GET /v1/workspaces/{workspace_id}/experts/{profile}/dashboard`
* **Description :** Retourne les métadonnées et la configuration de partage du tableau.
* **Réponse attendue :**
  ```json
  {
    "profile": "adjoua",
    "title": "Tableau de bord recrutement",
    "renderUrl": "https://mstudio-frames.onrender.com/share/frame/...",
    "acces": "workspace",
    "allowedEmails": ["eir@mstudio.vc", "leslie@mstudio.vc"],
    "pdfPath": "Livrables/Adjoua/Tableau-de-bord/2026-10-21/...pdf",
    "htmlPath": "Livrables/Adjoua/Tableau-de-bord/2026-10-21/...html",
    "updatedAt": "2026-10-21T16:55:00Z"
  }
  ```

### 2. `PATCH /v1/workspaces/{workspace_id}/experts/{profile}/dashboard/access`
* **Description :** Met à jour les droits d'accès et la liste des emails autorisés.
* **Payload :**
  ```json
  {
    "acces": "public" | "workspace" | "emails",
    "allowedEmails": ["collegue@mstudio.vc"]
  }
  ```

### 3. `GET /v1/dashboards/access-check`
* **Paramètres de requête :** `?agentId={id}&profile={profile}`
* **Description :** Point d'entrée de contrôle pour les visiteurs (avec ou sans token Bearer).
* **Comportement attendu :**
  * `200 OK` avec `{ "ok": true, "url": "..." }` si autorisé.
  * `401 Unauthorized` avec `{ "ok": false, "reason": "login_required" }` si non authentifié et mode non public.
  * `403 Forbidden` avec `{ "ok": false, "reason": "forbidden" }` si connecté mais hors cible.

---

## 4. Modèle de données suggéré en base (Back-Office)

```sql
CREATE TABLE IF NOT EXISTS expert_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    agent_id VARCHAR(64) NOT NULL,
    profile VARCHAR(64) NOT NULL,
    render_url TEXT,
    acces VARCHAR(32) NOT NULL DEFAULT 'public', -- 'public', 'workspace', 'emails'
    allowed_emails JSONB DEFAULT '[]'::jsonb,
    pdf_path TEXT,
    html_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, profile)
);
```

---

## 5. Transition Frontend $\rightarrow$ Back-Office

Dès que ces endpoints seront déployés sur le Back-Office :
1. Dans `src/app/api/agents/[id]/experts/[profile]/dashboard/route.ts` : remplacer les appels `instanceFetch` vers `tableau-de-bord-metier.json` par `backoffice.getDashboard(...)` et `backoffice.setDashboardAccess(...)`.
2. Dans `src/app/api/dashboards/shared/route.ts` : déléguer la vérification au Back-Office via `backoffice.checkDashboardAccess(...)`.
