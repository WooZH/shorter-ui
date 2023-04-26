<template>
  <div class="panel liquidations-table finished">
    <form class="form form-search" @submit.prevent>
      <div class="form-control">
        <input v-model="form.hash" style="width: 418px" placeholder="Position Hash" />
      </div>
      <div class="form-control">
        <input v-model="form.token" style="width: 280px" placeholder="Search Token" />
      </div>
    </form>

    <shorterSkeleton :loading="state.loading.fetchFinishedPositions">
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
            <th>Last State</th>
            <th>Phase 1 (USDs Auction)</th>
            <th>Phase 2 (Dex Cover)</th>
            <th>Finished on ({{ tz.text }})</th>
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
                <div v-if="!state.loading.fetchFinishedPositions" class="coin">
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
                <div v-if="state.loading.fetchFinishedPositions">-</div>
                <div v-else>
                  {{ item.lastState }}
                </div>
              </td>
              <td>
                <div v-if="!state.loading.fetchFinishedPositions" class="phase-2">
                  <svg class="shorter-icon" aria-hidden="true">
                    <use xlink:href="#icon-substitution" />
                  </svg>
                  <div class="rt">
                    <p>
                      <template v-if="item.lastState === 'Legacy'">0</template>
                      <SmartNumber
                        v-else
                        type="quantity"
                        :value="NP.times(item.phase1Infos.bidSize, item.phase1Infos.liquidationPrice)"
                      />
                      <Tag>{{ getContractAddress().usdToken }}</Tag>
                    </p>
                    <small class="color-gray">
                      <template v-if="item.lastState === 'Legacy'">0</template>
                      <SmartNumber v-else type="quantity" :value="item.phase1Infos.bidSize" />
                    </small>
                    <Tag style="margin-left: 3px">
                      {{ item.symbol }}
                    </Tag>
                  </div>
                </div>
                <div v-else>-</div>
              </td>
              <td>
                <div v-if="!state.loading.fetchFinishedPositions" class="phase-2">
                  <svg class="shorter-icon" aria-hidden="true">
                    <use xlink:href="#icon-substitution" />
                  </svg>
                  <div class="rt">
                    <p>
                      <template v-if="item.lastState === 'Legacy'">0</template>
                      <SmartNumber v-else type="quantity" :value="item.phase2Infos.usedCash" />
                      <Tag>{{ getContractAddress().usdToken }}</Tag>
                    </p>
                    <small class="color-gray">
                      <template v-if="item.lastState === 'Legacy'">0</template>
                      <SmartNumber v-else type="quantity" :value="item.phase2Infos.debtSize" />
                    </small>
                    <Tag style="margin-left: 3px">
                      {{ item.symbol }}
                    </Tag>
                  </div>
                </div>
                <div v-else>-</div>
              </td>
              <td>
                <div v-if="!state.loading.fetchFinishedPositions">
                  <p>
                    {{ formatDate(item.endTime, "HH:mm:ss") }}
                  </p>
                  <small class="color-gray">
                    {{ formatDate(item.endTime, "MMM DD, YYYY") }}
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
                    <shorterButton class="large">Detail</shorterButton>
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
      <Loading v-show="state.loading.loadMore" />

      <span v-show="!state.loading.loadMore" @click="loadMore()">Load More</span>
    </footer>
  </div>
</template>

<script setup>
import { computed, reactive, onUnmounted, watch, onBeforeMount } from "vue";
import { useRoute } from "vue-router";
import NP from "number-precision";

import { getContractAddress } from "@/contract";
import * as ShortBone from "@/contract/shortBone";
import * as TradingHub from "@/contract/tradingHub";
import * as VaultButler from "@/contract/vaultButler";

import { useTimezone } from "@/hooks/useTimezone";
import { useWallet } from "@/hooks/useWallet";

import { ellipsisStr, formatDate, blockToTime } from "@/utils/format";

const route = useRoute();
const { tz } = useTimezone();
const { chain } = useWallet();

const form = reactive({
  hash: "",
  token: "",
});
const state = reactive({
  loading: {
    fetchFinishedPositions: true,
    loadMore: false,
  },
  hashList: [],
  liquidations: [],
  pagination: {
    pageSize: 20,
    loadSize: 50,
    currentPage: 1,
    totalPage: 0,
    loadPage: 0,
    totalNumber: 0,
    totalCount: 0,
  },
  loadMoreVisible: computed(() => {
    if (state.loading.fetchFinishedPositions) return false;
    if (form.hash || form.token || form.onlyMine) return false;
    if (state.pagination.currentPage < state.pagination.totalNumber || state.loading.loadMore) {
      return true;
    }
    return false;
  }),
});

onBeforeMount(async () => {
  state.loading.fetchFinishedPositions = true;
  await getFinishedPositionsHashList();
  loadAll();
});

watch(
  () => chain.id,
  async () => {
    state.loading.fetchFinishedPositions = true;
    await getFinishedPositionsHashList();
    state.liquidations = [];
    loadAll();
  },
);

async function loadMore() {
  if (state.pagination.currentPage > state.pagination.totalNumber) return;

  state.loading.loadMore = true;
  setTimeout(() => {
    state.pagination.currentPage += 1;

    state.loading.loadMore = false;
  }, 500);
}

async function loadAll() {
  const queryAll = [];
  for (let current = 1; current <= state.pagination.loadPage; current++) {
    queryAll.push(getLiquidationsByPage(current, state.pagination.loadSize));
  }

  const res = await Promise.all(queryAll);
  res.forEach(item => {
    state.liquidations.push(...item);
  });
  setPageNumber(state.liquidations.length);

  let resultList = [];
  resultList = state.liquidations.concat();
  resultList = resultList.sort((a, b) => {
    if (a.positionBlocks && b.positionBlocks) {
      return b.positionBlocks.closedBlock - a.positionBlocks.closedBlock;
    }
    return false;
  });
  state.liquidations = resultList;
  state.loading.fetchFinishedPositions = false;
}

async function getLiquidationsByPage(currentPage, size) {
  const startIndex = (currentPage - 1) * size;
  const hashChip = state.hashList.concat().splice(startIndex, size);

  const baseLiqs = await VaultButler.getBaseLiquidations(hashChip, 8);
  baseLiqs.sort((a, b) => {
    if (a.positionBlocks && b.positionBlocks) {
      return b.positionBlocks.closedBlock - a.positionBlocks.closedBlock;
    }
    return false;
  });
  const res = await getFinishedLiquidations(baseLiqs);
  return res;
}

async function getFinishedLiquidations(partBaseLiqs) {
  const res = await VaultButler.getFinishedLiquidations(partBaseLiqs);
  return await Promise.all(
    res.map(async item => {
      const { closedBlock, overdrawnBlock } = item.positionBlocks || {};
      const endTime = await blockToTime(closedBlock, "MMM DD, YYYY HH:mm:ss");
      const tokenLogo = ShortBone.getTokenLogo(item.poolInfo.stakedToken);
      item.phase1Infos.bidSize = Math.min(item.phase1Infos.bidSize, item.positionInfoMap.totalSize);
      if (item.poolInfo.stakedToken === getContractAddress().chainTokenAddress) {
        item.symbol = getContractAddress().chainTokenSymbol;
      }
      return {
        ...item,
        endTime,
        tokenLogo,
        lastState: getLastState(item.phase1Infos.flag, overdrawnBlock),
      };
    }),
  );
}

async function getFinishedPositionsHashList() {
  try {
    const res = await TradingHub.getPositionsByState(8);
    state.hashList = res || [];
    setPagination(state.hashList.length);
  } catch (error) {
    state.hashList = [];
    console.error("get finished position hash list error =>", error);
  }
}

function getLastState(phase1Flag = false, overdrawnBlock = 0) {
  if (overdrawnBlock > 0) {
    return "Legacy";
  } else if (phase1Flag) {
    return "Phase 1";
  } else {
    return "Phase 2";
  }
}

const filterLiquidations = computed(() => {
  let resultList = state.liquidations || [];
  if ((!form.hash && !form.token) || state.loading.fetchFinishedPositions) return resultList;
  if (!resultList.length) return;

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
  state.pagination.loadPage = Math.ceil(length / state.pagination.loadSize);
}

function setPageNumber(count = 0) {
  state.pagination.totalCount = length;
  state.pagination.totalNumber = Math.ceil(count / state.pagination.pageSize);
}

onUnmounted(() => {
  form.hash = "";
  form.token = "";
});
</script>

<style lang="scss" src="./liquidations-table.scss" scoped></style>
