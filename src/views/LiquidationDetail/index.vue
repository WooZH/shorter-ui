<template>
  <Layout back="Liquidations">
    <template #title>
      <div class="title">
        <strong>Liquidation Detail</strong>
        <div
          v-if="!state.loading.fetchLiquidationDetail && state.liquidationDetail.state"
          :class="['state', `state-${state.liquidationDetail.state}`]"
        >
          {{ getStateText(state.liquidationDetail.state) }}
        </div>
      </div>
    </template>
    <div class="panel-group">
      <div class="lt">
        <LiquidationInfo
          :liquidation-detail="state.liquidationDetail"
          :loading="state.loading.fetchLiquidationDetail"
          :token-price="state.tokenPrice"
          :phase="state.phase"
          :end-time="state.endTime"
        />

        <LegacyBidList
          v-if="state.liquidationDetail.overdrawnBlock > 0"
          :liquidation-detail="state.liquidationDetail"
          :loading="state.loading.fetchLiquidationDetail"
        />

        <template v-else>
          <Phase-2
            v-if="showPhase2"
            :liquidation-detail="state.liquidationDetail"
            :loading="state.loading.fetchLiquidationDetail"
            :token-price="state.tokenPrice"
            :phase="state.phase"
            :end-time="state.endTime"
            @katana="userBidPhase2"
            @rulerCheck="dialogsVisible.rulerCheck = true"
          />
          <Phase-1
            :liquidation-detail="state.liquidationDetail"
            :loading="state.loading.fetchLiquidationDetail"
            :phase="state.phase"
          />
        </template>
      </div>

      <div class="rt">
        <Activities
          v-if="state.liquidationDetail.state === 2 || state.liquidationDetail.state === 4"
          :liquidation-detail="state.liquidationDetail"
          :state="state.liquidationDetail.state"
          :phase="state.phase"
        />
        <Participation
          v-if="state.liquidationDetail.state === 2 && state.phase === 1"
          :liquidation-detail="state.liquidationDetail"
          :loading="state.loading.fetchLiquidationDetail"
          :token-price="state.tokenPrice"
          :phase="state.phase"
          @tanto="userBidPhase1"
          @rulerCheck="dialogsVisible.rulerCheck = true"
        />
        <GetUSD
          v-if="state.liquidationDetail.state === 4"
          :liquidation-detail="state.liquidationDetail"
          :token-price="state.tokenPrice"
          :phase="state.phase"
          @naginata="userBid"
          @rulerCheck="dialogsVisible.rulerCheck = true"
        />
        <Residues
          v-if="account.value && (state.liquidationDetail.state === 4 || state.liquidationDetail.state === 8)"
          :position-hash="state.liquidationDetail.hash"
          :pool-info="state.liquidationDetail.poolInfo"
          :token-price="state.tokenPrice"
        />
      </div>
    </div>

    <Dialog v-model="dialogsVisible.overdrawn" :hidden-close="true">
      <DialogOverdrawn
        :aborted="isAborted"
        @close="
          () => {
            dialogsVisible.overdrawn = false;
            refreshLiquidationDetail(true);
          }
        "
      />
    </Dialog>

    <Dialog v-model="dialogsVisible.rulerCheck" :hidden-close="true">
      <DialogRulerCheck :type="liqState !== 8" @close="dialogsVisible.rulerCheck = false">
        <p class="earned">
          Rulers earned about
          <SmartNumber type="amount" :value="totalEarned" />
          in this liquidation.
        </p>
      </DialogRulerCheck>
    </Dialog>
  </Layout>
</template>

<script setup>
import { onBeforeMount, provide, reactive, ref, watch, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import NP from "number-precision";
import { ethers } from "ethers";

import * as TradingHub from "@/contract/tradingHub";
import * as PriceOracle from "@/contract/priceOracle";

import * as activityAction from "@/api/activities";
import { getCurBlockNumber } from "@/utils/block";
import * as Transfer from "@/utils/transfer";
import { blockToTime } from "@/utils/format";

import { getContractAddress } from "@/contract";
import { PHASE1_MAX_BLOCKS, PHASE2_MAX_BLOCKS } from "@/contract/auctionHall";

import LiquidationInfo from "./components/LiquidationInfo.vue";
import Phase1 from "./components/Phase_1.vue";
import Phase2 from "./components/Phase_2.vue";
import LegacyBidList from "./components/LegacyBidList.vue";
import Residues from "./components/Residues.vue";
import Participation from "./components/Participation.vue";
import GetUSD from "./components/GetUSD.vue";
import Activities from "./components/Activities.vue";
import DialogOverdrawn from "./components/DialogOverdrawn.vue";
import DialogRulerCheck from "./components/DialogRulerCheck.vue";

import { useWallet } from "@/hooks/useWallet";
import { useInterval } from "@/hooks/useInterval";

const route = useRoute();
const router = useRouter();
const { account, wallet, chain } = useWallet();
const { addNormalPriorityInterval, clearTimerInterval } = useInterval();

const state = reactive({
  positionHash: route.params.id,
  liquidationDetail: {
    tokenInfo: {},
    phase1Info: {},
    phase2Info: {},
  },
  phase: 0,
  tokenPrice: 0,
  endTime: "",
  loading: {
    fetchTokenPrice: false,
    fetchLiquidationDetail: true,
  },
});

const liqState = ref(1);
const dialogsVisible = reactive({
  overdrawn: false,
  rulerCheck: false,
});

const prevState = ref(null);

const events = reactive({});
const curPhase1TotalBid = ref(0);

provide("events", events);
provide("curPhase1TotalBid", curPhase1TotalBid);
provide(
  "refreshLiquidationDetail",
  (() => {
    const hash = state.positionHash;
    return withLoading => {
      getLiquidationDetail(hash, withLoading);
    };
  })(),
);

keepWatchingState(state.positionHash);

const isAborted = computed(() => {
  const aborted =
    state.liquidationDetail.overdrawnBlock >
    state.liquidationDetail.closingBlock + PHASE1_MAX_BLOCKS + PHASE2_MAX_BLOCKS;
  return aborted;
});

const showPhase2 = computed(() => {
  const liquiDetail = state.liquidationDetail;
  const phase1Info = liquiDetail.phase1Info;
  return (
    phase1Info &&
    phase1Info.flag === false &&
    curPhase1TotalBid.value < liquiDetail.totalSize &&
    (state.phase === 2 || liquiDetail.state == 8)
  );
});

watch(
  () => chain.id,
  (newChain, oldChain) => {
    if (newChain && oldChain && oldChain !== newChain)
      router.push({
        name: "Liquidations",
        query: route.query,
      });
  },
);

const totalEarned = ref(0);

function checkRuler() {
  if (wallet.isConnected && account.value) {
    if (_.isBoolean(account.isRuler) && account.isRuler === false) {
      dialogsVisible.rulerCheck = true;
    } else {
      dialogsVisible.rulerCheck = false;
    }
  }
}

onBeforeMount(async () => {
  getLiquidationDetail(state.positionHash, true);
});

async function userBid(value) {
  let params = {
    op_type: "Ordered",
    tx_hash: value.transactionHash,
    position_address: state.positionHash,
    account_address: value.from,
    bid_size: value.bid_size,
    estimate_rewards: value.estimate_rewards,
    user_type: "naginata",
  };
  await activityAction.userCommit(params);
}

async function userBidPhase1(value) {
  let params = {
    op_type: "Ordered",
    tx_hash: value.transactionHash,
    position_address: state.positionHash,
    account_address: value.from,
    user_type: "tanto",
  };
  await activityAction.userCommit(params);
}

async function userBidPhase2(value) {
  let params = {
    op_type: "Ordered",
    tx_hash: value.transactionHash,
    position_address: state.positionHash,
    account_address: value.from,
    user_type: "katana",
  };
  await activityAction.userCommit(params);
}

async function getLiquidationDetail(hash, withLoading = false) {
  try {
    state.loading.fetchLiquidationDetail = withLoading;
    const { positionDetail, phase } = await getPositionDetail(hash, withLoading);

    if (state.liquidationDetail.tokenInfo.address === getContractAddress().chainTokenAddress) {
      state.liquidationDetail.tokenInfo.symbol = getContractAddress().chainTokenSymbol;
    }

    state.liquidationDetail = positionDetail;
    state.phase = phase;
    state.tokenPrice = await getTokenPrice(positionDetail.tokenInfo.address);
    state.endTime = await getEndTime(positionDetail, phase);
    state.liquidationDetail.debtSize = getLiquidationDebtSize(positionDetail, phase);
  } catch (error) {
    console.log("liqudation detail", error);
  } finally {
    state.loading.fetchLiquidationDetail = false;
  }
}

async function getPositionDetail(hash) {
  try {
    const positionDetail = await TradingHub.getPositionDetail(hash);
    const phase = await getLiquidationPhase(positionDetail);

    return {
      positionDetail,
      phase,
    };
  } catch (error) {
    console.log("liquidationDetail positionDetail error", error);
  }
}

async function getTokenPrice(tokenAddress) {
  try {
    state.loading.fetchTokenPrice = true;
    const res = await PriceOracle.getFeedPrice(tokenAddress);
    return res?.price;
  } finally {
    state.loading.fetchTokenPrice = false;
  }
}

async function getLiquidationPhase(positionDetail) {
  const { closingBlock, state, phase1Info } = positionDetail || {};
  const curBlock = await getCurBlockNumber();
  const duration = Math.abs(NP.minus(curBlock, closingBlock));

  let phase = 0;

  if (state != 2) {
    return phase;
  }

  if (duration < PHASE1_MAX_BLOCKS) {
    //phase 1
    phase = 1;
  } else if (duration < PHASE1_MAX_BLOCKS + PHASE2_MAX_BLOCKS && phase1Info.flag === false) {
    //phase 2
    phase = 2;
  }

  return phase;
}

function getLiquidationDebtSize(liquidationDetail, phase) {
  const { totalSize, state, phase1Info, phase2Info, legacyInfo, tokenInfo } = liquidationDetail || {};
  const totalSize_big = liquidationDetail.totalSize_big;
  const legacyBidSize_big = legacyInfo.bidSize_big;
  liqState.value = state;

  checkRuler();

  if (state === 2) {
    if (phase === 1) {
      return Transfer.receiveAmount(totalSize_big);
    } else if (phase === 2) {
      return Transfer.receiveAmount(totalSize_big.sub(phase1Info.bidSize_big));
    }

    //错误情况
    return Transfer.receiveAmount(totalSize_big.sub(phase1Info.bidSize_big));
  }

  if (state === 4) {
    const debtSize = ethers.utils.formatUnits(legacyBidSize_big, tokenInfo.decimals);
    return debtSize;
  }

  if (state === 8) {
    calcLiquidationEarnedTotal(phase1Info, phase2Info, legacyInfo);
    if (phase1Info.flag) {
      return Math.max(NP.minus(totalSize, phase1Info.bidSize), 0);
    } else if (phase2Info.flag) {
      return Math.max(NP.minus(totalSize, NP(phase1Info.bidSize, phase2Info.debtSize)), 0);
    } else {
      const debtSize = ethers.utils.formatUnits(totalSize_big, tokenInfo.decimals);
      if (debtSize === "0.0") return 0;
      return debtSize;
    }
  }

  return 0;
}

function calcLiquidationEarnedTotal(phase1, phase2, legacy) {
  const phase1earned = phase1.liquidationPrice * phase1.bidSize * 0.02;
  const phase2earned = phase2.usedCash * 0.01;
  const legacyEarned = legacy.usedCash * 0.02;
  totalEarned.value = phase1earned + phase2earned + legacyEarned;
  if (totalEarned.value === 0) {
    dialogsVisible.rulerCheck = false;
  }
}

async function getEndTime(positionDetail, phase) {
  const { closingBlock, closedBlock, state } = positionDetail || {};

  if (state === 2) {
    let endBlock = closingBlock + PHASE1_MAX_BLOCKS;
    if (phase === 2) {
      endBlock += PHASE2_MAX_BLOCKS;
    }
    return await blockToTime(endBlock, "MMM DD, YYYY HH:mm:ss");
  }

  if (state === 8) {
    return await blockToTime(closedBlock, "MMM DD, YYYY HH:mm:ss");
  }
}

function getStateText(state) {
  const maps = new Map(
    Object.entries({
      1: "Open",
      2: "Closing",
      4: "Legacy",
      8: "Finished",
    }),
  );
  return maps.get(state.toString());
}

async function keepWatchingState(hash) {
  try {
    const { positionState: curState } = await TradingHub.getPositionStrToken(hash);

    if (prevState.value === null) {
      prevState.value = curState;
    }

    if (prevState.value === 8 || curState === 8) {
      clearTimerInterval();
      return;
    }

    if (prevState.value === 2 && curState === 4) {
      dialogsVisible.overdrawn = true;
      addTimerInterval();
    }
  } catch (error) {
    console.log({ ...error }, "liqState");
  }
}

function addTimerInterval() {
  const cb = async () => {
    const tokenInfo = state.liquidationDetail;
    if (tokenInfo && tokenInfo.address) {
      state.tokenPrice = await getTokenPrice(state.liquidationDetail.tokenInfo.address);
    }
  };

  addNormalPriorityInterval(cb);
}
</script>

<style lang="scss" scoped>
.title {
  @include flex-center-v;
  font-size: 32px;

  strong {
    font-family: Haas Grot Disp;
    font-weight: 600;
  }

  .state {
    @include flex-center;
    height: 24px;
    padding: 0 10px;
    margin-left: 20px;
    border-radius: 8px;
    border: 2px solid transparent;
    font-weight: 600;
    font-size: 14px;
    transform: translateY(1px);
    color: #a4a5b2;
    background: rgba(#999, 0.1);
    &.state-4 {
      color: #c4722d;
      background: rgba(#c4722d, 0.1);
    }
    &.state-2 {
      color: #36b1ff;
      background: rgba(#36b1ff, 0.1);
    }
  }
}

.panel-group {
  @include flex;
  margin: -16px;

  > .lt {
    flex: 2.3;
    min-width: 760px;
  }

  > .rt {
    flex: 1;
    min-width: 306px;
  }
}

.earned {
  font-size: 16px;
  line-height: 24px;
  margin-bottom: 30px;
  word-break: keep-all;
  span {
    color: $primary;
  }
  b {
    color: #333;
    font-weight: 600;
  }
}
</style>
