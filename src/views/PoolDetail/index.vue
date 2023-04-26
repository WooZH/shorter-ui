<template>
  <Layout back="Pools">
    <template #title>
      <div class="title">
        <strong>Pool</strong>
        <span class="subtitle">#{{ $route.params.id }}</span>
        <div v-if="!pageLoading.pool" :class="['status', `status-${poolInfo?.poolInfo.stateFlag}`]">
          <span v-if="poolStatusTag === 'Liquidating' && noActivePosition">Ended</span>
          <span v-else>{{ poolStatusTag }}</span>
        </div>
      </div>
    </template>

    <div class="panel-group">
      <div class="lt">
        <PoolInfo :info="poolInfo" :end-time="endTime" :count="count" :loading="pageLoading" />
        <MyPortfolio :portfolio="poolInfo" :loading-borrow="pageLoading.position" :loading-deposit="pageLoading.pool" />
      </div>

      <div class="rt">
        <DWController
          v-if="showController"
          :legacy="legacyPositionCount"
          :info="poolInfo"
          :loading="pageLoading.pool"
          @deal="dealDone"
        />
        <Trade
          v-if="poolInfo.poolInfo?.stateFlag * 1 === 1"
          :info="poolInfo"
          :loading="pageLoading.trader"
          @order="handleRefresh"
        />
      </div>
    </div>

    <Positions
      :all="poolInfo.allPositions"
      :my="poolInfo.myPositions"
      :loading="pageLoading.position"
      @sell="handleRefresh"
    />
  </Layout>
</template>

<script setup>
import { ref, computed, onBeforeMount, onBeforeUnmount, provide, reactive, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import PoolInfo from "./components/PoolInfo.vue";
import MyPortfolio from "./components/MyPortfolio.vue";
import Positions from "./components/Positions.vue";
import DWController from "./components/DWController.vue";
import Trade from "./components/Trade.vue";

import { getFeedPrice } from "@/contract/priceOracle";
import { getCurBlockNumber } from "@/utils/block";
import { usePoolDetail } from "@/hooks/usePoolDetail";
import { useWallet } from "@/hooks/useWallet";
import { useInterval } from "@/hooks/useInterval";

const { account, wallet, chain } = useWallet();
const route = useRoute();
const router = useRouter();
const { addNormalPriorityInterval, clearTimerInterval } = useInterval();

const { initDetail, getPositionsByPool, getParticipateCount, getPoolInfoById, getAllPoolsId } = usePoolDetail();

let pageLoading = reactive({
  pool: true,
  position: true,
  counts: true,
  trader: true,
  dw: true,
  firstLoad: true,
});

const count = reactive({
  traderCount: 0,
  providerCount: 0,
});

const endTime = ref("");

const poolInfo = ref({
  poolInfo: {
    allocPoint: "100",
    borrowedAmount: 0,
    creator: "",
    currentAmount: "",
    decimals: "",
    durationDays: "",
    endBlock: "",
    endTime: "",
    id: "",
    lastRewardBlock: "",
    maxLeverage: "",
    multiplier: "",
    sTokenAddress: "",
    stableToken: "",
    stableTokenDecimals: 0,
    stakedAmount: "",
    stakedTokenPrice: 0,
    startBlock: "",
    stateFlag: 1,
    tokenAddress: "",
    tokenName: "",
  },

  history: {},

  userInfoByPool: {
    amount: "0",
    borrowedAmount: "0",
    pendingIpistrs: "0",
    usdAmount: "0",
  },

  token: null,
  withdrawable: 0,
  totalAllocPoint: 1,
  firstLoad: true,
  canWithdraw: true,
  createTime: "",
  endTime: "",
  allPositions: [],
  myPositions: [],
  APY: 0,
  withdrawStaked: 0,
  withdrawStableAmount: 0,
  loading: {
    fetchDetail: true,
    fetchAllPositions: true,
  },
  count: {
    providerCount: 0,
    traderCount: 0,
  },
});

const stakedTokenPrice = computed(() => {
  return poolInfo.value.poolInfo.stakedTokenPrice;
});
provide("stakedTokenPrice", stakedTokenPrice);

const showController = computed(() => {
  if (poolInfo.value.poolInfo?.stateFlag * 1 !== 4) return true;
  if (poolInfo.value.poolInfo?.stakedAmount * 1 === 0 && poolInfo.value.poolInfo?.usdAmount * 1 === 0) {
    return false;
  }
  return true;
});

const noActivePosition = computed(() => {
  let sum = 0;
  poolInfo.value.allPositions.forEach(item => {
    if (item.state !== 8) sum++;
  });
  return !sum;
});

const legacyPositionCount = computed(() => {
  let sum = 0;
  poolInfo.value.allPositions.forEach(item => {
    if (item.state === 4) sum++;
  });
  return sum;
});

/**
 * @description: 合约对应状态 1 running 2 liquidating 3 recover 4 ended
 * @param {*}
 * @return {*} running / liquidating / ended
 */
const poolStatusTag = computed(() => {
  if (poolInfo.value?.poolInfo.stateFlag * 1 === 1) {
    return "Running";
  }
  if (poolInfo.value?.poolInfo.stateFlag * 1 === 2 || poolInfo.value?.poolInfo.stateFlag * 1 === 3) {
    return "Liquidating";
  }
  if (poolInfo.value?.poolInfo.stateFlag * 1 === 4) {
    return "Ended";
  }
  return "error";
});

watch(
  () => chain.id,
  () => {
    setTimeout(() => {
      const backQuery = Object.assign({}, route.query);
      router.replace({ name: "Pools", query: backQuery });
    }, 1000);
  },
);

watch(
  () => [wallet.isConnected, account.value],
  async () => {
    if (!pageLoading.firstLoad) {
      pageLoading.pool = true;
      pageLoading.position = true;
      pageLoading.trader = true;
      pageLoading.counts = true;
      poolInfo.value.loading.fetchDetail = true;
      await initPool();
    }
  },
);

onBeforeMount(async () => {
  document.title = `Pool #${route.params.id} | Shorter`;
  initDetail();

  try {
    poolInfo.value.loading.fetchDetail = true;
    await initPool();
  } catch (e) {
    console.log("init pool error =>", e);
  } finally {
    pageLoading.firstLoad = false;
    poolInfo.value.loading.fetchDetail = false;
  }
});

onBeforeUnmount(() => {
  initDetail();
});

async function initPool() {
  const res = await getAllPoolsId();

  const isExist = res.includes(route.params.id.toString());
  if (!isExist) {
    router.replace({ name: "404", query: route.query });
    return;
  }

  await initPoolDetail();

  const isPoolDetailPage = route.name === "PoolDetail";
  if (!isPoolDetailPage) {
    clearTimerInterval();
    return;
  }

  if (poolInfo.value.poolInfo?.stateFlag * 1 !== 4) {
    addTimerInterval();
  }
}

async function getFeedPriceData() {
  const token = await getFeedPrice(poolInfo.value.poolInfo.tokenAddress);
  poolInfo.value.poolInfo.stakedTokenPrice = token.price;
}

async function getPositionsData(from) {
  const positionsRes = await getPositionsByPool(route.params.id, poolInfo.value.poolInfo, from);
  poolInfo.value.allPositions = positionsRes?.allPositions || (from ? poolInfo.value.allPositions : []);
  poolInfo.value.myPositions = positionsRes?.myPositions || (from ? poolInfo.value.myPositions : []);
}

async function refreshPositions() {
  pageLoading.position = true;
  await getPositionsData();
  pageLoading.position = false;
}

// 初始化页面数据
async function initPoolDetail() {
  await getCurBlockNumber();

  const result = await getPoolInfoById(route.params.id);
  if (JSON.stringify(result) !== "{}") {
    poolInfo.value = result;
  }

  // 结束时间仅需要计算一次
  if (endTime.value) {
    poolInfo.value.endTime = endTime.value;
  } else {
    endTime.value = poolInfo.value.endTime;
  }

  pageLoading.pool = false;

  getTradeAndProviderCount();
  await getPositionsData();
  pageLoading.position = false;
  pageLoading.trader = false;

  return poolInfo.value;
}

async function dealDone() {
  getRroviderCount();
  poolInfo.value = await getPoolInfoById(route.params.id);
}

async function handleRefresh() {
  await Promise.all([refreshPositions(), getTraderCount()]);
}

async function getTradeAndProviderCount() {
  pageLoading.counts = false;

  const res = await getParticipateCount(route.params.id);
  count.traderCount = res.traders;
  count.providerCount = res.providers;

  pageLoading.counts = false;
}

async function getTraderCount() {
  pageLoading.trader = true;

  const res = await getParticipateCount(route.params.id);
  count.traderCount = res.traders;

  pageLoading.trader = false;
}

async function getRroviderCount() {
  const res = await getParticipateCount(route.params.id);
  count.providerCount = res.providers;
}

function addTimerInterval() {
  const cb = async () => {
    await getFeedPriceData();
    getPositionsData("poolDetail");
  };

  addNormalPriorityInterval(cb);
}
</script>

<style lang="scss" scoped>
.title {
  @include flex-center-v;
  font-size: 32px;

  strong {
    font-weight: 600;
  }

  .subtitle {
    color: #a4a5b2;
    margin-left: 10px;
  }

  .status {
    @include flex-center-v;
    height: 26px;
    padding: 0 10px;
    margin-left: 10px;
    border-radius: 14px;
    border: 1px solid #a4a5b2;
    font-weight: 600;
    font-size: 14px;
    color: #a4a5b2;

    &.status-0 {
      color: #a4a5b2;
      border-color: #a4a5b2;
    }

    &.status-1 {
      color: $green;
      border-color: $green;
    }

    &.status-2 {
      color: #36b1ff;
      border-color: #36b1ff;
    }
    &.status-3 {
      color: #36b1ff;
      border-color: #36b1ff;
    }
  }
}
.panel-group {
  @include flex;
  margin: -16px;

  > .lt {
    @include flex;
    flex-direction: column;
    flex: 2.3;
    min-width: 640px;
  }

  > .rt {
    flex: 1;
    min-width: 306px;
  }
}
</style>
