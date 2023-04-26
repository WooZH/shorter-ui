<template>
  <div class="info-group panel-container">
    <PlPanelHeader :first-token-locked="firstTokenLocked" />

    <div class="panel">
      <div class="left-wrap">
        <TokenPairTitle :token-info="LPTokenInfo" :second-token="secondToken" />

        <div class="op-wrap">
          <div class="block stake-wrap">
            <p class="top-describe" />
            <div class="number">
              <shorterSkeleton animated style="height: 48px" :loading="walletConnect && pageLoading.info">
                <template #template>
                  <shorterSkeletonItem style="height: 48px; width: 150px" />
                </template>
                <template #default>
                  <div v-if="!walletConnect" class="my-staked-wrap">
                    <shorterButton type="primary" class="stake-btn" plain @click="wallet.visible = true">
                      Unlock wallet
                    </shorterButton>
                  </div>

                  <div v-else class="my-staked-wrap">
                    <span v-show="myStaked != 0" class="staked-count">
                      {{ formatNum(myStaked, 2, true) }}
                    </span>

                    <shorterButton
                      v-show="myStaked == 0"
                      plain
                      type="primary"
                      class="stake-btn"
                      @click="openStakeLPDialog"
                    >
                      Stake
                    </shorterButton>

                    <div class="stake-btn-group">
                      <shorterButton
                        v-show="myStaked != 0"
                        plain
                        type="primary"
                        class="stake-btn-square operator-wrap"
                        @click="openStakeLPDialog"
                      >
                        <span class="">
                          <svg class="icon shorter-icon operator default" aria-hidden="true">
                            <use xlink:href="#icon-plus" />
                          </svg>
                          <svg class="icon shorter-icon operator active" aria-hidden="true">
                            <use xlink:href="#icon-plus-active" />
                          </svg>
                        </span>
                      </shorterButton>
                      <shorterButton
                        v-show="myStaked != 0"
                        plain
                        type="primary"
                        class="stake-btn-square operator-wrap"
                        @click="openUnstakeLPDialog"
                      >
                        <span>
                          <svg class="icon shorter-icon operator default" aria-hidden="true">
                            <use xlink:href="#icon-mins" />
                          </svg>
                          <svg class="icon shorter-icon operator active" aria-hidden="true">
                            <use xlink:href="#icon-mins-active" />
                          </svg>
                        </span>
                      </shorterButton>
                    </div>
                  </div>
                </template>
              </shorterSkeleton>
            </div>
            <p class="label">My Staked</p>
          </div>

          <div class="block speed-wrap">
            <p class="top-describe">
              Per Block
              <span>
                <svg class="icon shorter-icon" aria-hidden="true">
                  <use xlink:href="#icon-block" />
                </svg>
              </span>
            </p>
            <shorterSkeleton animated style="height: 48px" :loading="walletConnect && pageLoading.info">
              <template #template>
                <shorterSkeletonItem style="height: 48px; width: 150px" />
              </template>
              <template #default>
                <div class="number">+{{ formatPlainNum(perBlockReward) }}</div>
              </template>
            </shorterSkeleton>
            <p class="label">
              <span v-show="firstTokenLocked > 0">Unlock</span>
              <span v-show="firstTokenLocked <= 0">Yield</span>
              Speed
            </p>
          </div>

          <div class="block locked-wrap">
            <p class="top-describe" />
            <shorterSkeleton animated style="height: 48px" :loading="walletConnect && pageLoading.info">
              <template #template>
                <shorterSkeletonItem style="height: 48px; width: 150px" />
              </template>
              <template #default>
                <div class="number">
                  <span v-if="!walletConnect">0</span>
                  <span v-else>
                    {{ formatNum(firstTokenLocked, 2, true) }}
                  </span>
                  <Tag class="tag-ipistr">{{ firstTokenInfo.symbol }}</Tag>
                </div>
              </template>
            </shorterSkeleton>
            <p class="label">Locked</p>
          </div>
        </div>
        <div v-show="walletConnect">
          <div class="rewards-line">
            <span class="split-text">Rewards</span>
            <div class="split-line" />
          </div>

          <PlReward
            :token-info="LPTokenInfo"
            :first-reward="firstReward"
            :first-stake-reward="stakedReward"
            :second-token="secondToken"
            :second-reward="secondReward"
            :wallet-connect="walletConnect"
            :loading="pageLoading.info"
            :is-bsc="isBsc"
            :format-helper="formatPlainNum"
          />
        </div>
      </div>

      <div class="right-wrap">
        <p class="apr-wrap">
          <Tag class="apr-tag">APR</Tag>
          <shorterSkeleton animated style="height: 24px" :loading="walletConnect && pageLoading.info">
            <template #template>
              <shorterSkeletonItem style="height: 24px; width: 40px" />
            </template>
            <template #default>
              <span class="apr-num">{{ formatPlainNum(APR * 100) }}%</span>
            </template>
          </shorterSkeleton>
        </p>

        <shorterButton
          v-if="walletConnect"
          class="harvest-btn"
          type="primary"
          :loading="pageLoading.harvest"
          @click="submitHarvest"
        >
          Harvest
        </shorterButton>

        <shorterButton v-else class="harvest-btn" type="primary" plain @click="wallet.visible = true">
          Unlock wallet
        </shorterButton>
      </div>
    </div>
  </div>

  <Dialog v-model="dialogsVisible.stakeLP" width="560px">
    <DialogStakeLP
      :dialog-type="'Stake'"
      :token-info="LPTokenInfo"
      :second-token="secondToken"
      :token-id="tokenId"
      :staking="{
        [firstToken]: balance.amount,
        [secondToken]: secondTokenBalance,
      }"
      :is-bsc="isBsc"
      :lp-decimals="lpDecimals"
      :token0-is-first-token="token0IsFirstToken"
      :liquidity="liquidity"
      @success="loadLPInfo"
      @close="dialogsVisible.stakeLP = false"
    />
  </Dialog>
  <Dialog v-model="dialogsVisible.unstakeLP" width="560px">
    <DialogStakeLP
      :dialog-type="'Unstake'"
      :token-info="LPTokenInfo"
      :second-token="secondToken"
      :token-id="tokenId"
      :staking="staking"
      :is-bsc="isBsc"
      :my-staked="myStaked"
      :lp-decimals="lpDecimals"
      :token0-is-first-token="token0IsFirstToken"
      :liquidity="liquidity"
      @success="loadLPInfo"
      @close="dialogsVisible.unstakeLP = false"
    />
  </Dialog>
</template>

<script setup>
import { ref, reactive, computed, watchEffect, watch } from "vue";
import NP from "number-precision";

import * as FarmingContract from "@/contract/farming";
import * as FarmingImplV2 from "@/contract/farmingImplV2";
import * as PancakeLPs from "@/contract/pancakeLPs";
import { getContractAddress } from "@/contract";
import {
  getSpeedV3,
  pendingReward as FRpendingReward,
  getMaxUnlockSpeed,
  getMaxLpSupply,
} from "@/contract/farmingRewardModel";
import { lockedBalanceOf } from "@/contract/ipistr";
import { harvest } from "@/contract/farmingRewardModel";

import { useBalance } from "@/hooks/useBalance";
import { useWallet } from "@/hooks/useWallet";

import { Local } from "@/utils/localStorage";
import * as Transfer from "@/utils/transfer";
import { formatPlainNum, formatNum } from "@/utils/format";
import { getBalanceOf } from "@/contract/erc20";

import PlPanelHeader from "./PlPanelHeader.vue";
import TokenPairTitle from "./TokenPairTitle.vue";
import PlReward from "./PlReward.vue";
import DialogStakeLP from "./DialogStakeLP.vue";

const { wallet, account, chain } = useWallet();
const { balance, fetchBalance } = useBalance();
const walletConnect = computed(() => wallet.isConnected);

const pageLoading = reactive({
  harvest: false,
  info: false,
});

const LPTokenInfo = ref({});
const firstToken = ref("IPISTR");
const secondToken = computed(() => getContractAddress().usdToken);
const firstTokenInfo = computed(() => LPTokenInfo.value[firstToken.value] || {});
const secondTokenInfo = computed(() => LPTokenInfo.value[secondToken.value] || {});
const isBsc = computed(() => secondToken.value === "BUSD");

const myStaked = ref(0);
const secondTokenBalance = ref(0);
const lpDecimals = computed(() => {
  if (!isBsc.value) {
    return 12;
  } else {
    const firstDec = firstTokenInfo.value.decimals;
    const secondDec = secondTokenInfo.value.decimals;
    return (firstDec + secondDec) / 2;
  }
});
const tokenId = ref("");

const staking = computed(() => {
  return {
    [firstToken.value]: 0,
    [secondToken.value]: 0,
  };
});

const liquidity = ref({});

const token0IsFirstToken = ref(true);

const perBlockReward = ref(0);
const pendingReward = ref({
  unlockedReward: 0,
  reward: 0,
});
const lockedBalance = ref(0);

const reward = reactive({
  token0Rewards: 0,
  token1Rewards: 0,
});

const firstTokenLocked = computed(() => {
  const res = NP.minus(lockedBalance.value, pendingReward.value.unlockedReward);
  return res < 0 ? 0 : res;
});

const firstReward = computed(() => {
  return NP.plus(pendingReward.value.reward, pendingReward.value.unlockedReward);
});

const stakedReward = computed(() => {
  return token0IsFirstToken.value ? reward.token0Rewards : reward.token1Rewards;
});

const secondReward = computed(() => {
  return token0IsFirstToken.value ? reward.token1Rewards : reward.token0Rewards;
});

const APR = computed(() => {
  const firstPlusSecond = NP.plus(
    staking.value[secondToken.value],
    NP.times(staking.value[firstToken.value], balance.price),
  );

  const speed = getContractAddress().blockSpeed;
  const perBlockPrice = NP.times(balance.price, perBlockReward.value);
  const oneYearBlocks = NP.divide(60 * 60 * 24 * 365, speed);
  const allProfit = NP.times(perBlockPrice, oneYearBlocks);

  if (allProfit == 0 || firstPlusSecond == 0) {
    return 0;
  }

  return NP.divide(allProfit, firstPlusSecond);
});

const dialogsVisible = reactive({
  stakeLP: false,
  unstakeLP: false,
});

function openStakeLPDialog() {
  dialogsVisible.stakeLP = true;
}

function openUnstakeLPDialog() {
  dialogsVisible.unstakeLP = true;
}

watchEffect(async () => {
  if (account.value) {
    try {
      pageLoading.info = true;
      await loadLPInfo();
    } catch (error) {
      console.log("loadLPInfo error:");
      console.log(error);
    } finally {
      pageLoading.info = false;
    }
  } else {
    await loadUnlockInfo();
  }
});

watch(
  () => chain.id,
  async () => {
    try {
      pageLoading.info = true;
      resetData();
      getTokenMap();
      if (account.value) {
        await loadLPInfo();
      } else {
        await loadUnlockInfo();
      }
      pageLoading.info = false;
    } catch (e) {
      console.log("chain update provide liqudity error", e);
    }
  },
);

function resetData() {
  tokenId.value = "";
  myStaked.value = 0;
  pendingReward.value = {
    unlockedReward: 0,
    reward: 0,
  };
  perBlockReward.value = 0;
  lockedBalance.value = 0;

  const rw = {
    token0Rewards: 0,
    token1Rewards: 0,
  };

  for (const rk in rw) {
    reward[rk] = rw[rk];
  }
}

function initTokenMap() {
  getTokenMap();
  if (!Object.keys(LPTokenInfo.value)?.length) {
    setTimeout(() => {
      initTokenMap();
    }, 500);
  }
}
initTokenMap();

function getTokenMap() {
  const shorterStorage = Local.get("shorterStorage");
  const tokenList = shorterStorage[getContractAddress().networkName].common.token.list;
  const tokenMap = {};
  tokenList.map(token => {
    tokenMap[token.symbol] = token;
  });

  LPTokenInfo.value = tokenMap;
}

async function loadLPInfo() {
  fetchBalance();

  if (isBsc.value) {
    await getLiquidityV2();
    await getMyStakedValueV2();
    getSecondTokenBalance();
    getStakedV2(myStaked.value);
    getPendingReward();
    getLockBanlanceOf();
    getPerBlockReward();
  } else {
    await getTokenId();
    await getLiquidityV3();
    getSecondTokenBalance();
    getPerBlockReward();
    getPendingReward();
    getLockBanlanceOf();
    getStakeAndRewardV3();
  }
}

async function getSecondTokenBalance() {
  try {
    secondTokenBalance.value = await getBalanceOf(secondTokenInfo.value.address, account.value);
  } catch (e) {
    console.log(e);
  }
}

async function getLockBanlanceOf() {
  try {
    const res = await lockedBalanceOf(account.value);
    lockedBalance.value = res;
  } catch (e) {
    console.log(e);
  }
}

async function getPendingReward() {
  try {
    const res = await FRpendingReward(account.value);
    pendingReward.value = res;
  } catch (e) {
    console.log(e);
  }
}

async function getPerBlockReward() {
  try {
    const speed = await getSpeedV3(account.value);
    perBlockReward.value = Transfer.receiveAmount(speed, firstTokenInfo.value.decimals);
  } catch (e) {
    perBlockReward.value = 0;
  }
}

async function getMyStakedValueV2() {
  try {
    const staked = await FarmingImplV2.getUserStakedAmount(account.value);
    myStaked.value = Transfer.receiveAmount(staked, lpDecimals.value);
  } catch (e) {
    console.error("my staked", e);
  }
}

async function getLiquidityV2() {
  const pancakeLPsPromises = [PancakeLPs.getReserves(), PancakeLPs.token0(), PancakeLPs.totalSupply()];
  const [res, token0, lpAmount] = await Promise.all(pancakeLPsPromises);

  if (token0 === firstTokenInfo.value.address) {
    liquidity.value = {
      amount0: res._reserve0,
      amount1: res._reserve1,
      lpAmount,
      token0: firstToken.value,
    };
  } else {
    liquidity.value = {
      amount0: res._reserve1,
      amount1: res._reserve0,
      lpAmount,
      token0: secondToken.value,
    };
  }
}

function getStakedV2(stakedNum) {
  const firstDecimals = firstTokenInfo.value.decimals;
  const secondDecimals = secondTokenInfo.value.decimals;
  const firstTokenAmount0 = Transfer.receiveAmount(liquidity.value.amount0, firstDecimals);
  const secondTokenAmount0 = Transfer.receiveAmount(liquidity.value.amount1, secondDecimals);
  const lpAmount = Transfer.receiveAmount(liquidity.value.lpAmount, (firstDecimals + secondDecimals) / 2);

  staking.value[firstToken.value] = NP.divide(NP.times(stakedNum, firstTokenAmount0), lpAmount);
  staking.value[secondToken.value] = NP.divide(NP.times(stakedNum, secondTokenAmount0), lpAmount);
}

async function getTokenId() {
  try {
    tokenId.value = await FarmingContract.getTokenIdV3();
  } catch (error) {
    console.error("getTokenId", error);
  }
}

async function getLiquidityV3() {
  const DEFAULT_LP = Transfer.toAmount(1, 12);
  try {
    const res = await FarmingContract.getAmountsForLiquidityV3(tokenId.value, DEFAULT_LP);
    liquidity.value = res;
  } catch (error) {
    console.log("get liquidity v3", error);
  }
}

async function getStakeAndRewardV3() {
  const firstDecimals = firstTokenInfo.value.decimal;
  const secondDecimals = secondTokenInfo.value.decimals;

  const userReward = await FarmingContract.getUserInfoV3(account.value, tokenId.value);
  myStaked.value = Transfer.receiveAmount(userReward.stakedAmount, lpDecimals.value);

  const DEFAULT_LP = Transfer.toAmount(1, lpDecimals.value);
  const lp_param = userReward.stakedAmount.toString() == 0 ? DEFAULT_LP : userReward.stakedAmount;

  await getStakingV3(lp_param, "pl");

  const token0Rewards = userReward.token0Rewards;
  const token1Rewards = userReward.token1Rewards;
  reward.token0Rewards = Transfer.receiveAmount(
    token0IsFirstToken.value ? token0Rewards : token1Rewards,
    firstDecimals,
  );
  reward.token1Rewards = Transfer.receiveAmount(
    token0IsFirstToken.value ? token1Rewards : token0Rewards,
    secondDecimals,
  );
}

async function loadUnlockInfo() {
  if (!isBsc.value) {
    await getTokenId();
    await getUnlockInfoV3();
  } else {
    await getLiquidityV2();
    await getUnlockInfoV2();
  }
}

async function getUnlockInfoV2() {
  const lpToken = getContractAddress().PancakeLPs;
  const stakedAmount = await FarmingContract.getLpStakedAmount(lpToken);
  getStakedV2(stakedAmount);

  const { speed, supply } = await getUnlockSpeedAndSupply();
  const avgPerBlockReward = NP.divide(NP.times(stakedAmount, speed), supply);

  perBlockReward.value = avgPerBlockReward;
}

async function getUnlockInfoV3() {
  try {
    const firstDecimals = firstTokenInfo.value.decimal;

    const { liquidity, midPrice } = await FarmingContract.getTokenInfoV3(tokenId.value);

    await getStakingV3(liquidity);

    const DEFAULT_LP = Transfer.toAmount(1, 12);
    const { speed, supply } = await getUnlockSpeedAndSupply();
    const avgPerBlockReward = liquidity.mul(midPrice).mul(speed).div(DEFAULT_LP).div(supply);

    perBlockReward.value = Transfer.receiveAmount(avgPerBlockReward, firstDecimals);
  } catch (error) {
    console.error("get unlock v3 error", error);
  }
}

async function getStakingV3(lpParam, extraParam) {
  const firstDecimals = firstTokenInfo.value.decimal;
  const secondDecimals = secondTokenInfo.value.decimals;

  const LPInfo = await FarmingContract.getAmountsForLiquidityV3(tokenId.value, lpParam, extraParam);

  const amount0 = LPInfo.amount0;
  const amount1 = LPInfo.amount1;
  token0IsFirstToken.value = LPInfo.token0 === firstTokenInfo.value.address;

  staking.value[firstToken.value] = Transfer.receiveAmount(token0IsFirstToken.value ? amount0 : amount1, firstDecimals);
  staking.value[secondToken.value] = Transfer.receiveAmount(
    token0IsFirstToken.value ? amount1 : amount0,
    secondDecimals,
  );

  return LPInfo;
}

async function getUnlockSpeedAndSupply() {
  const [speed, supply] = await Promise.all([getMaxUnlockSpeed(), getMaxLpSupply()]);

  return {
    speed,
    supply,
  };
}

async function submitHarvest() {
  pageLoading.harvest = true;
  try {
    await harvest(account.value);
    loadLPInfo();
  } catch (e) {
    console.error(e);
  } finally {
    pageLoading.harvest = false;
  }
}
</script>

<style lang="scss" scoped src="../info-group.scss"></style>
<style lang="scss" scoped>
.info-group .panel {
  display: grid;
  height: auto;
  grid-template-columns: 67% 33%;
}

.left-wrap {
  width: 100%;

  .op-wrap {
    display: grid;
    grid-template-columns: 33% 33% 33%;
    height: 106px;
    margin-top: 20px;
    .block {
      .top-describe {
        height: 24px;
        font-size: 16px;
        font-weight: normal;
        color: #909399;
        line-height: 24px;
      }
      .number {
        height: 48px;
        font-size: 32px;
        font-weight: normal;
        color: #303133;
        line-height: 48px;
        display: flex;
        align-items: center;
        .tag-ipistr {
          margin-left: 10px;
          height: 16px;
          line-height: 16px;
          padding: 0 5px;
        }
      }
      .label {
        height: 20px;
        font-size: 14px;
        font-weight: normal;
        font-family: $caption;
        color: #a4a5b2;
        line-height: 20px;
        margin-top: 10px;
      }
    }

    .stake-btn {
      width: 160px;
      height: 40px;
    }
    .stake-btn-group {
      display: block;
      margin-left: 20px;
      margin-top: 8px;
    }
    .stake-btn-square {
      margin-bottom: 8px;
      width: 32px;
      height: 32px;
      font-size: 24px;
      padding: 0;
      border-radius: 8px;
    }
    .my-staked-wrap {
      display: flex;
      .staked-count {
        min-width: 80px;
      }
    }
  }

  .rewards-line {
    position: relative;
    width: 100%;
    margin-top: 40px;
    height: 20px;
    font-size: 14px;
    font-weight: normal;
    color: #c0c4cc;
    line-height: 20px;
    .split-text {
      position: absolute;
      top: 0;
      left: 64px;
      text-align: center;
      background: #fff;
      width: 98px;
      display: inline-block;
      z-index: 2;
    }
    .split-line {
      width: 100%;
      position: absolute;
      top: 10px;
      height: 1px;
      background: #eeeeee;
      z-index: 1;
    }
  }
}

.right-wrap {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  width: 100%;
  background-size: 200px 200px;
  background-position: 100% 68px;
  background-image: url("~@/assets/images/curve.svg");
  background-repeat: no-repeat;
  .apr-wrap {
    display: flex;
    align-items: center;
    margin-bottom: 40px;
    .apr-tag {
      border: solid 1px $primary;
      height: 16px;
      line-height: 16px;
      color: $primary;
      margin-right: 12px;
      background: none;
      padding-top: 0;
      opacity: 0.5;
    }
    .apr-num {
      font-size: 24px;
      font-weight: 600;
      color: $green;
      line-height: 24px;
      &::before {
        content: "+";
      }
    }
  }
  .harvest-btn {
    margin-top: 10px;
    width: 200px;
    height: 50px;
  }
}

.operator-wrap {
  .operator {
    width: 12px;
  }

  .default {
    opacity: 1;
    display: block;
    transition: all 0.1s;
  }
  .active {
    opacity: 0;
    display: none;
    transition: all 0.1s;
  }
  &:hover {
    .default {
      opacity: 0;
      display: none;
    }
    .active {
      opacity: 1;
      display: block;
    }
  }
}
</style>
