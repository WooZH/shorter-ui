import { createRouter, createWebHistory } from "vue-router";
import RouterMap from "./map";

const routes = [
  {
    path: "/:pathMatch(.*)*",
    redirect: "/404",
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes: routes.concat(RouterMap),
});

router.beforeEach((to, from, next) => {
  const title = to.meta.title ? to.meta.title : to.name;
  if (title && !to.meta.customTitle) document.title = `${title} | Shorter Finance`;
  next();
});

router.onError(err => {
  if (/loading chunk \d* failed./i.test(err.message)) {
    // 路由chunk报错  直接reload
    window.location.reload();
  }
});

export default router;
