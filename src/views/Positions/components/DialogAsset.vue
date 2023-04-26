<template>
  <div class="dialog-position-asset">
    <h4 class="title">Remnant Assets</h4>
    <ul class="main-content">
      <li>
        <div class="info">
          <label>Withdrawable</label>
          <p class="flex-center-v">
            <Image class="coin-icon" :src="position.detail.stableTokenInfo.logoURI" />
            <span style="transform: translateY(2px)">${{ addThousandsSep(position.detail.withdrawableAsset) }}</span>
          </p>
        </div>
        <div class="info">
          <label>Realized P/L</label>
          <p
            v-if="position.detail && position.detail.earnAmount"
            :class="position.detail.earnAmount * 1 >= 0 ? 'color-green' : 'color-red'"
          >
            <span v-if="position.detail.plPercent < -1">
              <SmartNumber prefix="-" type="amount" :value="Math.abs(position.detail.totalMarginAmount)" />
            </span>
            <span v-else>
              <SmartNumber
                :prefix="position.detail.earnAmount * 1 >= 0 ? '+' : '-'"
                type="amount"
                :value="Math.abs(position.detail.earnAmount)"
              />
            </span>
          </p>

          <p v-else class="color-grey">$0</p>
        </div>
      </li>
      <li>
        <div class="info">
          <label>Avg. Open Price</label>
          <p>
            <SmartNumber type="price" :value="position.detail?.avgHoldPrice" />
          </p>
        </div>
        <div class="info">
          <label>Avg. Liq. Price</label>
          <p>
            <SmartNumber type="price" :value="position.detail.avgLiqPrice" />
          </p>
        </div>
      </li>
    </ul>
    <shorterButton type="primary" class="full big" :loading="state.loading" @click="onWithdraw">
      Withdraw all
    </shorterButton>
  </div>
</template>

<script setup>
import { reactive } from "vue";

import { withdrawRemnantAsset } from "@/contract/strPool";

import { usePosition } from "@/hooks/usePosition";

import { addThousandsSep } from "@/utils/format";
import { handleRpcError } from "@/utils/handleError";

const emit = defineEmits(["closeDialog"]);

const { position } = usePosition();
const state = reactive({
  loading: false,
});

async function onWithdraw() {
  if (!position.detail.hash) return;
  state.loading = true;
  try {
    console.log("position.detail", position.detail);
    await withdrawRemnantAsset(position.detail.strToken, position.detail.hash);
    emit("closeDialog");
  } catch (error) {
    handleRpcError(error);
  } finally {
    state.loading = false;
  }
}
</script>

<style lang="scss" scoped>
.dialog-position-asset {
  padding: 32px;
  font-family: Haas Grot Text;
}

h4.title {
  font-family: Haas Grot Disp;
  font-weight: 600;

  color: #11142d;
  font-size: 18px;
  .tag {
    margin-left: 8px;
  }
}

.main-content {
  margin-top: 32px;
  margin-bottom: 16px;
  label {
    display: block;
    font-family: $caption;
    color: #a4a5b2;
    font-size: 14px;
    margin-bottom: 14px;
  }
  li {
    @include flex;
    justify-content: space-between;
    padding: 16px 0;
    .info:last-child {
      text-align: right;
    }
  }
  .coin-icon {
    width: 20px;
    height: 20px;
    margin-right: 8px;
  }
  li:first-child {
    border-bottom: 1px solid #e4e4e4;
  }
}
</style>
