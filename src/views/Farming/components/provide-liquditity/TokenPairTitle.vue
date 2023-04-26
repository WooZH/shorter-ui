<template>
  <div class="tokens">
    <div class="token-pair">
      <div class="coins">
        <Image :src="secondLogo" class="token0" />
        <Image :src="firstLogo" class="token1" />
      </div>
      <div class="coin-describe">
        <p class="title">{{ firstToken }} - {{ secondToken }}</p>
        <Tag class="tag">40X</Tag>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useTokenPair } from "./useTokenPair.js";

const { getTokenLogo } = useTokenPair();

const props = defineProps({
  tokenInfo: {
    type: Object,
    default: () => ({}),
  },
  firstToken: {
    type: String,
    default: "IPISTR",
  },
  secondToken: {
    type: String,
    default: "USDT",
  },
});

const firstLogo = computed(() => getTokenLogo(props.tokenInfo, props.firstToken));
const secondLogo = computed(() => getTokenLogo(props.tokenInfo, props.secondToken));
</script>

<style lang="scss" scoped src="../info-group.scss"></style>
<style lang="scss" scoped>
.token-pair {
  display: flex;
  .tag {
    margin-top: 8px;
    height: 16px;
    line-height: 16px;
    color: #1b9ef0;
    background-color: #e8f6fe;
    padding: 0 4px;
  }
}

.coins {
  width: 64px;
  height: 48px;
  position: relative;
  .token0 {
    width: 32px;
    height: 32px;
  }
  .token1 {
    width: 48px;
    height: 48px;
    position: absolute;
    left: 16px;
    background-color: #fff;
    border-radius: 50%;
  }
}

.coin-describe {
  margin-left: 20px;
  .title {
    color: #606266;
    font-size: 16px;
    font-weight: 600;
  }
}
</style>
