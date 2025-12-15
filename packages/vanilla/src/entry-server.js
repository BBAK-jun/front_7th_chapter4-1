import {
  HomePage,
  getServerSideProps as getSeverSidePropsHomePage,
  serverSideRender as serverSideRenderHomePage,
} from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { logger as baseLogger } from "./lib/logger.js";
import { safeSerialize } from "./utils/serialize.js";

const logger = baseLogger.child({
  base: "ROOT_SERVER",
});

const routes = [
  {
    path: "/",
    component: HomePage,
    getServerSideProps: getSeverSidePropsHomePage,
    serverSideRender: serverSideRenderHomePage,
    meta: {
      title: "쇼핑몰 - 홈",
    },
  },
  {
    path: ".*",
    component: NotFoundPage,
    meta: {
      title: "404 Not Found",
    },
  },
];

export const render = async (url) => {
  const { router } = await import("./router/router");

  routes.forEach((route) => {
    router.addRoute(route.path, route);
  });

  const context = router.resolve(url);
  const routeConfig = context?.handler;

  if (!routeConfig || context.path === ".*") {
    return {
      head: renderHead("404 Not Found"),
      body: "",
      initialScript: "",
    };
  }

  try {
    logger.info(`Requested ${context.path}`);

    let initialData = null;
    if (routeConfig.getServerSideProps) {
      const result = await routeConfig.getServerSideProps(context);
      initialData = result.initialData;
    }

    const title = routeConfig.meta?.title || "쇼핑몰";

    let body = "";
    if (routeConfig.serverSideRender && initialData) {
      body = routeConfig.serverSideRender(initialData);
    }

    let initialScript = "";
    if (initialData) {
      initialScript = wrappingInitialDataScript(initialData);
    }

    return {
      head: renderHead(title),
      body,
      initialScript,
    };
  } catch (error) {
    logger.error(error);
    return {
      head: renderHead("Error"),
      body: "",
      initialScript: "",
    };
  }
};

const wrappingInitialDataScript = (data) => {
  return `<script>window.__INITIAL_DATA__ = ${safeSerialize(data)};</script>`;
};

const renderHead = (title = "쇼핑몰 - 홈") => {
  return `<title>${title}</title>`;
};
