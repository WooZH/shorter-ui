<template>
  <Layout
    title="Governance"
    :subtitle="state.noticeVisible ? 'Rulers can earn IPISTR by processing liquidations and voting proposals.' : ''"
  >
    <div class="panel-group">
      <div class="panel-list">
        <!-- <LiquidationStats class="panel-item" /> -->
        <CommitteeStatus class="panel-item" />
        <ProposalsCounter class="panel-item" />
      </div>
      <RecentProposals />
      <TopRulers />
    </div>
  </Layout>
</template>
<script setup>
import { computed, provide, reactive } from "vue";
import { onBeforeRouteLeave, useRouter } from "vue-router";

// import LiquidationStats from "./components/LiquidationStats.vue";
import CommitteeStatus from "./components/CommitteeStatus.vue";
import ProposalsCounter from "./components/ProposalsCounter.vue";
import RecentProposals from "./components/RecentProposals.vue";
import TopRulers from "./components/TopRulers.vue";

import { useWallet } from "@/hooks/useWallet";

const state = reactive({
  noticeVisible: computed(() => {
    if (_.isBoolean(account.isRuler) && account.isRuler === false) {
      return true;
    }
    return false;
  }),
});

provide("loading", reactive({}));
provide("events", reactive({}));
provide(
  "proposalsCounter",
  reactive({
    active: 0,
    passed: 0,
    failed: 0,
    error: 0,
    total: 0,
  }),
);

const { account } = useWallet();
const router = useRouter();
const changeRouterKeepAlive = (name, keepAlive) => {
  router.options.routes.map(item => {
    if (item.name === name) {
      item.meta.keepAlive = keepAlive;
    }
  });
};

onBeforeRouteLeave((to, from) => {
  if (to.name !== "Proposals" && to.name !== "ProposalDetail") {
    changeRouterKeepAlive(from.name, false);
  } else {
    changeRouterKeepAlive(from.name, true);
  }
});
</script>
<style lang="scss" scoped>
.panel-group {
  margin: -16px;
}

.panel-list {
  @include flex;
  justify-content: space-between;

  .panel-item {
    &:not(&:first-child) {
      flex: 1;
    }
  }
}
</style>
