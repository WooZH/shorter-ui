<template>
  <div class="liq-history">
    <ul v-if="loading || state.loading.fetchHistory">
      <li v-for="i in 4" :key="i">
        <shorterSkeleton animated>
          <template #template>
            <shorterSkeletonItem style="width: 40%; height: 14px" />
            <shorterSkeletonItem style="width: 100%; height: 14px; margin-top: 6px; margin-bottom: 24px" />
          </template>
        </shorterSkeleton>
      </li>
    </ul>
    <ul v-else>
      <li v-for="(item, index) in state.history" :key="index" class="history-item">
        <div class="icon">
          <span>
            {{ index + 1 }}
          </span>
        </div>
        <div class="main">
          <span class="status">{{ item.title }}</span>
          <div class="date">{{ formatDate(item.time) }} ({{ tz.text }})</div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { watchEffect, reactive } from "vue";

import { PHASE1_MAX_BLOCKS, PHASE2_MAX_BLOCKS } from "@/contract/auctionHall";

import { useTimezone } from "@/hooks/useTimezone";

import { formatDate, blockToTime } from "@/utils/format";
import { getCurBlockNumber } from "@/utils/block";

const props = defineProps({
  loading: {
    type: Boolean,
    default: () => true,
  },
  liquidationDetail: {
    type: Object,
    default: () => {},
  },
  phase: {
    type: Number,
    default: () => 0,
  },
});

const { tz } = useTimezone();

const state = reactive({
  history: [],
  loading: {
    fetchHistory: true,
  },
});

watchEffect(() => {
  state.history = [];
  if (!props.loading) {
    generateHistory(props.liquidationDetail, props.phase);
  }
});

async function generateHistory(liquidationDetail, phase) {
  try {
    state.loading.fetchHistory = true;

    const { closingBlock, closedBlock, overdrawnBlock, phase1Info } = liquidationDetail || {};
    const phase2StartBlock = closingBlock + PHASE1_MAX_BLOCKS;
    const startTime = await blockToTime(closingBlock);
    const curBlock = await getCurBlockNumber();
    const list = [];

    if (overdrawnBlock == 0) {
      list.push({
        title: "Started",
        time: startTime,
      });

      //未出现穿仓
      list.push({
        title: "Phase1",
        time: startTime,
      });

      if (
        phase === 2 ||
        (phase1Info.flag === false && liquidationDetail.state == 4) ||
        (phase1Info.flag === false && curBlock > phase2StartBlock)
      ) {
        list.push({
          title: "Phase2",
          time: await blockToTime(phase2StartBlock),
        });
      }
    } else {
      //出现穿仓
      let title = "Overdrawn";
      if (closingBlock > 0) {
        list.push({
          title: "Started",
          time: startTime,
        });
        list.push({
          title: "Phase1",
          time: startTime,
        });
        if (overdrawnBlock > phase2StartBlock) {
          list.push({
            title: "Phase2",
            time: await blockToTime(phase2StartBlock),
          });
        }

        //进入closing
        const isAborted = overdrawnBlock > closingBlock + PHASE1_MAX_BLOCKS + PHASE2_MAX_BLOCKS;
        if (isAborted) {
          title = "Aborted";
        }
        list.push({
          title,
          time: await blockToTime(overdrawnBlock),
        });
      } else {
        //未进入closing
        const time = await blockToTime(overdrawnBlock);
        list.push({
          title: "Started",
          time,
        });
        list.push({
          title,
          time,
        });
      }
    }

    // 头寸已关闭
    if (closedBlock) {
      list.push({
        title: "Finished",
        time: await blockToTime(closedBlock),
      });
    }
    state.history = list;
  } finally {
    state.loading.fetchHistory = false;
  }
}
</script>

<style lang="scss" scoped>
.liq-history {
  height: 286px;
  margin-top: 24px;
  overflow: hidden;
}

.history-item {
  @include flex-center-v;
  margin-top: 24px;
  .icon {
    @include flex-center;
    position: relative;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #d8d8d8;
    color: #fff;
    span {
      font-size: 14px;
      font-weight: 600;
      transform: translateY(1px);
    }
  }
  .main {
    flex: 1;
    margin-left: 11px;
    .status {
      display: block;
      height: 14px;
    }
    .date {
      height: 14px;
      margin-top: 10px;
      color: #a4a5b2;
    }
  }
  &:not(&:last-child) .icon::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 100%;
    transform: translateX(-50%) translateY(4px);
    width: 0;
    height: 32px;
    border-left: 1px dashed #a4a5b2;
  }
  &:first-child {
    margin-top: 0;
  }
}
</style>
