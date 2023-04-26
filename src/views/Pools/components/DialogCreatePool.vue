<template>
  <div class="dialog-create-pool">
    <div v-if="!state.selectMode">
      <div class="title strong">Create a Token Loaning Pool</div>
      <form class="form" @submit.prevent>
        <div class="form-group">
          <label>Market</label>
          <div class="form-control" @click="state.selectMode = true">
            <div v-if="form.asset.symbol" class="select">
              <Image class="coin-icon" :src="form.asset.logoURI" />
              <span>{{ form.asset.symbol }}</span>
            </div>
            <div v-else class="select placeholder">Select a token</div>
            <div class="suffix" />
          </div>
        </div>
        <div class="form-group">
          <label>
            <span>Leverage</span>
          </label>
          <ul class="select-inline">
            <li
              v-for="leverage in leverageGears"
              :key="leverage"
              class="select-item leverage"
              :class="{
                active: form.maxLeverage === leverage,
                'leverage-disabled': leverage === 10 && form.asset?.rating !== 1 && form.asset?.rating !== 2,
              }"
              @click="
                () => {
                  form.maxLeverage = leverage;
                }
              "
            >
              {{ leverage }}×
            </li>
          </ul>
        </div>

        <div class="form-group">
          <label>Days to Expiration</label>
          <ul class="select-inline">
            <li
              v-for="(liquidateTime, index) in ['5 Days', '2 Weeks', '1 Month']"
              :key="liquidateTime"
              class="select-item"
              :class="{ active: state.liquidateTimeType === index + 1 }"
              @click="state.liquidateTimeType = index + 1"
            >
              {{ liquidateTime }}
            </li>
            <li
              class="select-item"
              :class="{ active: state.liquidateTimeType === 4 }"
              @click="state.liquidateTimeType = 4"
            >
              Other
            </li>
          </ul>

          <div v-if="state.liquidateTimeType === 4" class="form-control time-select">
            <v-select
              v-model="state.timeInterval"
              class="in-block"
              style="width: 120px"
              :searchable="false"
              label="text"
              :reduce="item => item.value"
              :options="timeIntervals"
            />
            <input v-model="form.input" v-number-only placeholder="0" type="text" @input="handleInput" />
          </div>
        </div>
        <div v-if="wallet.isConnected" class="notice">
          This will cost you
          <strong>10,000</strong>
          IPISTR
        </div>
        <shorterButton
          v-if="wallet.isConnected && !loading.approve"
          type="primary"
          :disabled="disabledCreateBtn"
          class="full big"
          :loading="loading.createPool"
          @click="onSubmit"
        >
          Submit a proposal
        </shorterButton>
        <shorterButton
          v-if="wallet.isConnected && loading.approve"
          type="primary"
          class="full big"
          :loading="loading.waitApprove"
          @click="onApprove"
        >
          Approve IPISTR
        </shorterButton>
        <shorterButton v-if="!wallet.isConnected" type="primary" class="full big" @click="wallet.visible = true">
          Unlock wallet
        </shorterButton>
      </form>
    </div>
    <TokenList v-if="state.selectMode" @select="getSelectToken" @back="state.selectMode = false" />
  </div>
</template>

<script setup>
import { reactive, computed, watchEffect, onMounted } from "vue";
import TokenList from "./TokenList.vue";
import * as CommitteeAction from "@/contract/committee";

import { Message } from "@/hooks/useMessage";
import { useWallet } from "@/hooks/useWallet";
import * as IpistrAction from "@/contract/ipistr";
import { useBalance } from "@/hooks/useBalance";
import { handleRpcError } from "@/utils/handleError";
import { getContractAddress } from "@/contract";

const props = defineProps({
  token: {
    type: Object,
    default: () => {},
  },
});
const emit = defineEmits(["close"]);

const { wallet, account } = useWallet();
const { balance, fetchBalance } = useBalance();

const state = reactive({
  liquidateTimeType: 1,
  timeInterval: 1,
  selectMode: false,
});

const form = reactive({
  maxLeverage: 1,
  input: "",
  asset: {},
});

const loading = reactive({
  createPool: false,
  approve: false,
  waitApprove: false,
});

const leverageGears = [1, 2, 5, 10];
const timeIntervals = [
  {
    text: "Day(s)",
    value: 1,
  },
  {
    text: "Week(s)",
    value: 7,
  },
  {
    text: "Month(s)",
    value: 30,
  },
];

const disabledCreateBtn = computed(() => {
  if (!form.asset.address) {
    return true;
  }
  if (state.liquidateTimeType == 4 && !(form.input > 0)) {
    return true;
  }

  return false;
});

onMounted(() => {
  if (props.token) {
    getSelectToken(props.token);
  }
});

watchEffect(async () => {
  form.liquidateTime = getLiquidateTime(state.liquidateTimeType, form.input);
});

function getLiquidateTime(type, val) {
  let result = "";
  if (type == 1) {
    result = 5;
  } else if (type == 2) {
    result = 14;
  } else if (type == 3) {
    result = 30;
  } else if (type == 4) {
    result = Number(val) * state.timeInterval;
  }
  return result;
}

function getSelectToken(asset) {
  form.asset = asset;
  state.selectMode = false;
}

/**
 * @description: 查看是否授权，查询授权限额
 * @param {*} async
 * @return {*}
 */
async function fetchAllowance() {
  let contractAddress = getContractAddress();
  try {
    state.ipistrAllowance = await IpistrAction.allowance(account.value, contractAddress.ShorterBone);
    if (state.ipistrAllowance * 1 < 10000) {
      loading.approve = true;
    }
  } catch (error) {
    console.log(error);
  }
}
fetchAllowance();

/**
 * @description: 开始给社区函数授权平台币的转账额度
 * @param {*} async
 * @return {*}
 */
async function onApprove() {
  loading.waitApprove = true;
  let contractAddress = getContractAddress();
  try {
    await IpistrAction.approve(contractAddress.ShorterBone, account.value);
    fetchAllowance();
    loading.approve = false;
  } catch (error) {
    handleRpcError(error);
  } finally {
    loading.waitApprove = false;
  }
}

/**
 * @description:提交池子创建申请
 * @param {*}
 * @return {*}
 */
async function onSubmit() {
  if (balance.amount * 1 < 10000) {
    Message.warning("Insufficient  IPISTR");
    return;
  }
  if (form.liquidateTime * 1 > 1000) {
    Message.error("Your duration exceeds maximum limit (1000 days).");
    return;
  }

  try {
    loading.createPool = true;
    const params = {
      tokenAddress: form.asset.address,
      maxLeverage: form.maxLeverage,
      durationDays: form.liquidateTime,
      from: account.value,
    };

    const tx = await CommitteeAction.createPoolProposal(params);
    let newProposalId = "";
    let committeeAddress = getContractAddress().Committee;
    if (tx.logs && tx.logs.length > 0) {
      tx.logs.forEach(item => {
        if (item.address === committeeAddress) {
          newProposalId = item.topics[1];
        }
      });
    }
    newProposalId = parseInt(Number(newProposalId));
    const targetUrl = `/governance/proposals/${newProposalId}`;
    Message(`<p> Your token loaning pool creation proposal was submitted. The related
                pool will be available once the proposal is approved.</p>
            <a href=${targetUrl} class="message-link">Check the proposal>></a>`);
    /**
     * * refresh IPISTR balance of
     **/
    fetchBalance();
    emit("close");
  } catch (error) {
    handleRpcError(error);
  } finally {
    loading.createPool = false;
  }
}

function handleInput(e) {
  form.input = e.target.value.replace(/[^\d]/g, "");
}
</script>
<style lang="scss" scoped>
.form-control {
  cursor: pointer;
}

.time-select {
  margin-top: 16px;
}

.dialog-create-pool {
  padding: 32px;
  font-family: Haas Grot Text;

  .title {
    font-size: 18px;
    color: #333;
  }
}

.form {
  margin-top: 48px;
}

.form-group {
  margin-bottom: 30px;

  .select {
    @include flex-center-v;
    flex: 1;
    padding: 0 24px;

    &.placeholder {
      color: #a4a5b2;
    }

    .coin-icon {
      width: 32px;
      height: 32px;
      margin-right: 8px;
      border-radius: 50%;
    }

    span {
      font-weight: 600;
      transform: translateY(2px);
    }
  }

  .select-inline {
    @include flex;

    .select-item {
      @include flex-center;
      flex: 1;
      height: 56px;
      line-height: 56px;
      background: #f8f8f8;
      border-radius: 8px;
      cursor: pointer;
      border: 1px solid transparent;

      &.leverage-disabled {
        pointer-events: none;
        color: #c3bcb9;
        background: #eee9e7;
        cursor: not-allowed;
      }

      // &:hover:not(&.leverage:last-child),
      &.active {
        cursor: pointer;
        border: 1px solid $primary;
        color: $primary;
      }

      input {
        width: 85px;
        height: 40px;
        padding: 0 10px;
        background: #fff;
        border: none;
        outline: none;
        margin-right: 8px;
        text-align: center;
      }
    }

    .select-item:not(:first-child) {
      margin-left: 8px;
    }
  }
}

.notice {
  margin-bottom: 16px;
  color: #a4a5b2;

  strong {
    color: $primary;
  }
}
</style>
