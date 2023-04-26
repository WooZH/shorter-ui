<template>
  <div class="hot-area">
    <ShorterStats class="chart" :total="total" :loading="tokenLoading" title="Total Value Borrowed" />
    <PoolTokenList class="pool-token-list" :pool-token="tokens" :loading="tokenLoading" list-type="Borrowed" />
  </div>

  <TableTrader
    id="table-pool"
    :sub-pool="subPoolNumber"
    :pool="pools"
    :tokens="white"
    :loading="pools.borrowLoad"
    @open="openToken"
  />
</template>

<script setup>
import { onMounted } from "vue";
import { useRoute } from "vue-router";

import PoolTokenList from "./components/PoolTokenList.vue";
import TableTrader from "./components/TableTrader.vue";
import ShorterStats from "./components/shorter-stats/shorterStats.vue";

const props = defineProps({
  pools: {
    type: Object,
    default: () => {},
  },
  tokens: {
    type: Object,
    default: () => {},
  },
  tokenLoading: {
    type: Boolean,
    default: () => {},
  },
  total: {
    type: Number,
    default: 0,
  },
  white: {
    type: Array,
    default: () => [],
  },
  subPoolNumber: {
    type: Map,
    default: () => new Map(),
  },
});

const emit = defineEmits(["openToken"]);

const route = useRoute();

onMounted(() => {
  if (route.hash) {
    document.getElementById("table-pool").scrollIntoView();
  }
});

function openToken(token) {
  emit("openToken", token);
}
</script>

<style lang="scss" scoped src="./pools.scss"></style>
