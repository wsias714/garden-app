import { initFeedback } from "./lib/feedback.js";
import { dropboxRemote, isConnected } from "./sync/dropbox.ts";
import { ConflictError } from "./sync/remote.ts";

/** In-app Feedback button (shared module, see ~/Projects/_shared/feedback). Items go to Dropbox
    feedback/ with the same sign-in as sync; offline or signed out, they wait on the device. */
let opener: (() => void) | null = null;

export const openFeedback = () => opener?.();

export function startFeedback() {
  const fb = initFeedback({
    app: "garden",
    fab: false, // opened from Settings so it never covers the map
    upload: async (item) => {
      if (!isConnected()) throw new Error("not connected to Dropbox");
      try {
        await dropboxRemote().write(`/feedback/${item.id}.json`, JSON.stringify(item), null);
      } catch (e) {
        if (!(e instanceof ConflictError)) throw e;
      }
    },
  });
  opener = fb.open;
}
