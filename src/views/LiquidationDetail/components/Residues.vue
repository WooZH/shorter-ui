<template>
  <div v-if="state.totalResidues > 0" class="panel-container">
    <header class="panel-header">
      <h4 class="panel-title">My Residues</h4>
    </header>
    <div class="panel">
      <shorterSkeleton
        v-if="loading || state.loading.fetchResidues"
        style="height: 200px; margin-bottom: 40px"
        animated
      >
        <template #template>
          <shorterSkeletonItem v-for="i in 3" :key="i" style="height: 40px; margin-bottom: 30px" />
        </template>
      </shorterSkeleton>
      <main v-else class="residues-list">
        <template v-for="(item, index) in state.myResidues" :key="index">
          <div v-show="item.amount > 0" class="residues-item">
            <div class="lt">
              <Image class="icon" :src="item.logoURI" alt="" />
              {{ item.symbol }}
            </div>
            <span v-if="index === 0">{{ toQuantity(item.amount || 0, balance.price) }}</span>
            <span v-else-if="index === 1">{{ toQuantity(item.amount || 0, tokenPrice) }}</span>
            <span v-else-if="index === 2">{{ formatNum(item.amount || 0, 2, true) }}</span>
          </div>
        </template>
      </main>
      <footer class="footer">
        <span>Total</span>
        <shorterSkeleton v-if="loading" style="width: 30%; height: 22px" animated>
          <template #template>
            <shorterSkeletonItem style="height: 22px" />
          </template>
        </shorterSkeleton>
        <strong v-else>${{ toAmount(state.totalResidues) }}</strong>
      </footer>
      <shorterButton
        class="btn-retrieve"
        type="primary"
        plain
        :loading="state.loading.onRetrieve"
        @click="onRetrieve(positionHash)"
      >
        Retrieve
      </shorterButton>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, watch } from "vue";
import NP from "number-precision";

import * as AuctionHall from "@/contract/auctionHall";
import { getTokenBaseInfo } from "@/contract/shortBone";
import { getContractAddress } from "@/contract";

import { useBalance } from "@/hooks/useBalance";
import { useWallet } from "@/hooks/useWallet";
import { Message } from "@/hooks/useMessage";

import { toQuantity, formatNum, toAmount } from "@/utils/format";
import { handleRpcError } from "@/utils/handleError";
import * as Transfer from "@/utils/transfer";

const props = defineProps({
  positionHash: {
    type: String,
    default: ''
  },
  poolInfo: {
    type: Object,
    default: () => {},
  },
  loading: {
    type: Boolean,
    default: () => false,
  },
  tokenPrice: {
    type: Number,
    default: () => 0,
  },
});

const { balance } = useBalance();
const { account } = useWallet();

const state = reactive({
  loading: {
    onRetrieve: false,
    fetchResidues: false,
  },
  myResidues: [
    {
      address: getContractAddress()["IPISTR"],
      amount: 0,
    },
    {
      address: props.poolInfo.stakedToken,
      amount: 0,
    },
    {
      address: props.poolInfo.stableToken,
      amount: 0,
    },
  ],
  totalResidues: computed(() => {
    let result = 0;
    if (props.tokenPrice == 0 || balance.price == 0) return result;
    const IPISTRValue = NP.times(state.myResidues[0].amount || 0, balance.price);
    const stakedTokenValue = NP.times(state.myResidues[1].amount || 0, props.tokenPrice);
    const stableTokenValue = state.myResidues[2].amount * 1;
    return NP.plus(IPISTRValue, stakedTokenValue, stableTokenValue);
  }),
});

watch(
  () => account.value,
  accountValue => {
    if (accountValue) {
      fetchMyResidues(props.positionHash, accountValue);
    }
  },
  {
    immediate: true,
  },
);

async function fetchMyResidues(hash, accountValue) {
  try {
    state.loading.fetchResidues = true;
    const [tokensInfo, residuesInfo] = await Promise.all([getTokensInfo(), queryResidues(hash, accountValue)]);
    // console.log(residuesInfo,'residuesInfo');
    state.myResidues[0] = { ...tokensInfo[0], ...state.myResidues[0] };
    state.myResidues[1] = { ...tokensInfo[1], ...state.myResidues[1] };
    state.myResidues[2] = { ...tokensInfo[2], ...state.myResidues[2] };
    state.myResidues[0].amount = Transfer.receiveAmount(residuesInfo.priorityFee, tokensInfo[0].decimals); //IPISTR
    state.myResidues[1].amount = Transfer.receiveAmount(residuesInfo.debtTokenSize, tokensInfo[1].decimals); // stakedToken
    state.myResidues[2].amount = Transfer.receiveAmount(residuesInfo.stableTokenSize, tokensInfo[2].decimals); //stableToken
  } catch (error) {
    console.log({ ...error }, "fetchResidues");
  } finally {
    state.loading.fetchResidues = false;
  }
}

async function onRetrieve(hash) {
  if (state.totalResidues.value * 1 === 0) {
    Message.warning("No assets to retrieve back");
    return;
  }

  try {
    state.loading.onRetrieve = true;
    await AuctionHall.retrieveRulerAssets(hash);
    await fetchMyResidues(hash, account.value);
  } catch (error) {
    handleRpcError(error);
  } finally {
    state.loading.onRetrieve = false;
  }
}

async function queryResidues(hash, accountValue) {
  try {
    state.loading.fetchResidues = true;
    const residues = await AuctionHall.queryResidues(hash, accountValue);
    return residues;
  } catch (error) {
    console.log({ ...error }, "queryResidues");
    return Promise.reject(error);
  }
}
async function getTokensInfo() {
  try {
    const addressList = state.myResidues.map(item => item.address);
    const [token0Info, token1Info, token2Info] = await Promise.all([
      getTokenBaseInfo(addressList[0]),
      getTokenBaseInfo(addressList[1]),
      getTokenBaseInfo(addressList[2]),
    ]);
    return [token0Info, token1Info, token2Info];
  } catch (error) {
    console.log({ ...error }, "getTokensInfo");
    return Promise.reject(error);
  }
}
</script>

<style lang="scss" scoped>
.panel-title {
  @include flex-center-v;
  justify-content: space-between;
  // margin-top: -7px;
}
.residues-list {
  margin-bottom: 40px;
  .residues-item {
    @include flex-center-v;
    height: 56px;
    padding: 0 16px;
    margin-bottom: 16px;
    background: #f8f8f8;
    border-radius: 12px;
    .lt {
      @include flex-center-v;
      flex: 1;
      .icon {
        width: 24px;
        height: 24px;
        margin-right: 5px;
        transform: translateY(-1px);
      }
    }
  }
}
.footer {
  @include flex;
  justify-content: space-between;
  font-weight: 600;
  strong {
    font-size: 18px;
  }
}
.btn-retrieve {
  width: 100%;
  height: 56px;
  margin-top: 40px;
  border-radius: 16px;
}
</style>
