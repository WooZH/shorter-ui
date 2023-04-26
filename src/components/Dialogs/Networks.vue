<template>
  <div class="dialog-networks">
    <h4 class="title">Select a Network</h4>
    <ul class="network-list">
      <li
        v-for="(item, index) in state.networks"
        :key="index"
        class="token-item"
        :class="[{ disable: item.disable }, { active: item.networkId * 1 === chain.id * 1 }]"
        @click="checkWork(item)"
      >
        <div class="logo">
          <svg class="shorter-icon" :style="{ color: item.logo.color }" aria-hidden="true">
            <use :xlink:href="item.logo.name" />
          </svg>
        </div>
        <span>
          {{ item.title }}
        </span>
        <CircleCheckFilled class="icon-check" />
      </li>
    </ul>
    <footer v-if="wallet.isConnected" class="footer">
      Currently connected
      <span>{{ chain.name }}</span>
    </footer>
  </div>
</template>
<script setup>
import { reactive, computed } from "vue";

import { switchNetwork } from "@/wallet/wallet";
import { getNetworks } from "@/middlewares/manifest/network";
import { useWallet } from "@/hooks/useWallet";

const emit = defineEmits(["closeWallet"]);
const state = reactive({
  networks: computed(() => {
    const availableNets = [];
    const disableNets = [];
    let networks = getNetworks();
    networks.forEach(item => {
      if (item.disable) {
        disableNets.push(item);
      } else {
        availableNets.push(item);
      }
    });
    return [...availableNets, ...disableNets];
  }),
});

const { wallet, chain } = useWallet();

/**
 * @description: swtichNetwork
 * @param {*} item
 * @return {*}
 */
async function checkWork(item) {
  if (chain.id * 1 !== item.networkId) {
    await switchNetwork(item.chainId);
    setTimeout(() => {
      emit("closeWallet");
      window.location.reload();
    }, 1.5 * 1000);
  }
}
</script>

<style lang="scss" scoped>
.dialog-networks {
  font-family: "Haas Grot Text";
  padding: 32px;
}
h4.title {
  font-family: Haas Grot Disp;
  font-weight: 600;
  color: #11142d;
  font-size: 18px;
}
.network-list {
  margin-top: 48px;
  max-height: 344px;
  overflow: auto;
  li {
    position: relative;
    @include flex-center-v;
    padding: 0 24px;
    margin-bottom: 16px;
    height: 56px;
    border-radius: 8px;
    border: 1px solid rgba(228, 228, 228, 1);
    cursor: pointer;
    &:hover,
    &.active {
      background: #fef8f5;
      border: 1px solid rgba(234, 118, 65, 0.5);
    }

    .logo {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      @include flex-center-v;
      justify-content: center;
      .shorter-icon {
        width: 32px;
        height: 32px;
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
      right: 26px;
      top: 50%;
      transform: translateY(-50%);
      color: #f2a380;
    }
    span {
      margin-left: 12px;
      font-size: 14px;
      color: #333333;
      line-height: 20px;
      transform: translateY(1px);
    }
    &.disable {
      pointer-events: none;
      span {
        color: #909399;
      }
    }
  }
  &::-webkit-scrollbar {
    width: 7px;
    height: 20px;
    cursor: pointer;
  }
  &::-webkit-scrollbar-track {
    background: rgb(239, 239, 239);
    border-radius: 2px;
  }
  &::-webkit-scrollbar-track-piece {
    background-color: #fff; /*滚动条的背景颜色*/
    border-radius: 0; /*滚动条的圆角宽度*/
  }
  &::-webkit-scrollbar-thumb {
    // height: 20px;
    background-color: #f1b8a7;
    border-radius: 4px;
    outline: 2px solid #fff;
    outline-offset: -2px;
    border: 2px solid #fff;
  }
  &::-webkit-scrollbar-thumb:hover {
    /*滚动条的hover样式*/
    cursor: pointer;
    // height: 20px;
    background-color: #f1b8a7;
    border-radius: 4px;
  }
}
.footer {
  font-weight: 600;
  margin-top: 14px;
  font-size: 13px;
  color: #a4a5b2;
  span {
    margin-left: 5px;
    color: $primary;
  }
}
</style>
