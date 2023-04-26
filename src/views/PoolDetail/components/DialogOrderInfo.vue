<template>
  <div class="dialog-order-info">
    <header class="header">
      <h4 class="title strong">Position Info ({{ poolDetail.poolInfo ? poolDetail.poolInfo.maxLeverage : "" }}×)</h4>
      <div class="basic-info">
        <div class="info-group">
          <div class="info">
            <label for="">{{ poolDetail.poolInfo.tokenName }}/USD</label>
            <h4>
              <shorterSkeleton animated :loading="form.loading">
                <template #template>
                  <shorterSkeletonItem style="height: 24px; width: 100%" />
                </template>
                <template #default>
                  <p class="">
                    <span>
                      <SmartNumber type="price" :value="trader.tokenPrice" />
                    </span>
                  </p>
                </template>
              </shorterSkeleton>
              <div class="progress-container">
                <CountdownProgress />
              </div>
            </h4>
          </div>
        </div>
        <div class="info-group">
          <div class="info">
            <label for="">Expiration</label>
            <h4>{{ getExpireTime() }}</h4>
          </div>
        </div>
      </div>
    </header>
    <ul class="order-detail">
      <li>
        <label>
          Expected Price
          <Guide
            text="Average price estimated for this order"
            style="width: 20px; height: 20px; margin-left: 3px; transform: translateY(-1px)"
          />
        </label>
        <div class="rt">
          <shorterSkeleton animated :loading="form.loading">
            <template #template>
              <shorterSkeletonItem style="height: 24px; width: 100px" />
            </template>
            <template #default>
              <p class="">
                <span>
                  <SmartNumber type="price" :value="trader.expectedPrice" />
                  per {{ poolDetail.poolInfo.tokenName }}
                </span>
              </p>
            </template>
          </shorterSkeleton>
        </div>
      </li>
      <li>
        <label>Estimated Margin</label>
        <div class="rt">
          <shorterSkeleton animated :loading="form.loading">
            <template #template>
              <shorterSkeletonItem style="height: 24px; width: 100px" />
            </template>
            <template #default>
              <p class="rt">
                <Image :src="poolDetail.poolInfo.stableLogo" class="coin-logo" />

                <span style="margin: 0 4px">
                  <SmartNumber type="amount" :value="estimateMargin" />
                </span>
                <Tag style="background: #fff">
                  {{ trader.coinName }}
                </Tag>
              </p>
            </template>
          </shorterSkeleton>
        </div>
      </li>
      <li>
        <label>Price Impact</label>
        <div class="rt">
          <shorterSkeleton animated :loading="form.loading">
            <template #template>
              <shorterSkeletonItem style="height: 24px; width: 100px" />
            </template>
            <template #default>
              <p class="rt">
                <span v-if="Math.abs(priceImpact) * 1 > 0.01" class="color-red">-{{ toPercent(priceImpact) }}%</span>
                <span v-else class="color-green">＜-0.01%</span>
              </p>
            </template>
          </shorterSkeleton>
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
        type="primary"
        style="flex: 1; height: 56px"
        :loading="form.loading || form.submitLoading"
        @click="onSubmit(form)"
      >
        Submit order
      </shorterButton>
    </footer>
  </div>
</template>

<script setup>
import { reactive, watch, onMounted, computed } from "vue";
import { usePoolDetail } from "@/hooks/usePoolDetail";
import { useTrader } from "@/hooks/useTrader";
import * as TradingAction from "@/contract/tradingHub";
import CountdownProgress from "@/components/CountdownProgress.vue";
import { toPercent } from "@/utils/format";
import { handleRpcError } from "@/utils/handleError";
import { getDuration } from "@/utils/date";
import { Message } from "@/hooks/useMessage";
import Guide from "@/components/Guide.vue";

const props = defineProps({
  tokenAmount: {
    type: Number,
    default: () => 0,
  },
});
const emit = defineEmits(["close", "success"]);

const form = reactive({
  submitLoading: false,
  loading: true,
  maxSlippage: 1,
  slippageList: [0.5, 1, 2, 5],
  slippageListObj: [
    { text: "0.5%", value: 0.5 },
    { text: "1%", value: 1 },
    { text: "2%", value: 2 },
    { text: "5%", value: 5 },
  ],
});
const { poolDetail } = usePoolDetail();
const { trader, setTraderFactor, fetchAmountsOut } = useTrader();

onMounted(() => {
  setTraderFactor(0, poolDetail.poolInfo.maxLeverage, poolDetail.poolInfo.stableTokenName);
  refreshExpectPrice();
});

watch([() => form.maxSlippage, trader.tokenPrice], () => {
  refreshExpectPrice();
});

async function refreshExpectPrice() {
  form.loading = true;
  fetchAmountsOut(
    props.tokenAmount,
    poolDetail.poolInfo.tokenAddress,
    poolDetail.poolInfo.stableToken,
    form.maxSlippage * 100,
    poolDetail.poolInfo.decimals,
    poolDetail.poolInfo.stableTokenDecimals,
    // poolDetail.poolInfo.maxLeverage,
    poolDetail.token.swapRouter,
  ).then(() => {
    form.loading = false;
  });
}

// estimateMargin 仅前端显示用 0424 uniswap更新
const estimateMargin = computed(() => {
  return (trader.expectedPrice / poolDetail.poolInfo.maxLeverage) * props.tokenAmount;
});

const priceImpact = computed(() => {
  if (+props.tokenAmount) {
    const noSlipagePrice = trader.noSlippagePrice;
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

/**
 * @description: 获取距离当前时长
 * @param {*} params
 * @return {*}
 */
function getExpireTime() {
  return getDuration(new Date(poolDetail.endTime) - new Date());
}

async function onSubmit() {
  if (Math.abs(priceImpact.value * 1) >= 10) {
    Message.warning("Too large(10%) price impact. Try a smaller order size");
    return;
  }

  form.submitLoading = true;
  try {
    await TradingAction.openPosition(
      poolDetail.poolInfo.id,
      props.tokenAmount,
      poolDetail.poolInfo.tokenAddress,
      poolDetail.poolInfo.stableToken,
      poolDetail.poolInfo.decimals,
      poolDetail.poolInfo.stableTokenDecimals,
      trader.expectedPrice,
      poolDetail.token.swapRouter,
    );
    emit("success");
    delete localStorage.pool_activity_logs;
  } catch (error) {
    console.log("openPosition", error);
    handleRpcError(error);
  } finally {
    form.submitLoading = false;
    setTraderFactor(0, poolDetail.poolInfo.maxLeverage, poolDetail.poolInfo.stableTokenName);
    emit("close");
  }
}
</script>

<style lang="scss" scoped>
@import "~@/views/Positions/components/PositionTrade.scss";
.dialog-order-info {
  padding: 32px;
  color: #333;

  label {
    font-size: 14px;
    color: #909399;
    font-family: $caption;
  }
}
.header {
  margin: -32px -32px 0;
  padding: 32px 32px 30px;
  background: #fffaf7;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  .title {
    font-family: Haas Grot Disp;
    font-weight: 600;

    color: #11142d;
    font-size: 18px;
  }
  .basic-info {
    @include flex;
    margin-top: 40px;
    .info-group {
      @include flex;
      flex: 1;
      position: relative;
      label {
        color: #a4a5b2;
      }
      &:last-child {
        position: relative;
        text-align: right;
        justify-content: flex-end;
      }
      .info:nth-child(2) {
        margin-left: 32px;
      }
      h4 {
        height: 20px;
        margin-top: 12px;
        font-size: 20px;
        line-height: 24px;
      }
      .progress-container {
        position: absolute;
        left: 0;
        bottom: -14px;
        width: 100px;
      }
    }
  }
}
.order-detail {
  padding: 0;
  background: #fff;
  margin-top: 14px;
  margin-bottom: 25px;
}
</style>
