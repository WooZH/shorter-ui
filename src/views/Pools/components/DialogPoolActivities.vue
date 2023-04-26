<template>
  <div class="panel dialog-pool-activities" :class="{ 'no-scroll': filterLogs.length <= 6 }">
    <h4 class="title">My Pool Activities</h4>

    <div class="table-container">
      <div class="shorter-table">
        <div class="table-header">
          <div>Pool</div>
          <div>Op.</div>
          <div class="center">Amount</div>
          <div class="text-right">Time ({{ tz.text }})</div>
          <div class="center" />
        </div>

        <div v-show="!state.loading" class="scroll-body" :class="{ scroll: filterLogs.length > 6 }">
          <div v-for="(item, index) in filterLogs" :key="`log_${index}`" class="log-wrap">
            <div class="item item-pool">
              <Image class="token-logo" :src="item.logoURI" alt="" />
              <div class="pool-info">
                <a class="pool-link" :href="`${poolUrl}${item.poolId}${networkQuery}`" target="_blank">
                  #{{ item.poolId }}
                </a>
                <p class="leverage">{{ item.stakedTokenName }} ({{ item.leverage }}x)</p>
              </div>
            </div>

            <div class="item">{{ item.operation }}</div>

            <div
              class="center item increase"
              :class="{ decrease: item.operation === 'Repay' || item.operation === 'Withdraw' }"
              :title="item.amount"
            >
              <span>
                <SmartNumber
                  :prefix="item.operation === 'Repay' || item.operation === 'Withdraw' ? '-' : '+'"
                  type="quantity"
                  :value="item.amount"
                />
              </span>
            </div>

            <div class="center item text-right">
              <p>{{ item.time }}</p>
              <p class="date">{{ item.date }}</p>
            </div>

            <div class="center">
              <a class="icon-jump" :href="`${scanURL}${item.txHash}`" target="_blank">
                <svg class="shorter-icon icon-jump" aria-hidden="true">
                  <use xlink:href="#icon-share" />
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div v-show="state.loading">
          <div v-for="i in 6" :key="i" class="skeleton-wrap">
            <ShorterSkeletonItem v-for="s in 4" :key="s" class="item-skeleton" />
          </div>
        </div>
      </div>
      <Empty v-if="!state.loading && (!filterLogs || filterLogs.length === 0)" content="No Activities" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watchEffect } from "vue";
import { BigNumber } from "ethers";

import { getContractAddress } from "@/contract";

import { useTimezone } from "@/hooks/useTimezone";
import { usePoolActivities } from "@/hooks/usePoolActivities";
import { useWallet } from "@/hooks/useWallet";

import * as Transfer from "@/utils/transfer";
import { blockToTimeSync } from "@/utils/format";
import { getTokenInfoByAddress } from '@/utils/localStorage';

const { tz } = useTimezone();
const { wallet, account } = useWallet();
const { getPoolActivities } = usePoolActivities();

const state = reactive({
  loading: false,
});

const logs = ref([]);

watchEffect(async () => {
  if (wallet.isConnected) {
    state.loading = true;

    const res = await getPoolActivities(account.value);
    logs.value = res;

    state.loading = false;
  }
});

const poolUrl = computed(() => {
  return window.location.origin + "/pools/";
});

const scanURL = computed(() => {
  const contractAddress = getContractAddress();
  return `${contractAddress.scanURL}/tx/`;
});

const networkQuery = computed(() => {
  return window.location.search;
});

const filterLogs = computed(() => {
  let result = [];
  logs.value.map(item => {
    if (!item) return;

    const bigAmount = BigNumber.from(item.amount);
    const time = blockToTimeSync(item.blockNumber, "HH:mm");
    const date = blockToTimeSync(item.blockNumber, "MMM D, YYYY");
    result.push({
      ...item,
      time: time,
      date: date,
      logoURI: getTokenInfoByAddress(item.stakedToken).logoURI,
      stakedTokenName: getTokenInfoByAddress(item.stakedToken).symbol,
      amount: Transfer.receiveAmount(bigAmount, item.decimals),
    });
  });
  return result;
});
</script>

<style lang="scss" scoped>
.dialog-pool-activities {
  width: 560px;
}
.panel {
  font-family: Haas Grot Text;
  padding-right: 14px;
}
.table-container {
  margin-top: 40px;
}

.skeleton-wrap {
  padding: 16px 0;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #e4e4e4;
  &:last-child {
    border-bottom: 0;
  }
}
.item-skeleton {
  width: 23%;
  height: 34px;
}

.shorter-table {
  width: 100%;
  transition: all 0.1s;
  .table-header {
    border-bottom: 1px solid #e4e4e4;
    text-align: left;
    padding: 16px 0;
    color: #a4a5b2;
    display: grid;
    grid-template-columns: 25% 20% 22.5% 25% 7.5%;
  }

  .center {
    text-align: center;
  }
  .text-right {
    text-align: right;
  }
  .scroll-body {
    display: block;
    max-height: 410px;
    overflow-y: auto;
    .log-wrap {
      display: grid;
      grid-template-columns: 25% 20% 22.5% 25% 7.5%;
      align-items: center;
      border-bottom: 1px solid #e4e4e4;
      &:last-child {
        border-bottom: 0;
      }
    }
    .item-pool {
      display: flex;
      align-items: center;
      .token-logo {
        width: 24px;
        height: 24px;
        margin-right: 8px;
      }
      .pool-info {
        display: block;
        .leverage {
          margin-top: 3px;
          font-size: 12px;
          color: #909399;
        }
      }
    }
    .pool-link {
      color: #333333;
      font-weight: 600;
      font-size: 14px;
      line-height: 17px;
      text-decoration: underline;
      transition: all 0.1s;

      &:hover {
        color: $primary;
      }
    }
    .item {
      padding: 16px 0;
      color: #333;
      .date {
        font-size: 12px;
        color: #909399;
      }
    }
    .increase {
      color: #43ac8d;
    }
    .decrease {
      color: #ef5a4f;
    }
    .icon-jump {
      svg {
        color: #909399;
        transition: all 0.1s;
      }
      &:hover svg {
        color: $primary;
      }
    }
    &::-webkit-scrollbar {
      width: 4px;
      height: 20px;
      background-color: rgba(228, 228, 228, 0.5);
    }
    &::-webkit-scrollbar-thumb {
      height: 30px;
      width: 4px;
      cursor: pointer;
      background-color: #d6d6d6;
    }
  }
}

.no-scroll {
  padding-right: 32px;
}
.scroll {
  padding-right: -14px;
}
</style>
