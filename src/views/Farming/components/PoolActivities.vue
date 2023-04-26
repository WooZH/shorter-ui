<template>
  <div v-if="wallet.isConnected" class="panel-container info-group">
    <header class="panel-header">
      <h4 class="panel-title">Pool Activities</h4>
    </header>
    <div class="panel">
      <div class="infos">
        <div class="infos-title">Pool Creator Dividen</div>
        <ul>
          <li>
            <h3>
              <shorterSkeleton v-if="loading" animated style="width: 50%">
                <template #template>
                  <shorterSkeletonItem style="height: 26px" />
                </template>
              </shorterSkeleton>
              <span v-else>
                {{ formatNum(data.creatorRewards, 2, true) }}
              </span>
            </h3>
            <p>Rewards</p>
          </li>
          <li>
            <h3>
              <shorterSkeleton v-if="state.loading.fetchPoolsNum" animated style="width: 50%">
                <template #template>
                  <shorterSkeletonItem style="height: 26px" />
                </template>
              </shorterSkeleton>
              <span v-else>
                {{ formatNum(state.createdPoolsNum, 2, true) }}
              </span>
            </h3>
            <p># Pools</p>
          </li>
        </ul>
      </div>
      <div class="infos">
        <div class="infos-title">Liquidity Providing</div>
        <ul>
          <li>
            <h3>
              <shorterSkeleton v-if="loading" animated style="width: 50%">
                <template #template>
                  <shorterSkeletonItem style="height: 26px" />
                </template>
              </shorterSkeleton>
              <span v-else>
                {{ toQuantity(data.stakedRewards, balance.price) ?? 0 }}
              </span>
            </h3>
            <p>Rewards</p>
          </li>
          <li>
            <h3>
              <shorterSkeleton v-if="loading" animated style="width: 50%">
                <template #template>
                  <shorterSkeletonItem style="height: 26px" />
                </template>
              </shorterSkeleton>
              <span v-else>
                {{ formatNum(state.stakedRewardPoolsNum, 2, true) ?? 0 }}
              </span>
            </h3>
            <p># Pools</p>
          </li>
        </ul>
      </div>
    </div>
  </div>
  <div v-else class="panel-container info-group">
    <header class="panel-header">
      <h4 class="panel-title">Pool Activities</h4>
    </header>
    <div class="panel">
      <div class="infos">
        <div class="infos-title">Pool Creator Dividen</div>
        <ul>
          <li>
            <h3>-</h3>
            <p>Rewards</p>
          </li>
          <li>
            <h3>-</h3>
            <p># Pools</p>
          </li>
        </ul>
      </div>
      <div class="infos">
        <div class="infos-title">Liquidity Providing</div>
        <ul>
          <li>
            <h3>-</h3>
            <p>Rewards</p>
          </li>
          <li>
            <h3>-</h3>
            <p># Pools</p>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useWallet } from "@/hooks/useWallet";
import { formatNum, toQuantity } from "@/utils/format";
import { useBalance } from "@/hooks/useBalance";
import { reactive, computed, watchEffect } from "vue";
import * as PoolGuardian from "@/contract/poolGuardian";

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

const state = reactive({
  createdPoolsNum: 0,
  stakedRewardPoolsNum: computed(() => {
    if (_.isArray(props.data.stakedRewardPools)) {
      return props.data.stakedRewardPools.length;
    }
    return 0;
  }),
  loading: {
    fetchPoolsNum: false,
  },
});

const { wallet, account } = useWallet();
const { balance } = useBalance();

watchEffect(() => {
  if (account.value) {
    fetchPoolsNum(account.value);
  }
});

async function fetchPoolsNum(account) {
  try {
    state.loading.fetchPoolsNum = true;
    const res = (await PoolGuardian.getUserCreatedPoolIds(account)) || [];
    if (_.isArray(res)) {
      state.createdPoolsNum = res.length;
    }
  } finally {
    state.loading.fetchPoolsNum = false;
  }
}
</script>

<style lang="scss" scoped src="./info-group.scss"></style>
