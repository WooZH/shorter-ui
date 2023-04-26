<template>
  <div class="panel-container phase">
    <shorterSkeleton v-if="loading" style="display: flex; justify-content: space-between; margin-bottom: 24px" animated>
      <template #template>
        <shorterSkeletonItem style="width: 250px; height: 24px" />
        <shorterSkeletonItem style="width: 100px; height: 24px" />
      </template>
    </shorterSkeleton>
    <header v-else class="panel-header">
      <h4 class="panel-title">USDs Auction - Naginata</h4>
      <div class="rt">
        <div v-if="!state.isEnded" class="status active">Ongoing</div>
        <div v-else class="status">Ended</div>
      </div>
    </header>
    <div class="panel">
      <shorterSkeleton :loading="state.loading.fetchLegacyBidList" animated>
        <template #template>
          <shorterSkeleton v-for="i in 6" :key="i">
            <template #template>
              <shorterSkeletonItem style="height: 16px; width: 20%; margin: 10px 25px 0 0" />
              <shorterSkeletonItem style="height: 16px; width: 20%; margin: 10px 25px 0 0" />
              <shorterSkeletonItem style="height: 16px; width: 25%; margin: 10px 25px 0 0" />
              <shorterSkeletonItem style="height: 16px; width: 20%; margin: 10px 25px 0 0" />
            </template>
          </shorterSkeleton>
        </template>
        <template #default>
          <div v-if="state.legacyBidList?.length > 0" class="table">
            <table class="shorter-table legacy-table">
              <thead class="table-header">
                <th>Ruler</th>
                <th>Sell at</th>
                <th>Debt Coverage (%)</th>
                <th>Submitted on ({{ tz.text }})</th>
                <th class="link" />
              </thead>
              <tbody>
                <tr v-for="(item, index) in formatedLegacyBidList" :key="`legacyBidList_${index}`">
                  <td>
                    <span v-if="item.ruler == account.value" class="color-primary">
                      {{ ellipsisStr(item.ruler) }}
                      <small>(You)</small>
                    </span>
                    <Copy v-else v-model="item.ruler">
                      <span>
                        {{ ellipsisStr(item.ruler) }}
                      </span>
                    </Copy>
                  </td>
                  <td>
                    <SmartNumber type="price" :value="item.bidPrice" />
                  </td>
                  <td>
                    <SmartNumber type="quantity" :value="item.bidSize" />
                    ({{ item.percantage }})
                  </td>
                  <td>
                    {{ formatDate(item.bidTime, "HH:mm:ss") }}
                    <p class="date">
                      {{ formatDate(item.bidTime, "MMM DD, YYYY") }}
                    </p>
                  </td>
                  <td>
                    <div class="link" @click="onShare(item.transactionHash)">
                      <svg class="shorter-icon share" aria-hidden="true">
                        <use xlink:href="#icon-share" />
                      </svg>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <Empty v-else content="No rulers into this Legacy" />
        </template>
      </shorterSkeleton>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, watchEffect, inject, onBeforeUnmount } from "vue";
import { ethers, utils } from "ethers";
import NP from "number-precision";

import { getContractAddress, } from "@/contract";
import * as VaultButler from "@/contract/vaultButler";
import VaultButlerJson from "@/abis/VaultButler.json";

import { getRPCProvider } from '@/wallet/provider';
import { useTimezone } from "@/hooks/useTimezone";
import { useWallet } from "@/hooks/useWallet";

import { getCurBlockNumber } from "@/utils/block";
import { ellipsisStr, encodeFilterTopics, formatDate, toPercent } from "@/utils/format";
import { openUrl } from "@/utils/url";

const refreshLiquidationDetail = inject("refreshLiquidationDetail");

const props = defineProps({
  liquidationDetail: {
    type: Object,
    default: () => {},
  },
  loading: {
    type: Boolean,
    default: () => false,
  },
});

const { tz } = useTimezone();
const { account } = useWallet();

const provider = getRPCProvider();

const state = reactive({
  isEnded: computed(() => {
    return props.liquidationDetail.state !== 4;
  }),
  loading: {
    fetchLegacyBidList: false,
  },
  legacyBidList: [],
});

const formatedLegacyBidList = computed(() => {
  const temp = state.legacyBidList;
  if (temp.length > 0) {
    const res = temp.map(item => {
      const openSize = NP.plus(
        Number(props.liquidationDetail.totalSize),
        Math.abs(props.liquidationDetail.legacyInfo.bidSize),
      );

      const progress = NP.divide(Number(item.bidSize), openSize);

      const percentage = `${toPercent(progress * 100)}%`;
      return {
        detail: props.liquidationDetail,
        openSize: openSize,
        percantage: percentage,
        ruler: item.ruler,
        bidPrice: item.bidPrice,
        bidSize: item.bidSize,
        bidTime: item.bidTime,
        transactionHash: item.transactionHash,
      };
    });
    return res;
  } else {
    return [];
  }
});

watchEffect(() => {
  if (props.liquidationDetail.hash) {
    onListenLogs(props.liquidationDetail);
  }
});

watchEffect(() => {
  if (!props.loading) {
    getLegacyBidList(props.liquidationDetail, true);
  }
});

watchEffect(() => {
  if (state.isEnded) {
    provider.removeAllListeners();
  }
});

async function getLegacyBidList(liquidationDetail, withLoading = false) {
  try {
    state.loading.fetchLegacyBidList = withLoading;
    const fromBlock = liquidationDetail.overdrawnBlock;
    const toBlock = await getCurBlockNumber();
    const res = await VaultButler.getLegacyBidList(
      liquidationDetail.hash,
      fromBlock,
      toBlock,
      liquidationDetail.tokenInfo.decimals,
      liquidationDetail.poolInfo.stableTokenDecimals,
    );
    state.legacyBidList = _.orderBy(res, ["bidSize"], ["desc"]);
  } finally {
    state.loading.fetchLegacyBidList = false;
  }
}

function onShare(transactionHash) {
  let contractAddress = getContractAddress();
  if (!contractAddress.scanURL) {
    return;
  }
  openUrl(`${contractAddress.scanURL}/tx/${transactionHash}`, "onShare");
}

async function listenExecuteNaginata(liquidationDetail, callback) {
  const iface = new ethers.utils.Interface(VaultButlerJson);
  const topics = await encodeFilterTopics(VaultButlerJson, "ExecuteNaginata");
  const coderAbi = new utils.AbiCoder();
  topics.push(coderAbi.encode(["address"], [liquidationDetail.hash]));
  const contractAddress = getContractAddress();
  const filter = {
    // fromBlock: liquidationDetail.overdrawnBlock,
    // toBlock: await getCurBlockNumber(),
    topics,
    address: contractAddress.VaultButler,
  };
  provider.on(filter, log => {
    const res = iface.parseLog(log);
    if (typeof callback === "function") {
      callback(res.args);
    }
  });
}

function onListenLogs(liquidationDetail) {
  listenExecuteNaginata(liquidationDetail, log => {
    if (log.positionAddr == liquidationDetail.hash) {
      refreshLiquidationDetail();
    }
  });
}

onBeforeUnmount(() => {
  provider.removeAllListeners();
});
</script>

<style lang="scss" scoped>
@import "./phase.scss";

.panel {
  overflow: hidden;
}

.title {
  position: relative;
  .rt {
    svg {
      position: absolute;
      right: -85px;
      top: -70px;
      width: 210px;
      height: 210px;
      z-index: 2;
    }
  }
}

.table {
  .date {
    font-size: 12px;
    color: #a4a5b2;
  }
  .progress {
    position: relative;
    width: 4px;
    height: 24px;
    background: #fce6dc;
    border-radius: 4px;
    margin-right: 8px;
    .progress-bar {
      position: absolute;
      bottom: 0;
      width: 100%;
      background: $primary;
      border-radius: 0px 0px 4px 4px;
    }
  }
  .link {
    cursor: pointer;
    .share {
      width: 18px;
      height: 18px;
      color: $primary;
    }
  }
}

.phase.close {
  .share {
    color: #a4a5b2;
  }
}

.legacy-table {
  .link {
    width: 38px;
    text-align: right;
  }
  th:nth-child(1) {
    width: 220px;
  }
  th:nth-child(2) {
    width: 180px;
  }
  th:nth-child(3) {
    width: 290px;
  }
  th:nth-child(4) {
    width: 200px;
  }
}
</style>
