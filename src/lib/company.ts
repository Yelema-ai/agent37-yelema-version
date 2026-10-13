// The company profile, as the back office deduces it from what exists: a logo, a presentation (a
// note of the company memory), reference documents. Nothing is ticked by hand.
export interface CompanyProfile {
  logo: boolean;
  note: boolean;
  document: boolean;
  done: number;
  total: number;
  /** The logo's address, carrying its version: a replaced logo changes address. */
  logoUrl: string | null;
}

export const LOGO_MAX_BYTES = 5 * 1024 * 1024;
export const LOGO_ACCEPT = "image/png,image/jpeg,image/webp";
export const PRESENTATION_TITLE = "Présentation de l’entreprise";
