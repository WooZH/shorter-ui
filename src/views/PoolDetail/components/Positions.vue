<template>
  <div class="positions">
    <ul class="tabs">
      <li v-if="wallet.isConnected" :class="['tab-item', { active: state.curTab === 1 }]" @click="switchToTab(1)">
        <span>
          My Positions
          <template v-if="!loading && poolDetail.myPositions.length">({{ poolDetail.myPositions.length }})</template>
        </span>
      </li>

      <li :class="['tab-item', { active: state.curTab === 0 }]" @click="switchToTab(0)">
        <span>Elite Positions</span>
      </li>
    </ul>

    <div class="panel">
      <div class="table">
        <template v-if="loading">
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

        <table v-if="!loading && currentPosition.length" class="shorter-table position-table">
          <thead class="table-header">
            <th>Hash</th>
            <th>Size</th>
            <th>Margin</th>
            <th>Liq.Price</th>
            <th>Avg. Open Price</th>
            <th>P/L</th>
            <th />
            <th />
          </thead>
          <tbody>
            <tr v-for="(item, index) in currentPosition" :key="`pool_positions_${index}`">
              <td>
                <div class="flex-center-v">
                  <Copy v-model="item.hash">
                    <span>{{ item.hash ? ellipsisStr(item.hash) : "-" }}</span>
                  </Copy>
                </div>
              </td>

              <td>
                <SmartNumber type="quantity" :value="-item.totalSize" />
              </td>

              <td>
                <div class="cell-margin flex-center-v">
                  <Image class="coin-logo" circle :src="poolDetail.poolInfo.stableLogo" />
                  <span>
                    <SmartNumber type="quantity" :value="item.totalMarginAmount" />
                  </span>
                </div>
              </td>

              <td>
                <SmartNumber type="price" :value="item.liquidPrice || '0.0'" />
              </td>

              <td>
                <SmartNumber type="price" :value="item.avgHoldPrice || '0.0'" />
              </td>

              <td>
                <div v-if="item.earnAmount * 1 > 0" class="color-green">
                  <p class="strong">
                    <SmartNumber prefix="+" type="amount" :value="item.earnAmount" />
                  </p>
                  <small>+{{ toPercent(Math.abs(item.plPercent * 100)) }}%</small>
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
                <Tag :color="getPositionStatusTagColor(item.status)">
                  {{ getPositionStatusText(item.status) }}
                </Tag>
              </td>
              <td class="opt-wrap">
                <shorterButton
                  v-if="item.state * 1 === 1 && item.trader == account.value"
                  class="table-btn large"
                  @click="onTrade(item)"
                >
                  Trade
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
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!loading && !currentPosition.length" class="panel empty-container">
          <Empty class="empty" content="No positions yet" />
        </div>
      </div>
    </div>
    <Dialog v-model="dialogsVisible.trade" width="976px" top="4vh">
      <DialogPosition @closeDialog="updatePositions" @sell="sell" />
    </Dialog>
  </div>
</template>

<script setup>
import { reactive, computed, watchEffect } from "vue";

import DialogPosition from "@/views/Positions/components/DialogPosition.vue";

import { usePosition } from "@/hooks/usePosition";
import { usePoolDetail } from "@/hooks/usePoolDetail";
import { useWallet } from "@/hooks/useWallet";
import { Message } from "@/hooks/useMessage";

import { ellipsisStr, toPercent } from "@/utils/format";

const props = defineProps({
  loading: {
    type: Boolean,
    default: () => true,
  },
  all: {
    type: Array,
    default: () => [],
  },
  my: {
    type: Array,
    default: () => [],
  },
});
const emit = defineEmits(["sell"]);

const { wallet, account } = useWallet();
const { setDetail, getPositionStatusText, getPositionStatusTagColor } = usePosition();
const { poolDetail, getPositionsByPool } = usePoolDetail();

const state = reactive({
  curTab: 1,
});

const currentPosition = computed(() => {
  let temp = [];
  if (state.curTab === 0) {
    temp = props.all;
    return _.orderBy(temp, ["totalSize", "hash"], ["desc", "desc"]).slice(0, 5);
  } else {
    temp = props.my;
    return _.orderBy(temp, ["state", "openBlock", "hash"], ["asc", "desc", "desc"]);
  }
});

const dialogsVisible = reactive({
  trade: false,
  asset: false,
});

watchEffect(() => {
  if (!wallet.isConnected && state.curTab === 1) {
    state.curTab = 0;
  }
});

async function switchToTab(current) {
  state.curTab = current;
}
function updatePositions() {
  dialogsVisible.trade = false;
  getPositionsByPool(poolDetail.poolInfo.id);
}
function handleCopySuccess() {
  Message.success("Hash copied");
}
function sell() {
  emit("sell");
}

function onTrade(position) {
  setDetail(position, poolDetail);
  dialogsVisible.trade = true;
}
</script>

<style lang="scss" scoped>
.positions {
  margin-top: 48px;
}

.panel {
  padding-top: 16px;
  border-top-left-radius: 0;
}

.table {
  margin: 0px -32px -16px -32px;
  padding: 0px 32px;
  .coin-logo {
    width: 16px;
    height: 16px;
    margin-right: 4px;
    transform: translateY(-2px);
  }
  .cell-margin {
    span {
      transform: translateY(1px);
    }
  }
  .footer {
    @include flex-center;
    margin-bottom: -32px;
    padding: 20px 0;
    span {
      cursor: pointer;
      font-weight: 600;
    }
  }
}

.tabs {
  @include flex;
  .tab-item {
    @include flex-center-v;
    height: 45px;
    padding: 0 32px;
    font-size: 16px;
    color: #b9b7b7;
    background: #f4f2f1;
    cursor: pointer;
    font-family: $caption;
    font-weight: 600;
    transition: all 0.3s;

    &.active {
      background: #fff;
      color: $primary;
      font-weight: 600;
    }
    &:not(&:first-child) {
      border-left: 1px solid #fff;
    }
    &:first-child {
      border-top-left-radius: 16px;
    }
    &:last-child {
      border-top-right-radius: 16px;
    }
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

.shorter-table {
  th:nth-child(1) {
    width: 158px;
  }
  th:nth-child(2) {
    width: 12%;
  }
  th:nth-child(3) {
    width: 15%;
  }
  th:nth-child(4) {
    width: 12%;
  }
  th:nth-child(5) {
    width: 12%;
  }
  th:nth-child(6) {
    width: 158px;
  }
  .opt-wrap {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding-left: 20px;
  }
}
</style>
