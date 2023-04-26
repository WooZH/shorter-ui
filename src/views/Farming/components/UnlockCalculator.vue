<template>
  <div class="unlock-calculator">
    <h4 class="title">Unlock Calculator</h4>
    <form class="form" @submit.prevent>
      <div class="form-group">
        <label for="">Unlock Amount</label>
        <div class="form-control">
          <input v-model="state.unlockedAmount" v-number-only type="text" placeholder="0" />
          <span class="suffix">IPISTR</span>
        </div>
      </div>
      <div class="form-group">
        <div class="label-container">
          <label>Stake</label>
        </div>
        <div class="calculator-container">
          <div class="recommended-result">
            <div class="form-control">
              <input v-model="state.lp" v-number-only type="text" placeholder="0" />
              <span class="suffix">LP</span>
            </div>
          </div>
          <div class="calculator-content">
            <div class="item">
              <span v-if="state.token1Amount > 0">{{ formatNum(state.token1Amount, 8, true) }}</span>
              <span v-else>--</span>
              <p>IPISTR</p>
            </div>
            <div class="btn-plus">
              <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" data-v-4211dcdd="">
                <path
                  fill="currentColor"
                  d="M480 480V128a32 32 0 0 1 64 0v352h352a32 32 0 1 1 0 64H544v352a32 32 0 1 1-64 0V544H128a32 32 0 0 1 0-64h352z"
                />
              </svg>
            </div>
            <div class="item">
              <span v-if="state.token0Amount > 0">{{ formatNum(state.token0Amount, 8, true) }}</span>
              <span v-else>--</span>
              <p>{{ getContractAddress().usdToken }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="form-group infos">
        <div class="info">
          <label for="">Unlock Speed</label>
          <p>{{ formatNum(state.blockSpeed, 8, true) }} IPISTR/block</p>
        </div>
        <div class="info">
          <label for="">Estimated Period</label>
          <p>{{ formatNum(state.farmHours, 2, true) }} hours</p>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup>
import { reactive, watchEffect, watch } from "vue";
import NP from "number-precision";
import { BigNumber } from "ethers";

import { getContractAddress } from "@/contract";
import * as FarmingRewardModel from "@/contract/farmingRewardModel";

import { formatNum } from "@/utils/format";
import * as Transfer from "@/utils/transfer";

let maxUnlockSpeed, maxLpSupply;

const props = defineProps({
  dexInfo: {
    type: Object,
    default: () => {
      return {
        totalSupply: 0,
        reserve0: 0,
      };
    },
  },
  liquidityPool: {
    type: Object,
    default: () => {},
  },
});

const state = reactive({
  unlockedAmount: 0,
  lp: 0,
  farmHours: 0,
  token0Amount: 0,
  token1Amount: 0,
  blockSpeed: 0,
});

watch(
  () => state.unlockedAmount,
  unlockedAmount => {
    if (unlockedAmount > 0) {
      const speed = getSpeedFromUnlockedAmount(unlockedAmount);
      state.blockSpeed = Transfer.receiveAmount(speed, props.liquidityPool.token0Conifg.decimals);
    } else {
      state.blockSpeed = 0;
    }
  },
);

watchEffect(() => {
  if (state.unlockedAmount > 0 && state.blockSpeed > 0) {
    state.farmHours = NP.divide(state.unlockedAmount || 0, NP.times(state.blockSpeed, 60));
  } else {
    state.farmHours = 0;
  }
});

watchEffect(() => {
  if (!props.dexInfo.totalSupply || !props.dexInfo.reserve0 || !state.lp) {
    state.token0Amount = 0;
    return;
  }
  const rate = NP.divide(props.dexInfo.totalSupply, state.lp);
  state.token0Amount = NP.times(rate, props.dexInfo.reserve0);
});

watchEffect(() => {
  if (!props.dexInfo.totalSupply || !props.dexInfo.reserve1 || !state.lp) {
    state.token1Amount = 0;
    return;
  }
  const rate = NP.divide(props.dexInfo.totalSupply, state.lp);
  state.token1Amount = NP.times(rate, props.dexInfo.reserve1);
});

getMaxUnlockSpeedAndMaxLpSupply();

async function getMaxUnlockSpeedAndMaxLpSupply() {
  if (!maxUnlockSpeed || !maxLpSupply) {
    const [speed, supply] = await Promise.all([
      FarmingRewardModel.getMaxUnlockSpeed(),
      FarmingRewardModel.getMaxLpSupply(),
    ]);
    maxUnlockSpeed = speed;
    maxLpSupply = supply;
    console.log(maxUnlockSpeed, "maxUnlockSpeedk");
    console.log(maxLpSupply, "maxLpSupply");
  }
}

function getSpeedFromUnlockedAmount(unlockedAmount) {
  if (!maxUnlockSpeed || !maxLpSupply || !unlockedAmount) return 0;
  const userStakedAmount = BigNumber.from(unlockedAmount);
  if (userStakedAmount.mul(2 ** 10) < maxLpSupply) {
    return userStakedAmount
      .mul(2 ** 10)
      .mul(maxUnlockSpeed)
      .div(maxLpSupply)
      .div(10);
  }

  if (userStakedAmount >= maxLpSupply) {
    return maxUnlockSpeed;
  }

  let speed;
  for (let i = 0; i < 10; i++) {
    if (userStakedAmount.mul(2 ** (9 - i)) < maxLpSupply) {
      let _speed = userStakedAmount
        .mul(2 ** (10 - i))
        .sub(maxLpSupply)
        .mul(maxUnlockSpeed)
        .div(maxLpSupply)
        .div(10);
      speed = speed.add(_speed);
      break;
    }

    speed = speed.add(maxUnlockSpeed.div(10));
  }
  return speed;
}
</script>

<style lang="scss" scoped>
.unlock-calculator {
  padding: 32px;
  .title {
    font-family: Haas Grot Disp;
    font-weight: 600;
    font-size: 18px;
    color: #11142d;
  }
}

.form {
  color: #333;
  margin-top: 48px;
  .form-group {
    margin-bottom: 20px;
    .suffix {
      color: #a4a5b2;
    }
  }
  .label-container {
    @include flex;
    justify-content: space-between;
    span {
      font-weight: 600;
    }
  }
}
.infos {
  @include flex;
  justify-content: space-between;
  label {
    margin-bottom: 8px;
  }
  .info:last-child {
    text-align: right;
  }
}
.btn-submit {
  width: 100%;
  // height: 56px;
  margin-top: 12px;
  .circle {
    @include flex-center;
    width: 18px;
    height: 18px;
    margin-right: 8px;
    border: 2px solid #fff;
    border-radius: 50%;
    font-size: 12px;
    font-weight: bold;
    i {
      font-size: 10px;
    }
  }
}

.calculator-container {
  background: #f8f8f8;
  border-radius: 8px;
  padding: 0 24px;
  .recommended-result {
    @include flex-center-v;
    justify-content: space-between;
    height: 52px;
    border-bottom: 1px solid #e2e2e4;
    .form-control {
      flex: 1;
      background: none;
      input {
        padding-left: 0;
      }
      .suffix {
        margin-right: 0;
      }
    }
  }
  .calculator-content {
    position: relative;
    @include flex;
    justify-content: space-between;
    padding: 24px 0;
    .item {
      width: 217px;
      height: 88px;
      padding-left: 40px;
      padding-top: 14px;
      border-radius: 8px;
      background: #fff;
      span {
        @include ellipsis(1);
        color: #a4a5b2;
      }
      p {
        margin-top: 16px;
      }
    }
    .btn-plus {
      @include flex-center;
      left: 50%;
      top: 50%;
      position: absolute;
      width: 24px;
      height: 24px;
      background: #f8f8f8;
      color: #a4a5b2;
      transform: translate(-50%, -50%);
      border-radius: 3px;
      border: 1px solid #dedede;
      cursor: pointer;
      .icon {
        width: 16px;
        height: 16px;
      }
    }
  }
}
</style>
