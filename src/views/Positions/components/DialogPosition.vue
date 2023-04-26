<template>
  <div class="dialog-position-trade">
    <h4 class="title">
      Position Info ({{ position.detail?.leverage }}×)
      <Tag class="tag" :color="getPositionStatusTagColor(position.detail.status)">
        {{ getPositionStatusText(position.detail.status) }}
      </Tag>
    </h4>

    <div v-if="position.detail" class="lt">
      <div class="card">
        <PositionExpiration
          v-tooltip.top="`Expiration`"
          :start-time="new Date().getTime()"
          :end-time="new Date(poolDetail.endTime).getTime()"
        />
        <header class="header">
          <div class="info">
            <label>P/L</label>
            <h4 :class="position.detail.earnAmount * 1 >= 0 ? 'color-green' : 'color-red'">
              <SmartNumber
                :prefix="position.detail.earnAmount >= 0 ? '+' : '-'"
                type="amount"
                :value="position.detail ? Math.abs(position.detail.earnAmount) : 0"
              />
              <span>({{ position.detail.earnAmount * 1 >= 0 ? "+" : "-" }}</span>
              <span>{{ toPercent(Math.abs(position.detail.plPercent * 100)) }}%)</span>
            </h4>
          </div>

          <div class="info">
            <label for="">{{ poolDetail.token.symbol }}/USD</label>
            <div class="cake-price">
              <h4>
                <SmartNumber type="price" :value="providePrice || position.detail.stakedTokenPrice" />
              </h4>
              <CountdownProgress style="width: 100px" />
            </div>
          </div>
        </header>

        <ul class="footer">
          <li class="info">
            <label>Size</label>
            <h4 :class="{ 'sell-max': state.curTab === 1 }" @click="toSellMax">
              {{ position.detail ? toNonExponential(position.detail.totalSize) : "-" }}
            </h4>
          </li>
          <li class="info">
            <label>Avg. Open Price</label>
            <h4>
              <template v-if="!position.detail">-</template>
              <SmartNumber v-else type="price" :value="position.detail.avgHoldPrice" />
            </h4>
          </li>
          <li class="info">
            <label>Margin</label>
            <h4>
              <template v-if="!position.detail">0</template>
              <SmartNumber v-else type="amount" :value="position.detail.totalMarginAmount" />
            </h4>
          </li>
        </ul>
      </div>

      <div :class="{ 'warning-cover': position.detail.state == 4 }">
        <div class="cover">
          <div class="closing-warning">The position {{ ellipsisStr(position.detail.hash) }} is under liquidation.</div>
        </div>
        <ul class="tabs">
          <li class="tab-item" :class="{ active: state.curTab === 0 }" @click="changeTab(0)">Sell Short</li>
          <li class="tab-item" :class="{ active: state.curTab === 1 }" @click="changeTab(1)">Buy to Cover</li>
        </ul>

        <section v-if="state.curTab === 0" class="tab-content tab-0" :class="{ active: state.curTab === 0 }">
          <div class="max-liquidity">
            <small>Max</small>
            <span>{{ toQuantity(maxLiquidity, position.detail.stakedTokenPrice) }}</span>
          </div>
          <form class="form">
            <div class="form-group">
              <div class="form-control">
                <Image class="coin-icon" :src="poolDetail.token ? poolDetail.token.logoURI : ''" circle />
                <input
                  v-number-only
                  type="text"
                  placeholder="0"
                  :value="form.openSize"
                  :readonly="state.btnLoading"
                  @input="handleChangeOpenSize($event.target.value)"
                  @focus="form.numberFocused = true"
                />
                <span class="suffix">
                  <Tag color="white">{{ position.detail.token.symbol }}</Tag>
                </span>
                <div v-if="form.openSize" class="extra">
                  ~
                  <SmartNumber type="amount" :value="form.priceValue || '0.0'" />
                </div>
              </div>
            </div>
          </form>
        </section>

        <section v-else class="tab-content tab-1" :class="{ active: state.curTab === 1 }">
          <div class="max-liquidity">
            <small>Max</small>
            <span>{{ toQuantity(position.detail.totalSize, position.detail.stakedTokenPrice) }}</span>
          </div>
          <form class="form">
            <div class="form-group">
              <div class="form-control">
                <Image class="coin-icon" :src="poolDetail.token ? poolDetail.token.logoURI : ''" alt="" circle />
                <input
                  v-number-only
                  type="text"
                  placeholder="0"
                  :value="form.closeSize"
                  :readonly="state.btnLoading"
                  @input="handleChangeCloseSize($event.target.value)"
                  @focus="state.sellShortFocused = true"
                  @blur="state.sellShortFocused = false"
                />
                <span class="suffix">
                  <Tag color="white">{{ position.detail.token.symbol }}</Tag>
                </span>
                <div v-if="form.closeSize" class="extra">
                  ~
                  <SmartNumber type="amount" :value="form.sellValue || '0.0'" />
                </div>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>

    <div class="rt">
      <PositionOpen
        v-if="state.curTab === 0"
        v-model="form.maxSlippage"
        :symbol="poolDetail.token.symbol"
        :loading="state.btnLoading"
        :token-amount="form.openSize"
        :expected-price="form.expectedPrice"
        :price-impact="priceImpact"
        :current-price="position.detail.stakedTokenPrice"
        @close="closeTransDialog"
        @trade="toggleLoading"
      />
      <PositionClose
        v-else
        v-model="form.maxSlippage"
        :loading="state.btnLoading"
        :symbol="poolDetail.token.symbol"
        :token-amount="form.closeSize"
        :expected-price="form.expectedPriceClose"
        :price-impact="priceImpactClose"
        :current-price="position.detail.stakedTokenPrice"
        @success="sell"
        @close="closeTransDialog"
        @trade="toggleLoading"
      />
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, onBeforeMount, watch, ref, inject } from "vue";
import NP from "number-precision";

import { usePosition } from "@/hooks/usePosition";
import { useTrader } from "@/hooks/useTrader";
import { usePoolDetail } from "@/hooks/usePoolDetail";
import { useWallet } from "@/hooks/useWallet";

import { toQuantity, toNonExponential } from "@/utils/format";
import { ellipsisStr, toPercent } from "@/utils/format";
import { getCurBlockNumber } from "@/utils/block";

import * as TradingAction from "@/contract/tradingHub";
import * as Erc20Action from "@/contract/erc20";

import CountdownProgress from "@/components/CountdownProgress.vue";
import PositionOpen from "./PositionOpen.vue";
import PositionClose from "./PositionClose.vue";
import PositionExpiration from "./PositionExpiration.vue";

const emit = defineEmits(["closeDialog", "sell"]);
const providePrice = inject("stakedTokenPrice");

const { account } = useWallet();

const { position, getPositionStatusTagColor, getPositionStatusText } = usePosition();
const { fullPoolInfo } = usePoolDetail();
const { trader, fetchTraderStableBalance, setTraderFactor, fetchTokenPriceAndBalance } = useTrader();

const state = reactive({
  curTab: 0,
  marginRequiredFocused: false,
  btnLoading: false,
});

const form = reactive({
  allowanceUSD: 0,
  openSize: "",
  sellValue: 0,
  closeSize: "",
  priceValue: 0,
  maxSlippage: 1,
  estimatedMargin: 0,
  noSlippageMargin: 0,
  expectedPrice: 0,
  expectedPriceClose: 0,
});

const poolDetail = ref({
  poolInfo: {},
  history: {},
  userInfoByPool: null,
  token: {
    symbol: "",
  },
  withdrawable: 0,
  totalAllocPoint: 1,
  firstLoad: true,
  canWithdraw: true,
  createTime: "",
  endTime: "",
  allPositions: [],
  myPositions: [],
  APY: 0,
  loading: {
    fetchDetail: true,
    fetchAllPositions: true,
  },
  count: {
    providerCount: 0,
    traderCount: 0,
  },
});

const priceImpact = ref(0);
const priceImpactClose = ref(0);

/**
 * @description: 最大可开仓数量
 * @param {*}
 * @return {*}
 */
const maxLiquidity = computed(() => {
  trader.maxLiquidity = poolDetail.value.poolInfo.currentAmount * 1;
  return poolDetail.value.poolInfo.currentAmount * 1;
});

watch(
  () => form.maxSlippage,
  async newValue => {
    if (!newValue) return;

    if (state.curTab === 0) {
      form.expectedPrice = await updateExpectPrice(form.openSize);
    }

    if (state.curTab === 1) {
      form.expectedPriceClose = await updateExpectPrice(form.closeSize);
    }
  },
  { deep: true },
);

watch(
  () => [form.expectedPrice, form.expectedPriceClose],
  () => {
    checkShortApprove();
  },
  { deep: true },
);

onBeforeMount(async () => {
  window.blockNumber = await getCurBlockNumber();
  if (position.detail.pool) {
    poolDetail.value = position.detail.pool;
  } else {
    poolDetail.value = await fullPoolInfo(position.detail?.poolInfo);
  }

  form.expectedPrice = await TradingAction.getExpectedPrice(0);
  fetchTokenPriceAndBalance(position.detail.stakedTokenAddress, position.detail.stakedTokenDecimals);
  fetchTraderStableBalance(poolDetail.value.poolInfo.stableToken, poolDetail.value.poolInfo.stableTokenDecimals);
  fetchAllowance();
  setTraderFactor(form.openSize, poolDetail.value.poolInfo.maxLeverage, poolDetail.value.poolInfo.stableTokenName);
});

function toggleLoading(status) {
  state.btnLoading = status;
}

function changeTab(current) {
  state.curTab = current;
}

function closeTransDialog() {
  toggleLoading(false);
  emit("closeDialog");
}

function sell() {
  emit("sell");
}

/**
 * @description: 查询授权限额
 * @param {*}
 * @return {*}
 */
async function fetchAllowance() {
  try {
    let allowanceUSD = await Erc20Action.allowance(
      poolDetail.value.poolInfo.stableToken,
      account.value,
      poolDetail.value.poolInfo.stableTokenDecimals,
    );
    if (allowanceUSD * 1 === 0) {
      trader.approveUsd = true;
    }
    trader.allowanceUSD = allowanceUSD * 1;
  } catch (error) {
    console.error("approveUsd", error);
  }
}

function toSellMax() {
  if (state.curTab === 1) {
    changeCloseSize(position.detail.totalSize, false);
  }
}

/**
 * @description: 价格影响
 * @param {*}
 * @return {*}
 */
function getPriceImpact() {
  const openSize = Number.parseFloat(form.openSize);

  return calcPriceImpact(openSize);
}

function getPriceImpactClose() {
  const closeSize = Number.parseFloat(form.closeSize);

  return calcPriceImpact(closeSize);
}

function calcPriceImpact(size) {
  if (!size || Number.isNaN(size)) return 0;
  if (!form.noSlippageMargin) return 0;

  const stakedTokenPrice = position.detail.stakedTokenPrice;
  const noSlipagePrice = NP.times(NP.divide(form.noSlippageMargin, size), poolDetail.value.poolInfo.maxLeverage);

  console.log(noSlipagePrice);
  const impact = NP.divide(NP.minus(noSlipagePrice, stakedTokenPrice), stakedTokenPrice) * 100;

  // 0.3 is handling charge
  let rate = Math.abs(impact) > 0.03 ? Math.abs(impact) - 0.03 : 1e-10;
  rate = impact > 0 ? rate : -rate;
  return rate;
}

const handleChangeOpenSize = _.debounce(val => {
  form.openSize = val;
  changeOpenSize(val);
}, 500);

async function changeOpenSize(val) {
  const fmtSize = val.match(/^\d+\.?\d{0,18}/)?.[0];

  if (!+fmtSize) {
    form.priceValue = 0;
    form.expectedPrice = 0;
    form.openSize = fmtSize;
    return 0;
  }

  if (fmtSize > maxLiquidity.value) {
    form.openSize = fmtSize;
    return;
  }

  setTraderFactor(fmtSize, poolDetail.value.poolInfo.maxLeverage, poolDetail.value.poolInfo.stableTokenName);

  try {
    form.expectedPrice = await updateExpectPrice(fmtSize);
  } finally {
    form.priceValue = position.detail.stakedTokenPrice * fmtSize;
  }

  priceImpact.value = getPriceImpact();
}

const handleChangeCloseSize = _.debounce(val => {
  form.closeSize = val;
  changeCloseSize(val);
}, 500);

async function changeCloseSize(val, match = true) {
  let fmtSize = val;

  if (match) {
    fmtSize = val.toString().match(/^\d+\.?\d{0,18}/)?.[0];
  } else {
    form.closeSize = val;
  }

  if (!+fmtSize) {
    form.priceValue = 0;
    form.expectedPriceClose = 0;
    form.closeSize = 0;
    return 0;
  }

  try {
    form.expectedPriceClose = await updateExpectPrice(fmtSize);
  } finally {
    form.sellValue = position.detail.stakedTokenPrice * fmtSize;
  }

  priceImpactClose.value = getPriceImpactClose();
}

/**
 * @description: 平仓操作
 * @param {*}
 * @return {*}
 */

function checkShortApprove() {
  form.numberFocused = false;
  if (trader.allowanceUSD * 1 < form.estimatedMargin * 1) {
    trader.approveUsd = true;
  } else {
    trader.approveUsd = false;
  }
}

async function updateExpectPrice(size) {
  state.btnLoading = true;
  form.estimatedMargin = await TradingAction.getEstimatedMargin(
    size,
    form.maxSlippage * 100,
    position.detail.stakedTokenAddress,
    poolDetail.value.poolInfo.stableToken,
    position.detail.stakedTokenDecimals,
    poolDetail.value.poolInfo.stableTokenDecimals,
    poolDetail.value.poolInfo.maxLeverage,
    poolDetail.value.token.swapRouter,
  );

  form.noSlippageMargin = await TradingAction.getEstimatedMargin(
    size,
    0,
    position.detail.stakedTokenAddress,
    poolDetail.value.poolInfo.stableToken,
    position.detail.stakedTokenDecimals,
    poolDetail.value.poolInfo.stableTokenDecimals,
    poolDetail.value.poolInfo.maxLeverage,
    poolDetail.value.token.swapRouter,
  );
  state.btnLoading = false;

  return (form.estimatedMargin * poolDetail.value.poolInfo.maxLeverage) / size;
}
</script>

<style lang="scss" scoped>
@import "~@/views/PoolDetail/components/form-control.scss";
.sell-max {
  cursor: pointer;
}

.cover {
  visibility: hidden;
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  @include flex-center;
  z-index: 444;
  background: hsla(0, 0%, 100%, 0.7);
  .closing-warning {
    color: $primary;
    @include flex;
  }
}

.warning-cover {
  position: relative;
  .cover {
    visibility: unset;
  }
}
.dialog-position-trade {
  @include flex;
  width: 900px;
  flex-wrap: wrap;
  padding: 32px;
  font-family: Haas Grot Text;
}

h4.title {
  width: 100%;
  font-family: Haas Grot Disp;
  font-weight: 600;

  color: #11142d;
  font-size: 18px;
  .tag {
    margin-left: 8px;
  }
}

.tabs {
  @include flex;
  margin-top: 32px;
  .tab-item {
    cursor: pointer;
    padding: 12px 20px;
    color: #a4a5b2;
    font-family: Haas Grot Disp;
    border-radius: 12px 12px 0px 0px;
    font-weight: 600;
    transition: all 0.3s;
    &.active {
      font-weight: 600;
      color: $primary;
      background: #f8f8f8;
    }
  }
}

.dialog-position-trade > .lt {
  flex: 1;
  margin-right: 32px;
  .card {
    position: relative;
    margin-top: 48px;
    padding: 0 20px;
    background: #ffffff;
    border-radius: 16px;
    border: 1px solid #e4e4e4;
    .header {
      @include flex;
      justify-content: space-between;
      padding: 24px 0;
      border-bottom: 1px solid #e4e4e4;
      label {
        font-family: Haas Grot Disp;
        color: #a4a5b2;
      }
      h4 {
        height: 28px;
        margin-top: 16px;
        font-size: 28px;
      }
      .info:last-child {
        text-align: right;
      }
      .cake-price {
        transform: translateY(-2px);
        h4 {
          font-size: 20px;
          height: 20px;
          margin-bottom: 8px;
        }
      }
    }
    .footer {
      padding: 12px 0px;
      li {
        @include flex-center-v;
        justify-content: space-between;
        padding: 12px 0;
        label {
          color: #a4a5b2;
          font-family: $caption;
          font-size: 16px;
        }
        h4 {
          font-size: 18px;
          height: 18px;
          color: #606266;
        }
      }
    }
  }
  .tab-content {
    @include flex;
    justify-content: space-between;
    position: relative;
    .max-liquidity {
      position: absolute;
      right: 0;
      top: -12px;
      color: #11142d;
      font-size: 12px;
      transform: translateY(-100%);
      small {
        color: #a4a5b2;
        margin-right: 8px;
        font-size: 12px;
      }
    }
  }
  .tab-0.active .form-control {
    border-top-left-radius: 0;
  }

  .form {
    width: 100%;
    .form-group {
      .form-control {
        width: 100%;
        height: 80px;
      }
      .suffix {
        cursor: unset;
      }
    }
  }
}

.dialog-position-trade > .rt {
  flex: 1;
}
</style>
