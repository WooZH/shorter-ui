<template>
  <div class="dialog-order-info">
    <ul class="order-detail">
      <TransitionGroup name="list" tag="ul">
        <li key="price">
          <label>
            Expected Price
            <Guide class="guide-label" text="Average price estimated for this order" />
          </label>
          <div class="rt">
            <span v-if="tokenAmount > 0 && !expectedPrice">$-per {{ poolDetail.poolInfo.tokenName }}</span>
            <span v-else>
              <span v-show="tokenAmount > 0">
                <template v-if="!expectedPrice">-</template>
                <SmartNumber v-else type="price" :value="expectedPrice" />
              </span>
              <span v-show="!(tokenAmount > 0)">
                <SmartNumber type="price" :value="currentPrice" />
              </span>
              per
              {{ symbol }}
            </span>
          </div>
        </li>
        <li key="payout">
          <label>Estimated Payout</label>
          <div class="rt">
            <Image :src="poolDetail.poolInfo.stableLogo" class="coin-logo" />
            <span class="estimated-price">
              <span v-show="estimatedPayout">
                <SmartNumber type="amount" :value="estimatedPayout" />
              </span>
              <span v-show="!estimatedPayout">-</span>
            </span>
            <Tag color="white">
              {{ trader.coinName }}
            </Tag>
          </div>
        </li>
        <li key="impact">
          <label>Price Impact</label>
          <div class="rt">
            <span v-if="Math.abs(priceImpact) * 1 > 0.01" class="color-red">-{{ toPercent(priceImpact) }}%</span>
            <span v-else-if="priceImpact * 1 === 0" class="color-green">-</span>
            <span v-else class="color-green">＜-0.01%</span>
          </div>
        </li>
        <li v-show="!!expectedPrice" key="fee">
          <label>Token Provider Fee</label>
          <div class="rt">0.3%</div>
        </li>
      </TransitionGroup>
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
        type="primary"
        class="trade-btn"
        :loading="loading || form.loading"
        :disabled="closePositionDisable"
        @click="closePosition(form)"
      >
        {{ form.submitText }}
      </shorterButton>
    </footer>
  </div>
</template>

<script setup>
import { reactive, computed, watch } from "vue";

import Guide from "@/components/Guide.vue";

import * as TradingAction from "@/contract/tradingHub";

import { usePoolDetail } from "@/hooks/usePoolDetail";
import { useTrader } from "@/hooks/useTrader";
import { Message } from "@/hooks/useMessage";
import { usePosition } from "@/hooks/usePosition";

import { toPercent, toAmount } from "@/utils/format";
import { handleRpcError } from "@/utils/handleError";
import { bigNumCompare } from "@/utils/number";

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
  maxSlippage: 1,
  slippageList: [0.5, 1, 2, 5],
  submitText: "Submit order",
  slippageListObj: [
    { text: "0.5%", value: 0.5 },
    { text: "1%", value: 1 },
    { text: "2%", value: 2 },
    { text: "5%", value: 5 },
  ],
});
const { poolDetail } = usePoolDetail();
const { trader } = useTrader();
const { position } = usePosition();

/**
 * @description: estimatedPayout 规则修改为 (margin + P/L) / totalSize  *  props.tokenAmount
 * @param {*}
 * @return {*}
 */
let estimatedPayout = computed(() => {
  if (props.tokenAmount * 1 > position.detail.totalSize * 1) {
    return 0;
  }
  if (position.detail.totalMarginAmount * 1 && props.tokenAmount * 1) {
    let amount = position.detail.totalMarginAmount * 1 + position.detail.earnAmount;
    console.log(position.detail.totalMarginAmount, position.detail.earnAmoun);
    let out = (amount / position.detail.totalSize) * props.tokenAmount * 1 * (100 / (100 + form.maxSlippage));
    return toAmount(out);
  }
  return 0;
});

watch(
  () => form.maxSlippage,
  () => {
    emit("update:modelValue", form.maxSlippage);
  },
);

/**
 * @description: 减仓禁用功能
 * @param {*}
 * @return {*}
 */
let closePositionDisable = computed(() => {
  // state: 1 open
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
  const res = bigNumCompare(props.tokenAmount.toString(), position.detail.totalSize.toString());

  if (res > 0) {
    form.submitText = "Insufficient Liquidity";
    return true;
  }
  form.submitText = "Submit order";

  return false;
});

async function closePosition() {
  if (!props.tokenAmount * 1) {
    Message.warning("Please enter a valid value");
    return;
  }
  let sellValue = position.detail.stakedTokenPrice * props.tokenAmount;
  if (sellValue * 1 < 0.1) {
    Message.warning(" Try a larger order amount greater than $0.1");
    return;
  }
  let amount = props.tokenAmount;
  const remainPrice = position.detail.stakedTokenPrice * (position.detail.totalSize - props.tokenAmount);
  // position剩余小于 $10 平仓剩余限制
  if (remainPrice < 10) {
    amount = position.detail.totalSize;
  }
  form.loading = true;
  emit("trade", true);

  try {
    await TradingAction.closePosition(
      position.detail.poolId,
      amount,
      form.maxSlippage * 100,
      poolDetail.poolInfo.tokenAddress,
      poolDetail.poolInfo.stableToken,
      poolDetail.poolInfo.decimals,
      poolDetail.token.swapRouter,
    );
    delete localStorage.pool_activity_logs;
    emit("success");
    emit("close");
  } catch (error) {
    handleRpcError(error);
  } finally {
    form.loading = false;
    emit("trade", false);
  }
}
</script>

<style lang="scss" scoped>
@import "./PositionTrade.scss";
</style>
