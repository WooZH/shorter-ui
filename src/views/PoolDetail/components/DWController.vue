<template>
  <div class="panel-container">
    <div class="panel">
      <shorterSkeleton v-if="loading" animated style="padding-top: 12px">
        <template #template>
          <shorterSkeletonItem style="height: 24px; width: 160px" />
          <shorterSkeletonItem style="height: 40px; margin-top: 16px" />
          <shorterSkeletonItem style="height: 24px; width: 180px; margin-top: 14px" />
          <shorterSkeletonItem style="margin-top: 24px; height: 40px" />
        </template>
      </shorterSkeleton>

      <template v-else>
        <div class="tabs">
          <div v-if="state.depositAvailable" :class="{ active: state.curTab === 0 }">
            <span @click="state.curTab = 0">Deposit</span>
          </div>
          <div :class="{ active: state.curTab === 1 }">
            <span @click="state.curTab = 1">Withdraw</span>
          </div>
        </div>

        <div
          class="tab-content"
          :class="[
            {
              disabled:
                (info.poolInfo.stateFlag != 1 && info.poolInfo.stateFlag != 4) ||
                (legacy > 0 && info.poolInfo.stateFlag == 1),
            },
          ]"
        >
          <form v-show="state.curTab === 0" class="form" @submit.prevent>
            <div class="form-group">
              <div class="form-control" :class="[{ active: state.inputFocused }, { error: depositDisabled }]">
                <Image circle :src="info.token ? info.token.logoURI : ''" style="width: 32px; height: 32px" />
                <input
                  v-model="state.depositVal"
                  v-number-only
                  type="text"
                  placeholder="0"
                  :readonly="btnStatus.depositLoading"
                  :disabled="!wallet.isConnected"
                  @focus="state.inputFocused = true"
                  @blur="state.inputFocused = false"
                  @input="checkDepositApprove"
                />
                <span v-if="wallet.isConnected" class="suffix" @click="toMax">MAX</span>
                <div v-if="state.depositVal" class="extra">
                  ~ ${{ toAmount(trader.tokenPrice * 1 * state.depositVal) }}
                </div>
              </div>

              <p class="addition">
                <small>Wallet Balance</small>
                <span v-if="wallet.isConnected">
                  {{ toQuantity(trader.tokenBalance, trader.tokenPrice) || 0 }} {{ info.poolInfo.tokenName }}
                </span>
                <span v-else>-</span>
              </p>
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
              v-else-if="!btnStatus.depositApprove"
              type="primary"
              :loading="btnStatus.depositLoading"
              :disabled="depositDisabled"
              class="btn-submit big"
              @click="onDeposit"
            >
              {{ depositDisabledText }}
            </shorterButton>

            <shorterButton
              v-else
              class="btn-submit big"
              :loading="btnStatus.depositLoading"
              type="primary"
              @click="onDepositApprove"
            >
              Approve {{ info.poolInfo.tokenName }}
            </shorterButton>
          </form>

          <form v-show="state.curTab === 1" class="form withdraw" @submit.prevent>
            <div v-if="!isLegacyLeftover" class="form-group">
              <div class="form-control" :class="[{ active: state.inputFocused }, { error: withdrawDisabled }]">
                <Image circle :src="info.token ? info.token.logoURI : ''" style="width: 32px; height: 32px" />
                <input
                  v-model="state.withdrawVal"
                  v-number-only
                  type="text"
                  placeholder="0"
                  :readonly="btnStatus.withdrawLoading"
                  :disabled="!wallet.isConnected"
                  @focus="state.inputFocused = true"
                  @blur="state.inputFocused = false"
                  @input="checkWithdrawApprove"
                />
                <span v-if="wallet.isConnected" class="suffix" @click="toMax">MAX</span>
                <div v-if="state.withdrawVal" class="extra">
                  ~ ${{ toAmount(trader.tokenPrice * 1 * state.withdrawVal) || 0 }}
                </div>
              </div>
              <p class="addition">
                <small>Current Providing</small>
                <span v-if="wallet.isConnected">
                  <span v-if="personalWithdraw !== info.userInfoByPool?.amount">
                    {{ toQuantity(personalWithdraw, trader.tokenPrice) || 0 }}/
                  </span>
                  <span>
                    {{ toQuantity(info.userInfoByPool?.amount || 0, trader.tokenPrice) || 0 }}
                    {{ info.poolInfo.tokenName }}
                  </span>
                </span>
                <span v-else>-</span>
              </p>
            </div>

            <div v-else class="form-group legacy">
              <div class="slider-container">
                <ShorterSlider
                  v-model="state.withdrawProgress"
                  color="#ef7f45"
                  handle-scale="2.5"
                  always-show-handle
                  track-color="#F1F6F8"
                  tooltip-color="#303133"
                  tooltip-text-color="#ffffff"
                  tooltip
                  :tooltip-text="'%v%'"
                />
                <div class="slider-marks">
                  <div class="slider-marks-text">0%</div>
                  <div class="slider-marks-text">30%</div>
                  <div class="slider-marks-text">60%</div>
                  <div class="slider-marks-text">100%</div>
                </div>
              </div>
              <ul class="info-group">
                <li>
                  <span>{{ info.poolInfo.tokenName }}:</span>
                  <small>
                    {{ toQuantity(withdrawAmount, trader.tokenPrice) }} / ${{
                      toAmount(withdrawAmount * trader.tokenPrice)
                    }}
                  </small>
                </li>
                <li>
                  <span>{{ getContractAddress().usdToken }}:</span>
                  <small>{{ toAmount(withdrawBusd) }} / ${{ toAmount(withdrawBusd) }}</small>
                </li>
              </ul>
            </div>
            <shorterButton
              v-if="!wallet.isConnected"
              class="btn-submit big"
              type="primary"
              plain
              @click="wallet.visible = true"
            >
              Unlock wallet
            </shorterButton>
            <shorterButton
              v-else-if="!btnStatus.withdrawApprove"
              type="primary"
              :loading="btnStatus.withdrawLoading"
              class="btn-submit big"
              :disabled="withdrawDisabled"
              @click="onDealWithdraw"
            >
              {{ withdrawDisabledText }}
            </shorterButton>
            <shorterButton
              v-else
              class="btn-submit big"
              :loading="btnStatus.withdrawLoading"
              type="primary"
              @click="onWithdrawApprove"
            >
              Approve str{{ info.poolInfo.tokenName }}
            </shorterButton>
          </form>
          <div v-show="state.curTab === 1" class="blur-cover">
            <div class="content">
              <svg class="shorter-icon" aria-hidden="true">
                <use xlink:href="#icon-warning-tip" />
              </svg>
              <p>
                <template v-if="!info.canWithdraw">
                  Withdrawal is temporarily prohibited as some positions are legacy. This means all providers could take
                  back the assets and legacy portionally when this pool is ended.
                </template>
                <template v-else>Withdrawal is temporarily prohibited while pool is under liquidation.</template>
              </p>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import slider from "vue3-slider";

export default {
  components: {
    ShorterSlider: slider,
  },
};
</script>

<script setup>
import { reactive, watchEffect, computed, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";

import * as Erc20Action from "@/contract/erc20";
import * as StrPoolAction from "@/contract/strPool";
import { getContractAddress } from "@/contract";

import { useWallet } from "@/hooks/useWallet";
import { usePoolDetail } from "@/hooks/usePoolDetail";
import { useTrader } from "@/hooks/useTrader";
import { Message } from "@/hooks/useMessage";

import { toAmount, toQuantity, dealDecimals } from "@/utils/format";
import { handleRpcError } from "@/utils/handleError";
import { bigNumCompare } from "@/utils/number";
import * as Transfer from "@/utils/transfer";

const props = defineProps({
  info: {
    type: Object,
    default: () => {},
  },
  legacy: {
    type: Number,
    default: 0,
  },
  loading: {
    type: Boolean,
    default: true,
  },
});
const emit = defineEmits(["deal"]);

const route = useRoute();

const { account, wallet, chain } = useWallet();
const { fetchPoolInfo } = usePoolDetail();
const { trader, fetchTokenPriceAndBalance } = useTrader();

const state = reactive({
  curTab: 0,
  inputFocused: false,
  depositVal: "",
  withdrawVal: "",
  depositAvailable: computed(() => {
    if ([2, 3, 4].includes(props.info.poolInfo.stateFlag * 1)) {
      state.curTab = 1;
      return false;
    }
    return true;
  }),
  withdrawProgress: 0,
  progress: {
    stable: 0,
    staked: 0,
  },
});

const btnStatus = reactive({
  depositApprove: false,
  withdrawLoading: false,
  depositLoading: false,
  withdrawApprove: false,
});

const isLegacyLeftover = computed(() => {
  return props.info.poolInfo.isLegacyLeftover;
});

const withdrawAmount = computed(() => {
  // if (props.info.withdrawStaked * 1 && state.withdrawProgress * 1) {
  //   return (props.info.withdrawStaked * state.withdrawProgress) / 100;
  // }
  const stakedAmount = state.progress.staked;

  if (stakedAmount && state.withdrawProgress * 1) {
    return (stakedAmount * state.withdrawProgress) / 100;
  }
  return 0;
});

const withdrawBusd = computed(() => {
  const stableAmount = state.progress.stable;
  // if (props.info.withdrawStableAmount > 0) {
  //   let busdAmount = (state.withdrawProgress * 1 * props.info.withdrawStableAmount) / 100;
  if (stableAmount > 0) {
    let busdAmount = (state.withdrawProgress * 1 * stableAmount) / 100;
    return busdAmount;
  }
  return 0;
});

const personalWithdraw = computed(() => {
  let userAmount = 0;
  if (props.info.userInfoByPool && props.info.userInfoByPool.amount) {
    userAmount = props.info.userInfoByPool.amount;
  }
  return userAmount < props.info.poolInfo.currentAmount ? userAmount : props.info.poolInfo.currentAmount;
});

const withdrawDisabled = computed(() => {
  if (isLegacyLeftover.value) {
    if (
      props.info.userInfoByPool?.amount * 1 > 0 &&
      withdrawBusd.value * 1 === 0 &&
      state.withdrawProgress * withdrawAmount.value === 0
    ) {
      return true;
    }
    return false;
  }
  if (state.withdrawVal === "") return false;
  if (state.withdrawVal * 1 === 0) {
    return true;
  }
  const result = bigNumCompare(state.withdrawVal.toString(), personalWithdraw.value.toString());
  if (result > 0) {
    return true;
  }

  let withdrawable = props.info.poolInfo.stakedAmount_big.sub(props.info.poolInfo.borrowedAmount_big);
  withdrawable = Transfer.receiveAmount(withdrawable);
  const resultWithdrawable = bigNumCompare(state.withdrawVal.toString(), withdrawable.toString());
  if (resultWithdrawable > 0 && props.info.poolInfo.stateFlag * 1 !== 4) {
    return true;
  }
  return false;
});

const depositDisabled = computed(() => {
  const result = bigNumCompare(state.depositVal.toString(), trader.tokenBalance.toString());
  if (result > 0) {
    return true;
  } else {
    return false;
  }
});

const depositDisabledText = computed(() => {
  const result = bigNumCompare(state.depositVal.toString(), trader.tokenBalance.toString());
  if (result > 0) {
    return "Insufficient " + props.info.poolInfo.tokenName;
  }
  return "Deposit " + props.info.poolInfo.tokenName;
});

const withdrawDisabledText = computed(() => {
  if (props.info.poolInfo.stateFlag * 1 === 4) {
    return "Withdraw " + props.info.poolInfo.tokenName;
  }
  const result = bigNumCompare(state.withdrawVal.toString(), personalWithdraw.value.toString());

  if (result > 0) {
    return "Insufficient " + props.info.poolInfo.tokenName;
  }
  let withdrawable = props.info.poolInfo.stakedAmount_big.sub(props.info.poolInfo.borrowedAmount_big);
  withdrawable = Transfer.receiveAmount(withdrawable);
  const resultWithdrawable = bigNumCompare(state.withdrawVal.toString(), withdrawable.toString());
  if (resultWithdrawable > 0) {
    return "Insufficient " + props.info.poolInfo.tokenName;
  }
  return "Withdraw " + props.info.poolInfo.tokenName;
});

watchEffect(() => {
  if (props.info.poolInfo?.tokenAddress && account.value) {
    fetchTokenPriceAndBalance(props.info.poolInfo.tokenAddress, props.info.poolInfo.decimals);
    if (account.value && chain.id) {
      fetchDepositAllowance();
      fetchWithdrawAllowance();
    }
  }
});

watchEffect(async () => {
  if (props.info.poolInfo.stateFlag == 4 && isLegacyLeftover.value) {
    if (account.value && chain.id) {
      const allWithdrawal = await StrPoolAction.getWithdrawableAmountByPercent(
        account.value,
        props.info.poolInfo.sTokenAddress,
        100,
      );
      state.progress.stable = allWithdrawal.stableTokenAmount;
      state.progress.staked = allWithdrawal.withdrawAmount;
    }
  }
});

onBeforeUnmount(() => {});

/**
 * 获取提币额度
 */
async function fetchWithdrawAllowance() {
  try {
    let withdrawAllowanceOf = await StrPoolAction.allowance(props.info.poolInfo.sTokenAddress, account.value);
    // 如果查询额度为零 需要授权
    if (withdrawAllowanceOf * 1 === 0) {
      btnStatus.withdrawApprove = true;
    }
    state.withdrawAllowanceOf = withdrawAllowanceOf * 1;
  } catch (error) {
    console.log(error, "fetchWithdrawAllowance");
  }
}
/**
 * 获取存币额度
 */
async function fetchDepositAllowance() {
  try {
    let depositAllowanceOf = 0;
    // eth在eth链上存币不需要授权
    if (props.info.poolInfo.tokenAddress === getContractAddress().chainTokenAddress) {
      const MAX_ALLOWANCE = parseInt("ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", 16);
      depositAllowanceOf = MAX_ALLOWANCE;
    } else {
      depositAllowanceOf = await StrPoolAction.allowance(props.info.poolInfo.tokenAddress, account.value);
    }

    if (depositAllowanceOf * 1 === 0) {
      btnStatus.depositApprove = true;
    }
    state.depositAllowanceOf = depositAllowanceOf * 1;
  } catch (error) {
    console.log(error, "fetchDepositAllowance");
  }
}

function checkDepositApprove() {
  // state.inputFocused = false;
  // state.depositVal = state.depositVal.match(/^\d+\.?\d{0,18}/);
  // console.log("%%", state.depositVal);
  if (depositDisabled.value) return;
  if (state.depositVal * 1 > state.depositAllowanceOf) {
    btnStatus.depositApprove = true;
  } else {
    btnStatus.depositApprove = false;
  }
}

function checkWithdrawApprove() {
  // state.inputFocused = false;
  if (withdrawDisabled.value) return;
  if (state.withdrawVal * 1 > state.withdrawAllowanceOf) {
    btnStatus.withdrawApprove = true;
  } else {
    btnStatus.withdrawApprove = false;
  }
}

/**
 * @description: 出现遗产按照百分比提现
 * @param {*}
 * @return {*}
 *
 */
const onPercentWithdraw = async () => {
  btnStatus.withdrawLoading = true;
  try {
    await StrPoolAction.withdraw(
      props.info.poolInfo.sTokenAddress,
      state.withdrawProgress,
      props.info.poolInfo.decimals,
      false,
    );
    state.withdrawProgress = 0;
    await fetchPoolInfo(route.params.id);
    emit("deal");
  } catch (error) {
    handleRpcError(error);
  } finally {
    btnStatus.withdrawLoading = false;
  }
};

/**
 * @description: 处理按照那种方式提现(1-输入提币金额提现, 2-按照提币进度提现)
 * @param {*}
 * @return {*}
 */

const onDealWithdraw = async () => {
  if (props.info.poolInfo.isLegacyLeftover * 1 > 0) {
    onPercentWithdraw();
  } else {
    onWithdraw();
  }
};

/**
 * @description: 提现
 * @param {*}
 * @return {*}
 */
const onWithdraw = async () => {
  state.withdrawVal = dealDecimals(state.withdrawVal, props.info.poolInfo.decimals);
  if (!state.withdrawVal * 1) {
    Message.warning("Please enter a valid value");
    return;
  }

  if (state.withdrawVal * 1 > state.withdrawAllowanceOf) {
    btnStatus.withdrawApprove = true;
    return;
  }

  btnStatus.withdrawLoading = true;

  try {
    await StrPoolAction.withdraw(
      props.info.poolInfo.sTokenAddress,
      state.withdrawVal,
      props.info.poolInfo.decimals,
      true,
    );
    state.withdrawVal = "";
    delete localStorage.pool_activity_logs;
    // 取款后再次获取池子信息
    emit("deal");
  } catch (error) {
    handleRpcError(error);
  } finally {
    btnStatus.withdrawLoading = false;
  }
};

/**
 * @description: 存币
 * @param {*}
 * @return {*}
 */
const onDeposit = async () => {
  console.log(account.value, "account");

  state.depositVal = dealDecimals(state.depositVal, props.info.poolInfo.decimals);
  if (!state.depositVal * 1) {
    Message.warning("Please enter a valid value");
    return;
  }

  btnStatus.depositLoading = true;
  try {
    // await PoolGuardianAction.deposit(
    //   route.params.id,
    //   props.info.poolInfo.decimals,
    //   state.depositVal
    // );
    // 更换存币合约接口
    // update abi by shaun 0401
    let special = false;
    if (props.info.poolInfo.tokenAddress === getContractAddress().chainTokenAddress) special = true;
    await StrPoolAction.deposit(
      state.depositVal,
      props.info.poolInfo.decimals,
      props.info.poolInfo.sTokenAddress,
      special,
    );
    state.depositVal = "";
    delete localStorage.pool_activity_logs;
    btnStatus.depositLoading = false;
    emit("deal");
  } catch (error) {
    handleRpcError(error);
  } finally {
    btnStatus.depositLoading = false;
  }
};

// 取最大值 shortcut
const toMax = () => {
  if (state.curTab * 1 === 0) {
    console.log("trader.tokenBalance", trader.tokenBalance);
    state.depositVal = trader.tokenBalance;
  }
  if (state.curTab * 1 === 1) {
    state.withdrawVal = personalWithdraw.value;
  }
};

/**
 * @description: 存币前授权
 * @param {*}
 * @return {*}
 */

const onDepositApprove = async () => {
  btnStatus.depositLoading = true;
  try {
    await Erc20Action.approve(props.info.poolInfo.tokenAddress, account.value);
    // fetchAllowance()
    fetchDepositAllowance();
    btnStatus.depositApprove = false;
  } catch (error) {
    handleRpcError(error);
  } finally {
    btnStatus.depositLoading = false;
  }
};

/**
 * @description: 提现前授权
 * @param {*}
 * @return {*}
 */
// 提币授权
const onWithdrawApprove = async () => {
  btnStatus.withdrawLoading = true;
  try {
    // await PieTokenAction.approve(
    //   props.info.poolInfo.sTokenAddress,
    //   account.value
    // );
    // fetchAllowance()
    // update abi shaun 0401
    await Erc20Action.approve(props.info.poolInfo.sTokenAddress, account.value);
    // 授权后更新授权额度 contract.getPriceImpact
    fetchWithdrawAllowance();
    btnStatus.withdrawApprove = false;
  } catch (error) {
    handleRpcError(error);
    console.error(error.message);
  } finally {
    btnStatus.withdrawLoading = false;
  }
};
</script>

<style lang="scss" scoped src="./form-control.scss"></style>
<style lang="scss" scoped>
.panel {
  height: 292px;
}
.tabs {
  @include flex;
  margin-left: -24px;
  height: 16px;
  div {
    @include flex-center;
    color: #bcbcbc;
    padding: 0 24px;
    font-family: $caption;
    font-size: 16px;
    font-weight: 600;
    &:nth-child(2) {
      border-left: 1px solid #ebebeb;
    }
    &:hover {
      color: #333;
    }
    &.active {
      color: #333;
      font-size: 18px;
      font-weight: 600;
    }
    span {
      cursor: pointer;
    }
  }
}

.form-group.legacy {
  .info-group {
    margin-top: 28px;
    li {
      @include flex;
      font-size: 12px;
      justify-content: space-between;
      &:first-child {
        margin-bottom: 3px;
      }
      span {
        color: #a4a5b2;
        font-weight: 600;
      }
    }
  }
}

.blur-cover {
  @include flex-center;
  visibility: hidden;
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  padding: 0 10%;
  .content {
    justify-content: center;
    @include flex;
    color: $primary;
    p {
      width: 100%;
      margin-left: 10px;
    }
  }
}

.tab-content {
  padding-top: 24px;
  &.disabled {
    position: relative;
    .cover {
      visibility: unset;
    }
    .withdraw {
      position: relative;
      opacity: 0.5;
      filter: blur(3px);
    }
    .blur-cover {
      visibility: unset;
    }
  }
}
.btn-submit {
  margin-top: 32px;
}
.slider-marks {
  display: flex;
  justify-content: space-between;
  color: rgb(144, 147, 153);
  font-size: 12px;
  margin-top: 18px;
}
</style>
