<template>
  <div class="panel-container">
    <header class="panel-header">
      <h4 class="panel-title">Trade ({{ info.poolInfo ? info.poolInfo.maxLeverage : 0 }}×)</h4>
    </header>

    <div class="panel trade">
      <shorterSkeleton v-if="loading" animated style="padding-top: 12px">
        <template #template>
          <shorterSkeletonItem style="height: 24px; width: 160px" />
          <shorterSkeletonItem style="height: 40px; margin-top: 16px" />
          <shorterSkeletonItem style="height: 24px; width: 180px; margin-top: 14px" />
          <shorterSkeletonItem style="margin-top: 24px; height: 40px" />
          <shorterSkeletonItem style="margin-top: 24px; height: 40px" />
        </template>
      </shorterSkeleton>

      <form v-else class="form" @submit.prevent>
        <div class="form-group">
          <label>Size</label>
          <div
            class="form-control"
            :class="[
              { active: state.numberFocused },
              {
                error: form.openSize * 1 > maxLiquidity * 1,
              },
            ]"
          >
            <Image circle :src="info.token ? info.token.logoURI : ''" style="width: 32px; height: 32px" />
            <input
              v-model="form.openSize"
              v-number-only
              type="text"
              placeholder="0"
              :disabled="!wallet.isConnected"
              @input="handleChangeOpenSize"
              @focus="state.numberFocused = true"
              @blur="state.numberFocused = false"
            />
            <span v-if="wallet.isConnected" class="suffix" @click="toTokenMax">MAX</span>
            <div v-if="form.openSize && !(form.openSize * 1 > maxLiquidity)" class="extra">
              ~ ${{ toAmount(form.priceValue || 0, false) }}
            </div>
          </div>
          <div class="addition">
            <small>Max Liquidity</small>
            <span>{{ toQuantity(maxLiquidity, info.poolInfo.stakedTokenPrice) }}</span>
          </div>
        </div>

        <div class="form-group">
          <label>Estimated Margin</label>
          <div class="form-control">
            <Image circle style="width: 32px; height: 32px" :src="info.poolInfo.stableLogo" />
            <input v-model="estimateMarginShow" v-number-only placeholder="0" type="text" disabled />
          </div>
          <div class="addition">
            <small>Wallet Balance</small>
            <span v-if="wallet.isConnected">
              {{ formatNum(trader.coinBalance, 2, true) }}
            </span>
            <span v-else>-</span>
          </div>
        </div>
        <div class="form-group">
          <shorterButton
            v-if="!wallet.isConnected"
            type="primary"
            class="btn-submit big"
            plain
            @click="wallet.visible = true"
          >
            Unlock wallet
          </shorterButton>
          <shorterButton
            v-else-if="dialogsVisible.approveTrader"
            class="btn-submit big"
            :loading="dialogsVisible.loading"
            type="primary"
            @click="onTraderApprove"
          >
            Approve {{ getContractAddress().usdToken }}
          </shorterButton>
          <shorterButton
            v-else
            type="primary"
            :disabled="btnDisabled"
            :loading="dialogsVisible.loading"
            class="btn-submit big"
            @click="openPosition(form)"
          >
            <span v-if="!btnDisabled">Short {{ info.poolInfo.tokenName }}</span>
            <span v-else>{{ state.disabledText }}</span>
          </shorterButton>
          <div class="addition">
            <small class="price-impact">
              <span>Price Impact</span>
              <Guide
                style="margin-left: 6px"
                text="<div style='max-width: 400px'>Price impact is an expression used to describe
                 the correlation between an incoming order and the change
                in the price of the asset involved caused by the trade.</div>"
              />
            </small>
            <span v-if="!form.openSize || priceImpact === 0" class="color-gray">-</span>
            <shorterSkeleton v-else animated :loading="state.priceImpactLoading">
              <template #template>
                <shorterSkeletonItem style="margin-top: 7px; height: 20px; width: 50px" />
              </template>
              <template #default>
                <span v-if="Math.abs(priceImpact) * 1 > 0.01" class="color-red">-{{ toPercent(priceImpact) }}%</span>
                <span v-else class="color-green">＜-0.01%</span>
              </template>
            </shorterSkeleton>
            <!-- <span v-if="state.priceImpactLoading">--</span>
            <span v-else>
              <span v-if="Math.abs(priceImpact) * 1 > 0.01" class="color-red">-{{ toPercent(priceImpact) }}%</span>
              <span v-else class="color-green">＜-0.01%</span>  </span> -->
          </div>
        </div>
      </form>
    </div>
    <Dialog v-model="dialogsVisible.trade" width="540px" top="8vh">
      <DialogOrderInfo :token-amount="form.openSize" @success="orderSuccess" @close="closeTrader" />
    </Dialog>
  </div>
</template>

<script setup>
import { reactive, watchEffect, watch, computed } from "vue";

import { getContractAddress } from "@/contract";

import DialogOrderInfo from "./DialogOrderInfo.vue";
import Guide from "@/components/Guide.vue";

import * as Erc20Action from "@/contract/erc20";
import { getEstimatedMargin } from "@/contract/tradingHub";

import { usePoolDetail } from "@/hooks/usePoolDetail";
import { useTrader } from "@/hooks/useTrader";
import { useWallet } from "@/hooks/useWallet";
import { Message } from "@/hooks/useMessage";

import { toAmount, formatNum, toQuantity, toPercent, dealDecimals } from "@/utils/format";
import { handleRpcError } from "@/utils/handleError";
import { bigNumCompare } from "@/utils/number";

const props = defineProps({
  info: {
    type: Object,
    default: () => {},
  },
  loading: {
    type: Boolean,
    default: true,
  },
});
const emit = defineEmits(["order"]);

const { trader, setPriceImpact, fetchTraderStableBalance } = useTrader();
const { poolDetail } = usePoolDetail();
const { account, wallet } = useWallet();

const state = reactive({
  openSizeFocused: false,
  expectedPriceFetch: false,
  disabledText: "Insufficient Liquidity",
  priceImpactLoading: false,
});
const form = reactive({
  openSize: "",
  allowanceUSD: 0,
  priceValue: 0,
  priceImpact: 0,
  estimatedMargin: 0,
  noSlippageMargin: 0,
});
setPriceImpact(0);

watchEffect(async () => {
  if (wallet.isConnected && props.info.poolInfo.tokenAddress) {
    fetchTraderStableBalance(props.info.poolInfo.stableToken, props.info.poolInfo.stableTokenDecimals);
    fetchAllowance();
  }
});

watch(
  () => form.estimatedMargin,
  newValue => {
    if (newValue) checkApprove();
  },
  { deep: true },
);

watch(
  () => account.value,
  () => {
    resetOpenSize();
  },
);

function closeTrader() {
  dialogsVisible.trade = false;
}

const estimateMarginShow = computed(() => {
  return formatNum(form.estimatedMargin);
});

const priceImpact = computed(() => {
  if (+form.openSize) {
    const noSlipagePrice = (form.noSlippageMargin / form.openSize) * poolDetail.poolInfo.maxLeverage;
    const stakedTokenPrice = poolDetail.poolInfo.stakedTokenPrice;
    const impact = ((noSlipagePrice - stakedTokenPrice) / stakedTokenPrice) * 100;

    // 0.3 is handling charge
    let rate = Math.abs(impact) >= 0.3 ? Math.abs(impact) - 0.3 : 1e-10;
    rate = impact > 0 ? rate : -rate;

    return rate === -100 ? 0 : rate;
  } else {
    return 0;
  }
});

const dialogsVisible = reactive({
  trade: false,
  loading: false,
  approveTrader: false,
});

const btnDisabled = computed(() => {
  if (form.openSize === "" || form.openSize * 1 === 0) {
    return false;
  }
  const result = bigNumCompare(form.openSize.toString(), maxLiquidity.value.toString());

  if (result > 0) {
    state.disabledText = "Insufficient liquidity";
    return true;
  }

  if (form.estimatedMargin * 1 > trader.coinBalance * 1) {
    state.disabledText = "Insufficient margin";
    return true;
  }
  return false;
});

/**
 * @description: 最大可用额度
 * @param {*}
 * @return {*}
 */
const maxLiquidity = computed(() => {
  if (props.info.poolInfo.stakedAmount * 1) {
    return props.info.poolInfo.currentAmount;
  } else {
    return 0;
  }
});

/**
 * @description: 预估保证金 by default slippage
 * @param {*}
 * @return {*}
 */
async function getDefaultEstimatedMargin() {
  const default_slippage = 100;

  const margin = await getEstimatedMargin(
    form.openSize,
    default_slippage,
    props.info.poolInfo.tokenAddress,
    props.info.poolInfo.stableToken,
    props.info.poolInfo.decimals,
    props.info.poolInfo.stableTokenDecimals,
    props.info.poolInfo.maxLeverage,
    props.info.token.swapRouter,
  );

  const noSlippageMargin = await getEstimatedMargin(
    form.openSize,
    0,
    props.info.poolInfo.tokenAddress,
    props.info.poolInfo.stableToken,
    props.info.poolInfo.decimals,
    props.info.poolInfo.stableTokenDecimals,
    props.info.poolInfo.maxLeverage,
    props.info.token.swapRouter,
  );

  return { margin, noSlippageMargin };
}

function toTokenMax() {
  let max = props.info.poolInfo.currentAmount;
  form.openSize = max;
}

function resetOpenSize() {
  form.openSize = "";
  changeOpenSize();
}

/**
 * @description: 授权前限制额
 * @param {*}
 * @return {*}
 */

const onTraderApprove = async () => {
  dialogsVisible.loading = true;
  try {
    await Erc20Action.approve(props.info.poolInfo.stableToken, account.value, form.allowanceUSD);
    let allowance = await fetchAllowance();
    // 授权为零的情况下,再次调用授权,默认为最大值
    if (allowance === 0) {
      await onTraderApprove();
    }
    dialogsVisible.approveTrader = false;
  } catch (error) {
    dialogsVisible.loading = false;
    handleRpcError(error);
  } finally {
    dialogsVisible.loading = false;
  }
};

/**
 * @description: 查询授权限额
 * @param {*}
 * @return {*}
 */

async function fetchAllowance() {
  try {
    let allowanceUSD = await Erc20Action.allowance(
      props.info.poolInfo.stableToken,
      account.value,
      props.info.poolInfo.stableTokenDecimals,
    );
    if (allowanceUSD * 1 === 0) {
      dialogsVisible.approveTrader = true;
    }
    form.allowanceUSD = allowanceUSD * 1;
    checkApprove();
    return form.allowanceUSD;
  } catch (error) {
    console.log("approveTrader", error);
  }
}

function checkApprove() {
  state.numberFocused = false;
  if (btnDisabled.value) return;
  if (form.allowanceUSD * 1 < form.estimatedMargin * 1) {
    dialogsVisible.approveTrader = true;
  } else {
    dialogsVisible.approveTrader = false;
  }
}

const handleChangeOpenSize = _.debounce(changeOpenSize, 500);
async function changeOpenSize() {
  state.priceImpactLoading = true;

  if (!form.openSize) {
    form.priceValue = 0;
    form.estimatedMargin = 0;
    setPriceImpact(0);
    dialogsVisible.approveTrader = false;
    return;
  }

  form.openSize = dealDecimals(form.openSize, props.info.poolInfo.decimals);
  const margins = await getDefaultEstimatedMargin();
  form.estimatedMargin = margins.margin;
  form.noSlippageMargin = margins.noSlippageMargin;
  state.priceImpactLoading = false;

  if (form.openSize <= maxLiquidity.value * 1) {
    form.priceValue = trader.tokenPrice * form.openSize;
  }
}

function openPosition(form) {
  form.openSize = dealDecimals(form.openSize, props.info.poolInfo.decimals);
  if (!(form.openSize * 1)) {
    Message.warning("Please enter a valid value");
    return;
  }

  if (form.allowanceUSD * 1 < form.estimatedMargin) {
    dialogsVisible.approveTrader = true;
    return;
  }

  if (props.info.poolInfo.stateFlag * 1 === 4) {
    Message.warning(`Pool #${props.info.poolInfo.id} is offline`);
    return;
  }

  const openPositions = props.info.myPositions.filter(item => item.state * 1 === 0);

  // minimum open value
  let minimum = openPositions.length ? 0.1 : 10;
  if (form.priceValue * 1 < minimum) {
    Message.warning(`Try a larger order amount greater than \$${minimum}`);
    return;
  }

  dialogsVisible.trade = true;
}

async function orderSuccess() {
  resetOpenSize();
  emit("order");
}
</script>

<style lang="scss" scoped src="./form-control.scss"></style>
<style lang="scss" scoped>
.panel-container {
  margin-top: 16px;
}
.form {
  .addition {
    .price-impact {
      @include flex-center-v;
      span {
        transform: translateY(-1px);
      }
    }
  }
}
</style>
