import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/cormorant-garamond/latin-600-italic.css";
import "@fontsource/nunito/latin-400.css";
import "@fontsource/nunito/latin-600.css";
import "@fontsource/pinyon-script/latin-400.css";
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { startFeedback } from "./feedback.ts";

startFeedback();
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
