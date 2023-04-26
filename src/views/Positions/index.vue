<template>
  <Layout title="My Positions" :back="{ name: 'Dashboard', text: 'Dashboard' }">
    <div class="panel">
      <form class="form form-search" @submit.prevent>
        <div class="form-control">
          <input v-model="form.token" placeholder="Search Token" style="width: 280px" />
        </div>
        <div class="form-control">
          <v-select
            v-model="form.status"
            style="width: 200px"
            placeholder="State"
            :searchable="false"
            label="text"
            :reduce="item => item.value"
            :options="statusList"
          />
        </div>
      </form>

      <shorterSkeleton :loading="page.loading">
        <template #template>
          <shorterSkeleton v-for="i in 4" :key="i">
            <template #template>
              <shorterSkeletonItem
                v-for="si in 8"
                :key="si"
                style="width: 10%; margin-right: 2.5%; height: 20px; margin-top: 32px"
              />
            </template>
          </shorterSkeleton>
        </template>

        <template #default>
          <table v-if="filterPositionsByPage && filterPositionsByPage.length > 0" class="shorter-table table">
            <thead class="table-header">
              <th>Pool</th>
              <th>Size</th>
              <th>
                <p>Avg. Open Price/</p>
                <p>Liq. Price</p>
              </th>
              <th>Margin</th>
              <th>P/L</th>
              <th>Last Change ({{ tz.text }})</th>
              <th />
              <th />
            </thead>

            <tbody>
              <tr v-for="(item, index) in filterPositionsByPage" :key="`rulers_${index}`">
                <td>
                  <div class="coin">
                    <Image class="coin-icon" :src="item.token ? item.token.logoURI : ''" alt="" circle />
                    <div>
                      <router-link :to="{ name: 'PoolDetail', params: { id: item.poolId }, query: route.query }">
                        <p>#{{ item.poolId }}</p>
                      </router-link>
                      <small class="color-gray">{{ item.tokenName }} ({{ item.leverage }}×)</small>
                    </div>
                  </div>
                </td>

                <td>
                  <p>
                    <SmartNumber prefix="-" type="quantity" :value="item.totalSize" />
                  </p>
                </td>

                <td>
                  <p>
                    <SmartNumber type="price" :value="item.avgHoldPrice" />
                  </p>
                  <small class="color-gray">
                    <SmartNumber type="price" :value="item.liquidPrice" />
                  </small>
                </td>

                <td>
                  <SmartNumber type="amount" :value="item.totalMarginAmount" />
                </td>

                <td>
                  <div v-if="item.earnAmount * 1 === 0" class="color-gray">
                    <p class="strong">${{ 0 }}</p>
                    <small>0%</small>
                  </div>
                  <div v-else-if="item.earnAmount * 1 > 0" class="color-green">
                    <p class="strong">
                      <SmartNumber prefix="+" type="amount" :value="Math.abs(item.earnAmount)" />
                    </p>
                    <small>+{{ toPercent(item.plPercent * 100) }}%</small>
                  </div>
                  <div v-else-if="item.earnAmount * 1 < 0" class="color-red">
                    <p v-if="Math.abs(item.earnAmount) > item.totalMarginAmount" class="strong">
                      <SmartNumber prefix="-" type="amount" :value="Math.abs(item.totalMarginAmount)" />
                    </p>
                    <p v-else class="strong">
                      <SmartNumber prefix="-" type="amount" :value="Math.abs(item.earnAmount)" />
                    </p>
                    <small v-if="item.plPercent < -1">-100%</small>
                    <small v-else>-{{ toPercent(item.plPercent * 100) }}%</small>
                  </div>
                  <div v-else class="color-gray">
                    <p class="strong">$0</p>
                    <small>0%</small>
                  </div>
                </td>

                <td>
                  <p>
                    <span>{{ item.statusText }}</span>
                  </p>

                  <small v-if="item.status < 3" class="color-gray">
                    {{ formatDate(item.poolEndTime) }}
                  </small>
                  <small v-if="item.status === 3" class="color-gray">
                    {{ formatDate(item.overdrawnTime) }}
                  </small>
                  <small v-if="item.status === 4" class="color-gray">
                    {{ formatDate(item.phase1StartTime) }}
                  </small>
                  <small v-if="item.status === 5" class="color-gray">
                    <span v-if="item.poolEndTime < item.closedTime">
                      {{ formatDate(item.closedTime) }}
                    </span>
                    <span v-else>
                      {{ formatDate(item.poolEndTime) }}
                    </span>
                  </small>
                  <small v-if="item.status === 6" class="color-gray">
                    {{ formatDate(item.finishedTime) }}
                  </small>
                </td>

                <td>
                  <Tag :color="getPositionStatusTagColor(item.status)">
                    {{ getPositionStatusText(item.status) }}
                  </Tag>
                </td>

                <td>
                  <div class="flex opt-wrap">
                    <shorterButton v-if="item.state * 1 === 1" class="table-btn large" @click="onTrade(item)">
                      Trade
                    </shorterButton>
                    <shorterButton
                      v-if="item.state * 1 === 8 && item.withdrawableAsset * 1 > 0"
                      class="table-btn large"
                      @click="onAsset(item)"
                    >
                      Assets
                    </shorterButton>
                    <shorterButton
                      v-copy="{ text: item.hash, success: handleCopySuccess }"
                      class="table-btn large btn-share-position"
                    >
                      <svg width="16" height="16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M28 6H42V20"
                          stroke="#606266"
                          stroke-width="4"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                        <path
                          d="M42 29.4737V39C42 40.6569 40.6569 42 39 42H9C7.34315 42 6 40.6569 6 39V9C6 7.34315 7.34315 6 9 6L18 6"
                          stroke="#606266"
                          stroke-width="4"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                        <path
                          d="M25.7998 22.1999L41.0998 6.8999"
                          stroke="#606266"
                          stroke-width="4"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </shorterButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <Empty v-else content="No positions yet" />

          <footer v-if="canLoadMore" class="load-more">
            <Loading v-show="page.loadingMore" />
            <span v-show="!page.loadingMore" @click="handleLoadMore()">Load More</span>
          </footer>
        </template>
      </shorterSkeleton>

      <Dialog v-model="dialogsVisible.trade" width="976px" top="4vh">
        <DialogPosition @closeDialog="dialogsVisible.trade = false" />
      </Dialog>

      <Dialog v-model="dialogsVisible.asset" width="560px" top="4vh">
        <DialogAsset @closeDialog="dialogsVisible.asset = false" />
      </Dialog>
    </div>
  </Layout>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { getCurBlockNumber } from "@/utils/block";
import { formatDate, toPercent } from "@/utils/format";

import { usePosition } from "@/hooks/usePosition";
import { Message } from "@/hooks/useMessage";
import { useTimezone } from "@/hooks/useTimezone";
import { useWallet } from "@/hooks/useWallet";
import { useInterval } from "@/hooks/useInterval";

import DialogPosition from "./components/DialogPosition.vue";
import DialogAsset from "./components/DialogAsset.vue";

// 1 OPEN, 0, 1, 2
// 2 CLOSING, 4
// 3 OVERDRAWN, 3
// 4 CLOSED 5
const statusList = [
  { text: "All" },
  { text: "Open", value: 1 },
  { text: "Closing", value: 2 },
  { text: "Legacy", value: 3 },
  { text: "Closed", value: 4 },
];

const route = useRoute();
const { wallet, account, chain } = useWallet();
const { addNormalPriorityInterval } = useInterval();
const { setDetail, getMyPositions, getPositionStatusTagColor, getPositionStatusText } = usePosition();
const { tz } = useTimezone();

const positionList = ref([]);

const form = reactive({
  token: "",
  status: undefined,
});

const page = reactive({
  loading: false,
  loadingMore: false,
  pageSize: 20,
  currentPage: 1,
});

const dialogsVisible = reactive({ trade: false, asset: false });

const filterPositions = computed(() => {
  let filterList = positionList.value.concat();

  if (form.token || form.status) {
    const reg = new RegExp(form.token, "gi");

    filterList = filterList.filter(el => {
      const isMatch = reg.test(el.hash) || reg.test(el.poolInfo.tokenName);

      if (!isMatch) {
        return false;
      }

      if (!form.status) {
        return el;
      } else if (form.status < 4) {
        return el.state == form.status;
      } else {
        return el.state >= 4;
      }
    });
  }

  filterList.sort(a => {
    const sortCond = a.state * 1 === 0 || (a.state * 1 === 5 && a.withdrawableAsset * 1 > 0);
    if (sortCond) return -1;
  });

  return filterList;
});

const filterPositionsByPage = computed(() => {
  const list = filterPositions.value.concat().splice(0, page.currentPage * page.pageSize);
  return list;
});

const canLoadMore = computed(() => {
  return filterPositionsByPage.value.length < filterPositions.value.length;
});

watch(
  () => [account.value, chain.id],
  () => {
    initPage();
  },
  { immediate: true },
);

async function initPage() {
  if (!wallet.isConnected || !account.value) {
    setTimeout(() => {
      initPage();
    }, 1000);
    return;
  }

  page.loading = true;

  console.log(123);
  await getCurBlockNumber();
  await getPositionList();
  addNormalPriorityInterval(getPositionList);

  page.loading = false;
}

async function getPositionList() {
  const res = await getMyPositions(account.value);
  console.log("positions", res);
  positionList.value = Array.isArray(res) ? res : [];
}

function handleCopySuccess() {
  Message.success("Hash copied");
}

function onTrade(item) {
  setDetail(item);
  dialogsVisible.trade = true;
}

function onAsset(item) {
  setDetail(item);
  dialogsVisible.asset = true;
}

function handleLoadMore() {
  page.loadingMore = true;

  setTimeout(() => {
    page.loadingMore = false;
    page.currentPage = page.currentPage + 1;
  }, 1000);
}
</script>

<style lang="scss" scoped>
@import "../Liquidations/components/liquidations-table.scss";

.panel {
  border-top-left-radius: 24px;
}

.table {
  .coin {
    p {
      text-decoration: underline;
      &:hover {
        color: $primary;
        cursor: pointer;
      }
    }
  }
}

footer {
  width: 100%;
}

.load-more {
  @include flex-center;
  height: 56px;
  margin-bottom: -32px;
  span {
    font-size: 14px;
    font-weight: 600;
    color: #212327;
    padding: 12px;
    cursor: pointer;
  }
}

.btn-share-position {
  margin-left: 14px;
  padding: 0 10px;
  svg {
    display: block;
  }
  path {
    stroke: #606266;
  }
  &:hover {
    path {
      stroke: #fff;
    }
  }
}

/* 表格列宽度定义 */
.shorter-table {
  th:nth-child(1) {
    width: 170px;
  }
  th:nth-child(2) {
    width: 15%;
  }
  th:nth-child(3) {
    width: 10%;
  }
  th:nth-child(4) {
    width: 120px;
  }
  th:nth-child(5) {
    width: 120px;
  }
  th:nth-child(6) {
    width: 240px;
  }
}
.opt-wrap {
  justify-content: flex-end;
}
</style>
