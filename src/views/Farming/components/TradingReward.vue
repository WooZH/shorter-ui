<template>
  <div class="panel-container info-group">
    <header class="panel-header">
      <h4 class="panel-title">Trading Reward</h4>
    </header>
    <div class="panel">
      <div class="infos countdown">
        <div class="infos-title">Countdown</div>
        <ul>
          <li>
            <TradingCountdown :start-time="new Date().getTime()" :end-time="state.endOfCurRoundTime" />
          </li>
          <li class="current-round">
            <div class="infos-title">Current Round</div>
            <h3>
              <shorterSkeleton v-if="state.loading.fetchCurRoundInfo" animated style="width: 30%">
                <template #template>
                  <shorterSkeletonItem :key="1" style="height: 26px" />
                </template>
              </shorterSkeleton>
              <span v-else>
                {{ toAmount(state.rewardPool || 0) }}
              </span>
              <!-- <span v-else>-</span> -->
            </h3>
            <p>Reward Pool</p>
          </li>
        </ul>
      </div>
      <div class="infos current-round">
        <div class="infos-title">My Rewards</div>
        <ul v-if="wallet.isConnected">
          <li>
            <h3>
              <shorterSkeleton v-if="state.loading.fetchLastRoundInfo" animated style="width: 30%">
                <template #template>
                  <shorterSkeletonItem :key="2" style="height: 26px" />
                </template>
              </shorterSkeleton>
              <span v-else>
                {{ formatNum(state.lastRound || 0, 2, true) }}
              </span>
            </h3>
            <p>Last Round</p>
          </li>
          <li>
            <h3>
              <shorterSkeleton v-if="state.loading.fetchCurRoundInfo" animated style="width: 50%">
                <template #template>
                  <shorterSkeletonItem :key="3" style="height: 26px" />
                </template>
              </shorterSkeleton>
              <span v-else>
                {{ `${toPercent(state.percent * 100)}%` }}
              </span>
            </h3>
            <p>% of Curr. Round</p>
          </li>
          <li>
            <h3>
              <shorterSkeleton v-if="state.loading.fetchAccrued" animated style="width: 50%">
                <template #template>
                  <shorterSkeletonItem :key="4" style="height: 26px" />
                </template>
              </shorterSkeleton>
              <span v-else>
                {{ formatNum(state.accrued || 0) }}
              </span>
            </h3>
            <p>Accrued</p>
          </li>
        </ul>
        <ul v-else>
          <li>
            <h3>-</h3>
            <p>Last Round</p>
          </li>
          <li>
            <h3>-</h3>
            <p>% of Curr. Round</p>
          </li>
          <li>
            <h3>-</h3>
            <p>Accrued</p>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject, onBeforeMount, reactive, watch } from "vue";
import { useWallet } from "@/hooks/useWallet";
import { toAmount, toPercent, timeToBlock, dealDecimals, formatNum, encodeFilterTopics } from "@/utils/format";

import * as TradingRewardModel from "@/contract/tradingRewardModel";
import TradingCountdown from "./TradingCountdown.vue";

import dayjs from "@/plugins/dayjs";
import NP from "number-precision";
import * as PriceOracle from "@/contract/priceOracle";
import * as ERC20 from "@/contract/erc20";
import { getContractAddress, commonGetLogs } from "@/contract";
import ShorterBoneABI from "@/abis/ShorterBone.json";
import { ethers } from "ethers";
import * as Transfer from "@/utils/transfer";

const { account, wallet, chain } = useWallet();
let timer = null;

const state = reactive({
  lastRound: 0,
  accrued: 0,
  rewardPool: 0,
  endOfCurRoundTime: getEndTime(),
  percent: 0,
  loading: {
    fetchLastRoundInfo: false,
    fetchCurRoundInfo: false,
    fetchAccrued: false,
  },
});
const fetchingEvents = inject("fetchingEvents");

fetchingEvents.push(
  (() => {
    return () => {
      if (wallet.isConnected && account.value) {
        if (state.loading.fetchCurRoundInfo === false) {
          getCurRoundRewards();
        }
        if (state.loading.fetchAccrued === false) {
          getAccrued(account.value);
        }
      }
    };
  })(),
);

if (wallet.isConnected && account.value) {
  getCurRoundRewards(true);
  getLastRoundRewards(true);
  getAccrued(account.value, true);
}
watch(
  () => [wallet.isConnected, account.value, chain.id],
  ([isConnected, accountValue]) => {
    if (isConnected && accountValue) {
      getCurRoundRewards(true);
      getLastRoundRewards(true);
      getAccrued(accountValue, true);
    } else {
      state.lastRound = 0;
      state.rewardPool = 0;
      state.percent = 0;
      state.accrued = 0;
    }
  },
);

async function getCurRoundRewards(withLoading = false) {
  try {
    state.loading.fetchCurRoundInfo = withLoading;
    const res = await getRoundRewards(0);
    state.rewardPool = res;
  } finally {
    state.loading.fetchCurRoundInfo = false;
  }
}
async function getLastRoundRewards(withLoading) {
  try {
    state.loading.fetchLastRoundInfo = withLoading;
    const res = await getRoundRewards(1);
    state.lastRound = res;
  } finally {
    state.loading.fetchLastRoundInfo = false;
  }
}

//type 0:curRound 1:lastRound

async function getRoundRewards(type) {
  const logs = await getLogs(type);

  if (_.isArray(logs) && logs.length > 0) {
    let totalAmount = 0;
    let userAmount = 0;
    logs.forEach(item => {
      if (item.type === 0 || item.type === 1) {
        totalAmount = NP.plus(totalAmount, item.amount);
        if (item.from == account.value) {
          userAmount = NP.plus(userAmount, item.amount);
        }
      }
    });

    let targetAmount;
    if (type == 0) {
      targetAmount = totalAmount;
      state.percent = NP.divide(userAmount, targetAmount) || 0;
    } else if (type == 1) {
      targetAmount = userAmount;
    }
    const rewards = await getRewards(targetAmount);
    return rewards;
  }
  return 0;
}

//type 0:curRound 1:lastRound
async function getLogs(type = 1) {
  let iface = new ethers.utils.Interface(ShorterBoneABI);
  const filter = await getRoundFilter(type);
  if (filter && filter.fromBlock < filter.toBlock) {
    const callPromise = await commonGetLogs(filter);
    return await Promise.all(
      callPromise.map(async log => await transHistoryLog(log)), //处理返回的日志信息
    );
  }
  return [];
  async function transHistoryLog(log) {
    try {
      let item = iface.parseLog(log);
      const temp = item.args;
      const decimalsMap = {};
      if (_.isNumber(temp._type) && _.isString(temp.tokenAddr)) {
        let decimals;
        if (decimalsMap[temp.tokenAddr]) {
          decimals = decimalsMap[temp.tokenAddr];
        } else {
          decimals = await ERC20.decimals(temp.tokenAddr);
          decimalsMap[temp.tokenAddr] = decimals;
        }
        return {
          amount: Transfer.receiveAmount(temp.amount, decimals) * 1,
          tokenAddress: temp.tokenAddr,
          type: temp._type,
          from: temp.user,
        };
      }
      return false;
    } catch (error) {
      return null;
    }
  }
}

//type 0:curRound 1:lastRound
async function getRoundFilter(type = 1) {
  let contractAddress = getContractAddress();
  const topics = await encodeFilterTopics(ShorterBoneABI, "Revenue");
  const filter = { address: contractAddress.ShorterBone, topics };
  if (type == 0) {
    const startTime = dayjs().startOf("week");
    const [fromBlock] = await Promise.all([timeToBlock(startTime)]);
    const toBlock = "latest";
    return { ...filter, fromBlock, toBlock };
  } else if (type == 1) {
    const startTime = dayjs().startOf("week").subtract(7, "day");
    const endTime = dayjs().endOf("week").subtract(7, "day");
    const [fromBlock, toBlock] = await Promise.all([timeToBlock(startTime), timeToBlock(endTime)]);

    return { ...filter, fromBlock, toBlock };
  }
}

//将币转化为价值
async function getRewards(amount) {
  const IPISTRPrice = await PriceOracle.getIPISTRPrice();
  if (_.isObject(IPISTRPrice) && IPISTRPrice.price >= 0 && IPISTRPrice.decimals >= 0) {
    let rewards = NP.divide(NP.times(amount, 0.4), IPISTRPrice.price);
    const res = dealDecimals(rewards, IPISTRPrice.decimals);
    return res;
  }
  return 0;
}

async function getAccrued(account, withLoading = false) {
  try {
    state.loading.fetchAccrued = withLoading;
    const accrued = await TradingRewardModel.fetchPendingReward(account);
    state.accrued = accrued;
  } finally {
    state.loading.fetchAccrued = false;
  }
}
function getEndTime() {
  const target = dayjs().endOf("week");
  return new Date(target).getTime();
}

onBeforeMount(() => {
  clearInterval(timer);
});
</script>

<style lang="scss" scoped>
@import "./info-group.scss";
.info-group {
  // flex: 2;
  width: 66.6%;
  .countdown {
    ul > li {
      &:nth-child(1) {
        flex: unset;
        width: 40%;
      }
      &:nth-child(2) {
        flex: 1;
      }
    }
    .current-round {
      position: relative;
      border-left-color: transparent !important;
      > .infos-title {
        position: absolute;
        top: -28px;
        left: 0;
        left: 32px+4px;
        transform: translateY(-100%);
      }
    }
  }
  .current-round {
    ul > li {
      box-sizing: border-box;
      &:nth-child(1) {
        flex: unset;
        width: 40%;
      }
      &:nth-child(2) {
        flex: unset;
        width: 30%;
      }
      &:nth-child(3) {
        flex: unset;
        width: 30%;
      }
    }
  }
}
</style>
