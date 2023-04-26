import { createApp } from "vue";
import NP from "number-precision";
import * as Sentry from "@sentry/vue";
import { BrowserTracing } from "@sentry/tracing";

import App from "./App.vue";
import router from "./router";
import globalComponents from "@/components";

import { checkEnv } from "@/env/index";

import "./plugins/icons";
import "./plugins/dayjs";
import "./styles/index.scss";
import "./styles/vue-select.css";

import copy from "@/directives/copy";
import numberOnly from "@/directives/numberOnly";
import tooltip from "@/directives/tip";

NP.enableBoundaryChecking(false);

checkEnv().then(() => {
  const app = createApp(App);

  const host = window.location.host;
  if (host.includes("shorter.finance")) {
    Sentry.init({
      app,
      dsn: "https://d93aa26725194376af360e9fee87491e@o1160947.ingest.sentry.io/6383560",
      integrations: [
        new BrowserTracing({
          routingInstrumentation: Sentry.vueRouterInstrumentation(router),
          tracingOrigins: ["ipilabs.com", "shorter.finance", /^\//],
        }),
      ],
    });
  }

  app.use(copy).use(numberOnly).use(tooltip).use(globalComponents).use(router).mount("#app");
});
