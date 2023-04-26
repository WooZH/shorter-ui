<template>
  <Layout title="Farming">
    <div class="panel-group">
      <TradingReward />
      <BountyFaucet />
    </div>
    <div class="panel-group part-2">
      <PoolActivities :data="state.allRewards" :loading="state.loading.fetchAllRewards" />
      <GovernanceActivities :data="state.allRewards" :loading="state.loading.fetchAllRewards" />
      <TotalRewards :data="state.allRewards" :loading="state.loading.fetchAllRewards" />
    </div>
    <ProvideLiquidity />
  </Layout>
</template>

<script setup>
import { provide, reactive, watch } from "vue";

import * as Farming from "@/contract/farming";

import TradingReward from "./components/TradingReward.vue";
import BountyFaucet from "./components/BountyFaucet.vue";
import PoolActivities from "./components/PoolActivities.vue";
import GovernanceActivities from "./components/GovernanceActivities.vue";
import TotalRewards from "./components/TotalRewards.vue";
import ProvideLiquidity from "./components/provide-liquditity/ProvideLiquidity.vue";

import { useWallet } from "@/hooks/useWallet";

const state = reactive({
  allRewards: {
    creatorRewards: 0,
    stakedRewards: 0,
    farmingRewards: 0,
    govRewards: 0,
    tradingRewards: 0,
    voteAgainstRewards: 0,
    voteRewards: 0,
    stakedRewardPools: [],
    voteRewardPools: [],
    tradingRewardPools: [],
    createRewardPools: [],
  },
  loading: {
    fetchAllRewards: false,
  },
});
const events = [];
provide("fetchingEvents", events);
provide("refreshFarming", refreshFarming);
function refreshFarming() {
  events.forEach(event => {
    if (typeof event === "function") event();
  });
}

const { wallet, account, chain } = useWallet();
if (wallet.isConnected && account.value) {
  pendingAllRewards(account.value, true);
}

events.push(
  (() => {
    return () => {
      if (wallet.isConnected && account.value) {
        pendingAllRewards(account.value);
      }
    };
  })(),
);

watch(
  () => [wallet.isConnected, account.value, chain.id],
  ([isConnected, accountValue]) => {
    if (isConnected && accountValue) {
      pendingAllRewards(accountValue, true);
    } else {
      state.allRewards = {
        creatorRewards: 0,
        stakedRewards: 0,
        farmingRewards: 0,
        govRewards: 0,
        tradingRewards: 0,
        voteAgainstRewards: 0,
        voteRewards: 0,
        stakedRewardPools: [],
        voteRewardPools: [],
        tradingRewardPools: [],
        createRewardPools: [],
      };
    }
  },
);

async function pendingAllRewards(account, withLoading = false) {
  try {
    state.loading.fetchAllRewards = withLoading;
    const res = await Farming.pendingAllRewards(account);
    state.allRewards = { ...state.allRewards, ...res };
  } catch (err) {
    console.log(err, "pendingAllRewards", account);
  } finally {
    state.loading.fetchAllRewards = false;
  }
}
</script>
<style lang="scss" scoped>
.panel-group {
  @include flex;
  margin: 0 -12px;
  &.part-2 {
    margin-top: 16px;
  }
}
</style>
