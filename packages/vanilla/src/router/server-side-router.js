/**
 * 서버 전용 메모리 라우터
 * - 클라이언트 Router의 매칭 규칙을 그대로 따르되, window 의존 제거
 * - URL 문자열을 입력받아 라우트를 매칭하고 params/query를 추출
 */

export class ServerSideRouter {
  #routes;
  #route;
  #baseUrl;

  /**
   * @param {string} baseUrl 배포 베이스 경로 (예: "/front_6th_chapter4-1/vanilla")
   */
  constructor(baseUrl = "") {
    this.#routes = new Map();
    this.#route = null;
    this.#baseUrl = String(baseUrl).replace(/\/$/, "");
  }

  get baseUrl() {
    return this.#baseUrl;
  }

  get route() {
    return this.#route;
  }

  get params() {
    return this.#route?.params ?? {};
  }

  get target() {
    return this.#route?.handler;
  }

  get query() {
    return this.#route?.query ?? {};
  }

  /**
   * 라우트 등록
   * @param {string} path 경로 패턴 (예: "/product/:id/")
   * @param {(ctx: any) => any} handler 라우트 핸들러
   */
  addRoute(path, handler) {
    const paramNames = [];
    const regexPath = path
      .replace(/:\w+/g, (match) => {
        paramNames.push(match.slice(1));
        return "([^/]+)";
      })
      .replace(/\//g, "\\/");

    // baseUrl은 resolve 단계에서 제거되므로 정규식에는 포함하지 않음
    // 마지막 슬래시는 있거나 없거나 허용 (/?$)
    const regex = new RegExp(`^${regexPath}/?$`);

    this.#routes.set(path, {
      regex,
      paramNames,
      handler,
    });
  }

  /**
   * URL을 매칭하여 라우트/파라미터/쿼리를 반환
   * @param {string} url 전체 경로 (예: "/product/123/?q=a") 또는 베이스 포함 경로
   */
  match(url) {
    // WHATWG URL 사용 (베이스는 로컬 도메인으로 임의 설정)
    const parsed = new URL(url, "http://localhost");
    const pathname = parsed.pathname;
    const search = parsed.search;

    for (const [routePath, route] of this.#routes) {
      const match = pathname.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });

        const query = ServerSideRouter.parseQuery(search);

        return {
          ...route,
          params,
          query,
          path: routePath,
        };
      }
    }
    return null;
  }

  /**
   * 현재 라우트를 설정하고 결과를 반환
   * @param {string} url
   */
  resolve(url) {
    this.#route = this.match(this.#stripBase(url));
    return this.#route;
  }

  /**
   * 서버에서 전달된 원본 URL에서 baseUrl을 제거 (정규화)
   * @param {string} url
   */
  #stripBase(url) {
    if (!this.#baseUrl) return url;
    const parsed = new URL(url, "http://localhost");
    const normalized = parsed.pathname.replace(this.#baseUrl, "") + parsed.search + parsed.hash;
    return normalized || "/";
  }

  /**
   * 쿼리 파라미터를 객체로 파싱
   * @param {string} search "?a=1&b=2" 형태 문자열 또는 ""
   */
  static parseQuery(search = "") {
    const params = new URLSearchParams(search.startsWith("?") ? search : search ? `?${search}` : "");
    const query = {};
    for (const [key, value] of params) {
      if (value !== "" && value != null) {
        query[key] = value;
      }
    }
    return query;
  }
}
