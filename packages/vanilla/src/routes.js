import {
  HomePage,
  getServerSideProps as getSeverSidePropsHomePage,
  serverSideRender as serverSideRenderHomePage,
} from "./pages/HomePage";
import {
  ProductDetailPage,
  getServerSideProps as getServerSidePropsProductDetailPage,
  serverSideRender as serverSideRenderProductDetailPage,
} from "./pages/ProductDetailPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export const routes = [
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
    path: "/product/:id",
    component: ProductDetailPage,
    getServerSideProps: getServerSidePropsProductDetailPage,
    serverSideRender: serverSideRenderProductDetailPage,
    meta: {
      title: (data) => `쇼핑몰 - ${data.currentProduct?.title || "상품 상세"}`,
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
