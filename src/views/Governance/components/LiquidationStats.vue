<template>
  <div class="panel-container">
    <header class="panel-header">
      <h4 class="panel-title">Liquidation Stats</h4>
    </header>

    <div class="panel">
      <ul class="time-interval-tabs">
        <li
          v-for="(interval, index) in state.timeList"
          :key="index"
          :class="{ active: state.timeType === index }"
          @click="switchLiqTime(index)"
        >
          <div>{{ interval }}</div>
        </li>
      </ul>
      <ul class="infos">
        <li class="info-item">
          <h4>Positions</h4>
          <h2>
            <shorterSkeleton v-if="state.loading.fetchStats" style="padding: 5px 0; width: 110px" animated>
              <template #template>
                <shorterSkeletonItem style="height: 33px" />
              </template>
            </shorterSkeleton>
            <span v-else>
              {{ state.statsFromJson[state.timeTypeText].positions || 0 }}
            </span>
          </h2>
        </li>
        <li class="info-item">
          <h4>Unique Pools</h4>
          <h2>
            <shorterSkeleton v-if="state.loading.fetchStats" style="padding: 5px 0; width: 110px" animated>
              <template #template>
                <shorterSkeletonItem style="height: 33px" />
              </template>
            </shorterSkeleton>
            <span v-else>
              {{ state.statsFromJson[state.timeTypeText].uniquePools || 0 }}
            </span>
          </h2>
        </li>
        <li class="info-item">
          <h4>Amount</h4>
          <h2>
            <shorterSkeleton v-if="state.loading.fetchStats" style="padding: 5px 0; width: 110px" animated>
              <template #template>
                <shorterSkeletonItem style="height: 33px" />
              </template>
            </shorterSkeleton>
            <span v-else>
              <SmartNumber
                type="amount"
                :value="
                  Number(state.statsFromJson[state.timeTypeText].amount) === 0
                    ? 0
                    : state.statsFromJson[state.timeTypeText].amount
                "
              />
            </span>
          </h2>
        </li>
      </ul>
    </div>
  </div>
</template>
<script setup>
import { onMounted, reactive, watch } from "vue";

import { getLiquidationStats } from "@/api/stats.js";
import { useWallet } from "@/hooks/useWallet";
import { Message } from "@/hooks/useMessage";

const { chain } = useWallet();

const state = reactive({
  timeType: 0,
  timeTypeText: "day",
  rangeType: 0,
  timeList: ["24 Hours", "1 Week", "1 Month", "All"],
  liquidationTypes: [
    { label: "All", value: 0 },
    { label: "Mine Only", value: 1 },
  ],
  liquidations: [],
  stats: {
    uniquePoolsCount: 0,
    positionsCount: 0,
    totalAmount: 0,
  },
  statsFromJson: {
    day: {
      positions: 0,
      uniquePools: 0,
      amount: 0,
    },
    week: {
      positions: 0,
      uniquePools: 0,
      amount: 0,
    },
    month: {
      positions: 0,
      uniquePools: 0,
      amount: 0,
    },
    all: {
      positions: 0,
      uniquePools: 0,
      amount: 0,
    },
  },
  loading: {
    fetchStats: false,
  },
});

onMounted(async () => {
  refreshStats();
});

watch(
  () => chain.id,
  async () => {
    refreshStats();
  },
);

async function refreshStats() {
  state.loading.fetchStats = true;
  const res = await getLiquidationStats();
  state.statsFromJson = res;
  state.loading.fetchStats = false;
}

function switchLiqTime(index) {
  if (state.loading.fetchStats) {
    Message.warning("Please try again later.");
    return;
  }
  let type = "day";
  switch (index) {
    case 0:
      type = "day";
      break;
    case 1:
      type = "week";
      break;
    case 2:
      type = "month";
      break;
    case 3:
      type = "all";
      break;

    default:
      break;
  }
  state.timeType = index;
  state.timeTypeText = type;
}
</script>
<style lang="scss" scoped>
.panel-container {
  flex: 1.9;
  .panel {
    height: 264px;
  }
  .panel-header {
    position: relative;
    .select-container {
      position: absolute;
      right: 0;
      top: -4px;
      width: 120px;
    }
  }
}
.time-interval-tabs {
  @include flex;
  height: 48px;
  border-radius: 16px;
  // border: 1px solid #e4e4e4;
  background: rgba($primary, 0.05);
  li {
    flex: 1;
    padding: 4px;
    div {
      @include flex-center;
      width: 100%;
      height: 100%;
      color: #a4a5b2;
      border-radius: 12px;
      cursor: pointer;
    }
  }
  li.active {
    div {
      color: $primary;
      background: #fff;
    }
  }
}
.infos {
  @include flex;
  margin-top: 46px;
  .info-item {
    flex: 1;
    h4 {
      color: #a4a5b2;
      font-family: $caption;
    }
    h2 {
      margin-top: 16px;
      font-size: 36px;
    }
    .currency {
      font-size: 18px;
      margin-right: 2px;
    }
  }
}
</style>
