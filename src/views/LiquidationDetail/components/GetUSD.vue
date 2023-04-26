<template>
  <div class="panel-container">
    <header class="panel-header">
      <h4 class="panel-title">Get USDs Legacy</h4>
    </header>
    <div class="panel">
      <form class="form" @submit.prevent>
        <div class="form-group">
          <label>
            Sell
            <span class="legacy-get-symbol">{{ showTokenSymbol }}</span>
            at
          </label>
          <div class="num-text-field">
            <SmartNumber type="price" :value="rewardPrice" />
          </div>
        </div>
        <div class="form-group">
          <label>Est. Profit</label>
          <div :class="['num-text-field', state.form.negProfitFlag]">
            {{ state.form.estProfit }}
          </div>
        </div>
        <div class="form-group">
          <label style="display: flex">Bid Size</label>
          <div
            class="form-control"
            :class="[
              { active: state.form.bidSizeFocused },
              {
                error:
                  state.form.bidSize * 1 > state.tokenBalance * 1 ||
                  state.form.bidSize * 1 > liquidationDetail.totalSize * 1,
              },
            ]"
          >
            <Image class="coin-icon" :src="liquidationDetail.tokenInfo.logoURI" alt="" />
            <input
              v-model="state.form.bidSize"
              v-number-only
              type="text"
              placeholder="0"
              :disabled="!wallet.isConnected"
              @focus="state.form.bidSizeFocused = true"
              @blur="state.form.bidSizeFocused = false"
            />
            <span v-if="wallet.isConnected" class="suffix" @click="toLegacyMax(liquidationDetail)">MAX</span>
          </div>
          <div class="addition">
            <small>Wallet Balance</small>
            <span v-if="wallet.isConnected">
              {{ state.tokenBalance ? toQuantity(state.tokenBalance, tokenPrice) : "-" }}
              {{ state.tokenBalance ? showTokenSymbol : "" }}
            </span>
            <span v-else>-</span>
          </div>
        </div>
        <shorterButton
          v-if="!wallet.isConnected"
          type="primary"
          class="full big"
          style="margin-top: 36px"
          plain
          @click="wallet.visible = true"
        >
          Unlock wallet
        </shorterButton>
        <shorterButton
          v-else-if="state.form.showApprove"
          type="primary"
          class="full big"
          style="margin-top: 36px"
          :loading="state.loading.approve"
          @click="onApprove(liquidationDetail)"
        >
          Approve {{ showTokenSymbol }}
        </shorterButton>
        <shorterButton
          v-else
          type="primary"
          class="full big"
          style="margin-top: 36px"
          :loading="state.loading.submit"
          :disabled="state.form.bidDisabled"
          @click="onSubmit({ ...state.form }, liquidationDetail)"
        >
          Submit my bid
        </shorterButton>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, watchEffect, watch, inject } from "vue";
import NP from "number-precision";

import { getContractAddress } from "@/contract";
import * as Erc20 from "@/contract/erc20";
import * as VaultButler from "@/contract/vaultButler";
import * as CommitteeAction from "@/contract/committee";

import { useWallet } from "@/hooks/useWallet";
import { Message } from "@/hooks/useMessage";

import { toQuantity, dealDecimals, toNonExponential, formatNum } from "@/utils/format";
import { handleRpcError } from "@/utils/handleError";
import * as Transfer from "@/utils/transfer";

const props = defineProps({
  liquidationDetail: {
    type: Object,
    default: () => {},
  },
  tokenPrice: {
    type: Number,
    default: () => 0,
  },
  phase: {
    type: Number,
    default: () => 0,
  },
});

const emit = defineEmits(["naginata", "rulerCheck"]);

const { account, wallet } = useWallet();
const rewardPrice = computed(() => {
  const currentTokenPrice = props.tokenPrice;
  const remainUnsettledCash = props.liquidationDetail.unsettledCash;

  const debtSize = props.liquidationDetail.totalSize;
  const maxReward = NP.divide(remainUnsettledCash, debtSize);
  return Math.min(currentTokenPrice * 1.02, maxReward);
});

const showTokenSymbol = computed(() => {
  const liquidationDetail = props.liquidationDetail;
  const contractAddress = getContractAddress();
  if (liquidationDetail.tokenInfo.address === contractAddress.chainTokenAddress) {
    return contractAddress.chainTokenSymbol;
  }
  return liquidationDetail.tokenInfo.symbol;
});

const state = reactive({
  form: {
    bidSize: "",
    estProfit: "--",
    negProfitFlag: "",
    tokenAllowance: "",
    bidSizeFocused: false,
    showApprove: false,
    bidDisabled: computed(() => {
      if (state.loading.fetchAllowance) {
        return true;
      }
      if (state.form.bidSize === "") {
        return false;
      }
      if (state.form.bidSize * 1 === 0) {
        return true;
      }
      return false;
    }),
  },
  loading: {
    submit: false,
    approve: false,
    fetchAllowance: false,
  },
  tokenBalance: 0,
});

const refreshLiquidationDetail = inject("refreshLiquidationDetail");

watchEffect(() => {
  if (wallet.isConnected && account.value) {
    resetForm();
    const liquidationDetail = props.liquidationDetail;
    fetchTokenAllowance(liquidationDetail.poolInfo.stakedToken, account.value);
    fetchTokenBalance(liquidationDetail.tokenInfo.address, account.value);
  }
});

watch(
  () => state.form.bidSize,
  () => {
    checkApprove();
    calcProfit();
  },
);

function resetForm() {
  const init_form = {
    bidSize: "",
  };
  Object.assign(state.form, init_form);
}

//给池子合约授权额度查询,合约将替换为其他合约
async function fetchTokenAllowance(stakedToken, account) {
  try {
    if (stakedToken === getContractAddress().chainTokenAddress) {
      const MAX_ALLOWANCE = parseInt("ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", 16);
      state.form.tokenAllowance = MAX_ALLOWANCE;
    } else {
      state.loading.fetchAllowance = true;
      const tokenAllowance = await Erc20.allowance(stakedToken, account);
      state.form.tokenAllowance = tokenAllowance * 1;
    }
  } catch (error) {
    console.log(error, "fetchTokenAllowance");
  } finally {
    state.loading.fetchAllowance = false;
  }
}

async function fetchTokenBalance(tokenAddress, account) {
  const result = await Erc20.getBalanceOf(tokenAddress, account);
  state.tokenBalance = result;
}

/**
 * @description: remainingDebtSize
 * @param {*}
 * @return {*}
 */
function toLegacyMax(liquidationDetail) {
  const debtSize = Transfer.receiveAmount(liquidationDetail.totalSize_big);
  if (Number(state.tokenBalance) >= Number(debtSize)) {
    state.form.bidSize = toNonExponential(debtSize);
  } else {
    state.form.bidSize = toNonExponential(state.tokenBalance);
  }
}

async function onApprove(liquidationDetail) {
  const { poolInfo } = liquidationDetail || {};
  const { stakedToken } = poolInfo || {};
  try {
    state.loading.approve = true;
    await Erc20.approve(stakedToken, account.value);
    await fetchTokenAllowance(stakedToken, account.value);
    checkApprove();
  } catch (error) {
    handleRpcError(error);
    console.log(error, "onApprove");
  } finally {
    state.loading.approve = false;
  }
}
function checkApprove() {
  if (state.form.bidSize > state.form.tokenAllowance) {
    state.form.showApprove = true;
  } else {
    state.form.showApprove = false;
  }
}

async function calcProfit() {
  let bidSize = state.form.bidSize;
  if (!bidSize) {
    state.form.negProfitFlag = "";
    state.form.estProfit = "--";
    return;
  }
  const currentTokenPrice = props.tokenPrice;
  let priceDiff = rewardPrice.value - currentTokenPrice;
  let amount = NP.times(priceDiff, bidSize);
  let digitStr = formatNum(amount, 2, true);
  state.form.estProfit = amount >= 0 ? `\$${digitStr}` : digitStr.replace("-", "-$");
  state.form.negProfitFlag = amount >= 0 ? "color-green" : "color-red";
}

/**
 * @description: 获取遗产信息
 * @param {*}
 * @return {*}
 */
async function onSubmit(form, liquidationDetail) {
  let bidSize = form.bidSize;
  if (!account.value) {
    Message.warning("Connect your wallet to continue");
    return;
  }
  const res = await CommitteeAction.isRuler(account.value);

  if (!res) {
    emit("rulerCheck");
    return;
  } else {
    account.isRuler = true;
  }

  if (!bidSize * 1 > 0) {
    Message.warning("Please enter a valid value");
    return;
  }
  if (liquidationDetail.state === 2) {
    if (bidSize * 1 > liquidationDetail.totalSize * 1) {
      Message.warning("Too large amount.");
      return;
    }
  } else {
    if (bidSize * 1 > liquidationDetail.totalSize * 1) {
      Message.warning("Too large amount.");
      return;
    }
  }

  try {
    state.loading.submit = true;

    const { tokenInfo, hash } = liquidationDetail || {};
    bidSize = Transfer.toAmount(dealDecimals(bidSize, tokenInfo.decimals), tokenInfo.decimals);

    const special = tokenInfo.address === getContractAddress().chainTokenAddress;
    const estProfit = state.form.estProfit.replace("$", "");

    const legacyBid = await VaultButler.executeNaginata(hash, bidSize, special, estProfit);
    state.form.bidSize = "";
    refreshLiquidationDetail();
    const bidInfo = {
      op_type: "Ordered",
      estimate_rewards: estProfit,
      bid_size: bidSize.toString(),
    };
    emit("naginata", Object.assign(legacyBid, bidInfo));
  } catch (error) {
    handleRpcError(error);
  } finally {
    state.loading.submit = false;
  }
}
</script>

<style lang="scss" scoped>
@import "~@/views/PoolDetail/components/form-control.scss";
.panel-container {
  margin-top: 16px;
}
.num-text-field {
  font-size: 18px;
  margin-bottom: -14px;
}
.legacy-get-symbol {
  color: $black2;
}
</style>
