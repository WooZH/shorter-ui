<template>
  <header class="panel-header">
    <h4 class="panel-title title">
      Provide Liquidity for IPISTR
      <a class="link">See instruction and perks</a>
    </h4>

    <p class="mode">
      <span v-show="firstTokenLocked > 0" class="unlock">
        <svg class="icon shorter-icon" aria-hidden="true">
          <use xlink:href="#icon-unlock" />
        </svg>
        Unlock Mode
      </span>
      <span v-show="firstTokenLocked <= 0" class="yield">
        <svg class="icon shorter-icon" aria-hidden="true">
          <use xlink:href="#icon-farming" />
        </svg>
        Yield Mode
      </span>
    </p>
  </header>
</template>

<script setup>
defineProps({
  firstTokenLocked: {
    type: Number,
    default: 0
  }
});
</script>

<style lang="scss" scoped>
.panel-header {
  .mode {
    font-family: $caption;
    font-weight: 600;
    span {
      line-height: 20px;
      color: #a4a5b2;
    }
  }
}

header {
  .link {
    margin-left: 20px;
    font-size: 16px;
    font-family: "Haas Grot Text";
    font-weight: normal;
    color: #909399;
    border-bottom: 1px dashed #909399;
    transition: all 0.1s;
    &:hover {
      color: $primary;
      border-color: $primary;
    }
  }

  svg.icon{
    width: 24px;
    height: 24px;
    vertical-align: -6px;
  }
}
</style>
