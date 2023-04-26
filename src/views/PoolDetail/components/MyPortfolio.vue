<template>
  <div v-if="wallet.isConnected" class="panel-container">
    <header class="panel-header">
      <h4 class="panel-title">My Portfolio</h4>
    </header>

    <div class="panel">
      <ul class="assets">
        <li>
          <div class="info">
            <p>My Deposited</p>
            <shorterSkeleton v-if="loadingDeposit" animated>
              <template #template>
                <shorterSkeletonItem style="height: 34px; width: 140px" />
              </template>
            </shorterSkeleton>
            <h4 v-else>
              <span>
                <SmartNumber v-if="portfolio.userInfoByPool" type="quantity" :value="portfolio.userInfoByPool.amount" />
                <template v-else>0</template>
              </span>
              <Tag v-if="portfolio.poolInfo">
                {{ portfolio.poolInfo?.tokenName || "-" }}
              </Tag>
            </h4>
          </div>

          <div class="info">
            <p>Withdrawable</p>
            <shorterSkeleton v-if="loadingDeposit" animated>
              <template #template>
                <shorterSkeletonItem style="height: 34px; width: 140px" />
              </template>
            </shorterSkeleton>
            <h4 v-else>
              <SmartNumber type="amount" speical-amount="poolDetail" :value="withdrawable || 0" />
              <div
                v-if="showLegacyTip"
                v-tooltip.top="
                  `<div style='width: 242px;
                        padding: 5px 0;
                        font-size: 14px;
                        font-family: Haas Grot Text;
                        font-weight: 500;'>
                    <div style='display:flex;justify-content: space-between;margin-bottom: 10px;'>
                      <label>${portfolio.poolInfo?.tokenName}:</label>
                      <span>${progress.staked}</span>
                    </div>
                    <div style='display:flex;justify-content: space-between;margin-bottom: 10px;'>
                      <label>${getContractAddress().usdToken} (Legacy):</label>
                      <span>${formatNum(progress.stable)}</span>
                    </div>
                    <p style='color: #fff;
                      opacity: 0.5;
                      font-size: 12px;
                      margin-top: 3px;'>
                      Legacy assets are generated within overdrawn positions.
                    </p>
                  </div>`
                "
                class="icon-more-info"
              >
                <svg class="shorter-icon" aria-hidden="true">
                  <use xlink:href="#icon-help" />
                </svg>
              </div>
            </h4>
          </div>

          <div class="info">
            <p>Earned</p>
            <shorterSkeleton v-if="loadingDeposit" animated>
              <template #template>
                <shorterSkeletonItem style="height: 34px; width: 140px" />
              </template>
            </shorterSkeleton>
            <h4 v-else>
              <span class="color-green">
                <SmartNumber v-if="portfolio.userInfoByPool" type="quantity" :value="userEarned" />
                <template v-else>0</template>
              </span>
              <Tag>IPISTR</Tag>
            </h4>
          </div>
        </li>

        <li>
          <div class="info">
            <p>My Borrowed</p>
            <shorterSkeleton v-if="loadingBorrow" animated>
              <template #template>
                <shorterSkeletonItem style="height: 34px; width: 140px" />
              </template>
            </shorterSkeleton>
            <h4 v-else>
              <span>
                <SmartNumber type="quantity" :value="myBorrow" />
              </span>
              <Tag v-if="portfolio.poolInfo">
                {{ portfolio.poolInfo?.tokenName }}
              </Tag>
            </h4>
          </div>

          <div class="info">
            <p>Margin Locked</p>
            <shorterSkeleton v-if="loadingBorrow" animated>
              <template #template>
                <shorterSkeletonItem style="height: 34px; width: 140px" />
              </template>
            </shorterSkeleton>
            <h4 v-else>
              <SmartNumber type="amount" speical-amount="poolDetail" :value="marginLocked" />
            </h4>
          </div>

          <div class="info">
            <p>Unclosed Positions</p>
            <shorterSkeleton v-if="loadingBorrow" animated>
              <template #template>
                <shorterSkeletonItem style="height: 34px; width: 140px" />
              </template>
            </shorterSkeleton>
            <h4 v-else>
              {{ myPositions }}
            </h4>
          </div>
        </li>
      </ul>
    </div>
  </div>

  <div v-else class="panel-container">
    <header class="panel-header">
      <h4 class="panel-title">My Portfolio</h4>
    </header>
    <div class="panel">
      <ul class="assets">
        <li>
          <div class="info">
            <p>My Deposited</p>
            <h4>-</h4>
          </div>
          <div class="info">
            <p>Withdrawable</p>
            <h4>-</h4>
          </div>
          <div class="info">
            <p>Earned</p>
            <h4>-</h4>
          </div>
        </li>
        <li>
          <div class="info">
            <p>My Borrowed</p>
            <h4>-</h4>
          </div>
          <div class="info">
            <p>Margin Locked</p>
            <h4>-</h4>
          </div>
          <div class="info">
            <p>Unclosed Positions</p>
            <h4>-</h4>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, watch, watchEffect, ref } from "vue";
import NP from "number-precision";

import { getContractAddress } from "@/contract";
import * as StrPoolAction from "@/contract/strPool";
import { getPendingIpistrs } from "@/contract/PoolRewardModel";

import { formatNum } from "@/utils/format";

import { useWallet } from "@/hooks/useWallet";
import { useInterval } from "@/hooks/useInterval";

const props = defineProps({
  portfolio: {
    type: Object,
    default: () => {},
  },
  loadingDeposit: {
    type: Boolean,
    default: true,
  },
  loadingBorrow: {
    type: Boolean,
    default: true,
  },
});

const { addNormalPriorityInterval } = useInterval();
const { wallet, account } = useWallet();

const progress = reactive({
  stable: 0,
  staked: 0,
});

const isLegacyLeftover = computed(() => {
  return props.portfolio.poolInfo.isLegacyLeftover;
});

const latestEarned = ref(0);

const userEarned = computed(() => {
  const initIPISTR = props.portfolio?.userInfoByPool?.pendingIpistrs;
  return latestEarned.value > initIPISTR ? latestEarned.value : initIPISTR;
});

//显示当前我 unclosed 状态下的所有头寸
const myPositions = computed(() => {
  const myPos = props.portfolio.myPositions;
  const unclose = myPos?.length ? myPos.filter(o => o.state * 1 !== 8) : [];
  return unclose.length;
});

// 头寸没有结束前所有锁定的保证金
const marginLocked = computed(() => {
  const myPos = props.portfolio.myPositions;

  if (myPos.length === 0) return 0;

  const lockedMargin =
    _.sumBy(myPos, o => {
      if (o.state * 1 !== 8) {
        return o.totalMarginAmount * 1;
      }
      return 0;
    }) || 0.0;

  return lockedMargin;
});

/**
 * @description: 显示未结算遗产债务
 * @param {*}
 * @return {*}
 */

const showLegacyTip = computed(() => {
  if (props.portfolio.poolInfo.isLegacyLeftover) {
    return true;
  }
  return false;
});

/**
 * @description: 可提现金额
 * @param {*}
 * @return {*}
 */
const withdrawable = computed(() => {
  if (!props.portfolio.canWithdraw) {
    return 0;
  }

  if (props.portfolio.poolInfo.isLegacyLeftover) {
    const sum = NP.plus(progress.stable, NP.times(props.portfolio.poolInfo.stakedTokenPrice, progress.staked));
    return sum;
  } else {
    let amount = Math.min(props.portfolio?.userInfoByPool?.amount, props.portfolio.poolInfo.currentAmount);
    return NP.times(amount, props.portfolio.poolInfo.stakedTokenPrice);
  }
});

/**
 * @description: 我的借款
 * @param {*}
 * @return {*}
 */
const myBorrow = computed(() => {
  if (props.portfolio.myPositions.length === 0) return 0;
  if (props.portfolio.myPositions.length === 1) {
    return props.portfolio.myPositions[0].totalSize;
  }

  let borrow =
    _.sumBy(props.portfolio.myPositions, o => {
      if (o.state * 1 !== 8) {
        return o.totalSize * 1;
      }
      return 0;
    }) || 0;

  return borrow;
});

watch(
  () => props.portfolio?.userInfoByPool?.pendingIpistrs,
  ipistr => {
    if (ipistr > 0) {
      addNormalPriorityInterval(getLatestEarned);
    }
  },
);

watchEffect(async () => {
  if (props.portfolio.poolInfo.stateFlag == 4 && isLegacyLeftover.value) {
    if (account.value) {
      const res = await StrPoolAction.getWithdrawableAmountByPercent(
        account.value,
        props.portfolio.poolInfo.sTokenAddress,
        100,
      );

      progress.stable = res.stableTokenAmount;
      progress.staked = res.withdrawAmount;
    }
  }
});

async function getLatestEarned() {
  latestEarned.value = await getPendingIpistrs(props.portfolio.poolInfo.id, account.value);
}
</script>

<style lang="scss" scoped>
.panel-container {
  margin-top: 16px;
}
.panel {
  @include flex;
  flex-direction: column;
  // height: 227px;
}
.assets {
  @include flex;
  flex-direction: column;
  flex: 1;
  li {
    @include flex-center-v;
    flex: 1;
    &:last-child {
      margin-top: 19px;
      padding-top: 19px;
      border-top: 1px solid #e6e6e6;
    }
    .info {
      flex: 1;
      > p {
        color: #a4a5b2;
        margin-bottom: 12px;
        font-family: $caption;
        font-size: 16px;
      }
      h4 {
        @include flex-center-v;
        font-size: 28px;
      }
    }

    span {
      margin-right: 6px;
    }
  }
  .icon-more-info {
    @include flex-center;
    color: #a4a5b2;
    margin-left: 6px;
    .shorter-icon {
      width: 20px;
      height: 20px;
    }
    &:hover {
      cursor: pointer;
      color: $primary;
    }
  }
}
.popover-content {
  width: 242px;
  padding: 5px 0;
  font-size: 14px;
  font-family: Haas Grot Text;
  font-weight: 500;
  p {
    color: #fff;
    opacity: 0.5;
    font-size: 12px;
    margin-top: 3px;
  }
  div {
    @include flex;
    justify-content: space-between;
    margin-bottom: 10px;
  }
}
</style>
