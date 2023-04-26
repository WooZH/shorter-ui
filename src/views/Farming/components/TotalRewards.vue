<template>
  <div class="panel-container total-rewards">
    <header class="panel-header">
      <h4 class="panel-title flex" style="height: 24px">
        Total Rewards
        <Guide
          text="<div>Instantly collect all kinds of rewards to your wallet.</div>"
          style="margin-left: 8px; transform: translateY(1px)"
          :size="{ width: '24px', height: '24px' }"
        />
      </h4>
    </header>
    <div class="panel">
      <div class="rewards-content">
        <h3 v-if="wallet.isConnected">
          <shorterSkeleton v-if="loading" animated style="width: 50%">
            <template #template>
              <shorterSkeletonItem style="height: 26px" />
            </template>
          </shorterSkeleton>
          <span v-else>
            {{ formatNum(state.claimableValue) }}
          </span>
        </h3>
        <h3 v-else>-</h3>
        <h4>Claimable</h4>
      </div>
      <div class="btn-group">
        <shorterButton
          v-if="wallet.isConnected"
          class="full big"
          type="primary"
          :disabled="!(state.claimableValue > 0)"
          :loading="state.loading.harvest"
          @click="onHarvest"
        >
          Harvest all
        </shorterButton>
        <shorterButton v-else class="full big" type="primary" plain @click="wallet.visible = true">
          Unlock wallet
        </shorterButton>
        <shorterButton class="full big" type="primary" plain style="margin-top: 20px" @click="onMore">
          Learn more
          <svg class="shorter-icon" aria-hidden="true">
            <use xlink:href="#icon-share" />
          </svg>
        </shorterButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, reactive } from "vue";
import NP from "number-precision";

import { harvestAll } from "@/contract/farming";
import Guide from "@/components/Guide";

import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";

import { toAmount } from "@/utils/transfer";
import { openUrl } from "@/utils/url";
import { formatNum } from "@/utils/format";

const props = defineProps({
  data: {
    type: Object,
    default: () => {},
  },
  loading: {
    type: Boolean,
    default: () => false,
  },
});
const { wallet } = useWallet();
const { fetchBalance } = useBalance();
const refreshFarming = inject("refreshFarming");

const state = reactive({
  claimableValue: computed(() => {
    const rewardList = [
      "creatorRewards",
      "stakedRewards",
      "farmingRewards",
      "govRewards",
      "tradingRewards",
      "voteAgainstRewards",
      "voteRewards",
    ];
    let sum = 0;
    rewardList.forEach(item => {
      let reward = props.data[item];
      if (_.isNumber(reward)) {
        sum = NP.plus(sum, reward);
      }
    });
    return sum;
  }),
  loading: {
    fetchClaimableValue: true,
    harvest: false,
  },
});

async function onHarvest() {
  try {
    state.loading.harvest = true;
    const params = {
      govRewards: toAmount(props.data.govRewards),
      farmingRewards: toAmount(props.data.farmingRewards),
      voteAgainstRewards: toAmount(props.data.voteAgainstRewards),
      tradingRewardPools: props.data.tradingRewardPools,
      stakedRewardPools: props.data.stakedRewardPools,
      createRewardPools: props.data.createRewardPools,
      voteRewardPools: props.data.voteRewardPools,
    };
    await harvestAll(params);
    fetchBalance();
    refreshFarming();
  } finally {
    state.loading.harvest = false;
  }
}

function onMore() {
  openUrl("https://docs.shorter.finance/governance/tokenomics/revenue-model.html", "learn more");
}
</script>

<style lang="scss" scoped>
.total-rewards {
  flex: 1;
  padding: 16px 12px;
  .panel {
    @include flex;
    flex-direction: column;
    justify-content: space-between;
    height: 298px;
    padding: 24px;
    background: linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)),
      url("~@/assets/images/shorter.svg") no-repeat;
    background-position: right -67px top 24px;
    background-size: auto 200px;
    background-color: #fff;
  }
  .rewards-content {
    h3 {
      @include flex-center-v;
      height: 32px;
      font-size: 32px;
    }
    h4 {
      height: 20px;
      margin-top: 12px;
      font-size: 16px;
      color: #a4a5b2;
    }
  }
  .btn-group {
    .btn {
      width: 100%;
      height: 40px;
      border-radius: 8px;

      &:last-child {
        margin-left: 0;
        margin-top: 20px;
      }
    }
  }
}
</style>
