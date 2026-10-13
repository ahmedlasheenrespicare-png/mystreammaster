import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import { RouterProvider } from "./router";
import "./index.css";

/* HTML الصفحات جاء مُرسمًا مسبقًا وقت البناء → نُكمل عليه (hydrate)
   أما في وضع التطوير فلا يوجد رسم مسبق → نبني من الصفر (createRoot) */
const container = document.getElementById("root")!;
const tree = (
  <React.StrictMode>
    <RouterProvider>
      <App />
    </RouterProvider>
  </React.StrictMode>
);

if (container.hasChildNodes()) {
  hydrateRoot(container, tree);
} else {
  createRoot(container).render(tree);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* Offline support is optional. */ });
  });
}
