<template>
  <div class="hot-area">
    <ShorterStats class="chart" :total="total" :loading="tokenLoading" title="Total Value Staked" />
    <PoolTokenList class="pool-token-list" :pool-token="tokens" :loading="tokenLoading" list-type="Deposited" />
  </div>
  <TableProvider :sub-pool="subPoolNumber" :pool="pools" :tokens="white" @open="openToken" />
</template>

<script setup>
import PoolTokenList from "./components/PoolTokenList.vue";
import TableProvider from "./components/TableProvider.vue";
import ShorterStats from "./components/shorter-stats/shorterStats.vue";

defineProps({
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

function openToken(token) {
  emit("openToken", token);
}
</script>

<style lang="scss" scoped src="./pools.scss"></style>
