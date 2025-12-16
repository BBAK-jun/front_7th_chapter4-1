import { routes } from "./routes";
import { logger as baseLogger } from "./lib/logger.js";
import { safeSerialize } from "./utils/serialize.js";

const logger = baseLogger.child({ base: "ROOT_SERVER" });

/**
 * 라우터 초기화 및 매칭
 * @param {string} url
 */
const resolveRoute = async (url) => {
  const { router } = await import("./router/router");

  // 라우트 등록 (최적화를 위해 최초 1회만 하거나, 중복 등록 허용되는지 확인 필요. 현재는 매 요청마다 수행)
  routes.forEach((route) => router.addRoute(route.path, route));

  const context = router.resolve(url);

  if (context) {
    context._cache = new Map();
  }

  return context;
};

/**
 * 데이터 로딩
 * @param {object} context
 */
const fetchData = async (context, routeConfig) => {
  if (!routeConfig?.getServerSideProps) {
    return null;
  }
  const result = await routeConfig.getServerSideProps(context);
  return result.initialData;
};

/**
 * HTML 생성자 빌더
 */
const buildHtmlResponse = (routeConfig, initialData) => {
  // Title 계산
  const metaTitle = routeConfig?.meta?.title;
  const title = typeof metaTitle === "function" ? metaTitle(initialData) : metaTitle || "쇼핑몰";

  // Body 렌더링
  const body = routeConfig?.serverSideRender && initialData ? routeConfig.serverSideRender(initialData) : "";

  // Head 렌더링
  const head = `<title>${title}</title>`;

  // Script 주입
  const initialScript = initialData ? `<script>window.__INITIAL_DATA__ = ${safeSerialize(initialData)};</script>` : "";

  return { head, body, initialScript };
};

const renderError = (error) => {
  logger.error(error);
  return {
    head: `<title>Error</title>`,
    body: "",
    initialScript: "",
  };
};

// 메인 렌더링 엔트리 (파이프라인)
export const render = async (url) => {
  try {
    const context = await resolveRoute(url);
    const routeConfig = context?.handler;

    // 404 처리
    if (!routeConfig || context.path === ".*") {
      const notFoundRoute = routes.find((r) => r.path === ".*");
      return buildHtmlResponse(notFoundRoute, null);
    }

    // SSR 데이터 페칭 및 HTML 생성
    const initialData = await fetchData(context, routeConfig);
    return buildHtmlResponse(routeConfig, initialData);
  } catch (error) {
    return renderError(error);
  }
};
