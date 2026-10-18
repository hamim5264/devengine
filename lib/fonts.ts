export const SITE_FONTS = {
  default: {
    label: "Original typography (Poppins)",
    family: '"Poppins", "Inter", sans-serif',
  },
  "plus-jakarta-sans": {
    label: "Plus Jakarta Sans",
    family: '"Plus Jakarta Sans", "Poppins", sans-serif',
  },
} as const;

export type SiteFont = keyof typeof SITE_FONTS;

export function normalizeSiteFont(value: unknown): SiteFont {
  return typeof value === "string" && Object.hasOwn(SITE_FONTS, value)
    ? (value as SiteFont)
    : "default";
}
