<template>
  <div class="wallet">
    <div class="title strong">
      <a v-show="turnGuide" class="more" @click="switchGuide(false)">← Turn on Metamask</a>
      <span v-show="!turnGuide">Select a Wallet</span>
    </div>

    <div v-if="!turnGuide" class="main-content">
      <p v-if="!isMetamaskValid" class="install-meta" @click="currentWalletId = null">
        <svg class="shorter-icon icon-meta" aria-hidden="true">
          <use xlink:href="#icon-metamask" />
        </svg>

        <span v-if="isMetamaskInstalled">
          <span>
            <span class="underline-text" @click="switchGuide(true)">Turn on</span>
          </span>
          <span>&nbsp;/&nbsp;</span>
          <a class="underline-text" target="_blank" href="https://metamask.io/">Install</a>
          &nbsp;Metamask
        </span>

        <span v-else>
          <a class="underline-text" target="_blank" href="https://metamask.io/">Install&nbsp;Metamask</a>
        </span>
      </p>

      <a v-if="isMetamaskLock" class="install-meta" @click="unlockMetamask">
        <svg class="shorter-icon icon-meta" aria-hidden="true">
          <use xlink:href="#icon-metamask" />
        </svg>
        <span class="underline-text">Unlock Metamask</span>
      </a>

      <ul class="wallet-list">
        <li
          v-for="(item, index) in filterList"
          :key="index"
          :class="{ active: currentWalletId === item.id }"
          @click="onSelectWallet(item.id)"
        >
          <svg class="shorter-icon icon-wallet" aria-hidden="true">
            <use :xlink:href="item.icon" />
          </svg>
          <span>
            {{ item.name }}
          </span>
          <CircleCheckFilled v-if="currentWalletId === item.id" class="icon-check" />
        </li>
      </ul>

      <footer class="footer">
        <div class="network-select">
          <label>Network</label>
          <div class="select-inner" :class="{ active: dropdownVisible }" @click="dropdownVisible = !dropdownVisible">
            <svg class="shorter-icon icon-network" :style="{ color: curNetwork.logo.color }" aria-hidden="true">
              <use :xlink:href="curNetwork.logo.name" />
            </svg>
            <span>{{ curNetwork ? curNetwork.abbr : "" }}</span>

            <div class="icon-caret" />
            <transition>
              <div v-if="dropdownVisible" class="select-dropdown">
                <div max-height="170px">
                  <ul>
                    <li
                      v-for="(item, index) in networks"
                      :key="index"
                      :class="{ disabled: item.isDisabled }"
                      @click="onSelectNetwork(item.networkId)"
                    >
                      <svg class="shorter-icon icon-network" :style="{ color: item.logo.color }" aria-hidden="true">
                        <use :xlink:href="item.logo.name" />
                      </svg>
                      <span>{{ item.title }}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </transition>
          </div>
        </div>

        <shorterButton :disabled="!currentWalletId" class="full big connect-btn" type="primary" @click="handleConnect">
          Connect
        </shorterButton>
      </footer>
    </div>
    <div v-if="turnGuide" class="main-content">
      <video class="guide-video" muted autoplay playsinline loop src="../../assets/images/turnOnMatemask.mp4" />
      <div class="guide-copy">
        <span class="chrome-url">chrome://extensions/</span>
        <div
          v-tooltip.top="'Copy'"
          v-copy="{ text: 'chrome://extensions/', success: handleCopySuccess }"
          class="copy-icon"
        >
          <svg class="shorter-icon" aria-hidden="true">
            <use xlink:href="#icon-account_copy" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";

import { Message } from "@/hooks/useMessage";
import { useWallet } from "@/hooks/useWallet";

import { DEFAULT_CHAIN_ID, getNetworks } from "@/middlewares/manifest/network";

import { switchNetwork } from "@/wallet/wallet";
import { isMetaMaskAvailable, isMetaMaskLocked, requestMetamaskAccount } from "@/wallet/metamask";
import { createWalletConnect } from "@/wallet/walletconnect";

import { Local } from "@/utils/localStorage";

const emit = defineEmits(["closeWallet"]);

const { chain } = useWallet();

const wallets = [
  {
    id: 2,
    name: "MetaMask",
    icon: "#icon-metamask",
  },
  {
    id: 1,
    name: "WalletConnect",
    icon: "#icon-wallet-connect",
  },
];
const networks = getNetworks();

const currentWalletId = ref(null);
const currentNetworkId = ref(null);
const selectedNetworkId = ref(null);
const isMetamaskInstalled = ref(false);
const dropdownVisible = ref(false);
const turnGuide = ref(false);

const isMetamaskValid = computed(() => {
  return isMetaMaskAvailable();
});

const isMetamaskLock = computed(() => {
  return isMetaMaskLocked();
});

const filterList = computed(() => {
  if (isMetamaskValid.value && !isMetamaskLock.value) {
    return wallets;
  } else {
    return [
      {
        name: "WalletConnect",
        icon: "#icon-wallet-connect",
        id: 1,
      },
    ];
  }
});

function initNetwork() {
  currentNetworkId.value = chain.id || DEFAULT_CHAIN_ID;
}
initNetwork();

const curNetwork = computed(() => {
  const selectedNetwork = networks.find(o => String(o.networkId) === String(currentNetworkId.value));
  return selectedNetwork;
});

function onSelectWallet(id) {
  currentWalletId.value = id;
}

function onSelectNetwork(id) {
  currentNetworkId.value = id;
}

async function unlockMetamask() {
  const id = chain.id || DEFAULT_CHAIN_ID;
  const selectedNetwork = networks.find(o => String(o.networkId) === String(id));
  await connectMetamask(selectedNetwork);
  emit("closeWallet", false);
}

async function handleConnect() {
  const selectedNetwork = networks.find(o => String(o.networkId) === String(currentNetworkId.value));
  if (!selectedNetwork.chainId) {
    return;
  }

  if (currentWalletId.value === 2) {
    connectMetamask(selectedNetwork);
    return;
  }
  if (currentWalletId.value === 1) {
    connectWalletConnect();
  }
}

async function connectMetamask(selectedNetwork) {
  try {
    emit("closeWallet", false);
    await requestMetamaskAccount();
    await switchNetwork(selectedNetwork.chainId);
  } catch (error) {
    console.log(error, "connectMetamask initializing");
  }
}

async function connectWalletConnect() {
  try {
    await createWalletConnect();
    emit("closeWallet", false);
  } catch (error) {
    console.log(error, "connectWalletConnect");
  }
}

function handleCopySuccess() {
  Message.success("Copied");
}

onMounted(() => {
  if (isMetaMaskAvailable()) {
    currentWalletId.value = 2;
  }

  isMetamaskInstalled.value = Local.get("isMetamaskInstalled") || false;
});

onBeforeUnmount(() => {
  turnGuide.value = false;
});

function switchGuide(type) {
  turnGuide.value = type;
}
</script>

<style lang="scss" scoped>
.connect-btn {
  margin-left: 12px;
  flex: 1;
}

.wallet {
  font-family: Haas Grot Text;
  padding: 32px;
  .title {
    font-size: 18px;
    color: #11142d;
  }
}

.main-content {
  margin-top: 48px;
  position: relative;
}

.install-meta {
  @include flex-center-v;
  position: relative;
  height: 56px;
  padding: 0 16px;
  border-radius: 8px;
  border: 1px solid #e4e4e4;
  margin-bottom: 16px;
  .icon-meta {
    width: 24px;
    height: 24px;
    margin-right: 8px;
  }
  .install-text {
    margin-left: 8px;
    text-decoration: underline;
  }
  .underline-text {
    text-decoration: underline;
  }
  transition: all 0.3s;
  &:hover {
    border-color: #ea7641;
    background: #fef8f5;
    cursor: pointer;
  }
}

.wallet-list {
  li {
    @include flex-center-v;
    position: relative;
    height: 56px;
    padding: 0 16px;
    border-radius: 8px;
    border: 1px solid #e4e4e4;
    transition: all 0.3s;

    &:not(&:first-child) {
      margin-top: 16px;
    }
    &.active,
    &:hover {
      border-color: #ea7641;
      background: #fef8f5;
      cursor: pointer;
    }
    span {
      margin-left: 8px;
      transform: translateY(2px);
    }
    .icon-wallet {
      width: 24px;
      height: 24px;
    }
    .icon-check {
      position: absolute;
      right: 16px;
      width: 24px;
      height: 24px;
      top: 50%;
      transform: translateY(-50%);
      color: #f2a380;
    }
  }
}

.footer {
  @include flex-center-v;
  justify-content: space-between;
  margin-top: 32px;

  .btn {
    flex: 1;
    margin-left: 12px;
    height: 56px;
  }
}

.network-select {
  @include flex-center-v;
  position: relative;
  width: 40%;
  height: 50px;
  background: #ffffff;
  border: 1px solid $primary;
  border-radius: 12px;
  margin-right: 12px;

  label {
    position: absolute;
    padding: 0 3px;
    font-size: 12px;
    color: #a4a5b2;
    left: 17px;
    top: 0;
    transform: translateY(-50%);
    background: #fff;
  }

  .select-inner {
    @include flex-center-v;
    position: absolute;
    width: 100%;
    padding: 8px 30px 8px 16px;
    .icon-caret {
      width: 0;
      height: 0;
      border: 5px solid;
      border-color: transparent;
      border-top-color: #666;
      position: absolute;
      right: 16px;
      top: calc(50% + 2.5px);
      transform: translateY(-50%);
      transform-origin: center 25%;
      transition: 0.3s;
      cursor: pointer;
    }

    &.active .icon-caret {
      transform: translateY(-50%) rotate(180deg);
    }
    .icon-network {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      cursor: pointer;
    }
    > span {
      @include ellipsis(1);
      flex: 1;
      margin-left: 8px;
      transform: translateY(2px);
      height: 20px;
      line-height: 20px;
      cursor: pointer;
    }
  }
  .select-dropdown {
    position: absolute;
    top: 56px;
    left: 0;
    width: 265px;
    // max-height: 170px;
    background: #ffffff;
    border: 1px solid #e3e3e3;
    border-radius: 8px;
    // overflow-y: auto;
    ul {
      padding: 6px 0;
      li {
        @include flex-center-v;
        height: 52px;
        padding: 0 16px;
        cursor: pointer;
        &.disabled {
          pointer-events: none;
          cursor: none;
        }
        &:not(&:first-child) {
          border-top: 1px solid #f8f8f8;
        }
        &:hover {
          color: $primary;
        }
        svg {
          flex-shrink: 0;
        }
        span {
          @include ellipsis(1);
          margin-left: 8px;
          transform: translateY(2px);
        }
      }
    }
  }
}

.turn-guide {
  background: #fff;
  height: 100%;
  width: 100%;
  top: 0;
  left: 0;
}

.guide-video {
  width: 500px;
  border-radius: 12px;
  margin-bottom: 12px;
}

.guide-copy {
  display: flex;
  justify-content: center;
  font-size: 16px;

  color: #303133;
  line-height: 30px;
}

.copy-icon {
  margin-left: 4px;
  cursor: pointer;
}
</style>
