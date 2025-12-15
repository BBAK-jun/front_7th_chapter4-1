// 글로벌 라우터 인스턴스
import { UniversalRouter } from "./universal-router.js";
import { BASE_URL } from "../constants.js";

export const router = new UniversalRouter(BASE_URL);
