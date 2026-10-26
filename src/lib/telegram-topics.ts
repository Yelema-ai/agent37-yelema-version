import "server-only";

// "Un sujet par expert" on Telegram: one bot (the default profile), one forum topic per expert
// profile, all served by the default profile in multiplex mode. A port of the back office's
// ROUTE_PROFILES_COMMAND (apps/control-plane/.../tenant-apps/lib/shortcuts.ts) and of the
// hermes-experts repo's scripts/add_profile_route.py, which is embedded below so it ships with the
// app (Vercel has no checkout of hermes-experts). Keep both in sync with their sources.
//
// Nothing here takes user input: the group comes from the home channel that /sethome stored on the
// instance, the bot token is read ON the instance, and the profiles are the instance's own folders.

// Where the routing script is written (files API) before it runs.
export const ROUTE_SCRIPT_FILE = "~/.yelema/add_profile_route.py";

// `hermes` lives in ~/.local/bin on some images: put it on PATH rather than rely on the shell.
const HERMES = 'export PATH="$HOME/.local/bin:$PATH";';

// What the routing command prints when its prerequisites are missing (it then exits 0, untouched).
export const NO_HOME_CHANNEL = "routage : aucun home channel Telegram";
export const NO_BOT_TOKEN = "routage : TELEGRAM_BOT_TOKEN absent du profil default";

// Every member of the /sethome group may talk to the experts; private chats stay with the owner
// (TELEGRAM_ALLOWED_USERS). Multiplex the default gateway, then one topic per profile (idempotent: a
// profile that already has a topic is skipped). Uses Hermes's own python: the PATH python3 has neither
// ruamel.yaml nor requests.
export const ROUTE_PROFILES_COMMAND = [
  HERMES,
  'H="hermes -p default";',
  'CHAT="$($H config get platforms.telegram.home_channel.chat_id --raw 2>/dev/null || true)";',
  `case "$CHAT" in ""|"Config key not set"*) echo "${NO_HOME_CHANNEL}, taper /sethome dans le groupe forum, puis relancer"; exit 0;; esac;`,
  '$H config set TELEGRAM_GROUP_ALLOWED_CHATS "$CHAT" >/dev/null && echo "accès : tout le groupe $CHAT";',
  'TOK="$($H config get TELEGRAM_BOT_TOKEN --raw 2>/dev/null || true)";',
  `case "$TOK" in ""|"Config key not set"*) echo "${NO_BOT_TOKEN}, bot à configurer"; exit 0;; esac;`,
  '[ "$($H config get gateway.multiplex_profiles 2>/dev/null)" = true ] || $H gateway migrate --multiplex -y;',
  'PY="$(dirname "$(readlink -f "$(command -v hermes)")")/python";',
  'CFG="$($H config path 2>/dev/null || echo "$HOME/.hermes/config.yaml")";',
  'FAIL=0; for p in $(ls -1 "$HOME/.hermes/profiles"); do [ "$p" = default ] && continue;',
  '"$PY" "$HOME/.yelema/add_profile_route.py" "$CFG" "$p" "$CHAT" "$TOK" || { echo "routage en échec : $p"; FAIL=1; }; done; exit $FAIL',
].join(" ");

// The default profile multiplexes every profile: one restart reloads all the routes.
export const GATEWAY_RESTART_COMMAND = `${HERMES} hermes -p default gateway restart`;

// End of what the instance printed, kept for support: enough to diagnose, bounded.
export function outputTail(stdout: string, stderr: string, max = 1500): string {
  const text = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n--- stderr ---\n");
  return text.length > max ? `…${text.slice(-max)}` : text;
}

// The routing command stopped before touching anything (no /sethome yet, or no bot): the reason to
// show, or null when it went ahead.
export function routingSkipped(stdout: string): string | null {
  if (stdout.includes(NO_HOME_CHANNEL)) return "Tapez /sethome dans le groupe, puis réessayez.";
  if (stdout.includes(NO_BOT_TOKEN)) return "Connectez d’abord votre bot Telegram, puis réessayez.";
  return null;
}

// Why some topics could not be created, from Telegram's own error text (relayed by the script).
export function routingFailure(output: string): string {
  const text = output.toLowerCase();
  if (text.includes("upgraded to a supergroup")) {
    return "Le groupe a changé d’identifiant en activant les Sujets : tapez à nouveau /sethome dans le groupe, puis réessayez.";
  }
  if (text.includes("not a forum")) return "Activez les Sujets dans les paramètres du groupe, puis réessayez.";
  if (text.includes("not enough rights")) {
    return "Le bot doit être administrateur du groupe, avec le droit de gérer les sujets.";
  }
  if (text.includes("chat not found") || text.includes("kicked") || text.includes("not a member")) {
    return "Le bot n’est pas dans le groupe : ajoutez-le, tapez /sethome, puis réessayez.";
  }
  return "Certains sujets n’ont pas pu être créés. Réessayez dans un instant.";
}

export const TOPICS_CREATED = "Les sujets des experts sont créés : tous les membres du groupe peuvent écrire à chacun dans son sujet.";
export const RESTART_FAILED = "Les sujets sont créés, mais la messagerie n’a pas redémarré. Réessayez dans un instant.";

// hermes-experts/scripts/add_profile_route.py, verbatim except punctuation in comments and messages.
export const ADD_PROFILE_ROUTE_PY = `#!/usr/bin/env python3
"""Create (if needed) a Telegram forum topic for a profile and write/update its
numeric-thread-id route in the default profile's config.yaml (gateway.profile_routes).

Usage: add_profile_route.py <config.yaml> <profile> <chat_id> <bot_token>

Why this creates the topic itself (does NOT rely on Hermes auto-creating it):
- Incoming routing match is a strict equality on Telegram's numeric topic id
  (gateway/profile_routing.py: ProfileRoute.matches -> self.thread_id != thread_id).
  Telegram always sends a numeric message_thread_id, so a route whose thread_id is a
  profile NAME (e.g. "adjoua") can never match an inbound message, this was the bug in
  the previous version of this script.
- Hermes's own auto-create-topic-by-name helper (gateway/delivery.py:
  _ensure_named_dm_topic) only fires for Telegram PRIVATE chats (positive chat_id), a
  forum GROUP's chat_id is negative (-100...), so that helper never runs there and no
  topic is ever created by waiting for a profile's first outbound message.

So this script calls Telegram's Bot API directly (POST .../createForumTopic) to create
a topic named after the profile in the given group, and stores the REAL numeric
message_thread_id Telegram returns in the route, that id is what inbound routing
actually matches on.

Idempotent: a profile that already has a route with a NUMERIC thread_id is left alone
(no new topic is created, no API call made), safe to re-run on every profile push.
A profile whose existing route still has the old (broken) name-as-thread_id is treated
as needing a fix: a real topic is created and the route is corrected in place.

Limitation (Telegram API): there is no "list a group's topics" endpoint, so if a topic
is deleted by hand in Telegram, this script cannot detect that and will not recreate it
until its route entry is removed from config.yaml (then a re-run creates a fresh one).

Uses ruamel.yaml (round-trip mode) instead of plain PyYAML so existing comments and key
order in config.yaml are preserved, config.yaml ships with extensive inline
documentation comments that a safe_load/safe_dump round-trip would silently destroy.
"""
import sys

import requests
from ruamel.yaml import YAML

TELEGRAM_API_TIMEOUT_S = 20

# Custom emoji IDs from the "ExpertYelema" sticker set (https://t.me/addemoji/ExpertYelema).
EXPERT_EMOJI_IDS = {
    "adjoua": "5969576054027722422",
    "alioune": "5969618157592128985",
    "fatima": "5969999881400491290",
    "djeneba": "5969914433026138152",
    "ibrahim": "5971938685472481742",
    "koffi": "5969991635063283359",
    "fatou": "5969791682860819040",
    "salif": "5969881847109262972",
    "awa": "5969774936783330236",
    "nadia": "5972007623992548834",
    "kouassi": "5969773764257258928",
    "mamadou": "5969755441926777485",
}


def create_forum_topic(bot_token: str, chat_id: str, name: str, icon_custom_emoji_id: str = None) -> int:
    """POST createForumTopic; returns the new topic's numeric message_thread_id.

    Raises RuntimeError with Telegram's own error description on failure (e.g. the bot
    isn't an admin, the group isn't a forum, or, since Telegram exposes no "list
    topics" call, a topic with this name already exists from a previous manual/partial
    run and TOPIC_NAME_DUPLICATED-style errors come back as plain error text, not a
    structured code).
    """
    url = f"https://api.telegram.org/bot{bot_token}/createForumTopic"
    payload = {"chat_id": chat_id, "name": name}
    if icon_custom_emoji_id:
        payload["icon_custom_emoji_id"] = str(icon_custom_emoji_id)
    resp = requests.post(url, json=payload, timeout=TELEGRAM_API_TIMEOUT_S)
    data = resp.json()
    if not data.get("ok"):
        # If Telegram rejects custom emoji (e.g. PREMIUM_ACCOUNT_REQUIRED), fall back without icon
        if icon_custom_emoji_id and "PREMIUM" in data.get("description", "").upper():
            resp = requests.post(url, json={"chat_id": chat_id, "name": name}, timeout=TELEGRAM_API_TIMEOUT_S)
            data = resp.json()
        if not data.get("ok"):
            raise RuntimeError(data.get("description", f"HTTP {resp.status_code}"))
    return int(data["result"]["message_thread_id"])


def set_topic_icon(bot_token: str, chat_id: str, thread_id: int, icon_custom_emoji_id: str):
    """POST editForumTopic to apply the custom emoji icon to an existing topic."""
    url = f"https://api.telegram.org/bot{bot_token}/editForumTopic"
    payload = {
        "chat_id": chat_id,
        "message_thread_id": int(thread_id),
        "icon_custom_emoji_id": str(icon_custom_emoji_id),
    }
    resp = requests.post(url, json=payload, timeout=TELEGRAM_API_TIMEOUT_S)
    data = resp.json()
    if not data.get("ok"):
        print(f"notice: could not set custom emoji on topic {thread_id}: {data.get('description')}", file=sys.stderr)
        return False
    return True


def main():
    if len(sys.argv) != 5:
        print("Usage: add_profile_route.py <config.yaml> <profile> <chat_id> <bot_token>", file=sys.stderr)
        sys.exit(2)
    config_path, profile, chat_id, bot_token = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]

    # config.yaml uses the "offset" list style (list items indented 4 spaces under a
    # 2-space-indented key, i.e. the dash itself is offset 2 from the key). ruamel's
    # default (sequence=2, offset=0) differs and would reformat every list in the file
    # into a huge, unreviewable diff, match the file's actual style explicitly.
    yaml = YAML()
    yaml.preserve_quotes = True
    yaml.indent(mapping=2, sequence=4, offset=2)

    with open(config_path, "r", encoding="utf-8") as f:
        config = yaml.load(f) or {}

    gateway = config.setdefault("gateway", {})
    routes = gateway.setdefault("profile_routes", [])

    emoji_id = EXPERT_EMOJI_IDS.get(profile.lower().strip())

    existing = next(
        (r for r in routes if dict(r).get("platform") == "telegram" and dict(r).get("profile") == profile),
        None,
    )
    if existing is not None and str(dict(existing).get("thread_id", "")).isdigit():
        thread_id = int(dict(existing)["thread_id"])
        if emoji_id:
            set_topic_icon(bot_token, chat_id, thread_id, emoji_id)
        print(f"skip: profile={profile} already has a numeric topic (thread_id="
              f"{thread_id}), icon update attempted")
        return

    try:
        thread_id = create_forum_topic(bot_token, chat_id, profile, icon_custom_emoji_id=emoji_id)
    except RuntimeError as exc:
        print(f"ERROR: could not create Telegram topic for profile={profile}: {exc}", file=sys.stderr)
        print("       If a topic with this name already exists (e.g. created manually or by a "
              "previous broken run), Telegram gives no way to look up its id automatically: "
              "delete that topic by hand, or find its id and add the route manually.",
              file=sys.stderr)
        sys.exit(1)

    new_route = {
        "name": f"auto-{profile}",
        "platform": "telegram",
        "chat_id": str(chat_id),
        "thread_id": str(thread_id),
        "profile": profile,
    }

    # Replace any existing route for this profile on this platform instead of appending a
    # duplicate, keyed on (platform, profile) only, NOT chat_id: if the profile's route is
    # re-run against a different chat_id (e.g. the forum group was recreated), the old route
    # must be replaced, not left behind as a stale duplicate alongside the new one.
    kept = [
        r for r in routes
        if not (
            dict(r).get("platform") == "telegram"
            and dict(r).get("profile") == profile
        )
    ]
    kept.append(new_route)
    routes.clear()
    routes.extend(kept)

    with open(config_path, "w", encoding="utf-8") as f:
        yaml.dump(config, f)

    print(f"topic created + route written: profile={profile} chat_id={chat_id} thread_id={thread_id}")


if __name__ == "__main__":
    main()
`;
