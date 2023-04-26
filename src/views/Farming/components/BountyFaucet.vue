<template>
  <div class="panel-container bounty-faucet">
    <header class="panel-header">
      <h4 class="panel-title">IPISTR Bounty Faucet</h4>
    </header>

    <div class="panel">
      <div class="bounty-wrap">
        <div class="total-bounty">
          <shorterSkeleton v-if="state.loading.fetchBountyFaucet" animated style="width: 50%">
            <template #template>
              <shorterSkeletonItem style="width: 130px; height: 26px" />
            </template>
          </shorterSkeleton>
          <span v-else>
            {{ toAmount(state.faucetReward) || 0 }}
          </span>
        </div>

        <div class="new-bounty">
          <shorterSkeleton
            v-if="state.loading.fetchBountyFaucet || !balance.price"
            animated
            style="width: 90px; height: 19px"
          >
            <template #template>
              <shorterSkeletonItem style="height: 19px" />
            </template>
          </shorterSkeleton>
          <span v-else>~ {{ toAmount(state.faucetAmount) }} USD</span>
        </div>
      </div>

      <div class="gas-limit">
        <shorterSkeleton :loading="state.loading.fetchBountyFaucet" style="width: 18%; height: 20px">
          <template #template>
            <shorterSkeletonItem style="height: 19px" />
          </template>
          <template #default>
            <div class="estimate-gas">
              <svg class="shorter-icon" aria-hidden="true">
                <use xlink:href="#icon-gas_station" />
              </svg>
              <span class="limit-text">{{ toAmount(state.estimateGasLimit, false) }}</span>
            </div>
          </template>
        </shorterSkeleton>
      </div>

      <shorterButton
        v-if="wallet.isConnected"
        class="full big"
        style="margin-top: 14px"
        type="primary"
        :loading="state.loading.grab"
        :disabled="state.faucetReward * 1 === 0"
        plain
        @click="onGrab"
      >
        Grab !
      </shorterButton>
      <shorterButton v-else class="btn" type="primary" plain @click="wallet.visible = true">
        Unlock wallet
      </shorterButton>

      <div class="notice">
        <p>
          This bounty is given away as rewards for the contributors maintaining the states across the entire protocol.
        </p>
        <div class="colon">
          <i class="rect" />
          <i class="arc" />
        </div>
        <div class="colon">
          <i class="rect" />
          <i class="arc" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, watch, onBeforeMount } from "vue";
import NP from "number-precision";

import * as GrabRewardModel from "@/contract/grabRewardModel";

import { useBalance } from "@/hooks/useBalance";
import { useWallet } from "@/hooks/useWallet";
import { Message } from "@/hooks/useMessage";
import { useInterval } from "@/hooks/useInterval";

import { handleRpcError } from "@/utils/handleError";
import { toAmount } from "@/utils/format";

const { balance, fetchBalance } = useBalance();
const { account, wallet, chain } = useWallet();
const { addBlockSpeedInterval } = useInterval();

const state = reactive({
  faucetReward: 0,
  estimateGasLimit: 0,
  argsConfig: {},
  loading: {
    grab: false,
    fetchBountyFaucet: false,
  },
  faucetAmount: computed(() => {
    if (!state.faucetReward) return 0;
    if (!balance.price) return 0;
    return NP.times(state.faucetReward, balance.price);
  }),
});

onBeforeMount(() => {
  fetchFaucetData(true);
});

watch(
  () => chain.id,
  () => {
    fetchFaucetData();
  },
);
watch(
  () => account.value,
  () => {
    state.loading.grab = false;
  },
);

function fetchFaucetData() {
  fetchGrabReward(true);
  addBlockSpeedInterval(fetchGrabReward);
}

async function fetchGrabReward(withLoading = false) {
  try {
    state.loading.fetchBountyFaucet = withLoading;
    const grab = (await GrabRewardModel.getGrabReward()) || {};
    state.faucetReward = grab.reward * 1;
    state.estimateGasLimit = grab.estimateGasLimit;
    state.argsConfig = {
      data: grab.data,
      signature: grab.signature,
    };
  } catch (error) {
    console.error(error, "getGrabRewarModel-pendingReward");
  } finally {
    state.loading.fetchBountyFaucet = false;
  }
}

async function onGrab() {
  if (!account.value) {
    Message.warning("Connect your wallet to continue");
    return;
  }
  if (!state.argsConfig) {
    throw "Missing parameter";
  }

  try {
    state.loading.grab = true;
    await GrabRewardModel.grabReward(state.argsConfig);
    state.faucetReward = 0;
    fetchBalance();
  } catch (error) {
    handleRpcError(error);
  } finally {
    state.loading.grab = false;
  }
}
</script>

<style lang="scss" scoped>
.bounty-faucet {
  width: 33.3%;
  padding: 16px 12px;
  .panel {
    padding: 24px;
  }
}

.bounty-wrap {
  display: flex;
  align-items: center;
}

.total-bounty {
  font-size: 32px;
  color: #303133;
}

.new-bounty {
  margin-left: 10px;
  font-size: 16px;
  color: #909399;
}

.gas-limit {
  margin-top: 10px;
  font-size: 16px;
  color: #a4a5b2;
  line-height: 20px;
  .estimate-gas {
    float: left;
    width: 180px;
  }
  .limit-text {
    margin-left: 4px;
  }
}

.btn {
  width: 100%;
  height: 40px;
  border-radius: 8px;
  margin-top: 24px;
  font-weight: 600;
}

.notice {
  @include flex-center-v;
  position: relative;
  height: 97px;
  margin-top: 24px;
  background: #f8f8f8;
  border-radius: 12px;
  padding: 0 60px 0 16px;
  p {
    line-height: 18px;
    color: #a4a5b2;
  }
  .colon {
    position: absolute;
    right: 21px;
    top: 6px;
    width: 20px;
    height: 45px;
    overflow: hidden;
    .rect {
      position: absolute;
      right: 0;
      top: 0;
      width: 20px;
      height: 25px;
      background: #d9d9d9;
      border-radius: 2px;
    }
    .arc {
      position: absolute;
      bottom: 0;
      right: 0;
      border: 20px solid transparent;
      border-bottom-color: #d9d9d9;
      border-radius: 50%;
      transform: rotate(-45deg);
      &::after {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        border: 10px solid transparent;
        border-bottom-color: #f8f8f8;
        border-radius: 50%;
        transform: translate(-50%, -50%) rotate(0deg);
      }
    }
  }
  .colon:last-child {
    right: -4px;
    top: 8px;
    transform: scale(0.92);
  }
}
</style>
