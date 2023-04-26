<template>
  <div class="rewards-wrap">
    <div class="reward">
      <Image :src="firstLogo" class="reward-coin" />
      <shorterSkeleton animated style="height: 48px" :loading="walletConnect && loading">
        <template #template>
          <shorterSkeletonItem style="height: 48px; width: 160px" />
        </template>
        <template #default>
          <p class="reward-number">
            <span v-if="!walletConnect">-</span>
            <template v-else>
              <span>{{ formatHelper(firstReward) }}</span>
              <template v-if="!isBsc">
                <span class="plus">+</span>
                <span>{{ formatHelper(firstStakeReward) }}</span>
              </template>
            </template>
          </p>
        </template>
      </shorterSkeleton>
    </div>

    <div v-if="!isBsc" class="reward">
      <Image :src="secondLogo" class="reward-coin" />
      <shorterSkeleton animated style="height: 48px" :loading="walletConnect && loading">
        <template #template>
          <shorterSkeletonItem style="height: 48px; width: 160px" />
        </template>
        <template #default>
          <p class="reward-number">
            <span v-if="!walletConnect">-</span>
            <span v-else>{{ formatHelper(secondReward) }}</span>
          </p>
        </template>
      </shorterSkeleton>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

import { useTokenPair } from "./useTokenPair.js";

const { getTokenLogo } = useTokenPair();

const props = defineProps({
  isBsc: {
    type: Boolean,
  },
  walletConnect: {
    type: Boolean,
  },
  loading: {
    type: Boolean,
  },
  tokenInfo: {
    type: Object,
    default: () => ({}),
  },
  firstToken: {
    type: String,
    default: "IPISTR",
  },
  secondToken: {
    type: String,
    default: "USDT",
  },
  firstReward: {
    type: Number,
    required: true,
  },
  firstStakeReward: {
    type: [Number, String],
    required: true,
  },
  secondReward: {
    type: [Number, String],
    required: true,
  },
  formatHelper: {
    type: Function,
    default: v => v,
  },
});

const firstLogo = computed(() => getTokenLogo(props.tokenInfo, props.firstToken));
const secondLogo = computed(() => getTokenLogo(props.tokenInfo, props.secondToken));
</script>

<style lang="scss" scoped>
.rewards-wrap {
  display: flex;
  margin-top: 14px;
  .reward {
    display: flex;
    align-items: center;
    margin-right: 100px;
  }
  .reward-coin {
    width: 32px;
    height: 32px;
    margin-right: 20px;
  }
  .reward-number {
    height: 48px;
    font-size: 32px;
    font-weight: normal;
    color: #303133;
    line-height: 48px;
  }
  .plus {
    margin: 0 8px;
    height: 48px;
    font-size: 32px;
    font-weight: normal;
    color: #909399;
    line-height: 48px;
  }
}
</style>
