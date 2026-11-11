/** Dropbox app key "GardenJournal-wsias" (public by design under PKCE: there is no secret).
    Settings can override it, or set VITE_DROPBOX_APP_KEY at build time. */
export const DEFAULT_DROPBOX_APP_KEY: string = import.meta.env?.VITE_DROPBOX_APP_KEY ?? "9e9xjmksw6ou0ma";

/** Rounded to 2 decimals (about 1 km): city-level, enough for weather, not an address. */
export const DEFAULT_LAT = 33.68;
export const DEFAULT_LON = -117.83;

export const APP_VERSION = "0.1.0";
