<template>
  <div class="balance-card">
    <div class="content">
      <div class="balance">
        <div class="item">
          <span class="key">IPISTR Price:</span>
          <span class="amount">
            <SmartNumber type="price" :value="balance.price" />
          </span>
        </div>
        <div class="item">
          <span class="key">Wallet Balance:</span>
          <span v-if="wallet.isConnected" class="amount">{{ formatNum(balance.amount, 2, true) }}</span>
          <span v-else class="amount">-</span>
        </div>
      </div>
      <div class="opts">
        <div v-if="wallet.type === 'metamask'" v-tooltip.right="'Add IPISTR to your MetaMask wallet'">
          <div class="btn-metamask" @click="addToken">
            <div class="circle" />
            <svg class="shorter-icon" aria-hidden="true">
              <use xlink:href="#icon-metamask" />
            </svg>
          </div>
        </div>
        <shorterButton class="buy-btn full medium" type="primary" plain @click="toDexRouter">Buy</shorterButton>
      </div>
    </div>
    <div class="bg-container">
      <svg class="shorter-icon bg-logo" aria-hidden="true">
        <use xlink:href="#icon-shorter" />
      </svg>
    </div>
  </div>
</template>
<script setup>
import { watch } from "vue";
import { useRouter } from "vue-router";

import { getContractAddress } from "@/contract";

import { useBalance } from "@/hooks/useBalance";
import { Message } from "@/hooks/useMessage";
import { useWallet } from "@/hooks/useWallet";

import { openUrl } from "@/utils/url";
import { formatNum } from "@/utils/format";

const router = useRouter();
const { balance, fetchBalance, fetchIpiStrPrice } = useBalance();
const { wallet, account, chain } = useWallet();

fetchBalance();
fetchIpiStrPrice();

watch(
  () => [account.value, chain.id],
  () => {
    if (!account.value && !chain.id) return;
    fetchBalance();
    fetchIpiStrPrice();
  },
);

watch(
  () => router.currentRoute.value.path,
  () => {
    fetchBalance();
    fetchIpiStrPrice();
  },
);

async function addToken() {
  const contractAddress = getContractAddress();

  try {
    const payload = {
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: contractAddress.IPISTR,
          symbol: "IPISTR",
          decimals: 18,
        },
      },
    };

    const res = await window.ethereum.request(payload);
    if (res) {
      console.log(res, "success");
    } else {
      Message.error("Something went wrong.");
    }
  } catch (error) {
    console.log(error);
  }
}

function toDexRouter() {
  const links = {
    1: "https://app.uniswap.org/#/swap?inputCurrency=0xdAC17F958D2ee523a2206206994597C13D831ec7&outputCurrency=0x888888888888f195E27A2E0F98D712952aB9348e&chain=mainnet",
    5: "https://app.uniswap.org/#/swap?inputCurrency=0x5F4da92a35afa1A09b4E5635589BFa8E0B765a72&outputCurrency=0x54c31aBbBd6811DA7fAa7f46813AD46f0bcD0101&chain=goerli",
    97: "https://pancakeswap.finance/swap?inputCurrency=BNB&outputCurrency=0x888888888888f195E27A2E0F98D712952aB9348e&chain=bsc",
    56: "https://pancakeswap.finance/swap?inputCurrency=BNB&outputCurrency=0x888888888888f195E27A2E0F98D712952aB9348e",
  };

  const target = links[chain.id];

  let url = target ? target : "https://app.uniswap.org/#/swap?chain=mainnet";

  openUrl(url);
}
</script>
<style lang="scss" scoped>
.balance-card {
  position: relative;
  margin-bottom: 32px;
  padding: 20px;
  height: 143px;
  min-height: 143px;
  width: 216px;
  background: #fef8f6;
  border-radius: 12px;
  // font-family: Haas Grot Text;
  .bg-container {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    svg {
      position: absolute;
      right: -20px;
      top: -10px;
      width: 120px;
      height: 120px;
      z-index: 1;
      color: rgba($primary, 0.1);
    }
  }

  .content {
    width: 100%;
    height: 100%;
    padding: 20px;
    position: absolute;
    left: 0;
    top: 0;
    z-index: 2;
  }
  .balance {
    .item {
      @include flex-center-v;
      justify-content: space-between;
      height: 16px;
      line-height: 16px;
      &:last-child {
        margin-top: 6px;
      }
      .key {
        // flex:0 0 auto;
        font-size: 14px;
        color: #a4a5b2;
        font-family: $caption;
      }
      .amount {
        // max-width: 74px;
        flex: 0 0 auto;
        // transform: translateY(2px);
      }
      // .item {
      //   flex: 0 0 auto;
      //   font-size: 14px;
      //   color: #333333;
      // }
    }
  }
  .opts {
    @include flex-center-v;
    margin-top: 22px;

    .btn-metamask {
      margin-right: 8px;

      @include flex-center;
      position: relative;
      width: 32px;
      min-width: 32px;
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
}
.guide-content {
  color: #909399;
  font-size: 14px;
  font-family: Haas Grot Text;
  font-weight: normal;
  span {
    color: #fff;
  }
}
</style>
