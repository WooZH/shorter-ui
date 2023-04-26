<template>
  <div class="my-account">
    <!-- account -->
    <div class="account-title-wrap">
      <h4 class="title">Account</h4>
      <shorterButton type="primary" plain class="btn" @click="onLogout">Disconnect</shorterButton>
    </div>
    <!-- wallet -->
    <div class="wallet-wrap">
      <p class="sub-title">Wallet</p>
      <div class="account-row">
        <div class="account">
          <div class="icon">
            <svg class="shorter-icon" aria-hidden="true">
              <use :xlink:href="`#icon-${currentWallet}`" />
            </svg>
          </div>
          <p class="address">{{ ellipsisStr(basicAccount.address) }}</p>
        </div>
        <div class="opt-group">
          <div v-tooltip.top="'Copy'" v-copy="{ text: basicAccount.address, success: handleCopySuccess }" class="item">
            <svg class="shorter-icon" aria-hidden="true">
              <use xlink:href="#icon-account_copy" />
            </svg>
          </div>
          <div v-tooltip.top="`Open in ${scanName}`" class="item" @click="onExplore">
            <svg class="shorter-icon" aria-hidden="true">
              <use :xlink:href="`#icon-${scanName.toLowerCase()}_logo`" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from "vue";
import { getContractAddress } from "@/contract";

import { openUrl } from "@/utils/url";
import { ellipsisStr } from "@/utils/format";

import { disconnectWallet } from "@/wallet/wallet";
import { useWallet } from "@/hooks/useWallet";
import { Message } from "@/hooks/useMessage";
import { Warning } from "@/hooks/useWarning";
import { useTrader } from "@/hooks/useTrader";
import { useBalance } from "@/hooks/useBalance";

const emit = defineEmits(["closeWallet"]);

const { account, chain, wallet } = useWallet();
const { clearTraderBalance } = useTrader();
const { resetBalance } = useBalance();

const basicAccount = reactive({
  address: computed(() => account.value),
  network: computed(() => chain.name),
});

const currentWallet = computed(() => {
  const walletType = wallet.type;
  if (walletType === "metamask") {
    return "metamask";
  } else if (walletType === "walletconnect") {
    return "wallet-connect";
  } else {
    return "";
  }
});

const scanName = computed(() => {
  const chainConfig = getContractAddress();
  return chainConfig.scanName;
});

function onExplore() {
  let contractAddress = getContractAddress();
  openUrl(`${contractAddress.scanURL}/address/${account.value}`, "onShare");
}

/**
 * @description: clear history/account
 * @param {*}
 * @return {*}
 */
function onLogout() {
  console.log("logout");

  disconnectWallet();
  clearTraderBalance();
  resetBalance();

  Warning.close();
  emit("closeWallet", false);
}

function handleCopySuccess() {
  Message.success("Copied");
}
</script>

<style lang="scss" scoped>
.my-account {
  font-family: Haas Grot Text;
  padding: 32px;
  h4.title {
    font-family: Haas Grot Disp;
    font-weight: 600;
    font-size: 18px;
    color: #303133;
  }
  .sub-title {
    height: 20px;
    font-size: 14px;
    color: #909399;
  }
}

.account-title-wrap {
  display: flex;
  justify-content: space-between;
  align-items: center;
  .btn {
    font-size: 12px;
    width: 92px;
    height: 28px;
    border-radius: 4px;
  }
}

.wallet-wrap {
  margin-top: 24px;
  .account-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;
  }
  .account {
    display: flex;
    align-items: center;
    .icon {
      width: 24px;
      height: 24px;
      margin-right: 12px;
      .shorter-icon {
        width: 100%;
        height: 100%;
      }
    }
    .address {
      height: 24px;
      line-height: 24px;
      font-size: 16px;
      color: #333333;
    }
  }
  .opt-group {
    display: flex;
    align-items: center;
    .item {
      width: 20px;
      height: 20px;
      margin-left: 16px;
      cursor: pointer;
      .shorter-icon {
        width: 100%;
        height: 100%;
      }
    }
  }
}
</style>
