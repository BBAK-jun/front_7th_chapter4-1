import { registerGlobalEvents } from "./utils/index.js";
import { initRender } from "./render.js";
import { registerAllEvents } from "./events.js";
import { loadCartFromStorage } from "./services/index.js";
import { router } from "./router/index.js";
import { BASE_URL } from "./constants.js";

import { hydrateStoreFromSSR } from "./utils/hydration.js";

const enableMocking = () =>
  import("./mocks/browser.js").then(({ worker }) =>
    worker.start({
      serviceWorker: {
        url: `${BASE_URL}mockServiceWorker.js`,
      },
      onUnhandledRequest: "bypass",
    }),
  );

function main() {
  registerAllEvents();
  registerGlobalEvents();
  loadCartFromStorage();

  hydrateStoreFromSSR();

  initRender();
  router.start();
}

if (import.meta.env.MODE !== "test") {
  enableMocking().then(main);
} else {
  main();
}
