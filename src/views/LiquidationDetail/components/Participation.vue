<template>
  <div class="panel-container">
    <header class="panel-header">
      <h4 class="panel-title">Participate in Phase 1</h4>
    </header>

    <div class="panel">
      <form class="form" @submit.prevent>
        <div class="form-group">
          <label style="display: flex">Bid Size</label>
          <div
            class="form-control"
            :class="[
              { active: state.form.coverAmountFocused },
              {
                error:
                  state.form.coverAmount * 1 > liquidationDetail.debtSize * 1 ||
                  state.form.coverAmount * 1 > state.tokenBalance * 1,
              },
            ]"
          >
            <Image class="coin-icon" :src="liquidationDetail.tokenInfo.logoURI" alt="" />
            <input
              v-model="state.form.coverAmount"
              v-number-only
              type="text"
              placeholder="0"
              :disabled="!wallet.isConnected"
              @input="state.form.coverAmount = state.form.coverAmount.match(/^\d+\.?\d{0,18}/)"
              @focus="state.form.coverAmountFocused = true"
              @blur="state.form.coverAmountFocused = false"
            />
            <span v-if="wallet.isConnected" class="suffix" @click="toMaxBid">MAX</span>
          </div>
          <div class="addition">
            <small>Wallet Balance</small>
            <span v-if="wallet.isConnected">
              {{ state.tokenBalance ? toQuantity(state.tokenBalance, tokenPrice) : "-" }}
              {{ state.tokenBalance ? tokenSymbol : "" }}
            </span>
            <span v-else>-</span>
          </div>
        </div>
        <div class="form-group">
          <label>Priority Fee</label>
          <div
            class="form-control"
            :class="[
              { active: state.form.piorityFeeFocused },
              { error: state.form.priorityFee * 1 > balance.amount * 1 },
            ]"
          >
            <Image class="coin-icon" src="https://cdn.shorter.finance/tokens/img/IPISTR.png" alt="" />
            <input
              v-model="state.form.priorityFee"
              v-number-only
              type="text"
              placeholder="0"
              :disabled="!wallet.isConnected"
              @input="state.form.priorityFee = state.form.priorityFee.match(/^\d+\.?\d{0,18}/)"
              @focus="state.form.piorityFeeFocused = true"
              @blur="state.form.piorityFeeFocused = false"
            />
            <span
              v-if="wallet.isConnected"
              class="suffix"
              @click="
                () => {
                  state.form.priorityFee = toNonExponential(balance.amount);
                }
              "
            >
              MAX
            </span>
          </div>
          <div class="addition">
            <small>Wallet Balance</small>
            <span v-if="wallet.isConnected">{{ formatNum(balance.amount, 2, true) }} IPISTR</span>
            <span v-else>-</span>
          </div>
        </div>

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
          v-else-if="state.form.showApproveIPISTR"
          type="primary"
          class="btn-submit big"
          :loading="state.loading.approveIpistr"
          @click="onApproveIPISTR"
        >
          Approve IPISTR
        </shorterButton>
        <shorterButton
          v-else-if="state.form.showApproveToken"
          type="primary"
          class="btn-submit big"
          :loading="state.loading.approveToken"
          @click="onApproveToken(liquidationDetail)"
        >
          Approve {{ tokenSymbol }}
        </shorterButton>
        <shorterButton
          v-else
          type="primary"
          class="btn-submit big"
          :disabled="state.form.btnDisabled"
          :loading="state.loading.submit"
          @click="onSubmit({ ...state.form }, liquidationDetail)"
        >
          Submit my bid
        </shorterButton>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, watchEffect, computed, inject, watch } from "vue";

import { getContractAddress } from "@/contract";
import * as CommitteeAction from "@/contract/committee";
import * as ERC20 from "@/contract/erc20";
import * as AuctionHall from "@/contract/auctionHall";

import { useBalance } from "@/hooks/useBalance";
import { Message } from "@/hooks/useMessage";
import { useWallet } from "@/hooks/useWallet";

import { handleRpcError } from "@/utils/handleError";
import { toNonExponential, toQuantity, dealDecimals, formatNum } from "@/utils/format";
import { bigNumCompare } from "@/utils/number";

const props = defineProps({
  liquidationDetail: {
    type: Object,
    default: () => {},
  },
  loading: {
    type: Boolean,
    default: () => false,
  },
  tokenPrice: {
    type: [Number, String],
    default: () => 0,
  },
});
const emit = defineEmits(["tanto", "rulerCheck"]);

const events = inject("events");

const { balance } = useBalance();
const { account, wallet } = useWallet();

const state = reactive({
  tokenBalance: 0,
  loading: {
    submit: false,
    approveToken: false,
    approveIpistr: false,
    fetchIPISTRAllowance: false,
    fetchTokenAllowance: false,
  },
  form: {
    coverAmount: "", //Token
    priorityFee: "", //IPISTR
    tokenAllowance: "",
    IPISTRAllowance: "",
    coverAmountFocused: false,
    piorityFeeFocused: false,
    showApproveToken: false,
    showApproveIPISTR: false,
    btnDisabled: computed(() => {
      if (state.loading.fetchIPISTRAllowance || state.loading.fetchTokenAllowance) {
        return true;
      }
      if (state.form.coverAmount === "") {
        return false;
      }
      if (state.form.coverAmount * 1 <= 0) {
        return true;
      }
      if (state.form.priorityFee * 1 < 0) {
        return true;
      }
      return false;
    }),
  },
});

const tokenSymbol = computed(() => {
  const chainConfig = getContractAddress();

  const tInfo = props.liquidationDetail.tokenInfo;
  if (tInfo.address === chainConfig.chainTokenAddress) {
    return chainConfig.chainTokenSymbol;
  }
  return tInfo.symbol;
});

watchEffect(() => {
  if (wallet.isConnected && account.value) {
    resetForm();
    const liquidationDetail = props.liquidationDetail;
    fetchIPISTRAllowance(account.value);
    if (liquidationDetail.poolInfo) fetchTokenAllowance(liquidationDetail.poolInfo.stakedToken, account.value);
    if (liquidationDetail.tokenInfo) fetchTokenBalance(liquidationDetail.tokenInfo.address, account.value);
  }
});

watch(
  () => state.form.coverAmount,
  () => {
    checkTokenApprove();
  },
);

watch(
  () => state.form.priorityFee,
  () => {
    checkIPISTRApprove();
  },
);

function resetForm() {
  const init_form = {
    coverAmount: "", //Token
    priorityFee: "", //IPISTR
    tokenAllowance: "",
    IPISTRAllowance: "",
    coverAmountFocused: false,
    piorityFeeFocused: false,
    showApproveToken: false,
    showApproveIPISTR: false,
  };
  Object.assign(state.form, init_form);
}

async function fetchTokenBalance(tokenAddress, accountValue) {
  const result = await ERC20.getBalanceOf(tokenAddress, accountValue);
  state.tokenBalance = result;
}

function toMaxBid() {
  const res = bigNumCompare(props.liquidationDetail.debtSize, state.tokenBalance);
  if (res < 0) {
    state.form.coverAmount = props.liquidationDetail.debtSize;
  } else {
    state.form.coverAmount = state.tokenBalance;
  }
}

async function fetchTokenAllowance(stakedToken, accountValue) {
  try {
    if (stakedToken === getContractAddress().chainTokenAddress) {
      const MAX_ALLOWANCE = parseInt("ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", 16);
      state.form.tokenAllowance = MAX_ALLOWANCE;
    } else {
      state.loading.fetchTokenAllowance = true;
      const tokenAllowance = await ERC20.allowance(stakedToken, accountValue);
      state.form.tokenAllowance = tokenAllowance * 1;
    }
  } catch (error) {
    console.log(error, "fetchTokenAllowance");
  } finally {
    state.loading.fetchTokenAllowance = false;
  }
}

async function fetchIPISTRAllowance(accountValue) {
  const contractAddress = getContractAddress();
  if (!contractAddress.IPISTR) return;
  try {
    state.loading.fetchIPISTRAllowance = true;
    const IPISTRAllowance = await ERC20.allowance(contractAddress.IPISTR, accountValue);
    state.form.IPISTRAllowance = IPISTRAllowance * 1;
  } catch (error) {
    console.log(error, "fetchIPIstrAllowance");
  } finally {
    state.loading.fetchIPISTRAllowance = false;
  }
}

async function onApproveToken(liquidationDetail) {
  const { poolInfo } = liquidationDetail || {};
  const { stakedToken } = poolInfo || {};
  try {
    state.loading.approveToken = true;
    await ERC20.approve(stakedToken, account.value);
    await fetchTokenAllowance(stakedToken, account.value);
    checkTokenApprove();
  } catch (error) {
    handleRpcError(error);
  } finally {
    state.loading.approveToken = false;
  }
}

async function onApproveIPISTR() {
  state.loading.approveIpistr = true;
  const contractAddress = getContractAddress();
  try {
    await ERC20.approve(contractAddress.IPISTR, account.value);
    await fetchIPISTRAllowance(account.value);
    checkIPISTRApprove();
  } catch (error) {
    handleRpcError(error);
  } finally {
    state.loading.approveIpistr = false;
  }
}

function checkTokenApprove() {
  if (state.form.coverAmount > state.form.tokenAllowance) {
    state.form.showApproveToken = true;
  } else {
    state.form.showApproveToken = false;
  }
}

function checkIPISTRApprove() {
  if (state.form.priorityFee > state.form.IPISTRAllowance) {
    state.form.showApproveIPISTR = true;
  } else {
    state.form.showApproveIPISTR = false;
  }
}

async function onSubmit(form, liquidationDetail) {
  if (!account.value) {
    Message.warning("Connect your wallet to continue");
    return;
  }
  /**
   * double check
   */
  const res = await CommitteeAction.isRuler(account.value);

  if (!res) {
    // Message.error("Liquidation is exclusive to Rulers.");
    emit("rulerCheck");
    return;
  }
  if (
    form.coverAmount * 1 <= 0 ||
    state.form.coverAmount * 1 > props.liquidationDetail.debtSize * 1 ||
    state.form.priorityFee * 1 > balance.amount * 1
  ) {
    Message.warning("Please enter a valid value");
    return;
  }

  if (form.priorityFee * 1 > balance.amount * 1) {
    Message.warning("Insufficient amount");
    return;
  }
  // addAccountAddress(hash, account.value, "1");
  try {
    state.loading.submit = true;
    const hash = liquidationDetail.hash;
    const coverAmount = dealDecimals(form.coverAmount.toString(), 18);
    if (!form.priorityFee) form.priorityFee = 0;
    const priorityFee = dealDecimals(form.priorityFee.toString(), 18);
    let special = false;
    if (liquidationDetail.tokenInfo.address === getContractAddress().chainTokenAddress) special = true;
    const estProfit = form.coverAmount * props.tokenPrice * 0.02;
    const phase1Bid = await AuctionHall.bidTanto(hash, coverAmount, priorityFee, special, estProfit);
    state.form.coverAmount = "";
    state.form.priorityFee = "";
    const fetchPhase1BidList = events["fetchPhase1BidList"];
    if (typeof fetchPhase1BidList === "function") {
      fetchPhase1BidList();
    }
    emit("tanto", phase1Bid);
  } catch (error) {
    handleRpcError(error.error);
  } finally {
    state.loading.submit = false;
  }
}
</script>

<style lang="scss" scoped>
@import "~@/views/PoolDetail/components/form-control.scss";
.popover-content {
  min-width: 165px;
  padding: 2px;
  text-align: center;
}
.panel-container {
  margin-top: 16px;
  .btn-submit {
    width: 100%;
    // height: 56px;
    margin-top: 40px;
  }
}
</style>
