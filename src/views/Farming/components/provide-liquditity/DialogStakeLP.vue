<template>
  <div class="dialog-stake-LP">
    <h4 class="title">
      {{ dialogType }}
      <span v-show="state.lp > 0">{{ formatNum(state.lp, 2, true) }}</span>
      LP
    </h4>

    <form class="form" @submit.prevent>
      <div class="form-group">
        <label>Amount</label>
        <div class="form-control" :class="[{ active: tokenForm[firstToken].numberFocused }]">
          <div class="trading-pair">
            <div class="pics">
              <Image class="front" style="width: 32px; height: 32px" :src="firstTokenInfo.logoURI" />
            </div>
            <span>{{ firstTokenInfo.symbol }}</span>
          </div>
          <input
            v-model="tokenForm[firstToken].stakeSize"
            v-number-only
            type="text"
            placeholder="0"
            @focus="tokenForm[firstToken].numberFocused = true"
            @blur="tokenForm[firstToken].numberFocused = false"
            @input="checkLP(firstToken)"
          />

          <span class="suffix" @click="toMaxFirst">MAX</span>
        </div>
        <div class="addition">
          <small>{{ isStakeDialog ? "Wallet Balance" : "Current Staking" }}</small>
          <span>{{ formatNum(staking[firstToken], 4, true) || 0 }} {{ firstTokenInfo.symbol }}</span>
        </div>
      </div>

      <div class="form-group">
        <label>Amount</label>
        <div class="form-control" :class="[{ active: tokenForm[secondToken].numberFocused }]">
          <div class="trading-pair">
            <div class="pics">
              <Image class="front" style="width: 32px; height: 32px" :src="secondTokenInfo.logoURI" />
            </div>
            <span>{{ secondTokenInfo.symbol }}</span>
          </div>
          <input
            v-model="tokenForm[secondToken].stakeSize"
            v-number-only
            type="text"
            placeholder="0"
            @focus="tokenForm[secondToken].numberFocused = true"
            @blur="tokenForm[secondToken].numberFocused = false"
            @input="checkLP(secondToken)"
          />

          <span class="suffix" @click="toMaxSecond">MAX</span>
        </div>
        <div class="addition">
          <small>{{ isStakeDialog ? "Wallet Balance" : "Current Staking" }}</small>
          <span>{{ formatNum(staking[secondToken], 4, true) || 0 }} {{ secondTokenInfo.symbol }}</span>
        </div>
      </div>

      <StakeLPFormBtn
        :wallet-connect="wallet.isConnected"
        :approve-loading="state.loading.approveLoading"
        :stake-loading="state.loading.stakeLoading"
        :first-token-approve="tokenForm[firstToken].showApprove"
        :second-token-approve="tokenForm[secondToken].showApprove"
        :first-token="firstToken"
        :second-token="secondToken"
        :btn-disabled="formBtnDisabled"
        :btn-text="formBtnText"
        @connectWallet="wallet.visible === true"
        @approve="onApprove($event)"
        @stake="handleStake"
      />
    </form>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted, nextTick } from "vue";
import NP from "number-precision";

import { useWallet } from "@/hooks/useWallet";
import { Message } from "@/hooks/useMessage";

import * as ERC20 from "@/contract/erc20";
import * as Farming from "@/contract/farming";
import * as FarmingImplV2 from "@/contract/farmingImplV2";

import { formatNum, dealDecimals } from "@/utils/format";
import { handleRpcError } from "@/utils/handleError";
import * as Transfer from "@/utils/transfer";

import StakeLPFormBtn from "./StakeLPFormBtn.vue";

const props = defineProps({
  isBsc: {
    type: Boolean,
  },
  dialogType: {
    type: String,
    default: "Stake",
  },
  tokenInfo: {
    type: Object,
    default: () => {},
  },
  firstToken: {
    type: String,
    default: "IPISTR",
  },
  secondToken: {
    type: String,
    default: "USDT",
  },
  tokenId: {
    type: String,
    default: "",
  },
  staking: {
    type: Object,
    default: () => ({}),
  },
  lpDecimals: {
    type: Number,
    default: 12,
  },
  token0IsFirstToken: {
    type: Boolean,
    default: true,
  },
  myStaked: {
    type: Number,
    default: 0,
  },
  liquidity: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["close", "success"]);
const { account, wallet } = useWallet();

const isStakeDialog = computed(() => {
  return props.dialogType === "Stake";
});

const firstTokenInfo = computed(() => {
  return props.tokenInfo[props.firstToken];
});
const secondTokenInfo = computed(() => {
  return props.tokenInfo[props.secondToken];
});

const formBtnDisabled = ref(false);
const formBtnText = ref(props.dialogType);

const tokenForm = reactive(getTokenForm());

const state = reactive({
  lp: 0,
  loading: {
    stakeLoading: false,
    approveLoading: false,
  },
});

watch(
  () => account.value,
  () => {
    fetchAllowance(firstTokenInfo.value.address, props.firstToken);
    fetchAllowance(secondTokenInfo.value.address, props.secondToken);
  },
);

watch(
  () => tokenForm[props.firstToken].stakeSize,
  () => {
    checkFormStatu();
    checkApprove(props.firstToken);
  },
);

watch(
  () => tokenForm[props.secondToken].stakeSize,
  () => {
    checkFormStatu();
    checkApprove(props.secondToken);
  },
);

onMounted(async () => {
  fetchAllowance(firstTokenInfo.value.address, props.firstToken);
  fetchAllowance(secondTokenInfo.value.address, props.secondToken);
});

function checkFormStatu() {
  nextTick(() => {
    checkFirstFormStatus();
    checkSecondFormStatus();
  });
}

function getTokenForm() {
  const firstToken = props.firstToken;
  const secondToken = props.secondToken;

  return {
    [firstToken]: {
      stakeSize: "",
      lpAllowanceOf: 0,
      showApprove: false,
      approveText: `Approve ${firstToken}`,
      numberFocused: false,
    },
    [secondToken]: {
      stakeSize: "",
      lpAllowanceOf: 0,
      showApprove: false,
      approveText: `Approve ${secondToken}`,
      numberFocused: false,
    },
  };
}

async function checkLP(token) {
  if (props.isBsc) {
    await getLiquidityByAmountV2(token);
  } else {
    await getLiquidityByAmountV3(token);
  }
}

async function checkApprove(token) {
  if (!isStakeDialog.value) {
    return;
  }

  const lpAllowanceOf = tokenForm[token].lpAllowanceOf * 1;
  const show = tokenForm[token].stakeSize * 1 > lpAllowanceOf || lpAllowanceOf === 0;
  tokenForm[token].showApprove = show;
}

async function getLiquidityByAmountV2(token) {
  const firstDecimals = firstTokenInfo.value.decimals;
  const secondDecimals = secondTokenInfo.value.decimals;
  const firstTokenAmount0 = Transfer.receiveAmount(props.liquidity.amount0, firstDecimals);
  const secondTokenAmount0 = Transfer.receiveAmount(props.liquidity.amount1, secondDecimals);
  const lpAmount = Transfer.receiveAmount(props.liquidity.lpAmount, (firstDecimals + secondDecimals) / 2);

  if (!firstTokenAmount0) {
    return setTimeout(() => {
      getLiquidityByAmountV2(token);
    }, 500);
  }

  if (token === props.firstToken) {
    tokenForm[props.secondToken].stakeSize = NP.divide(
      NP.times(tokenForm[props.firstToken].stakeSize, secondTokenAmount0),
      firstTokenAmount0,
    );

    const lp = NP.divide(NP.times(tokenForm[props.firstToken].stakeSize, lpAmount), firstTokenAmount0);
    state.lp = NP.divide(NP.times(lp, 997), 1000);
  }

  if (token === props.secondToken) {
    tokenForm[props.firstToken].stakeSize = NP.divide(
      NP.times(tokenForm[props.secondToken].stakeSize, firstTokenAmount0),
      secondTokenAmount0,
    );

    const lp = NP.divide(NP.times(tokenForm[props.secondToken].stakeSize, lpAmount), secondTokenAmount0);
    state.lp = NP.divide(NP.times(lp, 997), 1000);
  }
}

async function getLiquidityByAmountV3(token) {
  const firstAmount = props.token0IsFirstToken ? props.liquidity.amount0 : props.liquidity.amount1;
  const secondAmount = props.token0IsFirstToken ? props.liquidity.amount1 : props.liquidity.amount0;

  const firstDecimals = firstTokenInfo.value.decimals;
  const secondDecimals = secondTokenInfo.value.decimals;

  const formatteFirstAmount = Transfer.receiveAmount(firstAmount, firstDecimals);
  const formatteSecondAmount = Transfer.receiveAmount(secondAmount, secondDecimals);

  let rate = 0;
  if (token === props.firstToken) {
    rate = NP.divide(formatteFirstAmount, formatteSecondAmount);
    state.lp = NP.divide(tokenForm[token].stakeSize, formatteFirstAmount);

    if (rate) {
      tokenForm[props.secondToken].stakeSize = dealDecimals(
        NP.divide(tokenForm[token].stakeSize, rate),
        secondDecimals,
      );
    } else {
      tokenForm[props.secondToken].stakeSize = 0;
    }
  }

  if (token === props.secondToken) {
    rate = NP.divide(formatteSecondAmount, formatteFirstAmount);
    state.lp = NP.divide(tokenForm[token].stakeSize, formatteSecondAmount);

    if (rate) {
      tokenForm[props.firstToken].stakeSize = dealDecimals(NP.divide(tokenForm[token].stakeSize, rate), firstDecimals);
    } else {
      tokenForm[props.firstToken].stakeSize = 0;
    }
  }
}

function toMaxFirst() {
  tokenForm[props.firstToken].stakeSize = props.staking[props.firstToken];
  checkLP(props.firstToken);
}

function toMaxSecond() {
  tokenForm[props.secondToken].stakeSize = props.staking[props.secondToken];
  checkLP(props.secondToken);
}

async function fetchAllowance(tokenAddress, name) {
  try {
    const allowance = await ERC20.allowance(tokenAddress, account.value);

    tokenForm[name].lpAllowanceOf = allowance;
    checkApprove(name);
  } catch (error) {
    console.log(error);
  }
}

async function onApprove(token) {
  if (!account.value) return;

  try {
    state.loading.approveLoading = true;
    const address = props.tokenInfo[token].address;
    await ERC20.approve(address, account.value, tokenForm[token].lpAllowanceOf);
    await fetchAllowance(address, token);

    checkFirstFormStatus();
    checkSecondFormStatus();
  } catch (error) {
    handleRpcError(error);
  } finally {
    state.loading.approveLoading = false;
  }
}

function checkFirstFormStatus() {
  const firstStakeSize = tokenForm[props.firstToken].stakeSize * 1;
  const firstLpAllowanceOf = tokenForm[props.firstToken].lpAllowanceOf * 1;
  const firstStaking = props.staking[props.firstToken] * 1;

  if (firstStakeSize > firstLpAllowanceOf) return;

  if (firstStakeSize === 0) {
    formBtnText.value = props.dialogType;
    formBtnDisabled.value = true;
  } else if (firstStakeSize > firstStaking) {
    formBtnText.value = `Insufficient ${props.firstToken}`;
    formBtnDisabled.value = true;
  } else {
    formBtnText.value = props.dialogType;
    formBtnDisabled.value = false;
  }
}

function checkSecondFormStatus() {
  const secondStakeSize = tokenForm[props.secondToken].stakeSize * 1;
  const secondLpAllowanceOf = tokenForm[props.secondToken].lpAllowanceOf * 1;
  const secondStaking = props.staking[props.secondToken] * 1;

  if (secondStakeSize > secondLpAllowanceOf) return;

  if (tokenForm[props.secondToken].stakeSize === "") {
    formBtnText.value = props.dialogType;
    formBtnDisabled.value = false;
  } else if (secondStakeSize === 0) {
    formBtnText.value = props.dialogType;
    formBtnDisabled.value = true;
  } else if (secondStakeSize > secondStaking) {
    formBtnText.value = `Insufficient ${props.secondToken}`;
    formBtnDisabled.value = true;
  } else {
    formBtnText.value = props.dialogType;
    formBtnDisabled.value = false;
  }
}

async function handleStakeV3() {
  const lp = isStakeDialog.value ? NP.times(state.lp, 0.99) : state.lp;
  const lpDec = props.lpDecimals;
  const lp_params = Transfer.toAmount(lp.toFixed(lpDec), lpDec);

  let amount0 = 0;
  let amount1 = 0;
  const token0Address = props.liquidity[0];

  for (const token of [props.firstToken, props.secondToken]) {
    const stake = dealDecimals(
      NP.times(tokenForm[token].stakeSize, isStakeDialog.value ? 1 : 0.99),
      props.tokenInfo[token].decimals,
    );

    if (props.tokenInfo[token].address === token0Address) {
      amount0 = Transfer.toAmount(stake, props.tokenInfo[token].decimals);
    } else {
      amount1 = Transfer.toAmount(stake, props.tokenInfo[token].decimals);
    }
  }

  if (isStakeDialog.value) {
    await Farming.stakeV3(props.tokenId, amount0, amount1, lp_params);
  } else {
    await Farming.unStakeV3(props.tokenId, lp_params, amount0, amount1);
  }
}

async function handleStakeV2() {
  const lpDec = props.lpDecimals;
  const lp = state.lp * 0.99;

  const firstStakeSize = tokenForm[props.firstToken].stakeSize;
  const secondStakeSize = tokenForm[props.secondToken].stakeSize;
  const firstDec = firstTokenInfo.value.decimals;
  const secondDec = secondTokenInfo.value.decimals;

  let amount0 = 0;
  let amount1 = 0;
  if (props.liquidity.token0 === props.firstToken) {
    amount0 = Transfer.toAmount(firstStakeSize, firstDec);
    amount1 = Transfer.toAmount(secondStakeSize, secondDec);
  } else {
    amount0 = Transfer.toAmount(secondStakeSize, secondDec);
    amount1 = Transfer.toAmount(firstStakeSize, firstDec);
  }

  if (isStakeDialog.value) {
    const lp_params = Transfer.toAmount(lp.toFixed(lpDec) * 0.99, lpDec);
    await FarmingImplV2.stake(amount0, amount1, lp_params);
  } else {
    const lp_params = Transfer.toAmount((lp / 0.99).toFixed(lpDec), lpDec);
    await FarmingImplV2.unStakeV3(lp_params, amount0, amount1);
  }
}

async function handleStake() {
  if (!tokenForm[props.firstToken].stakeSize * 1 || !tokenForm[props.secondToken].stakeSize * 1) {
    Message.warning("Please enter a valid value");
    return;
  }

  try {
    state.loading.stakeLoading = true;

    if (!props.isBsc) {
      await handleStakeV3();
    } else {
      await handleStakeV2();
    }

    tokenForm[props.firstToken].stakeSize = "";
    tokenForm[props.secondToken].stakeSize = "";

    emit("success");
    setTimeout(() => {
      emit("close");
    }, 1000);
  } catch (error) {
    console.error(error);
    handleRpcError(error.error);
  } finally {
    state.loading.stakeLoading = false;
  }
}
</script>

<style lang="scss" scoped src="./dialog-stake.scss"></style>
