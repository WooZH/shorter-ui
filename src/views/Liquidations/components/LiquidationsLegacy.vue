<template>
  <div class="panel liquidations-table legacy">
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
        <table
          v-if="filterLiquidations.slice(0, state.pagination.currentPage * state.pagination.pageSize).length > 0"
          class="shorter-table table"
        >
          <thead class="table-header">
            <th>Position Hash</th>
            <th>Position Info</th>
            <th>
              <div class="custom-t-header">
                <p>Avg. Open Price/</p>
                <p>Liq. Price</p>
              </div>
            </th>
            <th>Debt Coverage (%)</th>
            <th>Unsettled</th>
            <th>Changed on ({{ tz.text }})</th>
            <th />
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in filterLiquidations.slice(
                0,
                state.pagination.currentPage * state.pagination.pageSize,
              )"
              :key="`legacyList_${index}`"
            >
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
                    <span class="long-number" :title="item.legacyInfos.bidSize">
                      <SmartNumber type="quantity" :value="item.legacyInfos.bidSize" />
                    </span>
                    <span>({{ item.debtPercent * 1 > 0 ? toPercent(item.debtPercent * 100, 2) + "%" : "0%" }})</span>
                  </p>
                  <small class="color-gray">/{{ toAmount(item.legacyInfos.usedCash) }}</small>
                  <Tag style="margin-left: 3px">
                    {{ getContractAddress().usdToken }}
                  </Tag>
                </div>
                <div v-else>-</div>
              </td>
              <td>
                <div v-if="!state.loading.fetchLiquidations">
                  {{ formatNum(item.unsettledCashRemain, 2, true) }}
                  <Tag>{{ getContractAddress().usdToken }}</Tag>
                </div>
                <div v-else>-</div>
              </td>
              <td>
                <div v-if="!state.loading.fetchLiquidations">
                  <Tag>{{ item.legacyReason }}</Tag>

                  <p>
                    {{ item.endTime ? formatDate(item.endTime, "HH:mm:ss") : "-" }}
                  </p>
                  <small class="color-gray">
                    {{ item.endTime ? formatDate(item.endTime, "MMM DD, YYYY") : "-" }}
                  </small>
                </div>
                <div v-else>-</div>
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
        <Empty v-else content="No liquidations yet" />
      </template>
    </shorterSkeleton>

    <footer v-if="state.loadMoreVisible" class="load-more">
      <span @click="state.pagination.currentPage += 1">Load More</span>
    </footer>
  </div>
</template>

<script setup>
import { reactive, computed, onUnmounted, onBeforeMount, watch } from "vue";
import { useRoute } from "vue-router";
import NP from "number-precision";

import { getContractAddress } from "@/contract";
import * as ShortBone from "@/contract/shortBone";
import * as TradingHub from "@/contract/tradingHub";
import * as StrPool from "@/contract/strPool";
import * as VaultButler from "@/contract/vaultButler";

import { useTimezone } from "@/hooks/useTimezone";
import { useWallet } from "@/hooks/useWallet";

import { ellipsisStr, toPercent, formatNum, toAmount, formatDate, blockToTime } from "@/utils/format";

const route = useRoute();

const form = reactive({
  hash: "",
  token: "",
  onlyMine: false,
});

const state = reactive({
  loading: {
    fetchLegacyPositionHashList: true,
    fetchLiquidations: true,
  },
  liquidations: [],
  pagination: {
    pageSize: 10,
    currentPage: 1,
    totalPage: 0,
    totalCount: 0,
  },
  loadMoreVisible: computed(() => {
    if (state.loading.fetchLiquidations) return false;
    if (form.hash || form.token || form.onlyMine) return false;
    if (state.pagination.currentPage < state.pagination.totalPage) {
      return true;
    }
    return false;
  }),
});
const { account, chain } = useWallet();
const { tz } = useTimezone();

getLiquidations();

onBeforeMount(async () => {
  getLiquidations();
});

watch(
  () => chain.id,
  async () => {
    state.liquidations = [];
    getLiquidations();
  },
);

async function getLiquidations() {
  try {
    state.loading.fetchLiquidations = true;
    const hashList = (await getLegacyPositionsHashList()) || [];
    const baseLiqs = await VaultButler.getBaseLiquidations(hashList, 4);
    baseLiqs.sort((a, b) => {
      if (a.positionBlocks && b.positionBlocks) {
        return b.positionBlocks.overdrawnBlock - a.positionBlocks.overdrawnBlock;
      }
      return false;
    });
    const res = (await VaultButler.getLegacyLiquidations(baseLiqs)) || [];
    setPagination(res.length);
    state.liquidations = await Promise.all(res.map(getLiquidationItemInfo));
  } finally {
    state.loading.fetchLiquidations = false;
  }
}

async function getLiquidationItemInfo(item) {
  const { hash, strToken, fundingFee } = item || {};
  const { stakedToken, leverage } = item.poolInfo || {};
  const { bidSize } = item.legacyInfos || {};
  const { totalSize, unsettledCash } = item.positionInfoMap || {};

  const chainConf = getContractAddress();
  const tokenAddress = chainConf.chainTokenAddress;
  const tokenSymbol = chainConf.chainTokenSymbol;
  if (item.poolInfo.stakedToken === tokenAddress) {
    item.symbol = tokenSymbol;
  }

  const debtPercent = Math.min(NP.divide(bidSize, totalSize), 1);
  const tokenLogo = ShortBone.getTokenLogo(stakedToken);
  const endTime = await blockToTime(item.positionBlocks.overdrawnBlock, "MMM DD, YYYY HH:mm:ss");
  const { avgOpenPrice, liqPrice } = await StrPool.getPositionAvgOpenPriceAndLiqPrice({
    hash,
    strToken,
    unsettledCash: unsettledCash,
    leverage,
    totalSize,
    fundingFee,
  });

  return {
    ...item,
    avgOpenPrice,
    liqPrice,
    debtPercent,
    endTime,
    tokenLogo,
    unsettledCashRemain: unsettledCash,
  };
}

async function getLegacyPositionsHashList() {
  try {
    state.loading.fetchLegacyPositionHashList = true;
    const hashList = await TradingHub.getPositionsByState(4);
    return hashList;
  } finally {
    state.loading.fetchLegacyPositionHashList = false;
  }
}

const filterLiquidations = computed(() => {
  let resultList = state.liquidations || [];

  resultList = resultList.map(item => {
    const blocks = item.positionBlocks;
    if (blocks.closingBlock === 0 || blocks.overdrawnBlock - blocks.closingBlock < 220) {
      item.legacyReason = "Overdrawn";
    } else {
      item.legacyReason = "Aborted";
    }
    return item;
  });

  if ((!form.hash && !form.token) || state.loading.fetchLiquidations) return resultList;
  if (!resultList.length) return [];

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

function setPagination(length = 0) {
  state.pagination.totalCount = length;
  state.pagination.totalPage = Math.ceil(length / state.pagination.pageSize);
}

onUnmounted(() => {
  form.hash = "";
  form.token = "";
});
</script>

<style lang="scss" src="./liquidations-table.scss" scoped></style>
