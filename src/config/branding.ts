// Branding lives in code, not env — one Yelema brand for every client deployment.
// `logoUrl` (the wordmark) is a file in /public, never redrawn. The square violet Y Leslie chose on
// 11/10 is only the tab icon (src/app/icon.svg, favicon.ico, apple-icon.png), never the menu: the
// top of the menu shows the company's main logo, or its initial (Sidebar.tsx).
export const branding = {
  appName: "Yelema",
  logoUrl: "/yelema-long.png",
} as const;
