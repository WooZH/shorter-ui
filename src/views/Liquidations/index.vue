<template>
  <Layout>
    <template #title>
      <h2 class="title">Liquidations</h2>

      <div class="subtitle">
        <div v-if="noticeVisible" class="subtitle-content">
          Only Rulers are eligible for liquidation.
          <a v-if="wallet.isConnected" href="/governance">Become a Ruler →</a>
        </div>
      </div>
    </template>

    <Tabs v-model="state.curTab">
      <TabItem title="Closing Positions" />
      <TabItem title="Legacy" />
      <TabItem title="Finished" />
    </Tabs>
    <ClosingPositions v-show="state.curTab == 0" />
    <LiquidationsLegacy v-show="state.curTab == 1" />
    <LiquidationsFinished v-show="state.curTab == 2" />
  </Layout>
</template>

<script setup>
import { reactive, computed } from "vue";

import { useWallet } from "@/hooks/useWallet";

import ClosingPositions from "./components/ClosingPositions.vue";
import LiquidationsLegacy from "./components/LiquidationsLegacy.vue";
import LiquidationsFinished from "./components/LiquidationsFinished.vue";

const state = reactive({
  curTab: 0,
  current: "",
});

const { wallet, account } = useWallet();

const noticeVisible = computed(() => {
  if (_.isBoolean(account.isRuler) && account.isRuler === false) {
    return true;
  }
  return false;
});
</script>

<style lang="scss" scoped>
@import "../../styles/variables.scss";

.title {
  font-size: 32px;
  font-family: Haas Grot Disp;
  font-weight: 600;
}

.subtitle {
  height: 17px;
  margin-top: 14px;
  color: #a4a5b2;
  a {
    cursor: pointer;
    text-decoration: underline dashed;
    &:hover {
      color: $primary;
    }
  }
}
</style>
