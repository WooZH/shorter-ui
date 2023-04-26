<template>
  <Layout title="Testnet Playground">
    <div class="network-list">
      <div class="panel-container">
        <header class="panel-header">
          <h4 class="panel-title">
            <span>
              Test Tokens on
              <span class="cur-chain">{{ currentChainName }}</span>
            </span>
          </h4>
          <a href="https://docs.shorter.finance/miscellaneous/testnet-playground.html" target="_blank" class="link">
            Tutorial →
          </a>
        </header>
        <div class="panel">
          <ul class="token-list">
            <li v-for="token in testTokenList" :key="token.name" class="token-item">
              <div class="token-info">
                <Image class="shorter-icon" :src="token.logoURI" />
                <span>
                  {{ token.name }}
                </span>
              </div>
              <div class="btn-container">
                <shorterButton
                  class="btn-claim"
                  :class="{
                    disabled:
                      (token.limitTime && new Date(token.limitTime) > new Date()) ||
                      token.loading ||
                      state.loading.fetchTokenInfo,
                  }"
                  :has-slot="!state.loading.fetchTokenInfo && !token.loading"
                  :loading="state.loading.fetchTokenInfo || token.loading"
                  @click="getTestToken(token)"
                >
                  <span v-if="!token.loading && !state.loading.fetchTokenInfo">Claim</span>
                </shorterButton>
                <div
                  v-if="token.limitTime && token.limitTime !== true && new Date(token.limitTime) > new Date()"
                  class="countdown-container"
                >
                  <Countdown
                    :start-time="new Date().getTime()"
                    :end-time="new Date(token.limitTime).getTime()"
                    ruler="HH:mm"
                  />
                </div>
              </div>
              <div v-if="wallet.type === 'metamask'" v-tooltip.right="'Add to MetaMask'" placement="right">
                <div class="btn-metamask" @click="addToken(token)">
                  <div class="circle" />
                  <svg class="shorter-icon">
                    <use xlink:href="#icon-metamask" />
                  </svg>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div v-if="0" class="panel-container">
        <header class="panel-header">
          <h4 class="panel-title">
            <span>Point Query</span>
          </h4>
        </header>
        <div class="panel panel-point">
          <div class="point-wrap">
            <lineTitle>
              <template #title>S-Point</template>
              <template #number>
                {{ pointData.sPoint }}
              </template>
            </lineTitle>
            <lineTitle>
              <template #title>Current Rank</template>
              <template #number>
                {{ pointData.sRank }}
              </template>
            </lineTitle>
            <lineTitle>
              <template #title>Trade-Point</template>
              <template #number>
                {{ pointData.tradePoint }}
              </template>
            </lineTitle>
            <lineTitle>
              <template #title>Current Rank</template>
              <template #number>
                {{ pointData.tradeRank }}
              </template>
            </lineTitle>
          </div>
          <div v-if="!pointData.hasRegistered && wallet.isConnected">
            <p class="warning">
              Oops, we are having trouble processing your request. Please confirm you are registered to participate.
            </p>
            <p class="join">
              Join now:
              <a class="join-link" target="_blank" :href="pointData.link">{{ pointData.link }}</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>
<script setup>
import { computed, reactive, watch } from "vue";
import { useRouter } from "vue-router";

import { getContractAddress } from "@/contract";
import * as ShorterFaucet from "@/contract/shorterFaucet";

import { useWallet } from "@/hooks/useWallet";
import { Message } from "@/hooks/useMessage";
import { Transaction } from "@/hooks/useTransaction";
import { useBalance } from "@/hooks/useBalance";

import { blockToTime, formatDate } from "@/utils/format";
import { transBigNumber } from "@/utils/transfer";
import { Local } from "@/utils/localStorage";
import dayjs from "@/plugins/dayjs";

import { getNetworkNameById, isTestNetworkId } from "@/middlewares/manifest/network";

import Countdown from "@/components/Countdown.vue";
import lineTitle from "./components/line-title.vue";

const { wallet, account, chain } = useWallet();
const { fetchBalance } = useBalance();

const state = reactive({
  testTokens: {
    bsct: [
      {
        name: "CAKE",
        symbol: "CAKE",
        address: "0x55ED36e42c6921c937f2Ce2F039c2c706A68C608",
      },
      {
        name: "BUSD",
        symbol: "BUSD",
        address: "0x46E16FD369a55B506dFC5Fe9cC4BDd1B1798153f",
      },
      {
        name: "IPISTR",
        symbol: "IPISTR",
        address: "0xeFB3968B2DcD392DDA401254cc7E4B94fa93a9c1",
      },
    ],
    goerli: [
      {
        name: "BTC",
        symbol: "BTC",
        address: "0x3e15f804c48963dCB8370a5D96EB2b154b98B91D",
      },
      {
        name: "USDT",
        symbol: "USDT",
        address: "0x5F4da92a35afa1A09b4E5635589BFa8E0B765a72",
      },
      {
        name: "IPISTR",
        symbol: "IPISTR",
        address: "0x54c31aBbBd6811DA7fAa7f46813AD46f0bcD0101",
      },
    ],
  },
  loading: {
    fetchTokenInfo: false,
  },
});

const currentChainName = computed(() => {
  return getNetworkNameById(chain.id);
});

const testTokenList = computed(() => {
  return state.testTokens[currentChainName.value];
});
const router = useRouter();

watch(
  () => chain.id,
  id => {
    if (!isTestNetworkId(id)) {
      router.replace({ name: "404" });
      return;
    }

    refreshTokenClaimTime();
    getTokensInfo();
  },
  {
    immediate: true,
  },
);

watch(
  () => account.value,
  () => {
    if (!isTestNetworkId(chain.id)) return;

    refreshTokenClaimTime();
    getTokensInfo();
  },
);

const pointQuery = reactive({
  hasRegistered: false,
  sPoint: 100000,
  sRank: 1,
  tradePoint: 10000,
  tradeRank: 1,
  link: "https://forms.gle/hNj4yyZmD2fC7QGR8",
});

const pointData = computed(() => {
  if (wallet.isConnected) {
    if (pointQuery.hasRegistered) {
      return pointQuery;
    } else {
      return {
        hasRegistered: false,
        sPoint: 0,
        sRank: "> 10000",
        tradePoint: 0,
        tradeRank: "> 10000",
        link: "https://forms.gle/hNj4yyZmD2fC7QGR8",
      };
    }
  } else {
    return {
      hasRegistered: false,
      sPoint: "-",
      sRank: "-",
      tradePoint: "-",
      tradeRank: "-",
      link: "https://forms.gle/hNj4yyZmD2fC7QGR8",
    };
  }
});

async function getTokensInfo() {
  try {
    state.loading.fetchTokenInfo = true;
    let shorterStorage = Local.get("shorterStorage");
    const localTokenList = shorterStorage[getContractAddress().networkName].common.token.list;
    testTokenList.value.forEach(item => {
      localTokenList.forEach(token => {
        if (item.address === token.address) {
          (item.logoURI = token.logoURI), (item.decimals = token.decimals);
        }
      });
    });
  } finally {
    state.loading.fetchTokenInfo = false;
  }
}

async function addToken({ address, logoURI, decimals, symbol }) {
  try {
    let isAdded = await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address,
          symbol,
          decimals,
          image: logoURI,
        },
      },
    });
    if (isAdded) {
      console.log(isAdded, "success");
    } else {
      Message.error("Something went wrong.");
    }
  } catch (error) {
    console.log(error);
  }
}

async function getTestToken(token) {
  if (wallet.isConnected) {
    if (!isTestNetworkId(chain.id)) {
      Message.error("Something went wrong.");
      return;
    }
  } else {
    wallet.visible = true;
    return;
  }
  console.log(token);

  try {
    token.loading = true;

    const [res, timeAvailable] = await Promise.all([
      ShorterFaucet.getTestToken(token.address),
      getTokenChangeTime(token),
    ]);

    if (res.transactionHash) Transaction(res.transactionHash);
    if (token.symbol === "IPISTR") {
      fetchBalance();
    }

    token.limitTime = true;
    // 若不能立刻获取截止时间，则手动加上截止时间(待完善)
    if (!timeAvailable) {
      token.limitTime = formatDate(new Date(new Date().getTime() + 24 * 60 * 60 * 1000), "MMM DD, YYYY HH:mm:ss");
    }
  } catch (err) {
    if (err.code === "UNSUPPORTED_OPERATION") {
      wallet.visible = true;
    } else if (err.code !== 4001) {
      Message.error("Something went wrong.");
    }

    console.log(err);
  } finally {
    token.loading = false;
  }
}

async function getTokenChangeTime(item) {
  item.limitTime = "";
  const { address } = item;
  let startBlock = await ShorterFaucet.getUserTokenBlocks(address);
  startBlock = transBigNumber(startBlock);
  if (startBlock > 0) {
    const changeTime = await blockToTime(startBlock, "MMM DD, YYYY HH:mm:ss");
    const endTime = dayjs(changeTime).format("MMM DD, YYYY HH:mm:ss");
    if (new Date(endTime) > new Date() && new Date(endTime).getTime() < new Date().getTime() + 24 * 60 * 60 * 1000) {
      item.limitTime = endTime;
      return true;
    }
  }
  return false;
}

async function refreshTokenClaimTime() {
  testTokenList.value.forEach(item => {
    item.loading = true;
    getTokenChangeTime(item).then(() => {
      item.loading = false;
    });
  });
}
</script>
<style lang="scss" scoped>
.network-list {
  display: flex;
  margin: 0 -16px;

  .panel-container {
    width: 560px;
  }

  .panel-header {
    .link {
      @include flex-center-v;
      font-size: 16px;
      color: #909399;
      cursor: pointer;
      &:hover {
        color: $primary;
      }
    }
  }

  .panel {
    padding-top: 0;
    padding-bottom: 0;
  }

  .point-wrap {
    display: grid;
    grid-template-columns: 50% 50%;
    gap: 50px 0;
  }

  .panel-point {
    padding: 32px 32px 20px;
    font-size: 16px;
    position: relative;
    .unlock-btn {
      margin: 50px 0;
      margin-left: 50%;
      transform: translateX(-50%);
      width: 264px;
      height: 56px;
    }
    .warning,
    .join {
      line-height: 20px;
      margin-top: 12px;
      color: #909399;
    }
    .content,
    .join-link {
      margin-left: 4px;
    }
    .warning {
      margin-top: 27px;
      color: #909399;
    }
    .join-link {
      color: $primary;
      text-decoration: underline;
    }
  }

  .token-list {
    .token-item {
      @include flex-center-v;
      height: 88px;
      border-bottom: 1px solid #eee;
      &:last-child {
        border-bottom: none;
      }
    }
  }

  .token-info {
    @include flex-center-v;
    flex: 1;
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    span {
      margin-left: 12px;
      transform: translateY(1px);
    }
    .shorter-icon {
      width: 20px;
      height: 20px;
    }
  }

  .btn-container {
    position: relative;
    .btn-claim {
      @include flex-center;
      width: 69px;
      height: 32px;
      min-height: 32px;
      background: #ffffff;
      border-radius: 4px;
      border: 1px solid $primary;
      cursor: pointer;
      span {
        color: $primary;
        transform: translateY(1px);
      }
      &:hover {
        background: none !important;
      }
      &.disabled {
        border-color: #d9d9d9;
        pointer-events: none;
        span {
          color: #a4a5b2;
        }
      }
    }

    .countdown-container {
      position: absolute;
      left: 50%;
      bottom: 0;
      transform: translate(-50%, 50%);
      background: #fff;
      padding: 0 5px;
      font-weight: 600;
      color: #909399;
      font-size: 12px;
    }
  }

  .btn-metamask {
    margin-left: 16px;

    @include flex-center;
    position: relative;
    width: 32px;
    height: 32px;
    background: #ffffff;
    border-radius: 8px;
    border: 1px solid $primary;
    cursor: pointer;
    .circle {
      @include flex-center;
      position: absolute;
      width: 14px;
      height: 14px;
      right: -2px;
      bottom: -2px;
      border-radius: 50%;
      border: 1px solid #fff;
      background: $primary;
      color: #fff;
      overflow: hidden;
      &::after {
        content: "+";
        font-size: 12px;
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
      }
    }
    .shorter-icon {
      width: 20px;
      height: 20px;
    }
  }
}

.cur-chain {
  text-transform: Capitalize;
}
</style>
