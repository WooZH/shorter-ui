<template>
  <div v-if="wallet.isConnected" class="pool-token-list">
    <div class="header-box">
      <div class="title strong">
        {{ title }}
      </div>
    </div>
    <div class="progress-list">
      <shorterSkeleton v-if="loading" animated>
        <template #template>
          <div v-for="index in 4" :key="index">
            <shorterSkeletonItem
              :style="{
                width: `${20 + 15 * Math.random()}%`,
                height: '20px',
                'margin-bottom': '8px',
              }"
            />
            <br />
            <shorterSkeletonItem
              :style="{
                width: `${100 - (index - 1) * 18 - 10 * Math.random()}%`,
                height: '20px',
                'margin-bottom': '16px',
              }"
            />
          </div>
        </template>
      </shorterSkeleton>
      <template v-else-if="poolToken.tokenList && poolToken.tokenList.length > 0">
        <div v-for="(item, $index) in poolToken.tokenList" :key="$index" class="progress-item">
          <div class="title">
            <span>{{ item.token_name }}</span>
            <span>
              ${{ poolToken.type === 1 ? toAmount(item.totalDeposit, false) : toAmount(item.totalBorrow, false) }}
            </span>
          </div>
          <ShorterProgress
            :color="item.color"
            :stroke-width="8"
            :percentage="poolToken.type === 1 ? item.depositPercent : item.borrowPercent"
          />
        </div>
      </template>

      <Empty v-else :content="tip" class="empty" />
    </div>
  </div>

  <div v-else class="pool-token-list">
    <div class="header-box">
      <div class="title strong">
        {{ title }}
      </div>
    </div>
    <div class="progress-list">
      <Empty v-if="wallet.isConnected" content="No items yet" class="empty" />
      <shorterButton class="btn big" primary plain @click="wallet.visible = true">Unlock wallet</shorterButton>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { toAmount } from "@/utils/format";
import { useWallet } from "@/hooks/useWallet";

const props = defineProps({
  listType: {
    type: String,
    default: "Deposited",
  },
  poolToken: {
    type: Object,
    default: () => ({
      fetchLoading: false,
      tokenList: [],
      type: 1,
    }),
  },
  loading: {
    type: Boolean,
    default: true,
  },
});

const { wallet } = useWallet();

const title = computed(() => {
  return `My ${props.listType}`;
});

const tip = computed(() => {
  if (props.listType === "Deposited") return "No deposits";
  if (props.listType === "Borrowed") return "No debt";
  return "";
});
</script>

<style lang="scss" scoped>
.pool-token-list {
  @include flex;
  flex-flow: column;
  // width: 301px;
  height: 499px;
  background: #ffffff;
  padding: 8px;
  background: $primary;
  border-radius: 24px;
  .header-box {
    @include flex-center-v;
    justify-content: space-between;
    padding: 24px;
    padding-bottom: 32px;
    color: #ffffff;
    .title {
      font-size: 18px;
    }
    .setting {
      transform: rotate(90deg);
    }
  }
  .progress-list {
    position: relative;
    background: #ffffff;
    border-radius: 16px;
    padding: 32px 24px;
    flex: 1;
    overflow-y: auto;
    &::-webkit-scrollbar {
      display: none;
    }
    .progress-item {
      margin-bottom: 24px;
      .title {
        @include flex;
        justify-content: space-between;
        color: #11142d;
        font-size: 16px;
        margin-bottom: 16px;
      }
    }
    .empty {
      position: absolute;
      left: 50%;
      top: 45%;
      transform: translate(-50%, -50%);
    }
    .btn {
      position: absolute;
      left: 50%;
      top: 40%;
      transform: translate(-50%, -50%);
      width: 128px;
    }
  }
}
</style>
