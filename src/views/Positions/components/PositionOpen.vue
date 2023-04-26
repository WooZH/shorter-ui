<template>
  <div class="dialog-order-info">
    <ul class="order-detail">
      <li>
        <label>
          Expected Price
          <Guide class="guide-label" text="Average price estimated for this order" />
        </label>
        <div class="rt">
          <span v-show="tokenAmount > 0">
            <template v-if="!expectedPrice">-</template>
            <SmartNumber v-else type="price" :value="expectedPrice" />
          </span>
          <span v-show="!(tokenAmount > 0)">
            <SmartNumber type="price" :value="currentPrice" />
          </span>
          &nbsp;per
          {{ symbol }}
        </div>
      </li>
      <li>
        <label>Estimated Margin</label>
        <div class="rt">
          <Image :src="poolDetail.poolInfo.stableLogo" class="coin-logo" />
          <span class="estimated-price">
            <span v-show="estimatedMargin">
              <SmartNumber type="amount" :value="estimatedMargin * tokenAmount" />
            </span>
            <span v-show="!estimatedMargin">-</span>
          </span>
          <Tag color="white">
            {{ trader.coinName }}
          </Tag>
        </div>
      </li>
      <li>
        <label>Price Impact</label>
        <div class="rt">
          <span v-if="Math.abs(priceImpact) * 1 > 0.01" class="color-red">-{{ toPercent(priceImpact) }}%</span>
          <span v-else-if="priceImpact * 1 === 0" class="color-green">-</span>
          <span v-else class="color-green">＜-0.01%</span>
        </div>
      </li>
      <li>
        <label>Token Provider Fee</label>
        <div class="rt">0.3%</div>
      </li>
      <li>
        <label>Interest Rate</label>
        <div class="rt">0.028% per day</div>
      </li>
    </ul>
    <footer class="footer">
      <div class="select-container">
        <v-select
          v-model="form.maxSlippage"
          style="width: 80px"
          class="small"
          :reduce="item => item.value"
          label="text"
          :searchable="false"
          :options="form.slippageListObj"
        />

        <span>Max Slippage</span>
      </div>
      <shorterButton
        v-if="trader.approveUsd"
        type="primary"
        class="trade-btn"
        :loading="form.loading"
        :disabled="openPositionDisable"
        @click="onTraderApprove(form)"
      >
        Approve {{ trader.coinName }}
      </shorterButton>
      <shorterButton
        v-else
        type="primary"
        class="trade-btn"
        :loading="loading || form.loading"
        :disabled="openPositionDisable"
        @click="onSubmit(form)"
      >
        {{ form.submitText }}
      </shorterButton>
    </footer>
  </div>
</template>

<script setup>
import { reactive, computed, watch } from "vue";

import * as TradingAction from "@/contract/tradingHub";
import * as Erc20Action from "@/contract/erc20";

import Guide from "@/components/Guide.vue";

import { toPercent } from "@/utils/format";
import { handleRpcError } from "@/utils/handleError";
import { bigNumCompare } from "@/utils/number";

import { Message } from "@/hooks/useMessage";
import { usePosition } from "@/hooks/usePosition";
import { useWallet } from "@/hooks/useWallet";
import { usePoolDetail } from "@/hooks/usePoolDetail";
import { useTrader } from "@/hooks/useTrader";

const props = defineProps({
  symbol: {
    type: String,
    default: "",
  },
  currentPrice: {
    type: [Number, String],
    default: () => 0,
  },
  tokenAmount: {
    type: [Number, String],
    default: () => 0,
  },
  modelValue: {
    type: Number,
    default: () => 0,
  },
  expectedPrice: {
    type: Number,
    default: () => 0,
  },
  priceImpact: {
    type: Number,
    default: () => 0,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close", "success", "update:modelValue", "trade"]);

const form = reactive({
  loading: false,
  approveLoading: false,
  maxSlippage: 1,
  allowanceUSD: 0,
  slippageList: [0.5, 1, 2, 5],
  slippageListObj: [
    { text: "0.5%", value: 0.5 },
    { text: "1%", value: 1 },
    { text: "2%", value: 2 },
    { text: "5%", value: 5 },
  ],
  submitText: "Submit order",
  openResult: "",
});

watch(
  () => form.maxSlippage,
  () => {
    emit("update:modelValue", form.maxSlippage);
  },
);

const { poolDetail } = usePoolDetail();
const { trader, setTraderFactor } = useTrader();
const { position } = usePosition();
const { account } = useWallet();

const estimatedMargin = computed(() => {
  if (props.expectedPrice) {
    return props.expectedPrice / poolDetail.poolInfo.maxLeverage;
  } else {
    return 0;
  }
});
let openPositionDisable = computed(() => {
  // state 1
  if (position.detail.state != 1) {
    return true;
  }
  if (props.tokenAmount === "") {
    form.submitText = "Submit order";
    return false;
  }
  if (props.tokenAmount * 1 === 0) {
    return true;
  }
  const res = bigNumCompare(props.tokenAmount.toString(), trader.maxLiquidity.toString());
  if (res > 0) {
    form.submitText = "Insufficient Liquidity";
    return true;
  }
  form.submitText = "Submit order";
  return false;
});

/**
 * @description: 查询授权限额
 * @param {*}
 * @return {*}
 */
async function fetchAllowance() {
  try {
    let allowanceUSD = await Erc20Action.allowance(poolDetail.poolInfo.stableToken, account.value);
    if (allowanceUSD * 1 === 0) {
      trader.approveUsd = true;
    }
    trader.allowanceUSD = allowanceUSD * 1;
    return trader.allowanceUSD;
  } catch (error) {
    console.error("approveUsd", error);
  }
}

/**
 * @description: 授权前限制额
 * @param {*}
 * @return {*}
 */

const onTraderApprove = async () => {
  form.approveLoading = true;
  try {
    await Erc20Action.approve(poolDetail.poolInfo.stableToken, account.value, trader.allowanceUSD);
    let allowance = await fetchAllowance();
    if (allowance === 0) {
      await onTraderApprove();
    }
    trader.approveUsd = false;
  } catch (error) {
    handleRpcError(error);
  } finally {
    form.approveLoading = false;
  }
};

async function onSubmit() {
  if (!props.tokenAmount * 1) {
    Message.warning("Please enter a valid value");
    return;
  }
  if (trader.priceImpact * 1 >= 10) {
    Message.warning("Any orders can bring about too large(10%) price impact will be prohibited");
    return;
  }
  let openPositions = poolDetail.myPositions.filter(item => item.state * 1 === 1);
  let minimum = openPositions.length ? 0.1 : 1;
  if (trader.tokenPrice * props.tokenAmount < minimum) {
    Message.warning(`Try a larger order amount greater than \$${minimum}`);
    return;
  }
  form.loading = true;
  emit("trade", true);
  try {
    form.openResult = await TradingAction.openPosition(
      poolDetail.poolInfo.id,
      props.tokenAmount,
      poolDetail.poolInfo.tokenAddress,
      poolDetail.poolInfo.stableToken,
      poolDetail.poolInfo.decimals,
      poolDetail.poolInfo.stableTokenDecimals,
      props.expectedPrice,
      poolDetail.token.swapRouter,
    );

    emit("success");
    delete localStorage.pool_activity_logs;
    emit("close");
  } catch (error) {
    console.error("openPosition", error);
    handleRpcError(error);
  } finally {
    form.loading = false;
    emit("trade", false);
    setTraderFactor(0, poolDetail.poolInfo.maxLeverage, poolDetail.poolInfo.stableTokenName);
  }
}
</script>

<style lang="scss" scoped>
@import "./PositionTrade.scss";
</style>
