<template>
  <Layout title="Dashboard">
    <div class="panel-group">
      <div class="lt">
        <TotalEquity @total="getTotal" />
        <ShortPosition :position-count="positions.positionCount" :positions="positions" />
      </div>
      <div class="rt">
        <AccountOverview :total="state.yesterdayTotal" :overview="overviewRes" />
      </div>
    </div>
  </Layout>
</template>
<script setup>
import { reactive, watch, ref } from "vue";

import TotalEquity from "./components/total-equity/TotalEquity.vue";
import AccountOverview from "./components/Overview.vue";
import ShortPosition from "./components/ShortPosition.vue";

import * as TradingHub from "@/contract/tradingHub";

import { usePosition } from "@/hooks/usePosition";
import { useOverview } from "@/hooks/useOverview";
import { useWallet } from "@/hooks/useWallet";
import { useInterval } from "@/hooks/useInterval";

const state = reactive({
  loadMoreCount: 1,
  yesterdayTotal: 0,
});

const positions = reactive({
  list: [],
  loading: true,
  positionCount: 0,
});

let overviewRes = ref({
  loading: true,
  data: {},
});

const { getMyOpenPositions, position } = usePosition();
const { refreshUserPositions } = useOverview();
const { chain, account } = useWallet();
const { addNormalPriorityInterval } = useInterval();

watch(
  () => [chain.id, account.value],
  async () => {
    if (!account.value) {
      return;
    }
    overviewRes.value.loading = true;

    await getPositionData();
    await getOverviewData();
    addNormalPriorityInterval(getPositionList);
  },
  { immediate: true },
);

async function getPositionList() {
  positions.list = await getMyOpenPositions(account.value);
}

async function getPositionData() {
  positions.list = [];
  position.loading = true;
  await getPositionList();
  position.loading = false;
  positions.positionCount = await getPositionCount();
}

async function getOverviewData() {
  overviewRes.value.data = await refreshUserPositions(positions.list);
  overviewRes.value.loading = false;
}

async function getPositionCount() {
  const openSize = await TradingHub.userPositionSize(account.value);
  return Number(openSize.toString());
}

function getTotal(value) {
  state.yesterdayTotal = value;
}
</script>
<style lang="scss" scoped>
.panel-group {
  @include flex;
  margin: 0 -16px;
  .lt {
    flex: 1.8;
  }
  .rt {
    flex: 1;
    min-width: 365px;
  }
}
</style>
