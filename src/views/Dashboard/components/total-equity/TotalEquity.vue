<template>
  <div class="panel-container total-equity">
    <header class="panel-header">
      <h4 class="panel-title">Total Equity</h4>
      <div class="select-container">
        <v-select
          v-if="wallet.isConnected"
          v-model="state.range"
          class="line"
          :searchable="false"
          :options="optionsList"
          :reduce="item => item.value"
          @input="init"
        />
      </div>
    </header>
    <div class="panel" :class="{ blurred: !wallet.isConnected }">
      <div class="chart-container" style="position: relative; margin-top: 8px" @mouseleave="resetHover">
        <div id="hover-point" />
        <div id="hover-background" />
        <div id="hover-line" />
        <canvas id="myEquity" class="barChart" height="300px" />
        <maskLoading v-show="state.fetchLoading" />
      </div>
    </div>
    <div v-if="!wallet.isConnected" class="blur-cover-container">
      <div class="blur-cover" />
      <shorterButton type="primary" plain class="big btn-wallet" @click="wallet.visible = true">
        Unlock wallet
      </shorterButton>
    </div>
  </div>
</template>
<script setup>
import { reactive, onUnmounted, onMounted, watch } from "vue";

import { useSidebar } from "@/hooks/useSidebar";
import { useWallet } from "@/hooks/useWallet";
import { getMyStats } from "@/api/stats.js";
import { formatDate } from "@/utils/format";
import { getContractAddress } from "@/contract";
import { useTotalLineChart } from "./useTotalLineChart";

import maskLoading from "@/components/mask-loading.vue";
import { getSupportNetworkNames } from "@/middlewares/manifest/network";

const emit = defineEmits(["total"]);
const { wallet, account, chain } = useWallet();
const { initChart, resizeHandle } = useTotalLineChart();

const optionsList = [
  {
    value: 7,
    label: "1 Week",
  },
  {
    value: 30,
    label: "1 Month",
  },
];

const state = reactive({
  fetchLoading: false,
  range: 7,
});

const getDom = id => document.getElementById(id);

async function init(reload) {
  state.fetchLoading = true;

  const res = await getChartData(reload);
  if (!res) {
    return;
  }

  initChart(res);

  const resultD = (res.data || []).map(i => i.value * 1);
  emit("total", resultD[resultD.length - 1]);

  state.fetchLoading = false;
}

async function getChartData(reload = false) {
  const dataFromSession = getDataFromStorage();

  if (dataFromSession && !reload) {
    return dataFromSession;
  } else {
    const res = await getMyStatsData();
    return res;
  }
}

async function getMyStatsData() {
  if (!account.value) return;

  try {
    let res = await getMyStats(account.value, state.range);
    if (!res.status) return;
    saveDataToStorage(res.data);
    return res.data;
  } catch (e) {
    console.log("Cannot get data", e);
  }
}

function saveDataToStorage(result) {
  const { data, dates } = result;

  const keyValuePairs = dates.map((date, index) => [date, data[index]]);
  const saveResult = _.fromPairs(keyValuePairs);

  sessionStorage.setItem(`totalEquity_${state.range}_${getContractAddress().networkName}`, JSON.stringify(saveResult));
  sessionStorage.setItem(
    `totalEquity_${state.range}_ts_${getContractAddress().networkName}`,
    formatDate(new Date().getTime(), "YYYY/M/D"),
  );

  return saveResult;
}

function getDataFromStorage() {
  const localSaveTime = sessionStorage.getItem(`totalEquity_${state.range}_ts_${getContractAddress().networkName}`);
  const isToday = formatDate(new Date().getTime(), "YYYY/M/D") === localSaveTime;

  if (!isToday) return null;

  try {
    const dataStr = sessionStorage.getItem(`totalEquity_${state.range}_${getContractAddress().networkName}`);
    const storageData = JSON.parse(dataStr);
    if (!storageData) return null;
    // old version storage
    if (_.has(storageData, "dates")) return null;

    const result = {
      data: _.values(storageData),
      dates: _.keys(storageData),
    };
    return result;
  } catch (e) {
    return null;
  }
}

function clearSessionStorage() {
  const days = [7, 30];

  for (const d of days) {
    for (const n of getSupportNetworkNames()) {
      sessionStorage.removeItem(`totalEquity_${d}_${n}`);
      sessionStorage.removeItem(`totalEquity_${d}_ts_${n}`);
    }
  }
}

watch(
  () => state.range,
  () => {
    init();
    resetHover();
  },
);

const { isFold } = useSidebar();
watch(isFold, () => {
  setTimeout(() => {
    resizeHandle();
  }, 500);
});

watch(
  () => [chain.id, account.value],
  async () => {
    clearSessionStorage();
    init(true);
    resetHover();
  },
);

onMounted(async () => {
  init();
  window.onresize = _.debounce(() => {
    resizeHandle();
  }, 1500);
});

onUnmounted(() => {
  window.removeEventListener("resize", resizeHandle);
});

function resetHover() {
  const bgBox = getDom("hover-background");
  bgBox.style.left = "2000px";

  const bgLine = getDom("hover-line");
  bgLine.style.left = "2000px";

  if (!getDom("myEquity")) return;

  const bgPoint = getDom("hover-point");
  bgPoint.style.left = "2000px";
}
</script>

<style lang="scss" scoped>
#hover-background {
  width: 40px;
  height: 300px;
  background-color: #f25430;
  border-radius: 8px;
  opacity: 0.05;
  position: absolute;
  top: 0;
  left: 2000px;
  pointer-events: none;
}
#hover-line {
  width: 1px;
  background-color: #f25430;
  opacity: 0.5;
  position: absolute;
  bottom: 30px;
  left: 2000px;
}
#hover-point {
  background-color: #f25430;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 3.9px solid #fff;
  position: absolute;
  top: 0;
  left: 2000px;
  z-index: 1;
  pointer-events: none;
}

.barChart {
  width: 100%;
  height: 300px;
}

.panel-container {
  position: relative;
  .panel-header {
    position: relative;
    .select-container {
      position: absolute;
      right: 0;
      top: -4px;
      width: 186px;
    }
  }
  .panel {
    &.blurred {
      .chart-container {
        filter: blur(4px);
      }
    }
  }
  .blur-cover-container {
    position: absolute;
    left: 16px;
    top: 60px;
    right: 16px;
    bottom: 16px;
    border-radius: 24px;
    z-index: 99;
    overflow: hidden;

    .blur-cover {
      height: 100%;
      width: 100%;
      background: url("~@/assets/images/total_default.svg");
      background-size: 100% 100%;
      filter: blur(10px);
    }
    .btn-wallet {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 240px;
    }
  }
}
</style>
