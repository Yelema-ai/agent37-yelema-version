// Icon of each expert's Telegram topic: only custom_emoji_ids from getForumTopicIconStickers, the one list
// Telegram accepts from a bot (read 2026-10-26). Mirror of the gateway's apps/runtime-gateway/src/telegram/topicIcons.ts.
export const TOPIC_ICONS: Record<string, string> = {
  adjoua: "5309965701241379366", // 🔎 recrutement
  alioune: "5309958691854754293", // 💎 investissement
  awa: "5417915203100613993", // 💬 support client
  djeneba: "5433614043006903194", // 📆 assistanat de direction
  fatima: "5309984423003823246", // 📣 marketing
  fatou: "5348227245599105972", // 💼 RH et paie
  ibrahim: "5350548830041415279", // 🏛 juridique
  koffi: "5310039132297242441", // 🎨 design de marque
  kouassi: "5350452584119279096", // 💰 commercial
  mamadou: "5355127101970194557", // 🧮 finance
  nadia: "5350305691942788490", // 📈 données
  salif: "5357315181649076022", // 📁 opérations
  yele: "5312536423851630001", // 💡 accompagnement Yelema
};

// The table as a Python dict literal, for the routing script that runs on the instance.
export const TOPIC_ICONS_PY = JSON.stringify(TOPIC_ICONS);
