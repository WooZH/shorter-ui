<template>
  <div class="dialog-committee-vault">
    <div class="title strong">Committee Vault</div>

    <div class="main-content">
      <Tabs v-model="state.curTab" type="3">
        <TabItem title="Deposit" />
        <TabItem title="Withdraw" />
      </Tabs>

      <form v-show="state.curTab == 0" class="form" @submit.prevent>
        <div class="form-group group-inline">
          <div class="lt">
            <label for="">IPISTR in Committee</label>
            <p>{{ formatNum(committeeBalance) }}</p>
          </div>
          <div class="rt">
            <label for="">Your Vote Weight</label>
            <span>{{ voteWeight ? toPercent(voteWeight * 100, 2) : 0 }}%</span>
            <span v-if="form.depositVal > 0" class="weight-up">
              +{{ effectDepositPercent ? toPercent(effectDepositPercent * 100, 2) : 0 }}%
            </span>
          </div>
        </div>

        <div class="form-group">
          <label for="">Deposit</label>
          <div class="form-control">
            <input
              v-model="form.depositVal"
              v-number-only
              :readonly="loadingStatus.deposit || loadingStatus.fetchAllowance"
              type="text"
              placeholder="0"
            />
            <span class="max suffix" @click="toMax">MAX</span>
          </div>
          <p class="addition">
            <small>Wallet Balance</small>
            <span>{{ toQuantity(balance.amount, balance.price) }} IPISTR</span>
          </p>
        </div>
        <p v-if="!account.isRuler && state.showRulerTip" class="notice">
          Minimum vote weight for Ruler eligibility:
          <span class="color-primary">0.1%</span>
        </p>
        <shorterButton v-if="!wallet.isConnected" type="primary" class="full big" plain @click="wallet.visible = true">
          Unlock wallet
        </shorterButton>
        <shorterButton
          v-else-if="form.showApprove"
          type="primary"
          :loading="loadingStatus.approve"
          class="full big"
          @click="onApprove"
        >
          Approve IPISTR
        </shorterButton>

        <shorterButton
          v-else
          type="primary"
          :loading="loadingStatus.deposit || loadingStatus.fetchAllowance"
          :disabled="depositDisabled"
          class="full big"
          @click="onDeposit"
        >
          {{ depositText }}
        </shorterButton>
      </form>

      <form v-show="state.curTab == 1" class="form" @submit.prevent>
        <div class="form-group group-inline">
          <div class="lt">
            <label for="">IPISTR in Committee</label>
            <p>{{ formatNum(committeeBalance) }}</p>
          </div>
          <div class="rt">
            <label for="">Your Vote Weight</label>
            <span>{{ toPercent(voteWeight * 100) || 0 }}%</span>
            <span v-if="form.withdrawVal > 0" class="weight-down">
              -{{ toPercent(Math.min(voteWeight, effectWithdrawPercent) * 100) }}%
            </span>
          </div>
        </div>
        <div class="form-group">
          <label for="">Withdraw</label>
          <div class="form-control">
            <input
              v-model="form.withdrawVal"
              v-number-only
              :readonly="loadingStatus.withdraw || loadingStatus.fetchAllowance"
              placeholder="0"
              type="text"
            />
            <span class="max suffix" @click="toMax">MAX</span>
          </div>
          <p class="addition">
            <small>Current Providing</small>
            <span>{{ formatNum(availableShare, 2, true) }} IPISTR</span>
          </p>
        </div>
        <p v-if="!account.isRuler && state.showRulerTip" class="notice">
          Minimum vote weight for Ruler eligibility:
          <span class="color-primary">0.1%</span>
        </p>
        <shorterButton v-if="!wallet.isConnected" type="primary" class="full big" plain @click="wallet.visible = true">
          Unlock wallet
        </shorterButton>
        <shorterButton
          v-else
          type="primary"
          :disabled="withdrawDisabled"
          :loading="loadingStatus.withdraw || loadingStatus.fetchAllowance"
          class="full big"
          @click="onWithdraw"
        >
          Withdraw IPISTR
        </shorterButton>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, watchEffect, computed, watch } from "vue";
import NP from "number-precision";

import { updateAccount } from "@/env";
import { getContractAddress } from "@/contract";
import * as IPISTR from "@/contract/ipistr";
import * as Committee from "@/contract/committee";

import { toQuantity, toPercent, dealDecimals, formatNum } from "@/utils/format";
import { handleRpcError } from "@/utils/handleError";

import { Message } from "@/hooks/useMessage";
import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";

const props = defineProps({
  committeeBalance: {
    type: Number || String,
    default: () => 0,
  },
  totalShare: {
    type: Number || String,
    default: () => 0,
  },
  availableShare: {
    type: Number || String,
    default: () => 0,
  },
  voteWeight: {
    type: Number || String,
    default: () => 0,
  },
});

const emit = defineEmits(["updateData", "closeDialog"]);

const { wallet, account } = useWallet();
const { balance } = useBalance();

const state = reactive({
  curTab: 0,
  showRulerTip: true,
  ipistrAllowance: "",

  form: {
    depositVal: "",
    withdrawVal: "",
    showApprove: false,
  },
});

const form = reactive({
  depositVal: "",
  withdrawVal: "",
  showApprove: false,
});

const loadingStatus = reactive({
  withdraw: false,
  deposit: false,
  approve: false,
  fetchAllowance: false,
});

const depositText = computed(() => {
  if (form.depositVal * 1 > balance.amount * 1) return "Insufficient IPISTR";
  if (account.isRuler) return "Deposit IPISTR";

  const totalPercent = NP.divide(
    NP.plus(form.depositVal || 0, props.availableShare || 0),
    NP.plus(form.depositVal || 0, props.committeeBalance || 0),
  );
  if (totalPercent >= 0.001 && props.voteWeight * 1 < 0.001) {
    return "Deposit IPISTR to Become a Ruler!";
  } else {
    return "Deposit IPISTR";
  }
});

const depositDisabled = computed(() => {
  if (form.depositVal === "") {
    return false;
  }
  if (form.depositVal * 1 === 0) {
    return true;
  }
  if (form.depositVal * 1 > balance.amount * 1) {
    return true;
  }
  return false;
});

const withdrawDisabled = computed(() => {
  if (form.withdrawVal === "") {
    return false;
  }
  if (form.withdrawVal * 1 > props.availableShare * 1) {
    return true;
  }
  if (form.withdrawVal <= 0) {
    return true;
  }
  return false;
});

const effectDepositPercent = computed(() => {
  const votes = NP.plus(form.depositVal || 0, props.totalShare || 0);
  const newAmount = NP.plus(props.committeeBalance || 0, form.depositVal || 0);
  const newWeight = NP.divide(votes || 0, newAmount || 0);
  state.showRulerTip = newWeight * 1 < 0.001;
  return NP.minus(newWeight || 0, props.voteWeight || 0);
});

const effectWithdrawPercent = computed(() => {
  let result = 0;
  if (form.withdrawVal * 1) {
    const votes = form.withdrawVal * 1;
    result = NP.divide(votes || 0, props.committeeBalance) * 1;
  }

  const totalPercent = NP.minus(props.voteWeight || 0, result || 0);
  state.showRulerTip = totalPercent < 0.001;

  if (result > 1) return 1;
  return result;
});

watchEffect(() => {
  if (account.value && wallet.isConnected) {
    fetchAllowance();
  }
});

watch(
  () => form.depositVal,
  () => {
    checkApprove();
  },
);

async function fetchAllowance() {
  try {
    loadingStatus.fetchAllowance = true;
    const contractAddress = getContractAddress();
    state.ipistrAllowance = await IPISTR.allowance(account.value, contractAddress.ShorterBone);
  } finally {
    loadingStatus.fetchAllowance = false;
  }
}

async function onApprove() {
  try {
    loadingStatus.approve = true;
    const contractAddress = getContractAddress();
    await IPISTR.approve(contractAddress.ShorterBone, account.value);
    await fetchAllowance();
    checkApprove();
  } catch (error) {
    handleRpcError(error);
  } finally {
    loadingStatus.approve = false;
  }
}

function checkApprove() {
  if (state.ipistrAllowance * 1 < form.depositVal * 1) {
    form.showApprove = true;
  } else {
    form.showApprove = false;
  }
}

async function onWithdraw() {
  if (!form.withdrawVal * 1) {
    Message.warning("Please enter a valid value");
    return;
  }
  if (form.withdrawVal * 1 > props.availableShare * 1) {
    Message.warning("Too large withdrawal amount. Try a smaller value.");
    return;
  }
  try {
    loadingStatus.withdraw = true;
    const val = dealDecimals(form.withdrawVal, balance.decimals);
    await Committee.withdraw(val, account.value);

    emit("updateData");
    emit("closeDialog");
  } catch (error) {
    handleRpcError(error.error);
  } finally {
    loadingStatus.withdraw = false;
  }
}

async function onDeposit() {
  if (!form.depositVal * 1) {
    Message.warning("Please enter a valid value");
    return;
  }

  try {
    loadingStatus.deposit = true;
    const val = form.depositVal;
    await Committee.deposit(val, account.value);
    updateAccount(account.value);
    emit("updateData");
    emit("closeDialog");
  } catch (error) {
    handleRpcError(error.error);
  } finally {
    loadingStatus.deposit = false;
  }
}

function toMax() {
  if (state.curTab * 1 === 0) {
    form.depositVal = balance.amount;
  } else {
    form.withdrawVal = props.availableShare;
  }
}
</script>

<style lang="scss" scoped>
.dialog-committee-vault {
  padding: 32px;
  font-family: Haas Grot Text;

  .title {
    font-size: 18px;
    margin-bottom: 48px;
  }

  .main-content {
    margin: 0 -24px;
  }

  .form {
    margin-top: 32px;
    padding: 0 24px;
  }

  .form-group {
    margin-bottom: 30px;
    &.group-inline {
      @include flex;
      justify-content: space-between;
      .rt {
        text-align: right;
      }
      .color-primary {
        color: $primary;
        font-weight: 600;
      }
    }
    .form-input {
      padding: 0 24px;
    }
    .max {
      color: #11142d;
      cursor: pointer;
    }
  }

  .addition {
    @include flex-center-v;
    justify-content: space-between;
    margin-top: 17px;
    color: #a4a5b2;
    small {
      font-size: 14px;
    }
    span {
      color: #333;
    }
  }
  .notice {
    margin-top: 40px;
    margin-bottom: 8px;
    color: #a4a5b2;
    span {
      color: $primary;
    }
  }
}

.weight-up {
  color: #43ac8d;
  margin-left: 5px;
}

.weight-down {
  color: #ef814f;
  margin-left: 5px;
}
</style>
