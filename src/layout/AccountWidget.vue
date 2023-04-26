<template>
  <transition name="fade">
    <div v-show="showNetwork" class="transparent-mask" @click="turnNetworkSelector" />
  </transition>
  <div class="account-widget">
    <div
      class="network-logo-container"
      :style="{ borderColor: state.currentLogo.color }"
      :class="{ active: showNetwork }"
      @click="turnNetworkSelector"
    >
      <svg class="shorter-icon icon-gas" aria-hidden="true">
        <use xlink:href="#icon-network-gas" />
      </svg>
      <div class="network-icon">
        <svg class="shorter-icon" aria-hidden="true">
          <use :xlink:href="state.currentLogo.name" />
        </svg>
      </div>
      <keep-alive>
        <span v-show="!state.loading" class="gas">{{ gasPriceText }}</span>
      </keep-alive>
      <shorterSkeletonItem v-show="state.loading" style="height: 28px; width: 24px" />
    </div>
    <transition name="fade">
      <NetworkSelectVue
        v-show="showNetwork"
        @price="getAvg"
        @end-loading="gasLoadingEnd"
        @close-select="switchNetwork"
      />
    </transition>

    <!-- connect -->
    <div v-if="wallet.isConnected" class="connect-account" @click="handleOpenAccountDialog">
      <svg v-show="currentWallet" class="shorter-icon" aria-hidden="true">
        <use :xlink:href="`#icon-${currentWallet}`" />
      </svg>
      <span>{{ state.accountName }}</span>
    </div>
    <!-- unconnected -->
    <div v-else class="connect-account" @click="handleOpenWalletDialog">
      <svg style="width: 20px; height: 20px" class="shorter-icon" aria-hidden="true">
        <use xlink:href="#icon-join" />
      </svg>
      <span class="color-primary">Connect to a wallet</span>
    </div>
  </div>
  <Dialog v-model="walletDialogVisible" width="464px">
    <Wallet @closeWallet="handleCloseWalletDialog" />
  </Dialog>
  <Dialog v-model="networkDialogVisible" width="464px">
    <Networks @closeWallet="handleCloseNetworkDialog" />
  </Dialog>
  <Dialog v-model="accountDialogVisible" width="520px" hidden-close>
    <MyAccount @closeWallet="handleCloseAccountDialog" />
  </Dialog>
</template>
<script setup>
import { reactive, computed, onMounted, watch, ref } from "vue";

import Wallet from "@/components/Dialogs/Wallet";
import Networks from "@/components/Dialogs/Networks";
import MyAccount from "@/components/Dialogs/MyAccount";
import NetworkSelectVue from "@/components/NetworkSelect.vue";

import { getNetworks } from "@/middlewares/manifest/network";
import { useWallet } from "@/hooks/useWallet";
import { ellipsisStr, formatNum } from "@/utils/format";

const { wallet, account, chain } = useWallet();

const networkDialogVisible = ref(false);
const accountDialogVisible = ref(false);
const walletDialogVisible = computed({
  get() {
    return wallet.visible;
  },
  set(val) {
    wallet.visible = val;
  },
});

const state = reactive({
  currentLogo: {
    name: "#icon-ETH",
    color: "#5269FF",
  },
  loading: false,
  gasPrice: 0,
  networks: getNetworks(),
  accountName: computed(() => ellipsisStr(account.value)),
});

const gasPriceText = computed(() => {
  if (!state.gasPrice) return "";

  return state.gasPrice > 0.01 ? formatNum(state.gasPrice) : "< 0.01";
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

function turnNetworkSelector() {
  showNetwork.value = !showNetwork.value;
  const scrollContainer = document.querySelector(".main-container");
  scrollContainer.style.overflowY = showNetwork.value ? "hidden" : "auto";
}

watch(
  () => chain.id,
  () => {
    updateLogo(chain.id);
  },
  {
    immediate: true,
  },
);

watch(
  () => chain.id,
  () => {
    state.loading = true;
    const scrollContainer = document.querySelector(".main-container");
    scrollContainer.style.overflowY = "auto";
  },
);

watch(
  () => account.value,
  val => {
    if (!val) handleCloseAccountDialog();
  },
);

const showNetwork = ref(false);

function handleOpenWalletDialog() {
  walletDialogVisible.value = true;
}

function handleCloseWalletDialog() {
  walletDialogVisible.value = false;
}

function handleOpenAccountDialog() {
  accountDialogVisible.value = true;
}

function handleCloseAccountDialog() {
  accountDialogVisible.value = false;
}

function handleCloseNetworkDialog() {
  networkDialogVisible.value = false;
}

function getAvg(price) {
  state.gasPrice = price;
}

function updateLogo(id) {
  let currentChain = state.networks.find(v => v.networkId === id * 1);

  state.currentLogo = currentChain?.logo ?? { name: "#icon-network-ethereum", color: "#5269FF" };
}

function switchNetwork() {
  showNetwork.value = false;
}

function gasLoadingEnd() {
  state.loading = false;
}

onMounted(() => {
  state.loading = true;
});
</script>
<style lang="scss" scoped>
.account-widget {
  user-select: none;
  position: relative;
  @include flex-center-v;
  align-self: flex-start;
}
.network-logo-container {
  transition: all 0.2s;

  position: relative;
  @include flex-center;
  min-width: 90px;
  height: 48px;
  border-radius: 16px;
  border: 1px solid #6081f8;
  cursor: pointer;
  justify-content: space-between;
  padding: 0 20px;
  .shorter-icon {
    width: 24px;
    opacity: 1;
    height: 24px;
    margin-right: 12px;
    transition: all 0.2s;
  }
  .gas {
    transition: all 0.2s;
    font-size: 14px;
    height: 20px;
    line-height: 20px;
    opacity: 1;
    color: #333333;
  }
  .network-icon {
    background-color: #f8f8f8;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    position: absolute;
    transition: all 0.2s;
    transform: scale(0.66);
    top: 16px;
    left: 28px;
  }
}
.active {
  &.network-logo-container {
    min-width: 64px;
    width: 64px;
  }
  .icon-gas {
    opacity: 0;
  }
  .gas {
    opacity: 0;
  }
  .network-icon {
    transform: scale(1);
    top: 11px;
    left: 20px;
  }
}
.connect-account {
  @include flex-center;
  height: 48px;
  margin-left: 25px;
  padding: 0 21px;
  border-radius: 16px;
  font-size: 14px;
  border: 1px solid $primary;
  cursor: pointer;
  user-select: none;
  .shorter-icon {
    width: 14px;
    height: 14px;
    margin-right: 4px;
    transform: translateY(-1px);
  }
}

.transparent-mask {
  position: absolute;
  width: 100vw;
  height: 100vh;
  left: 0;
  top: 0;
  z-index: 10;
  user-select: none;
  background: transparent;
}
</style>
