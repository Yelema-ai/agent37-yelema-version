#!/usr/bin/env python3
"""
setup_telegram_premium.py - Générateur de session Telegram MTProto (StringSession) pour le compte Premium.
Permet d'obtenir TELEGRAM_SESSION_STRING une seule fois.
"""

import asyncio
from telethon import TelegramClient
from telethon.sessions import StringSession


async def main():
    print("=== Configuration du compte Telegram Premium pour les Boosts automatiques ===")
    print("Obtenez votre api_id et api_hash sur https://my.telegram.org (gratuit, 1 minute).")
    print()

    api_id_input = input("Entrez votre API ID: ").strip()
    api_hash_input = input("Entrez votre API HASH: ").strip()

    if not api_id_input or not api_hash_input:
        print("Erreur: API ID et API HASH sont requis.")
        return

    api_id = int(api_id_input)
    api_hash = api_hash_input

    client = TelegramClient(StringSession(), api_id, api_hash)
    await client.start()

    session_string = client.session.save()
    print()
    print("Authentification réussie !")
    print("================================================================================")
    print("Votre TELEGRAM_SESSION_STRING:")
    print(session_string)
    print("================================================================================")
    print()
    print("Pour l'activer dans le projet, ajoutez ces 3 lignes dans votre .env.local :")
    print(f"TELEGRAM_API_ID={api_id}")
    print(f"TELEGRAM_API_HASH={api_hash}")
    print(f"TELEGRAM_SESSION_STRING={session_string}")
    print()

    # Sauvegarde automatique dans .env.local si souhaité
    save = input("Voulez-vous ajouter automatiquement ces variables dans .env.local ? (o/n): ").strip().lower()
    if save in ["o", "oui", "y", "yes"]:
        env_path = ".env.local"
        lines = []
        if os.path.exists(env_path):
            with open(env_path, "r") as f:
                lines = [l for l in f.readlines() if not any(l.startswith(k) for k in ["TELEGRAM_API_ID=", "TELEGRAM_API_HASH=", "TELEGRAM_SESSION_STRING="])]
        lines.append(f"\nTELEGRAM_API_ID={api_id}\n")
        lines.append(f"TELEGRAM_API_HASH={api_hash}\n")
        lines.append(f"TELEGRAM_SESSION_STRING={session_string}\n")
        with open(env_path, "w") as f:
            f.writelines(lines)
        print("Configuration enregistrée dans .env.local avec succès !")

    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
