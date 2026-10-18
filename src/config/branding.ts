// Branding lives in code, not env — one Yelema brand for every client deployment.
// `logoUrl` (the wordmark) and `markUrl` (the square Y, the violet one Leslie chose on 11/10; also
// src/app/icon.svg, favicon.ico and apple-icon.png) are files in /public, never redrawn. A
// deployment can show its client's logo in the menu with BRAND_LOGO_URL (see runtime-config.ts).
export const branding = {
  appName: "Yelema",
  logoUrl: "/yelema-long.png",
  markUrl: "/yelema_y_violet.svg",
} as const;
