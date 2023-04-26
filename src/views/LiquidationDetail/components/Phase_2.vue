<template>
  <div class="panel-container phase">
    <header class="panel-header">
      <h4 class="panel-title">Phase 2 (Dex Cover) - Katana</h4>
      <div class="rt">
        <div v-if="!state.isEnded" class="status active">Ongoing</div>
        <div v-else class="status">Ended</div>
      </div>
    </header>

    <div :class="['panel', `status-${state.isEnded ? 1 : 2}`]">
      <main>
        <div v-if="!state.isEnded" class="lt">
          <header>
            <svg class="shorter-icon coin-icon" aria-hidden="true">
              <use :xlink:href="`#icon-${dexCenterName}`" />
            </svg>
            <span class="dex-name">{{ dexCenterName }}</span>
          </header>

          <div class="couple">
            <div class="card">
              <Image class="coin-icon" :src="liquidationDetail.stableTokenInfo?.logoURI" />
              <span v-if="tokenPrice">
                {{ toAmount(NP.times(liquidationDetail.debtSize || 0, tokenPrice || 0)) }}
              </span>
              <span v-else>---</span>
            </div>
            <div class="card">
              <Image class="coin-icon" :src="liquidationDetail.tokenInfo?.logoURI" alt="" />
              <span>
                {{ toAmount(liquidationDetail.debtSize) }}
              </span>
            </div>
            <img class="icon-swap" src="~@/assets/images/swap.svg" alt="" />
          </div>
        </div>

        <div v-else class="lt">
          <div class="panel-gray">
            <div class="info">
              <label>Liquidation Executor</label>
              <span>{{ ellipsisStr(liquidationDetail.phase2Info.rulerAddr) }}</span>
            </div>
            <div class="info">
              <label>Timestamp</label>
              <span v-if="endTime">{{ formatDate(endTime) }} ({{ tz.text }})</span>
              <span v-else>-</span>
            </div>
          </div>
        </div>

        <div :class="['rt', `status-${state.isEnded ? 1 : 2}`]">
          <div class="content">
            <small>
              Liquidation
              <br />
              Rewards
            </small>
            <h3>
              <span v-if="tokenPrice">~${{ toAmount(state.liquidationRewards) }}</span>
              <span v-else>---</span>
            </h3>
          </div>

          <template v-if="!state.isEnded">
            <shorterButton
              v-if="wallet.isConnected"
              type="primary"
              style="width: 200px; height: 48px"
              :loading="state.loading.rewarding"
              :disabled="state.isEnded"
              @click="onReward({ ...liquidationDetail })"
            >
              Liquidate
            </shorterButton>
            <shorterButton
              v-else
              type="primary"
              style="width: 200px; height: 48px"
              plain
              @click="wallet.visible = true"
            >
              Unlock wallet
            </shorterButton>

            <p>
              <strong>{{ state.activeRulersNum }}</strong>
              Rulers are sending order
            </p>
          </template>

          <div v-else class="trade-couple">
            <div class="trade-item">
              <Image class="coin-icon" :src="liquidationDetail.stableTokenInfo?.logoURI" />
              <span>
                {{ toAmount(liquidationDetail.phase2Info.usedCash) }}
              </span>
            </div>
            <svg class="arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" data-v-6ea9cbd4="">
              <path
                fill="currentColor"
                d="M384 141.248V928a32 32 0 1 0 64 0V218.56l242.688 242.688A32 32 0 1 0 736 416L438.592 118.656A32 32 0 0 0 384 141.248z"
              />
            </svg>
            <div class="trade-item">
              <Image class="coin-icon" :src="liquidationDetail.tokenInfo?.logoURI" />
              <span>
                {{
                  toQuantity(
                    Math.max(NP.minus(liquidationDetail.totalSize || 0, liquidationDetail.phase1Info.bidSize || 0), 0),
                    tokenPrice,
                  )
                }}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, inject } from "vue";
import NP from "number-precision";

import * as AuctionHall from "@/contract/auctionHall";
import * as CommitteeAction from "@/contract/committee";

import { ellipsisStr, formatDate, toAmount, toQuantity } from "@/utils/format";
import { handleRpcError } from "@/utils/handleError";
import { getContractAddress } from "@/contract";

import { useWallet } from "@/hooks/useWallet";
import { useTimezone } from "@/hooks/useTimezone";

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
    type: Number,
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
const emit = defineEmits(["rulerCheck", "katana"]);

const { wallet, account } = useWallet();
const { tz } = useTimezone();
const state = reactive({
  loading: {
    rewarding: false,
  },
  isEnded: computed(() => {
    return props.phase !== 2;
  }),

  liquidationRewards: computed(() => {
    const liquidationDetail = props.liquidationDetail || {};
    const tokenPrice = props.tokenPrice;
    const { phase2Info } = liquidationDetail || {};
    if (phase2Info.flag) {
      return phase2Info.dexCoverReward || 0;
    }
    return NP.times(liquidationDetail.debtSize || 0, tokenPrice || 0, 0.01);
  }),

  activeRulersNum: computed(() => {
    return 0;
  }),
});

const refreshLiquidationDetail = inject("refreshLiquidationDetail");

/**
 * @description: 获取收益
 * @param {*}
 * @return {*}
 */
async function onReward(liquidationDetail) {
  const res = await CommitteeAction.isRuler(account.value);
  if (!res) {
    emit("rulerCheck");
    return;
  }

  state.loading.rewarding = true;

  try {
    const { hash, poolInfo, tokenInfo } = liquidationDetail || {};
    const estProfit = state.liquidationRewards;
    const result = await AuctionHall.bidKatana(
      hash,
      [poolInfo.stableToken, poolInfo.stakedToken],
      tokenInfo.swapRouter,
      estProfit,
    );

    emit("katana", result);
    await refreshLiquidationDetail(true);
  } catch (error) {
    console.error("liquidate error = >", error);
    handleRpcError(error.error);
  } finally {
    state.loading.rewarding = false;
  }
}

const dexCenterName = computed(() => {
  const res = getContractAddress().dexName;
  return res;
});
</script>

<style lang="scss" scoped>
@import "./phase.scss";
.panel {
  main {
    @include flex;
    justify-content: space-between;
    .lt {
      flex: 1;
      max-width: 555px+25px;
      min-width: 326px+25px;
    }
    .rt {
      flex: 1;
    }
  }
}

.lt {
  header {
    @include flex-center-v;
    .coin-icon {
      width: 22px;
      height: 22px;
      margin-right: 8px;
      transform: translateY(-1px);
    }
  }
  .couple {
    position: relative;
    margin-top: 18px;
    .card {
      @include flex-center-v;
      width: 100%;
      height: 64px;
      padding: 0 24px;
      border-radius: 12px;
      font-size: 24px;
      font-weight: 600;
      &:nth-child(1) {
        background: rgba($primary, 0.05);
      }

      &:nth-child(2) {
        background: rgba(#4f7cef, 0.05);
        margin-top: 24px;
      }
      .coin-icon {
        width: 32px;
        height: 32px;
        margin-right: 8px;
        transform: translateY(-1px);
      }
    }
    .icon-swap {
      position: absolute;
      right: 0;
      top: 50%;
      height: 94px;
      transform: translate(100%, -50%);
    }
  }
  .panel-gray {
    height: 128px;
    // margin-top:80px;
    background: #f9f8f7;
    border-radius: 16px;
    padding: 0 16px;
    .info {
      @include flex-center-v;
      justify-content: space-between;
      height: 50%;
      &:first-child {
        border-bottom: 1px solid #e4e4e4;
      }
      label {
        color: #a4a5b2;
        font-size: 13px;
      }
    }
  }
}

.rt {
  @include flex-center-v;
  flex-direction: column;
  justify-content: flex-end;
  margin-left: 35px;
  max-width: 400px;
  &.status-1 {
    justify-content: center;
    .content {
      margin-top: 0;
      margin-bottom: 32px;
    }
  }
  .content {
    @include flex-center-v;
    justify-content: space-between;
    margin-top: 36px;
    margin-bottom: 48px;
    small {
      font-size: 13px;
      color: #a4a5b2;
      margin-right: 64px;
    }
    h3 {
      font-weight: 600;
      font-size: 32px;
    }
  }
  p {
    font-size: 12px;
    color: #a4a5b2;
    margin-top: 8px;
    strong {
      color: $primary;
    }
  }
  .trade-couple {
    @include flex-center-v;
    .trade-item {
      @include flex-center-v;
      padding: 0 8px;
      span {
        transform: translateY(1px);
        margin-left: 8px;
      }
    }
    .coin-icon {
      width: 20px;
      height: 20px;
    }
    .arrow {
      width: 20px;
      height: 20px;
      color: #333;
      transform: rotateY(180deg) rotate(-90deg) translateX(1px);
    }
  }
}

.dex-name {
  text-transform: capitalize;
}
</style>
