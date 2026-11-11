/** Dropbox app key (public by design under PKCE: there is no secret). The Dropbox app is not
    registered yet: paste its key in Settings, or set VITE_DROPBOX_APP_KEY at build time. */
export const DEFAULT_DROPBOX_APP_KEY: string = import.meta.env?.VITE_DROPBOX_APP_KEY ?? "";

/** Rounded to 2 decimals (about 1 km): city-level, enough for weather, not an address. */
export const DEFAULT_LAT = 33.68;
export const DEFAULT_LON = -117.83;

export const APP_VERSION = "0.1.0";
