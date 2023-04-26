<template>
  <div class="network-wrap">
    <div class="panel">
      <h4 class="title">Network</h4>
      <div class="network-list">
        <div
          v-for="(item, index) in curNetworkList"
          :key="index"
          class="token-item"
          :class="[{ active: item.networkId == chain.id }]"
          @click="selectNetwork(item)"
        >
          <div class="logo">
            <svg class="shorter-icon" :style="{ color: item.logo.color }" aria-hidden="true">
              <use :xlink:href="item?.logo?.name" />
            </svg>
          </div>
          <span>{{ item.abbr }}</span>
        </div>
      </div>
      <div v-show="isTestnet" class="testnet">
        <p class="title">Testnet Playground</p>
        <div class="desc">
          <a class="go-test item" @click="toBetaProgram">
            <span>Get test tokens</span>
            <svg width="16" height="16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M28 6H42V20" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
              <path
                d="M42 29.4737V39C42 40.6569 40.6569 42 39 42H9C7.34315 42 6 40.6569 6 39V9C6 7.34315 7.34315 6 9 6L18 6"
                stroke-width="4"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M25.7998 22.1999L41.0998 6.8999"
                stroke-width="4"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </a>
          <a href="https://docs.shorter.finance/miscellaneous/testnet-playground.html" target="_blank" class="item">
            <p>Tutorial</p>
            <svg width="16" height="16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M28 6H42V20" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
              <path
                d="M42 29.4737V39C42 40.6569 40.6569 42 39 42H9C7.34315 42 6 40.6569 6 39V9C6 7.34315 7.34315 6 9 6L18 6"
                stroke-width="4"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M25.7998 22.1999L41.0998 6.8999"
                stroke-width="4"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
    <div class="gas-price-title">
      Realtime
      <span class="highlight">{{ currentChainName }}</span>
      gas prices
    </div>
    <div class="gas-price-list">
      <div
        v-for="item in gasPricesShow"
        :key="item.name"
        :class="{ active: item.level === selectedLevel }"
        class="price-list-item"
        @click="selectLevel(item.level)"
      >
        <div class="left">
          <svg class="shorter-icon" aria-hidden="true">
            <use :xlink:href="`#icon-network-${item.name.toLowerCase()}`" />
          </svg>
          <p>{{ item.name }}</p>
        </div>

        <p class="price">
          <shorterSkeleton animated :loading="loading">
            <template #template>
              <shorterSkeletonItem style="margin-top: 7px; height: 20px; width: 100px" />
            </template>
            <template #default>
              {{ formatNum(toNonExponential(item.price), 4) }}
              Gwei
            </template>
          </shorterSkeleton>
        </p>
      </div>
    </div>
  </div>
</template>
<script setup>
import { onBeforeMount, ref, watch, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import NP from "number-precision";
import { utils } from "ethers";

import { getNetworkConfigById, getNetworks, isTestNetworkId } from "@/middlewares/manifest/network";
import { getRPCProvider } from "@/wallet/provider";
import { switchNetwork } from "@/wallet/wallet";

import { useWallet } from "@/hooks/useWallet";
import { useInterval } from "@/hooks/useInterval";

import { toNonExponential, formatNum } from "@/utils/format";

const { chain } = useWallet();
const router = useRouter();
const route = useRoute();
const { addNormalPriorityInterval } = useInterval();

const emit = defineEmits(["price", "closeWallet", "endLoading", "closeSelect"]);

const gasPrices = ref({
  fast: {
    level: 1,
    name: "Fast",
    price: 0,
  },
  avg: {
    level: 2,
    name: "Average",
    price: 0,
  },
  slow: {
    level: 3,
    name: "Slow",
    price: 0,
  },
});

const gasPricesShow = computed(() => {
  /*
   * ? BNB
   **/
  const tempGas = Object.assign({}, gasPrices.value);

  if (chain.id === "56") {
    delete tempGas.slow;
    return tempGas;
  }
  return tempGas;
});

const loading = ref(false);

// todo
// bsct情况下,gasprice低于avg会报错
const selectedLevel = ref(2);

watch(
  () => chain.id,
  () => {
    emit("closeSelect", false);
    refreshGasPrice();
  },
);

const isTestnet = computed(() => {
  return isTestNetworkId(chain.id);
});

const currentChainName = computed(() => {
  return getNetworkConfigById(chain.id)?.abbr;
});

const curNetworkList = getNetworks();

onBeforeMount(async () => {
  const savedLevel = sessionStorage.getItem("shorter_gasLevel");
  if (savedLevel) {
    selectedLevel.value = Number(savedLevel);
  } else {
    sessionStorage.setItem("shorter_gasLevel", 2);
  }

  refreshGasPrice();
});

function selectLevel(level) {
  selectedLevel.value = level;
  sessionStorage.setItem("shorter_gasLevel", level);
}

async function selectNetwork(item) {
  if (chain.id * 1 !== item.networkId) {
    const res = await switchNetwork(item.chainId);

    const scrollContainer = document.querySelector(".main-container");
    scrollContainer.style.overflowY = "auto";

    if (res === "success") {
      emit("closeSelect", item);
    } else if (res === "cancel") {
      emit("closeSelect", false);
    } else {
      emit("closeSelect", { noWallet: item.chainId });
    }
  }
}

function toBetaProgram() {
  router.push({ name: "Testnet Playground", query: route.query });
}

async function refreshGasPrice() {
  loading.value = true;

  await getGasPriceAction();
  addNormalPriorityInterval(getGasPriceAction);
}

async function getGasPriceAction() {
  try {
    const provider = getRPCProvider();
    const gasPrice = await provider.getGasPrice();
    setGasPriceToStorage(gasPrice.toString());

    const formattedGas = utils.formatUnits(gasPrice, "gwei");
    emit("price", formattedGas);

    gasPrices.value.fast.price = NP.times(formattedGas, 1 + 0.15);
    gasPrices.value.avg.price = formattedGas;
    gasPrices.value.slow.price = NP.times(formattedGas, 1 - 0.15);
  } catch (e) {
    gasPrices.value.fast.price = null;
    gasPrices.value.avg.price = null;
    gasPrices.value.slow.price = null;
  } finally {
    loading.value = false;
    setTimeout(() => {
      emit("endLoading");
    }, 500);
  }
}

function setGasPriceToStorage(price) {
  sessionStorage.setItem("shorter_gasPrice", price);
}
</script>

<style lang="scss" scoped>
.network-wrap {
  top: 60px;
  z-index: 101;
  left: -236px;
  position: absolute;
  width: 300px;
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e3e3e3;
  padding: 24px 12px;
  padding-bottom: 10px;
}

.panel {
  padding: 0 12px;
}
.title {
  font-size: 18px;
  font-family: "Haas Grot Disp";
  font-weight: 600;
  color: #303133;
  line-height: 24px;
}
.network-list {
  margin-top: 24px;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px 6px;
  .token-item {
    width: 100%;
    position: relative;
    @include flex-center-v;
    flex-direction: column;
    padding: 12px 0 12px;
    border-radius: 8px;
    border: 1px solid rgba(228, 228, 228, 1);
    cursor: pointer;
    transition: all 0.2s;
    &:hover,
    &.active {
      background: #fef8f5;
      border: 1px solid rgba(234, 118, 65, 0.5);

      span {
        color: $primary;
      }
    }
    &.active {
      &:hover {
        cursor: not-allowed;
      }
    }

    .logo {
      background-color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      @include flex-center-v;
      justify-content: center;
      .shorter-icon {
        width: 24px;
        height: 24px;
      }
    }
    &.active {
      .icon-check {
        width: 20px;
        height: 20px;
        display: unset;
      }
    }
    .icon-check {
      display: none;
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: #f2a380;
    }
    span {
      transition: all 0.2s;
      color: #909399;
      margin-top: 6px;
      font-size: 12px;
      line-height: 18px;
    }
  }
}
.gas-price-title {
  font-family: "Haas Grot Disp";
  padding-top: 24px;
  margin-left: 12px;
  margin-right: 12px;
  border-top: 1px solid #eeeeee;
  margin-top: 24px;
  font-size: 14px;
  color: #909399;
  line-height: 20px;
}
.highlight {
  color: $primary;
}
.left {
  display: flex;
  align-items: center;
  .shorter-icon {
    width: 32px;
    height: 32px;
    margin-right: 16px;
  }
}
.price-list-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  .price {
    height: 32px;
    line-height: 32px;
  }
  padding: 12px;
  border: 1px solid #ffffff;
  border-radius: 8px;
  transition: all 0.3s;
  cursor: pointer;

  &:not(:last-child) {
    // border-bottom: 1px solid #eeeeee;
    margin-bottom: 6px;
  }
  &:hover {
    background: #fef8f5;
    border: 1px solid rgba(234, 118, 65, 0.5);
  }
}
.gas-price-list {
  margin-top: 16px;
  .active {
    background: #fef8f5;
    border: 1px solid rgba(234, 118, 65, 0.5);
    cursor: not-allowed;
    pointer-events: none;

    .shorter-icon {
      animation: scale 0.5s ease-in;
    }
  }
}

@keyframes scale {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

.testnet {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #eeeeee;
  .title {
    font-size: 14px;
    font-family: "Haas Grot Disp";
    font-weight: normal;
    color: #909399;
    line-height: 20px;
    margin-bottom: 20px;
  }
  .desc {
    display: flex;
    justify-content: space-between;

    .item {
      display: flex;
      align-items: center;
      line-height: 20px;
      font-size: 14px;
      height: 20px;
      color: #303133;
      stroke: #303133;
      transition: all 0.3s;

      svg {
        margin-left: 4px;
      }

      svg:hover {
        color: $primary;
        stroke: $primary;
      }
      &:hover {
        color: $primary;
        stroke: $primary;
      }
    }
  }
}
</style>
