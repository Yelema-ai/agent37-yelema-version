# Plan : les onglets « Modèles » et « MCP », posés par le back-office

> Rédigé le 2026-10-12, après l'audit de la branche `feat/agentMail` (Christelle Ebou) : commits
> « Modèles (BYOK) » du 2026-10-09 → 11 et « MCP » du 2026-10-09.
> **Plan maître pour les deux dépôts** : ce dépôt (l'app) et `yelema-platform` (le back-office).
> Le pendant côté back-office est à écrire dans `yelema-platform/docs/plans/`, à son gabarit,
> d'après les §§ 5 à 8.
> **Décidé par Selim le 2026-10-12** : `feat/experts-profils` reste la source de vérité ;
> `feat/agentMail` n'est pas fusionnée, on en reprend les écrans et les icônes ; ce qui écrit sur
> une instance va au back-office ; le staff et l'administrateur du client posent une clé, pour tout
> le client ou pour un membre.
> **Retenu par défaut, à confirmer par Selim (§ 3.2)** : cinq points.
> **STATUS (2026-10-12, fin de session) : lots A, A2, B, C, D et E codés dans les deux dépôts, non
> commités, jamais essayés contre une instance réelle. État détaillé : § 13.**
> **§ 3.2 (5) accordé par Selim le 2026-10-13 : lot F (MCP) codé dans les deux dépôts, non commité,
> jamais essayé contre une instance réelle.** Branches : `feat/modeles-mcp` (app,
> `~/agent37-yelema-modeles`) et `feat/app-modeles-mcp` (back-office, `~/yelema-platform-modeles`).

## 1. Objectif

Deux réglages qu'un client fait lui-même depuis l'app, sans que l'app écrive sur une instance :

1. **Modèles** : faire tourner ses experts sur son propre compte de modèle (Anthropic, OpenAI,
   OpenRouter…) au lieu de celui de Yelema.
2. **MCP** : brancher sur ses experts un serveur d'outils MCP à lui.

| Qui | Peut régler pour |
|---|---|
| Staff Yelema (back-office) | tout le client, ou un membre — existe pour les modèles |
| Administrateur du client (app) | tout le client, ou un membre |
| Membre (app) | lui-même, si son administrateur l'a permis |

## 2. Ce qui revient à qui

| | App (ce dépôt) | Back-office |
|---|---|---|
| Écrans, formulaires, phrases en français | ✅ | |
| Liste des fournisseurs, forme des clés | affiche ce qu'on lui sert | ✅ |
| Vérifier une clé auprès du fournisseur | | ✅ |
| Chiffrer et garder clés et jetons | | ✅ |
| Écrire sur l'instance, redémarrer la passerelle Hermes | | ✅ |
| Dire qui a le droit | relaie la session | ✅ rôle lu sur la session |
| Surveiller qu'une clé marche encore, prévenir | affiche l'état | ✅ |
| Journal d'audit | | ✅ |

Pour ce dépôt : **aucun `exec`, aucune migration, aucune liste de fournisseurs, aucun secret
gardé**. Un fournisseur ajouté au catalogue du back-office apparaît ici sans changement.

## 3. Décisions

### 3.1 Prises

- Le back-office et l'administrateur du client posent une clé ; deux portées (client, membre).
- Ordre de priorité d'une instance, inchangé (`tenant-apps/llm/model.ts`) : clé du membre, sinon
  clé du client, sinon passerelle LiteLLM de Yelema, sinon modèle Agent37 en repli.
- Une source de modèle vaut pour **tous** les profils de l'instance, `default` compris. Pas de
  modèle par expert.
- Un secret ne revient jamais dans une réponse : seulement ses quatre derniers caractères.

### 3.2 Retenues par défaut, à confirmer

1. **Le membre règle pour lui-même seulement si son administrateur l'a ouvert**, fermé par défaut.
   Deux interrupteurs distincts : clés de modèle, serveurs MCP. Sans cela un membre sort seul de
   la passerelle de Yelema, donc de la mesure et du plafond de dépense.
2. **L'onglet montre la source du modèle, jamais la dépense** : le plan LiteLLM (« rien n'est
   montré au client ») n'est pas contredit.
3. **Enregistrer redémarre la passerelle Hermes et coupe un tour en cours** : dit dans le dialogue
   avant d'enregistrer ; on n'attend pas la fin des conversations.
4. **Le jeton d'abonnement Claude** (`anthropic-oauth`) reste réservé au staff, le temps de relire
   les conditions d'Anthropic sur l'usage d'un abonnement dans un produit tiers.
5. **Les serveurs MCP du client entrent au back-office.** Son invariant dit qu'il ne connaît pas
   la configuration d'une instance (outils, canaux, modèle). Les modèles y sont déjà, parce que la
   facturation dépend de qui paie. Pour MCP il faut une précision écrite dans son `AGENTS.md`, du
   même ordre que celle du 2026-10-10 sur la mémoire d'entreprise : « l'adresse et le jeton d'un
   serveur d'outils que le client fournit sont des identifiants du client, gardés et posés par le
   back-office ; ce que le serveur expose ne le regarde pas ». **Sans cet accord, le lot F ne se
   fait pas.**

Hors de ce plan, à trancher ailleurs : le forfait change-t-il quand le client apporte sa clé.

## 4. Ce qu'on reprend de la branche de Christelle

### 4.1 Écrans de Modèles (`src/components/models/ModelsView.tsx`)

| Élément | Lot |
|---|---|
| Bandeau « Moteur actif », « Revenir à Yelema Starter » | A |
| Barre de recherche, compteur de fournisseurs | A |
| Grille des fournisseurs : carte, « Actif », « Connecté », fin de clé | A |
| Icônes des 19 fournisseurs (`ProviderLogo` : pastille aux couleurs de la marque, initiales) | A |
| Menu d'une carte : modifier les accès, définir par défaut, déconnecter | A |
| Dialogue de connexion : clé masquée / affichée, modèle par défaut | A |
| Confirmation de déconnexion, squelette de chargement, « aucun résultat » | A |
| Bouton « Se connecter avec OpenRouter » (PKCE) | C |
| Carte, dialogue et liste « Endpoint ou serveur privé » | D |
| Onglet « OAuth / Compte » du dialogue (abonnement chez le fournisseur de modèles) | E |

### 4.2 Écran de MCP (`src/components/integrations/McpView.tsx`) — lot F

Liste des serveurs, dialogue d'ajout (nom, adresse, sans jeton ou jeton Bearer), suppression.

### 4.3 Ajouté par nous

- Le choix de la portée pour l'administrateur : « toute l'entreprise » ou « un membre », et par
  membre d'où vient son modèle. Les écrans d'origine ne connaissaient que l'instance du membre.
- L'état d'une clé : posée, en cours, en échec, refusée par le fournisseur.
- Les avertissements du § 3.2 (3) et du § 9.

### 4.4 Corrigé au passage

`any` retiré, `import type`, phrases d'erreur écrites ici, modèles proposés servis par le
back-office au lieu des listes en dur (plusieurs modèles cités n'existent plus), composants
découpés (l'écran d'origine fait 1 259 lignes).

### 4.5 Non repris, et pourquoi

- `src/lib/models.ts`, `src/lib/mcp.ts` et leurs routes `agents/[id]/modeles` et `agents/[id]/mcp` :
  des scripts Python envoyés par `python -c '…'`. Enregistrer un modèle y échoue toujours
  (`set_active = true`) ; une apostrophe dans une clé, une adresse ou un jeton exécute une commande
  dans l'instance ; un retour à la ligne écrit dans `~/.hermes/.env` ; le nom `Agent37` écrase le
  modèle géré. Remplacés par le back-office.
- Les jetons « OAuth » collés à la main : remplacés par le lot E.
- Ollama et LM Studio **en local** : `localhost` y désigne l'instance cloud. Ollama reste, en
  version cloud.
- La migration `0005_apps_mcp.sql` : la colonne existe déjà ici (`0003`).
- Le retrait de la carte e-mail de Canaux : l'écran a déjà changé ici.

## 5. Contrat : modèles

Routes sous `/api/v1/app/llm`, session de l'app (`appUserRoute`, comme `/app/mail/rights`). Le
back-office lit rôle et client sur la session ; l'app n'envoie ni l'un ni l'autre.

### 5.1 Lecture

`GET /app/llm`

```jsonc
{
  "catalogue": [{
    "id": "anthropic-api", "label": "Anthropic — clé API", "placeholder": "sk-ant-api03-…",
    "defaultModel": "claude-sonnet-5", "notice": null, "verifiable": true,
    "family": "anthropic"            // pour l'icône : stable, ne dépend pas du libellé
  }],
  "mine": {                          // l'instance de l'utilisateur ; null s'il n'en a pas
    "source": "client",              // "member" | "client" | "yelema" | "agent37"
    "provider": "anthropic-api",     // null si la source est Yelema ou Agent37
    "model": "claude-sonnet-5",
    "state": "applied",              // "applied" | "pending" | "failed" | "refused"
    "since": "2026-10-12T09:00:00Z"
  },
  "own": null,                       // la clé propre de l'utilisateur : { provider, model, hint, verified, state, updatedAt }
  "membersMayBringKey": false,
  // administrateurs seulement :
  "client": { "provider": "anthropic-api", "model": "claude-sonnet-5", "hint": "…a1b2",
              "verified": true, "state": "applied", "updatedAt": "2026-10-12T09:00:00Z" },
  "members": [{ "id": "…", "name": "…", "email": "…", "source": "client", "state": "applied", "own": null }]
}
```

- Un membre ne reçoit ni `client` ni `members`.
- `members[].id` est l'identifiant que les routes par membre attendent. Il n'existe pas dans
  `GET /app/members` aujourd'hui.
- `state: "refused"` : le fournisseur refuse désormais la clé (§ 7.2).
- Les entrées `staffOnly` du catalogue (`anthropic-oauth`) ne sont pas servies à l'app.

### 5.2 Écriture

| Route | Qui | Effet |
|---|---|---|
| `PUT /app/llm/client` | admin | clé du client, posée sur les instances sans clé propre |
| `DELETE /app/llm/client` | admin | ces instances reviennent à la passerelle de Yelema |
| `PUT /app/llm/members/{id}` | admin | clé d'un membre |
| `DELETE /app/llm/members/{id}` | admin | ce membre revient à la clé du client, sinon à Yelema |
| `PUT /app/llm/own`, `DELETE /app/llm/own` | l'utilisateur, si permis | sa propre clé |
| `PUT /app/llm/settings` `{ membersMayBringKey }` | admin | ouvre ou ferme la ligne précédente |

Corps d'un `PUT` de clé : `{ "provider": "anthropic-api", "secret": "sk-ant-…", "model": "claude-sonnet-5" }`.
`secret` absent = garder la clé en place et ne changer que le modèle.

Réponse : `{ "ok": true, "verified": true, "state": "pending" }`. Jamais la sortie d'une commande.

Refus, avec un `code` que l'app traduit (elle n'affiche pas le texte) :

| Statut | `code` | Cas |
|---|---|---|
| 400 | `unknown_provider` | fournisseur hors catalogue, ou réservé au staff |
| 400 | `bad_secret_format` | la clé n'a pas la forme attendue |
| 400 | `secret_refused` | le fournisseur a répondu 401 ou 403 |
| 400 | `unknown_model` | modèle absent du compte ; `suggestions: string[]` |
| 403 | `forbidden` | rôle insuffisant, ou réglage fermé aux membres |
| 404 | `not_found` | membre d'un autre client |
| 429 | `too_many_attempts` | § 7.4 |
| 503 | `unavailable` | chiffrement non configuré |

### 5.3 Lots suivants (contrat à préciser par le lot)

- **C — OpenRouter en un clic** : aucun changement de contrat. L'app fait l'échange PKCE côté
  serveur et envoie la clé obtenue par `PUT`.
- **D — endpoints privés** : `provider: "custom"` avec `{ name, baseUrl, secret?, model }`.
  `baseUrl` en `https`, hôte public ; `name` selon `^[A-Za-z][A-Za-z0-9_-]{1,39}$`, hors noms
  réservés (`Agent37`, `litellm`, `yelema`). Un par portée.
- **E — abonnement du client chez un fournisseur de modèles** (ChatGPT/Codex, Qwen, xAI, MiniMax,
  Nous), à la place d'une clé API. Ce n'est **pas** la connexion à l'app cliente, qui ne change
  pas. `POST /app/llm/{scope}/provider-login` lance la procédure de Hermes dans
  l'instance et rend `{ verificationUrl, userCode, expiresAt }` ; `GET …/provider-login` dit où elle
  en est.
  Seulement pour un membre (un compte se connecte sur une instance, pas sur un client entier).

## 6. Contrat : serveurs MCP (lot F)

Routes sous `/api/v1/app/mcp`, même session, mêmes portées, même forme de réponse.

`GET /app/mcp`

```jsonc
{
  "own": [{ "id": "…", "name": "crm", "url": "https://mcp.exemple.com/sse", "auth": "bearer",
            "hint": "…9f3c", "state": "applied", "updatedAt": "…" }],
  // administrateurs seulement :
  "client": [ /* même forme */ ],
  "members": [{ "id": "…", "name": "…", "email": "…", "servers": [ /* même forme */ ] }]
}
```

| Route | Qui |
|---|---|
| `POST /app/mcp/client`, `DELETE /app/mcp/client/{serverId}` | admin |
| `POST /app/mcp/members/{id}`, `DELETE /app/mcp/members/{id}/{serverId}` | admin |
| `POST /app/mcp/own`, `DELETE /app/mcp/own/{serverId}` | tout utilisateur, pour sa propre instance |

Corps d'un `POST` : `{ "name": "crm", "url": "https://…", "auth": "none" | "bearer", "token": "…" }`.

Règles, appliquées par le back-office :
- `name` : `^[a-z][a-z0-9_-]{1,39}$`, unique dans sa portée, hors noms que l'image pose elle-même
  (`apps`, `memoire`, et tout serveur déjà présent dans le profil à l'installation).
- `url` : `https`, hôte public (ni adresse privée, ni `localhost`, ni lien-local), 2 000 caractères
  au plus.
- `token` : 4 096 caractères au plus, sans retour à la ligne, chiffré comme une clé de modèle.
- Dix serveurs au plus par portée.
- Le back-office n'appelle jamais l'adresse fournie : c'est l'instance qui s'y connecte.
- La troisième méthode de l'écran d'origine (OAuth 2.0, `auth: oauth` laissé à Hermes) n'est pas
  reprise : rien n'établit comment Hermes mène cette autorisation sur une instance sans navigateur.
- Le client voit les serveurs du client et du membre réunis sur l'instance ; à nom égal, celui du
  membre l'emporte.

Refus : `bad_name`, `reserved_name`, `duplicate_name`, `bad_url`, `bad_token`, `too_many_servers`
(400) ; `forbidden`, `not_found`, `too_many_attempts`, `unavailable` comme au § 5.2.

## 7. Demandes au back-office au-delà du montage des routes

### 7.1 La pose ne tient pas la requête ouverte

`putClientLlmRoute` attend aujourd'hui chaque instance (commande puis redémarrage, trois à la
fois). Demandé, pour les routes de l'app : enregistrer, répondre `state: "pending"`, poser en tâche
de fond, écrire l'état par membre. L'app relit `GET` jusqu'à ce que plus rien ne soit `pending`.

### 7.2 Une clé qui cesse de marcher

Tâche périodique (une fois par jour, et après un échec signalé) : revérifier chaque clé de client
auprès de son fournisseur. Refus explicite → `state: "refused"`, notification à l'administrateur du
client et au staff, une par clé et par bascule. Rien n'est retiré de l'instance tout seul.

### 7.3 Cycle de vie

- Membre retiré : sa clé propre et ses serveurs MCP supprimés.
- Client suspendu : à lire dans `lib/suspend.ts` ce que devient l'instance, et n'ajouter que ce
  qui manque ; client purgé : tout supprimé (`purgeTenant.ts` connaît déjà `llm-credentials`).
- Expert installé plus tard, instance recréée, synchronisation des profils : la source de modèle
  et les serveurs MCP sont reposés (`syncKeysStep` le fait déjà pour le modèle).

### 7.4 Limite d'essais

Dix écritures par utilisateur et par heure sur `/app/llm/*` et `/app/mcp/*` : la vérification d'une
clé auprès du fournisseur servirait sinon à tester des clés volées en série.

### 7.5 Audit

Chaque écriture note qui l'a faite : staff, administrateur du client ou membre.

### 7.6 Catalogue : douze fournisseurs de plus

Une ligne chacun dans `catalogue.ts` : Mistral, Groq, Qwen, MiniMax, Together, DeepInfra,
Fireworks, Hugging Face, Copilot, Perplexity, Nous, Ollama Cloud. **Chacun n'entre que si le
registre de la version de Hermes installée (`hermes_cli/auth.py`, `PROVIDER_REGISTRY`) le connaît
comme fournisseur de conversation**, avec son identifiant et sa variable relevés dans le source à
l'étiquette épinglée. Leurs variables existent dans le dépôt public de Hermes ; cela ne prouve pas
que Hermes s'en sert pour la conversation. Un fournisseur non confirmé reste dehors, et le compte
rendu le dit.

Ajouts au type `LlmProvider` : `family` (icône), `staffOnly`.

## 8. Fichiers

### 8.1 Back-office (`yelema-platform`, branche partie de `feat/litellm-passerelle-defaut`)

```
docs/plans/app-modeles-et-mcp.md                         ← ce plan, au gabarit du dépôt
AGENTS.md                                                ← la précision du § 3.2 (5), si accordée
apps/control-plane/src/modules/app-api/llm.ts (+test)    ← lecture, écritures, droits, DTO
apps/control-plane/src/modules/app-api/mcp.ts (+test)    ← lot F
apps/control-plane/src/modules/app-api/rateLimit.ts (+test) ← § 7.4, si rien n'existe déjà
apps/control-plane/src/app/(client-api)/api/v1/app/llm/**  ← routes du § 5.2
apps/control-plane/src/app/(client-api)/api/v1/app/mcp/**  ← routes du § 6
apps/control-plane/src/modules/tenant-apps/llm/catalogue.ts ← `family`, `staffOnly`, § 7.6
apps/control-plane/src/modules/tenant-apps/llm/routes.ts    ← la pose sort dans une tâche, partagée avec l'app
apps/control-plane/src/modules/tenant-apps/llm/health.ts (+test) ← § 7.2
apps/control-plane/src/modules/tenant-apps/jobs/…          ← tâche de pose, tâche de revérification
apps/control-plane/src/modules/tenant-apps/mcp/            ← lot F : store, règles, commande, routes staff
apps/control-plane/src/modules/tenant-apps/assets/hermes/apply_mcp.py ← lot F, déposé par l'API fichiers
apps/control-plane/src/modules/tenant-apps/collections/    ← `LlmCredentials` : état, auteur ; `McpServers` ; deux interrupteurs sur l'espace
apps/control-plane/src/migrations/                         ← une migration par lot qui change le schéma
docs/specs/client-api-v1/openapi.yaml, examples.yaml       ← puis `pnpm api-reference:build`
apps/control-plane/JOURNAL.md, docs/ops/…                  ← selon les règles du dépôt
```

Le secret d'une pose passe par un fichier déposé puis supprimé, jamais par une commande (motif de
`llm/apply.ts` et `llm/model.ts`). Le script MCP écrit par l'outil de Hermes (`hermes mcp …` ou
`hermes config set`) si le source le permet, sinon par YAML, jamais par texte assemblé.

### 8.2 App (ce dépôt, branche partie de `feat/experts-profils`)

```
src/lib/backoffice.ts                          ← méthodes llm* et mcp*
src/lib/llm.ts (+ .test.ts)                    ← types du contrat ; `code` → phrase (module pur)
src/lib/mcp-servers.ts (+ .test.ts)            ← idem pour MCP
src/app/api/llm/route.ts                       ← GET
src/app/api/llm/client/route.ts                ← PUT, DELETE
src/app/api/llm/members/[memberId]/route.ts    ← PUT, DELETE
src/app/api/llm/own/route.ts                   ← PUT, DELETE
src/app/api/llm/settings/route.ts              ← PUT
src/app/api/llm/openrouter/route.ts            ← lot C : échange PKCE côté serveur
src/app/api/mcp/**                             ← lot F, même découpe
src/components/models/ModelsView.tsx           ← repris, rebranché, allégé
src/components/models/ProviderLogo.tsx         ← les icônes, par `family`
src/components/models/ProviderDialog.tsx       ← le dialogue de connexion
src/components/models/ScopePicker.tsx          ← entreprise / membre, partagé avec MCP
src/components/integrations/McpView.tsx        ← lot F, repris, rebranché
src/app/(app)/administration/modeles/page.tsx
src/app/(app)/administration/mcp/page.tsx
src/app/(app)/administration/layout.tsx        ← deux onglets, `backoffice: true`
src/components/integrations/UsageView.tsx      ← la note du § 9 sur Consommation
AGENTS.md                                      ← les onglets ; la règle « l'app ne pose ni clé ni outil »
```

Les onglets n'existent que là où le back-office ouvre la session (`AUTH_VIA_BACKOFFICE`). Ils sont
visibles d'un membre seulement quand son interrupteur est ouvert, ou pour lui montrer d'où vient
son modèle (lecture seule).

## 9. Ce que l'écran doit dire

- Avant d'enregistrer une clé : « Tous vos experts passeront par ce compte, routines et messages
  reçus par Telegram ou WhatsApp compris, de jour comme de nuit. La conversation en cours sera
  interrompue. »
- Sur une clé refusée : le fournisseur n'accepte plus la clé ; les experts ne répondent plus tant
  qu'elle n'est pas remplacée ou retirée.
- Dans Consommation, pour un client sur sa propre clé : la dépense de modèle n'est pas mesurée par
  Yelema, elle se lit chez le fournisseur.
- Sur un serveur MCP : ses outils seront offerts à tous les experts concernés ; Yelema ne les
  vérifie pas.

## 10. Lots et ordre

| Lot | Contenu | Dépôt qui commence |
|---|---|---|
| A | Modèles pour l'administrateur : routes, pose en tâche de fond, état, 7 fournisseurs, écrans | back-office |
| A2 | § 7.2 à 7.6 : surveillance, cycle de vie, limite d'essais, audit, catalogue | back-office |
| B | Le membre pour lui-même, interrupteur | back-office |
| C | OpenRouter en un clic | app |
| F | MCP : module, routes, écrans — **si § 3.2 (5) accordé** | back-office |
| D | Endpoints privés | back-office |
| E | Abonnement du client chez un fournisseur de modèles, à la place d'une clé — **commence par une vérification de faisabilité** | back-office |

Chaque lot se termine avec les vérifications du § 12 au vert dans les deux dépôts. E vient en
dernier : il dépend d'une procédure de Hermes prévue pour un terminal, dont rien ne dit encore
qu'elle se pilote par `exec`. Si elle ne se pilote pas, le lot s'arrête là et le dit.

## 11. Risques et hors périmètre

- **Sécurité** : aucune valeur du navigateur dans une commande ; secrets chiffrés, jamais
  journalisés, jamais rendus ; droits relus sur la session à chaque appel ; un membre ne lit ni
  n'écrit la portée d'un autre ; adresses fournies jamais appelées par le back-office.
- **Travail en cours au back-office** : sa copie de travail porte des changements non commités
  d'un autre chantier (réglages des connecteurs, graphiques FinOps), dont `navModel.ts`,
  `importMap.js`, `payload.config.ts` et `mailRoutes.ts`. Ce chantier-ci se fait dans une copie de
  travail à part et n'y touche pas ; conflits à prévoir sur ces quatre fichiers à la réunion.
- **Jamais essayé contre une instance réelle** tant que la recette du § 12 n'est pas faite.
- **Hors périmètre** : la dépense montrée au client, le prix du forfait, un modèle par expert, le
  déplacement des canaux et des routines vers le back-office, de vrais logos de marque, la fusion
  de `feat/agentMail`.

## 12. Vérification

App : `npm run typecheck`, `npm test`, `npm run build`.
Back-office : `pnpm test` dans `apps/control-plane`, lint, `pnpm check:versions`,
`pnpm api-reference:build` après toute retouche de l'OpenAPI.

Tests unitaires attendus :
- chaque `code` de refus et sa phrase ; un membre ne reçoit ni `client` ni `members` ;
- droits : membre sur la portée d'un autre → 404 ; membre sans interrupteur → 403 ;
- aucune commande générée ne contient une valeur fournie (clé, adresse, jeton, nom) ;
- règles MCP : noms réservés, adresse privée refusée, doublon, plafond ;
- priorité : clé du membre avant celle du client ; retrait → retour au niveau du dessous.

Recette, sur l'instance d'un client de test (à faire par un humain, non couverte par la session) :
clé du client posée → un expert répond par ce modèle ; clé retirée → retour à Yelema ; clé refusée
→ rien d'enregistré ; clé révoquée chez le fournisseur → état « refusée » et notification ; serveur
MCP ajouté → ses outils visibles d'un expert ; retiré → disparus.

## 13. État par lot (2026-10-12)

| Lot | État | Ce qui est fait | Ce qui ne l'est pas, et pourquoi |
|---|---|---|---|
| A | codé | Routes `/app/llm` (lecture, client, membre), pose en tâche de fond (`tenant-app-model-pose`), `modelState`, écrans repris (`ModelsView`, `ProviderDialog`, `ProviderLogo`, `ScopePicker`, `MemberSources`) | « Définir par défaut » du menu d'une carte : sans objet, il n'y a qu'une clé par portée |
| A2 | codé | Revérification quotidienne et après une pose en échec, alerte à la bascule, clé du membre supprimée à son retrait, dix écritures par heure, auteur à l'audit et sur la clé, catalogue | Cinq fournisseurs écartés (ci-dessous) ; l'écran du staff ne montre pas encore `refused` |
| B | codé | `membersMayBringKey` (fermé par défaut), routes `own` et `settings` | — |
| C | codé | OpenRouter en un clic : échange PKCE côté serveur, vérificateur en cookie httpOnly, paramètre `state` | — |
| F | codé (2026-10-13, § 3.2 (5) accordé) | Back-office : collection `mcp-servers`, huit routes `/app/mcp/*`, pose en tâche de fond (`tenant-app-mcp-pose`, `mcpState`), script `apply_mcp.py` déposé par l'API fichiers, routes et carte du staff, serveurs d'un membre retirés avec lui, repose à l'envoi de profils. App : `src/lib/mcp-servers.ts`, routes `src/app/api/mcp/**`, écran repris (`McpView`, `McpServerDialog`), onglet MCP | **Écarts au § 6, relevés dans Hermes 0.21.5** : nom sans tiret ni `_` final (`^[a-z][a-z0-9_]{0,38}[a-z0-9]$` — Hermes ramène tout caractère hors `[A-Za-z0-9_]` à `_`, `a-b` et `a_b` se confondraient) ; jeton borné aux caractères d'un jeton Bearer, sans `$` (Hermes interpole `${…}` dans un en-tête). Le serveur s'écrit dans `mcp_servers` de chaque profil (`url`, `headers.Authorization`), comme l'image le fait pour `apps`, puis la passerelle est redémarrée. Un nom déjà présent sur l'instance et que le back-office n'a pas posé n'est connu qu'à la pose : elle le refuse (`failed`) au lieu de l'écraser, il n'y a donc pas de refus `reserved_name` pour lui à l'enregistrement. `state` dit si l'écriture a réussi, pas si le serveur répond. Un membre ne voit pas les serveurs de l'entreprise posés sur son instance (contrat du § 6). Le script n'a tourné que sur un faux dossier Hermes |
| D | codé | `provider: custom` (`name`, `baseUrl` en https sur hôte public, `secret?`, `model`), un par portée, posé par fichier ; carte et dialogue repris | Un endpoint sur le réseau local du client est refusé (l'instance est dans le cloud) ; la clé n'est jamais vérifiée (le back-office n'appelle pas l'adresse) |
| E | codé | Faisabilité établie dans le source : **oui, par l'API du tableau de bord de Hermes, pas par son CLI**. `POST|GET …/provider-login` pour `openai-codex`, `xai-oauth`, `minimax-oauth`, `nous` | Qwen : sa connexion passe par un CLI tiers (`qwen`), hors d'atteinte. Conditions d'usage des abonnements non relues |
| G | codé (ajouté le 2026-10-12, à la demande de Selim) | Modèles de Yelema au choix du membre, sans clé : liste générale tenue au back-office (une pour tous les clients), choix pour l'instance ou pour un expert (`PUT /app/llm/own/model`), section « Modèles Yelema » de l'onglet ; le sélecteur du chat, déjà en place, liste les mêmes modèles | Ni prix affiché ni ligne de facture ; le fournisseur derrière un modèle d'OpenRouter se fixe dans LiteLLM, pas par le membre ; solde OpenRouter au back-office : non fait (faisable par `GET /api/v1/credits` avec une clé de gestion ; la recharge n'a pas d'API) |

**Catalogue (§ 7.6).** Entrés, relevés dans `hermes_cli/auth.py` et `plugins/model-providers/` à
l'étiquette `v2026.9.24` (= 0.21.5) : Qwen (`alibaba`), MiniMax, DeepInfra, Fireworks, Hugging Face,
Ollama Cloud, Copilot (réservé au staff, comme le jeton Claude : abonnement individuel). Tous
marqués non vérifiables à l'avance. **Écartés** : Mistral, Groq, Together, Perplexity — Hermes ne
les connaît pas comme fournisseurs de conversation (leurs variables servent la voix ou la recherche
web) ; ils restent joignables par un endpoint privé. Nous — pas de clé API de conversation
confirmée ; il entre par le lot E.

**Écarts au contrat et choix faits en cours de route.**
- `GET /app/llm` rend en plus `customEndpoints` et `logins` (lots D et E) ; une clé d'endpoint porte `name` et `baseUrl`.
- `suggestions` est rendu dans `error`, à côté de `code`.
- Refus ajoutés : `bad_name`, `reserved_name`, `bad_url` (lot D) ; `no_instance` (409), `login_unavailable` (502) (lot E).
- `…/provider-login` rend `{ status, verificationUrl?, userCode?, expiresAt? }` ; `status` vaut `none`, `pending`, `approved`, `denied`, `expired` ou `error`.
- Les routes du staff gardent leur pose immédiate (elles lisent la sortie) ; seules celles de l'app passent par la tâche. Les deux partagent `llm/pose.ts`.
- L'onglet Modèles est visible de tous là où le back-office ouvre la session ; un membre sans interrupteur n'y lit que la source de son modèle.
- La note de Consommation ne s'affiche que si une clé du client ou d'un membre est en place.
- Les pastilles noires (Ollama, Copilot) prennent l'encre du thème, pour rester lisibles en sombre.
- Une migration par lot ; celle du lot D porte aussi les valeurs d'énumération des fournisseurs du catalogue. Leur `down` est celui que Payload génère.

**À couvrir par la recette (§ 12), faute d'instance pendant la session.** La pose d'une clé par la
tâche de fond et le passage de `pending` à `applied` ; le mode `custom` de `apply_model.py` sur une
vraie configuration (essayé seulement dans un répertoire jetable) ; la connexion d'un abonnement de
bout en bout, dont la présence des routes `/api/providers/oauth/*` dans l'image installée et la
lecture des jetons de `default` par les profils ; chacun des sept fournisseurs ajoutés ; l'aller et
retour OpenRouter ; l'alerte d'une clé révoquée ; la version exacte de Hermes (`hermes --version`).
