import { ClientSideRouter } from "./client-side-router.js";
import { ServerSideRouter } from "./server-side-router.js";

/**
 * 유니버설 라우터 (지연평가)
 * - 서버: ServerRouter 사용
 * - 클라이언트: Router 사용
 * - 최초 사용 시점에 실제 라우터 인스턴스를 생성
 */
export class UniversalRouter {
  #instance;
  #baseUrl;

  constructor(baseUrl = "") {
    this.#instance = null;
    this.#baseUrl = String(baseUrl).replace(/\/$/, "");
  }

  #isServer() {
    try {
      // import.meta.env는 Vite SSR에서 주입됨
      // window 부재는 Node(서버) 환경 지표

      return typeof window === "undefined" || (!!import.meta?.env && !!import.meta.env.SSR);
    } catch {
      return true;
    }
  }

  #ensure() {
    if (this.#instance) return this.#instance;
    this.#instance = this.#isServer() ? new ServerSideRouter(this.#baseUrl) : new ClientSideRouter(this.#baseUrl);
    return this.#instance;
  }

  get baseUrl() {
    return this.#baseUrl;
  }

  get route() {
    return this.#ensure().route ?? null;
  }

  get params() {
    return this.#ensure().params ?? {};
  }

  get target() {
    return this.#ensure().target;
  }

  get query() {
    return this.#ensure().query ?? {};
  }

  set query(newQuery) {
    const inst = this.#ensure();
    try {
      // 클라이언트 Router는 setter가 있으며, 서버는 존재하지 않음 → 서버에서는 조용히 무시
      inst.query = newQuery;
    } catch {
      /* noop for server */
    }
  }

  addRoute(path, handler) {
    this.#ensure().addRoute(path, handler);
  }

  // 서버 전용 매칭(클라에서는 사용하지 않음)
  match(url) {
    const inst = this.#ensure();
    if (typeof inst.match === "function") return inst.match(url);
    throw new Error("UniversalRouter.match() is server-only");
  }

  // 서버 전용 resolve(클라에서는 사용하지 않음)
  resolve(url) {
    const inst = this.#ensure();
    if (typeof inst.resolve === "function") return inst.resolve(url);
    throw new Error("UniversalRouter.resolve() is server-only");
  }

  // 클라이언트 내비게이션 (서버에서는 no-op)
  push(url) {
    const inst = this.#ensure();
    if (typeof inst.push === "function") inst.push(url);
  }

  // 클라이언트 시작 (서버에서는 no-op)
  start() {
    const inst = this.#ensure();
    if (typeof inst.start === "function") inst.start();
  }

  // 클라이언트 구독 (서버에서는 no-op)
  subscribe(fn) {
    const inst = this.#ensure();
    if (typeof inst.subscribe === "function") inst.subscribe(fn);
  }
}
