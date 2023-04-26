<template>
  <div class="panel-container">
    <shorterSkeleton v-if="loading" style="height: 24px; margin-bottom: 24px" animated>
      <template #template>
        <shorterSkeletonItem style="height: 22px; width: 35%" />
      </template>
    </shorterSkeleton>
    <header v-else class="panel-header">
      <h4 class="panel-title">
        Position
        <span v-tooltip.top="`${liquidationDetail.hash}`">
          {{ ellipsisStr(liquidationDetail.hash) }}
        </span>
      </h4>
    </header>
    <div class="panel">
      <LiqCountdown
        v-show="liquidationDetail.state === 2 && endTime"
        :end-time="new Date(endTime).getTime()"
        :loading="loading"
        @onStop="refreshPage"
      />
      <div class="lt">
        <header class="header">
          <div class="progress">
            <div class="info">
              <label>Progress</label>
              <span v-if="!loading" class="color-primary">{{ state.progress }}%</span>
            </div>
            <ShorterProgress color="#ef814f" :stroke-width="8" :percentage="state.progress" />
          </div>
          <div v-show="!loading" class="price-change">
            <span v-show="!loading" v-tooltip.top="`Last Price`">
              <h4>
                <span :class="state.priceChangeStatus">
                  <SmartNumber type="price" :value="state.lastPrice" />
                </span>
              </h4>
            </span>
          </div>
        </header>
        <div class="card position">
          <header>Position Info</header>
          <footer class="flex">
            <div class="info">
              <label>Leverage</label>
              <shorterSkeleton v-if="loading" style="margin-top: 9px; width: 50%" animated>
                <template #template>
                  <shorterSkeletonItem style="height: 29px" />
                </template>
              </shorterSkeleton>
              <p v-else class="liq-info-p">
                {{ liquidationDetail.poolInfo ? liquidationDetail.poolInfo.leverage : "-" }}×
              </p>
            </div>
            <div class="info">
              <label>Size</label>
              <shorterSkeleton v-if="loading" style="margin-top: 9px; width: 50%" animated>
                <template #template>
                  <shorterSkeletonItem style="height: 29px" />
                </template>
              </shorterSkeleton>
              <p v-else class="size-info-p">
                <SmartNumber type="quantity" prefix="-" :value="openSize" />
              </p>
            </div>
          </footer>
          <svg class="shorter-icon bg" aria-hidden="true">
            <use xlink:href="#icon-position" />
          </svg>
        </div>
        <div class="card auction">
          <header>Auction Briefing</header>
          <footer class="flex">
            <div class="info">
              <label>Unsettled USDs</label>
              <shorterSkeleton v-if="loading" style="margin-top: 9px; width: 50%" animated>
                <template #template>
                  <shorterSkeletonItem style="height: 29px" />
                </template>
              </shorterSkeleton>
              <p v-else>
                <Image circle class="icon" :src="logoSrc" />
                <SmartNumber type="amount" speical-amount="unsettledAndPhase2" :value="state.unsettledUsd" />
              </p>
            </div>
            <div class="info">
              <label>Remaining Debt</label>
              <shorterSkeleton v-if="loading" style="margin-top: 9px; width: 50%" animated>
                <template #template>
                  <shorterSkeletonItem style="height: 29px" />
                </template>
              </shorterSkeleton>
              <p v-else>
                <Image class="icon" circle :src="liquidationDetail.tokenInfo.logoURI" />
                <SmartNumber type="quantity" :value="currentDebt" />
              </p>
            </div>
          </footer>
          <svg class="shorter-icon bg" aria-hidden="true">
            <use xlink:href="#icon-auction" />
          </svg>
        </div>
      </div>
      <div class="rt">
        <p>Liquidation History</p>
        <LiqHistory :loading="loading" :liquidation-detail="liquidationDetail" :phase="phase" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, watch, watchEffect, ref } from "vue";
import NP from "number-precision";

import { getContractAddress } from "@/contract";

import LiqCountdown from "./LiqCountdown.vue";
import LiqHistory from "./LiqHistory.vue";

import { useWallet } from "@/hooks/useWallet";

import { ellipsisStr, toPercent } from "@/utils/format";
import * as Transfer from "@/utils/transfer";
import { Local } from "@/utils/localStorage";

const props = defineProps({
  liquidationDetail: {
    type: Object,
    default: () => {},
  },
  loading: {
    type: Boolean,
    default: () => false,
  },
  tokenPrice: {
    type: [Number, String],
    default: () => 0,
  },
  phase: {
    type: Number,
    default: () => 0,
  },
  endTime: {
    type: String,
    default: () => "",
  },
});

const { chain } = useWallet();
const logoSrc = ref("");

watch(
  () => chain.id,
  () => {
    const stableToken = getContractAddress().usdToken;
    const shorterStorage = Local.get("shorterStorage");
    const tokenList = shorterStorage[getContractAddress().networkName].common.token.list;
    const token = tokenList.find(t => t.symbol == stableToken);
    logoSrc.value = token?.logoURI || "";
  },
  {
    immediate: true,
  },
);

const state = reactive({
  progress: computed(() => getProgress(props.liquidationDetail, props.phase)),
  //未结算usd
  unsettledUsd: computed(() => getUnsettledCash(props.liquidationDetail, props.phase)),
  lastPrice: 0,
  priceChangeStatus: "",
});

const openSize = computed(() => {
  const { totalSize_big, legacyInfo } = props.liquidationDetail || {};
  const res = totalSize_big ? totalSize_big.add(legacyInfo.bidSize_big) : "";
  return Transfer.receiveAmount(res);
});

watchEffect(() => {
  if (state.lastPrice === 0) {
    state.lastPrice = props.tokenPrice;
  }
});

watch(
  () => props.tokenPrice,
  (val, oldVal) => {
    state.lastPrice = val;
    if (!oldVal) {
      state.priceChangeStatus = "";
    } else if (val > oldVal) {
      state.priceChangeStatus = "up";
    } else {
      state.priceChangeStatus = "down";
    }
  },
);

const currentDebt = computed(() => {
  const { state, debtSize, totalSize } = props.liquidationDetail || {};
  if (state === 8 || state === 2) {
    return debtSize;
  } else {
    return totalSize;
  }
});

function getProgress(liquidationDetail, phase) {
  let result = 0;
  const { state, totalSize, phase1Info, legacyInfo, debtSize } = liquidationDetail || {};
  if (state === 2) {
    if (phase === 1) {
      result = 0;
    } else if (phase === 2) {
      result = Math.min(NP.divide(phase1Info.bidSize || 0, totalSize), 1);
    }
  }
  if (state === 4) {
    result = NP.divide(legacyInfo.bidSize || 0, Number(totalSize) + legacyInfo.bidSize);
  }
  if (state === 8) {
    if (debtSize == 0) {
      result = 1;
    } else {
      result = NP.divide(legacyInfo.bidSize || 0, Number(totalSize) + legacyInfo.bidSize);
    }
  }
  return toPercent(result * 100);
}

function getUnsettledCash(liquidationDetail, phase) {
  const { unsettledCash, state } = liquidationDetail || {};

  const phase1UsedCash = getPhase1UsedCash(liquidationDetail);
  //closing
  if (state === 2) {
    if (phase === 1) {
      //phase1
      return unsettledCash;
    } else if (phase === 2) {
      //phase2
      return NP.minus(unsettledCash, phase1UsedCash);
    }
    //错误情况
    return NP.minus(unsettledCash, phase1UsedCash);
  }
  if (state === 4) {
    return unsettledCash;
  }
  if (state === 8) {
    const { phase1Info, phase2Info } = liquidationDetail || {};
    if (phase1Info.flag) {
      return NP.minus(unsettledCash, phase1UsedCash);
    } else if (phase2Info.flag) {
      return NP.minus(unsettledCash, phase1UsedCash, phase2Info.usedCash);
    } else {
      return unsettledCash;
    }
  }

  return 0;
}

function getPhase1UsedCash(liquidationDetail = {}) {
  const { phase1Info, totalSize } = liquidationDetail || {};
  let { bidSize, liquidationPrice } = phase1Info || {};
  if (bidSize > 0) {
    bidSize = Math.min(Number(bidSize), Number(totalSize));
    const phase1UsedCash = NP.times(bidSize, liquidationPrice);
    return Number(phase1UsedCash);
  }
  return 0;
}

function refreshPage() {
  location.reload();
}
</script>

<style lang="scss" scoped>
.panel-header {
  h4 {
    span {
      color: $primary;
      margin: 0 10px;
      cursor: pointer;
    }
  }
}
.panel {
  @include flex;
  position: relative;
  > .lt {
    flex: 1;
    min-width: 420px;
  }
  > .rt {
    min-width: 232px;
    margin-left: 32px;
  }
  .countdown-skeleton {
    position: absolute;
    right: 0;
    top: -150px;
  }
}
.header {
  @include flex-center-v;
  justify-content: space-between;
  .progress {
    width: 200px;
    height: 30px;
    .info {
      @include flex-center-v;
      height: 14px;
      line-height: 17px;
      justify-content: space-between;
      margin-bottom: 8px;
      font-weight: 600;
    }
  }
  .price-change {
    color: $black2;
    h4 {
      font-size: 24px;
      font-weight: 500;
      // margin-right:28px;
      .up {
        color: $green;
      }
      .down {
        color: #ef5a4f;
      }
      span {
        @include flex-center-v;
      }
      .arrow {
        display: block;
        position: relative;
        width: 24px;
        height: 24px;
        &::after {
          content: "";
          position: absolute;
          top: 12px+3px;
          border: 6px solid transparent;
          transform: translate(100%, -50%);
        }
        &.down::after {
          top: 12px+3px;
          border-top-color: #ef5a4f;
        }
        &.up::after {
          top: 12px-3px;
          border-bottom-color: $green;
        }
      }
    }
  }
}

.card {
  position: relative;
  padding: 20px 24px 18px;
  height: 128px;
  overflow: hidden;
  margin-top: 24px;
  &:last-child {
    margin-top: 16px;
  }
  header {
    @include flex-center-v;
    font-weight: 600;
    font-size: 16px;
  }
  footer {
    margin-top: 16px;
  }
  .info {
    flex: 1;
    label {
      color: #a4a5b2;
      font-size: 16px;
      font-family: $caption;
    }

    p {
      position: relative;
      @include flex-center-v;
      margin-top: 8px;
      font-size: 24px;
      z-index: 1;
      .icon {
        width: 20px;
        height: 20px;
        margin-right: 8px;
        font-size: 14px;
        transform: translateY(-1px);
      }
    }

    .liq-info-p {
      z-index: 2;
    }

    .size-info-p {
      z-index: 1;
    }
  }
  .bg {
    position: absolute;
    right: -20px;
    bottom: -30px;
    width: 128px;
    height: 128px;
    z-index: 0;
  }
}
.card.position {
  background: rgba(#4f9bef, 0.03);
  border-radius: 16px;
  .icon {
    color: #4f9bef;
  }
  .bg {
    color: #f1f7fe;
  }
}
.card.auction {
  background: rgba($primary, 0.03);
  border-radius: 16px;
  .icon {
    color: $primary;
  }
  .bg {
    color: #fef5f1;
  }
}

.rt {
  > p {
    height: 14px;
    line-height: 17px;
    font-weight: 600;
    font-size: 16px;
  }
}
</style>
