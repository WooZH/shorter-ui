<template>
  <div class="panel-container phase">
    <shorterSkeleton v-if="loading" style="display: flex; justify-content: space-between; margin-bottom: 24px" animated>
      <template #template>
        <shorterSkeletonItem style="width: 250px; height: 24px" />
        <shorterSkeletonItem style="width: 100px; height: 24px" />
      </template>
    </shorterSkeleton>
    <header v-else class="panel-header">
      <h4 class="panel-title">Phase 1 (USDs Auction) - Tanto</h4>
      <div class="rt">
        <div v-if="!state.isEnded" class="status active">Ongoing</div>
        <div v-else class="status">Ended</div>
      </div>
    </header>

    <div
      class="panel"
      :class="{
        close: state.isEnded,
      }"
    >
      <shorterSkeleton v-if="loading" animated>
        <template #template>
          <shorterSkeletonItem v-for="i in 6" :key="i" style="height: 16px; width: 100%; margin: 10px 0" />
        </template>
      </shorterSkeleton>

      <div v-else class="table">
        <!-- Ongoing -->
        <shorterSkeleton :loading="state.loading.fetchPhase1BidList" animated>
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
            <div v-if="!state.isEnded">
              <table v-if="state.bidList?.length > 0" class="shorter-table legacy-table">
                <thead class="table-header">
                  <th>Ruler</th>
                  <th>Bid Size</th>
                  <th>Priority Fee</th>
                  <th>Submitted on ({{ tz.text }})</th>
                  <th class="link" />
                </thead>
                <tbody>
                  <tr v-for="(item, index) in state.bidList" :key="`phase1BidList_${index}`">
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
                      <SmartNumber type="quantity" :value="item.bidSize" />
                    </td>

                    <td>
                      <SmartNumber type="quantity" :value="item.priorityFee" />
                      <Tag style="margin-left: 4px">IPISTR</Tag>
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
              <Empty v-else content="No bidding yet" />
            </div>

            <div v-else>
              <table v-if="state.bidList?.length > 0" class="shorter-table end-table legacy-table">
                <thead class="table-header">
                  <th>Ruler</th>
                  <th>Debt Coverage (%)</th>
                  <th>Priority Fee</th>
                  <th>Submitted on ({{ tz.text }})</th>
                  <th>Status</th>
                  <th class="link" />
                </thead>
                <tbody>
                  <tr v-for="(item, index) in state.bidList" :key="`phase1BidList_${index}`">
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
                      <SmartNumber type="quantity" :value="item.bidSize" />

                      <span v-if="item.debtCoverage == 0">(0%)</span>
                      <span v-else>({{ item.debtCoverage > 0.01 ? item.debtCoverage : `&lt;0.01` }}%)</span>
                    </td>

                    <td>
                      <SmartNumber type="quantity" :value="item.priorityFee" />
                      <Tag style="margin-left: 4px">IPISTR</Tag>
                    </td>

                    <td>
                      {{ formatDate(item.bidTime, "HH:mm:ss") }}
                      <p class="date">
                        {{ formatDate(item.bidTime, "MMM DD, YYYY") }}
                      </p>
                    </td>

                    <td>
                      <div class="flex-center-v">
                        <div class="progress">
                          <div class="progress-bar" :style="`height:${item.effectivePercent}%`" />
                        </div>
                        <div class="rt">
                          <p>{{ item.effectivePercent }}%</p>
                          <small v-if="item.effectivePercent >= 100">Won</small>
                          <small v-else-if="item.effectivePercent == 0">Failed</small>
                          <small v-else>Partially Won</small>
                        </div>
                      </div>
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
              <Empty v-else content="No bidding yet" />
            </div>
          </template>
        </shorterSkeleton>

        <!-- Ended -->
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, onBeforeUnmount, reactive, watchEffect } from "vue";
import { useRoute } from "vue-router";
import { ethers, utils } from "ethers";
import NP from "number-precision";

import Tag from "@/components/Tag.vue";

import { getContractAddress } from "@/contract";
import * as AuctionHall from "@/contract/auctionHall.js";
import AuctionHallJson from "@/abis/AuctionHall.json";

import { getRPCProvider } from "@/wallet/provider";
import { useTimezone } from "@/hooks/useTimezone";
import { useWallet } from "@/hooks/useWallet";

import { ellipsisStr, toPercent, formatDate, encodeFilterTopics } from "@/utils/format";
import { openUrl } from "@/utils/url";
import { getCurBlockNumber } from "@/utils/block";

const props = defineProps({
  liquidationDetail: {
    type: Object,
    default: () => {},
  },
  loading: {
    type: Boolean,
    default: () => false,
  },
  phase: {
    type: Number,
    default: () => 0,
  },
});

const provider = getRPCProvider();
const { tz } = useTimezone();
const { account } = useWallet();
const route = useRoute();

const state = reactive({
  bidList: [],
  loading: {
    fetchPhase1BidList: false,
  },
  isEnded: computed(() => {
    return props.phase !== 1;
  }),
  curTotalBid: computed(() => {
    let sum = 0;
    state.bidList.forEach(bid => {
      sum = NP.plus(sum, bid.bidSize || 0);
    });
    return sum;
  }),
});

const curPhase1TotalBid = inject("curPhase1TotalBid");
const events = inject("events");
events["fetchPhase1BidList"] = (function () {
  return () => {
    getPhase1BidList(props.liquidationDetail);
  };
})();

watchEffect(() => {
  if (props.liquidationDetail.hash) {
    onListenLogs(props.liquidationDetail);
  }
});

watchEffect(() => {
  if (state.curTotalBid > 0) {
    curPhase1TotalBid.value = state.curTotalBid;
  }
});
watchEffect(() => {
  if (!props.loading) {
    getPhase1BidList(props.liquidationDetail, state.isEnded, true);
  }
});
watchEffect(() => {
  if (state.isEnded) {
    provider.removeAllListeners();
  }
});

function onShare(transactionHash) {
  console.log(transactionHash);
  let contractAddress = getContractAddress();
  if (!contractAddress.scanURL) {
    console.log("contractAddress.scanURL is null");
    return;
  }
  if (!transactionHash) {
    console.log("onShare address is null");
    return;
  }
  openUrl(`${contractAddress.scanURL}/tx/${transactionHash}`, "onShare");
}

async function getPhase1BidList(liquidationDetail, isEnded, withLoading = false) {
  try {
    state.loading.fetchPhase1BidList = withLoading;
    const toBlock = await getCurBlockNumber();
    const fromBlock = liquidationDetail.closingBlock;

    const hashFromQuery = route.params.id;
    const hash = liquidationDetail.hash || hashFromQuery;

    const res = await AuctionHall.getPhase1BidList(hash, fromBlock, toBlock);
    const bidList = _.orderBy(res, ["priorityFee", "blockNumber"], ["desc", "desc"]);
    if (isEnded) {
      state.bidList = getEndedPhase1List(bidList, liquidationDetail.totalSize);
    } else {
      state.bidList = bidList;
    }
  } finally {
    state.loading.fetchPhase1BidList = false;
  }
}

async function listenBidTanto(liquidationDetail, callback) {
  const iface = new ethers.utils.Interface(AuctionHallJson);
  const topics = await encodeFilterTopics(AuctionHallJson, "BidTanto");
  const coderAbi = new utils.AbiCoder();
  topics.push(coderAbi.encode(["address"], [liquidationDetail.hash]));
  const contractAddress = getContractAddress();
  const filter = {
    topics,
    address: contractAddress.AuctionHall,
  };
  provider.on(filter, log => {
    const res = iface.parseLog(log);
    if (typeof callback === "function") {
      callback(res.args);
    }
  });
}

function onListenLogs(liquidationDetail) {
  listenBidTanto(liquidationDetail, log => {
    if (log && log.positionAddr == liquidationDetail.hash) {
      console.log(log, "catchBidTanto");
      // 防止捕捉不到日志,phase1当前用户的submit会主动去获取phase1列表
      if (log.ruler !== account.value) {
        getPhase1BidList(liquidationDetail, state.isEnded);
      }
    }
  });
}

function getEndedPhase1List(bidList, totalSize) {
  bidList = _.orderBy(bidList, ["priorityFee", "blockNumber"], ["desc", "asc"]);

  let leftSize = totalSize; //剩余size
  const res = [];

  bidList.forEach(item => {
    let bidSize = item.bidSize;

    if (bidSize * 1 >= leftSize * 1) {
      bidSize = leftSize * 1;
    }
    item.effectivePercent = toPercent(NP.divide(bidSize, item.bidSize) * 100);
    if (leftSize > 0) {
      item.debtCoverage = toPercent(NP.divide(bidSize, totalSize) * 100);
    } else {
      item.debtCoverage = toPercent(0);
    }
    leftSize -= bidSize;

    res.push(item);
  });
  return res;
}

onBeforeUnmount(() => {
  provider.removeAllListeners();
});
</script>

<style lang="scss" scoped>
@import "./phase.scss";
.panel {
  overflow: hidden;
  padding-top: 16px;
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
  margin-bottom: -16px;
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
    text-align: right;
    .share {
      cursor: pointer;
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
.shorter-table {
  th:nth-child(1) {
    width: 20%;
  }
  th:nth-child(2) {
    width: 20%;
  }
  th:nth-child(3) {
    width: 30%;
  }
  th:nth-child(4) {
    width: 20%;
  }
}
.end-table {
  th:nth-child(1) {
    width: 20%;
  }
  th:nth-child(2) {
    width: 18%;
  }
  th:nth-child(3) {
    width: 18%;
  }
  th:nth-child(4) {
    width: 20%;
  }
  th:nth-child(4) {
    width: 20%;
  }
}
</style>
