#!/usr/bin/env python3
"""
boost_telegram_group.py - Boost automatique de supergroupe Telegram via compte Premium (MTProto).
Usage: boost_telegram_group.py <chat_id>
Variables d'environnement attendues:
  - TELEGRAM_API_ID
  - TELEGRAM_API_HASH
  - TELEGRAM_SESSION_STRING
"""

import os
import sys
import json
import asyncio
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.tl.functions.premium import ApplyBoostRequest, GetMyBoostsRequest
from telethon.errors import RPCError


async def boost_group(chat_id_arg: str):
    api_id = os.environ.get("TELEGRAM_API_ID")
    api_hash = os.environ.get("TELEGRAM_API_HASH")
    session_str = os.environ.get("TELEGRAM_SESSION_STRING")

    if not api_id or not api_hash or not session_str:
        print(json.dumps({
            "ok": False,
            "error": "missing_credentials",
            "message": "TELEGRAM_API_ID, TELEGRAM_API_HASH ou TELEGRAM_SESSION_STRING manquant dans l'environnement."
        }))
        sys.exit(1)

    try:
        api_id_int = int(api_id)
    except ValueError:
        print(json.dumps({
            "ok": False,
            "error": "invalid_api_id",
            "message": "TELEGRAM_API_ID doit être un entier numérique."
        }))
        sys.exit(1)

    client = TelegramClient(StringSession(session_str), api_id_int, api_hash)
    await client.connect()

    if not await client.is_user_authorized():
        print(json.dumps({
            "ok": False,
            "error": "unauthorized",
            "message": "La session Telegram fournie n'est plus autorisée ou a expiré."
        }))
        await client.disconnect()
        sys.exit(1)

    try:
        try:
            target_id = int(chat_id_arg)
        except ValueError:
            target_id = chat_id_arg

        peer = await client.get_input_entity(target_id)

        # Récupérer les boosts de l'utilisateur
        my_boosts = await client(GetMyBoostsRequest())
        my_slots = getattr(my_boosts, "my_boosts", [])

        slots_to_apply = []
        if my_slots:
            for b in my_slots:
                slots_to_apply.append(getattr(b, "slot", 0))
        else:
            slots_to_apply = [0, 1]

        # Dédupliquer les slots
        slots_to_apply = list(dict.fromkeys(slots_to_apply))

        try:
            await client(ApplyBoostRequest(peer=peer, slots=slots_to_apply))
            print(json.dumps({
                "ok": True,
                "message": f"Boost appliqué avec succès au groupe {chat_id_arg}",
                "slots": slots_to_apply
            }))
        except RPCError as rpc_err:
            desc = str(rpc_err)
            if "BOOSTS_EMPTY" in desc or "SLOTS_EMPTY" in desc:
                await client(ApplyBoostRequest(peer=peer, slots=[0]))
                print(json.dumps({
                    "ok": True,
                    "message": f"Boost appliqué au groupe {chat_id_arg} (slot 0)",
                    "slots": [0]
                }))
            elif "ALREADY_BOOSTED" in desc or "CHAT_BOOST_EXISTS" in desc:
                print(json.dumps({
                    "ok": True,
                    "message": f"Le groupe {chat_id_arg} bénéficie déjà de votre boost.",
                    "already_boosted": True
                }))
            else:
                raise rpc_err

    except Exception as e:
        print(json.dumps({
            "ok": False,
            "error": "boost_failed",
            "message": str(e)
        }))
        sys.exit(1)
    finally:
        await client.disconnect()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "ok": False,
            "error": "missing_chat_id",
            "message": "Usage: boost_telegram_group.py <chat_id>"
        }))
        sys.exit(1)

    asyncio.run(boost_group(sys.argv[1]))
