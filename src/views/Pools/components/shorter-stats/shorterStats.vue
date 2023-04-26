<template>
  <div class="shorter-stats">
    <div class="header-box">
      <div class="strong title">
        {{ title }}
      </div>
      <shorterSkeleton v-if="state.fetchLoading" animated style="padding-top: 36px">
        <template #template>
          <shorterSkeletonItem style="width: 200px; height: 67px" />
        </template>
      </shorterSkeleton>
      <div v-else class="main-price">${{ transAmount(state.total) }}</div>
    </div>
    <div class="chart-wrap" @mouseleave="resetHover">
      <div id="hover-line" />
      <canvas id="LineChart" class="line-chart" width="100%" height="350" />
      <maskLoading v-show="state.fetchLoading" />
    </div>
  </div>
</template>
<script setup>
import { ref, reactive, onUnmounted, onMounted, watchEffect, watch } from "vue";
import { useRoute } from "vue-router"

import maskLoading from "@/components/mask-loading.vue";

import { getPoolStats } from "@/api/stats.js";
import { getContractAddress } from "@/contract";
import { formatDate } from "@/utils/format";
import { Local } from "@/utils/localStorage";
import { useSidebar } from "@/hooks/useSidebar";

import { useWallet } from "@/hooks/useWallet";
import { useStatsLineChart } from './useStatsLineChart'

const props = defineProps({
  title: {
    type: String,
    default: "Shorter Stats",
  },
  loading: {
    type: Boolean,
    default: true,
  },
})

const state = reactive({
  total: "",
  fetchLoading: true,
});

const { initChart, transAmount, resizeHandle }  = useStatsLineChart()

async function init() {
  const result = await getPoolStatsData()
  if (!result) return;

  state.total = result.tvl
  state.fetchLoading = false

  initChart(result)
}

async function getPoolStatsData() {
  const resFromStorage = getPoolDataFromStorage();

  if (resFromStorage) {
    return resFromStorage;
  } else {
    const res = await getPoolStats();
    for (const key in res) {
      savePoolDataToStorage(res, key)
    }
    return res[route.name.toLowerCase()]
  }
}

function getPoolDataFromStorage() {
  const shorterStorage = Local.get("shorterStorage");
  const poolStats = shorterStorage[getContractAddress().networkName].common.poolStats;

  const cateName = route.name.toLowerCase()
  const lastDate = poolStats[cateName + 'Ts']
  const yesterday = formatDate(new Date().getTime() - 60 * 60 * 24 * 1000, "YYYYMMDD");
  const isToday = yesterday === lastDate;
  if (!isToday) return null;

  const dataFromSession = poolStats[cateName];
  if (!dataFromSession) return null;

  const result = _.omit(dataFromSession, ['data']);

  const oldData = dataFromSession.data;
  const dates = []
  const allDatas = []
  for(const key in oldData) {
    dates.push(key);
    allDatas.push(oldData[key])
  }
  result.dates = dates;

  const newData = [];
  const hasTokens = _.keys(allDatas[0]);
  for (const token of hasTokens) {
    const tokenAllData = allDatas.map(i => i[token]);
    newData.push({
      name: token,
      data: tokenAllData
    });
  }

  result.data = newData;

  return result;
}

function savePoolDataToStorage(res, cateName) {
  const { dates, data } = res[cateName];

  const saveResult = _.omit(res[cateName], ['dates', 'data']);
  saveResult.data = {};

  for (const [index, date] of dates.entries()) {
    const dataOfDate = {}

    for (const dataItem of data) {
      dataOfDate[dataItem.name] = dataItem.data[index]
    }

    saveResult.data[date] = dataOfDate;
  }

  const shorterStorage = Local.get("shorterStorage");
  const poolStats = shorterStorage[getContractAddress().networkName].common.poolStats;
  const newPoolStats = Object.assign(_.omit(poolStats, [cateName, cateName + 'Ts']), {
    [cateName]: saveResult,
    [cateName + "Ts"]: dates[dates.length - 1]
  });

  shorterStorage[getContractAddress().networkName].common.poolStats = newPoolStats;
  Local.set("shorterStorage", shorterStorage);
}

const { chain } = useWallet();
watch(
  () => chain.id,
  async () => {
    init();
  },
  { deep: true },
);

const tab = ref("");
const route = useRoute();
watchEffect(() => {
  if (route.path.includes("/pools")) {
    tab.value = route.path.split("/")[2];
  }
});

const { isFold } = useSidebar();
watch(isFold, () => {
  setTimeout(() => {
    resizeHandle();
  }, 500);
});


onMounted(() => {
  init();

  window.onresize = _.debounce(() => {
    resizeHandle();
  }, 1500);
});

onUnmounted(() => {
  window.removeEventListener("resize", resizeHandle);
});

function resetHover() {
  const bgLine = document.getElementById("hover-line");
  bgLine.style.left = "2000px";
};
</script>

<style lang="scss" scoped>
.shorter-stats {
  padding: 32px;
  height: 499px;
  border-radius: 24px;
  background: #fefbf9;

  #hover-line {
    width: 1px;
    border-left: 1px dashed #a4a5b2;
    position: absolute;
    bottom: 61px;
    height: 242px;
    left: 2000px;
  }

  .header-box {
    .title {
      font-size: 18px;
      color: #b2b3bd;
      font-weight: 500;
    }
    .main-price {
      margin-top: 16px;
      color: #333333;
      font-size: 56px;
    }
  }
  .chart-wrap {
    position: relative;
  }
  .line-chart {
    margin-top: 20px;
    z-index: 3;
    border-radius: 12px;
  }
  .background {
    width: 100%;
    height: 290px;
    border-radius: 12px;
    position: relative;
    top: -330.75px;
  }
}
</style>
