<template>
  <div class="panel liquidations-table">
    <form class="form form-search" @submit.prevent>
      <div class="form-control">
        <input v-model="form.hash" style="width: 418px" placeholder="Position Hash" />
      </div>
      <div class="form-control">
        <input v-model="form.token" style="width: 280px" placeholder="Search Token" />
      </div>
    </form>

    <shorterSkeleton :loading="state.loading.fetchLiquidations">
      <template #template>
        <div class="table-skeleton-top">
          <shorterSkeleton v-for="i in 6" :key="i">
            <template #template>
              <div class="table-skeleton">
                <shorterSkeletonItem v-for="si in 6" :key="si" style="height: 26px; width: 13%" />
              </div>
            </template>
          </shorterSkeleton>
        </div>
      </template>
      <template #default>
        <div v-if="filterLiquidations?.length > 0" class="table">
          <table class="shorter-table legacy-table">
            <thead class="table-header">
              <th>Position Hash</th>
              <th>Position Info</th>
              <th>
                <div class="custom-t-header">
                  <p>Avg. Open Price/</p>
                  <p>Liq. Price</p>
                </div>
              </th>
              <th>Phase 1 (USDs Auction)%</th>
              <th>Closes in</th>
              <th />
            </thead>
            <tbody>
              <tr v-for="(item, index) in filterLiquidations" :key="`legacyBidList_${index}`">
                <td>
                  <Copy v-model="item.hash">
                    {{ ellipsisStr(item.hash) }}
                  </Copy>
                </td>
                <td>
                  <div v-if="!state.loading.fetchLiquidations" class="coin">
                    <Image class="coin-icon" :src="item.tokenLogo" circle />
                    <div>
                      <p>{{ item.symbol }}</p>
                      <small class="color-gray">
                        ({{ item.poolInfo.leverage }}×)
                        <SmartNumber prefix="-" type="quantity" :value="item.positionInfoMap.totalSize" />
                      </small>
                    </div>
                  </div>
                  <div v-else>-</div>
                </td>
                <td>
                  <div v-if="!state.loading.fetchLiquidations">
                    <p>
                      <SmartNumber type="price" :value="item.avgOpenPrice" />
                    </p>
                    <small class="color-gray">
                      <SmartNumber type="price" :value="item.liqPrice" />
                    </small>
                  </div>
                  <div v-else>-</div>
                </td>
                <td>
                  <div v-if="!state.loading.fetchLiquidations">
                    <p>
                      <SmartNumber type="quantity" :value="item.phase === 2 ? item.phase1Infos.bidSize : 0" />
                      &nbsp;({{ item.phase === 2 ? toPercent(item.phase1Infos.phase1ActionPercent * 100, 2) : 0 }}%)
                    </p>
                    <small class="color-gray">
                      /{{
                        item.phase === 2
                          ? formatNum(NP.times(item.phase1Infos.bidSize, item.phase1Infos.liquidationPrice))
                          : 0
                      }}
                    </small>
                  </div>
                  <div v-else>-</div>
                </td>
                <td>
                  <template v-if="!state.loading.fetchLiquidations">
                    <svg class="shorter-icon" aria-hidden="true" style="margin-right: 5px">
                      <use xlink:href="#icon-countdown" />
                    </svg>
                    <Countdown :start-time="new Date().getTime()" :end-time="new Date(item.endTime).getTime()" />
                  </template>
                </td>
                <td>
                  <div class="flex-center-v" style="justify-content: flex-end">
                    <router-link
                      :to="{
                        name: 'LiquidationDetail',
                        params: { id: item.hash },
                        query: route.query,
                      }"
                    >
                      <shorterButton class="large">Liquidate</shorterButton>
                    </router-link>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Empty v-else content="No liquidations yet" />
      </template>
    </shorterSkeleton>
  </div>
</template>

<script setup>
import { reactive, computed, onUnmounted, watch, onBeforeMount } from "vue";
import { useRoute } from "vue-router";
import NP from "number-precision";

import Countdown from "@/components/Countdown.vue";

import { getContractAddress } from "@/contract";
import * as ShortBone from "@/contract/shortBone";
import * as TradingHub from "@/contract/tradingHub";
import * as StrPool from "@/contract/strPool";
import * as VaultButler from "@/contract/vaultButler";
import { PHASE1_MAX_BLOCKS, PHASE2_MAX_BLOCKS } from "@/contract/auctionHall";

import { getCurBlockNumber } from "@/utils/block";
import { ellipsisStr, toPercent, formatNum, blockToTime } from "@/utils/format";
import { useWallet } from "@/hooks/useWallet";

const route = useRoute();

const form = reactive({
  hash: "",
  token: "",
});
const state = reactive({
  loading: {
    fetchClosingPositionsHashList: true,
    fetchLiquidations: true,
  },
  liquidations: [],
});

const { chain } = useWallet();

async function getLiquidations() {
  try {
    state.loading.fetchLiquidations = true;
    const hashListRes = await getClosingPositionsHashList();
    const hashList = [...hashListRes].reverse();

    const baseLiqs = await VaultButler.getBaseLiquidations(hashList);
    const res = await VaultButler.getClosingLiquidations(baseLiqs);
    state.liquidations = await Promise.all(res.map(getLiquidationItemInfo));
  } finally {
    state.loading.fetchLiquidations = false;
  }
}

async function getLiquidationItemInfo(item) {
  const totalSize = item.positionInfoMap.totalSize;
  const bidSize = item.phase1Infos.bidSize;
  const { stakedToken, leverage } = item.poolInfo || {};

  const tokenLogo = ShortBone.getTokenLogo(stakedToken);
  const { endTime, phase } = await getEndTimeAndPhase(item.positionBlocks.closingBlock);
  const { avgOpenPrice, liqPrice } = await StrPool.getPositionAvgOpenPriceAndLiqPrice({
    hash: item.hash,
    strToken: item.strToken,
    unsettledCash: item.positionInfoMap.unsettledCash,
    leverage,
    totalSize,
    fundingFee: item.fundingFee,
  });
  item.phase1Infos.bidSize = Math.min(bidSize, totalSize);
  item.phase1Infos.phase1ActionPercent = NP.divide(bidSize, totalSize);

  const chainConf = getContractAddress();
  const tokenAddress = chainConf.chainTokenAddress;
  const tokenSymbol = chainConf.chainTokenSymbol;
  if (item.poolInfo.stakedToken === tokenAddress) {
    item.symbol = tokenSymbol;
  }

  return {
    ...item,
    tokenLogo,
    totalSize,
    avgOpenPrice,
    liqPrice,
    endTime,
    phase,
  };
}

async function getClosingPositionsHashList() {
  try {
    state.loading.fetchClosingPositionsHashList = true;
    const hashList = await TradingHub.getPositionsByState(2);
    return hashList;
  } finally {
    state.loading.fetchClosingPositionsHashList = false;
  }
}

async function getEndTimeAndPhase(closingBlock) {
  const curBlock = await getCurBlockNumber();
  //phase1
  let endBlock = closingBlock + PHASE1_MAX_BLOCKS;
  let phase = 1;
  //phase2
  if (curBlock - closingBlock > PHASE1_MAX_BLOCKS) {
    endBlock += PHASE2_MAX_BLOCKS;
    phase = 2;
  }
  const endTime = await blockToTime(endBlock, "MMM DD, YYYY HH:mm:ss");
  return {
    endTime,
    phase,
  };
}
const filterLiquidations = computed(() => {
  let resultList = state.liquidations || [];
  if ((!form.hash && !form.token) || state.loading.fetchLiquidations) return resultList;

  if (form.hash) {
    resultList = resultList.filter(item => {
      const reg = new RegExp(form.hash, "gi");
      if (reg.test(item.hash)) return item;
    });
  }

  if (form.token) {
    resultList = resultList.filter(item => {
      const regToken = new RegExp(form.token, "gi");
      if (regToken.test(item.symbol)) return item;
    });
  }

  return resultList;
});

onBeforeMount(() => {
  getLiquidations();
});

watch(
  () => chain.id,
  () => {
    getLiquidations();
  },
);

onUnmounted(() => {
  form.hash = "";
  form.token = "";
});
</script>

<style lang="scss" src="./liquidations-table.scss" scoped></style>
