import { PRODUCT_ACTIONS, productStore } from "../stores";
import { isServer } from "./environment.js";

/**
 * SSR에서 전달된 초기 데이터를 스토어에 복원
 */
export const hydrateStoreFromSSR = () => {
  if (isServer() || !window.__INITIAL_DATA__) {
    return false;
  }

  const data = window.__INITIAL_DATA__;

  try {
    // 홈페이지 데이터 복원
    if (data.products || data.categories || typeof data.totalCount !== "undefined") {
      productStore.dispatch({
        type: PRODUCT_ACTIONS.SETUP,
        payload: {
          products: data.products ?? [],
          categories: data.categories ?? {},
          totalCount: data.totalCount ?? 0,
          loading: false,
          error: null,
          status: "done",
        },
      });
    }

    // 상품 상세 페이지 데이터 복원
    if (data.currentProduct) {
      productStore.dispatch({
        type: PRODUCT_ACTIONS.SET_CURRENT_PRODUCT,
        payload: data.currentProduct,
      });
    }

    if (data.relatedProducts) {
      productStore.dispatch({
        type: PRODUCT_ACTIONS.SET_RELATED_PRODUCTS,
        payload: data.relatedProducts,
      });
    }

    // 메모리 정리
    cleanupInitialData();
    return true;
  } catch (error) {
    console.error("Failed to hydrate store from SSR data:", error);
    cleanupInitialData();
    return false;
  }
};

/**
 * window.__INITIAL_DATA__ 정리
 */
const cleanupInitialData = () => {
  try {
    delete window.__INITIAL_DATA__;
  } catch {
    window.__INITIAL_DATA__ = undefined;
  }
};
