<template>
  <div :class="['proposal-status', status]">
    <span>
      <slot />
    </span>
  </div>
</template>

<script setup>
const props = defineProps({
  status: {
    type: String,
    default: () => "",
  },
});
</script>

<style lang="scss" scoped>
.proposal-status {
  @include flex-center-v;
  height: 28px;
  padding: 0 8px;
  background: #f8f8f8;
  color: #a4a5b2;
  font-size: 14px;
  font-style: normal;
  font-family: "Haas Grot Text";
  font-weight: 500;
  border-radius: 8px;
  &.failed {
    color: #fd7676;
    background: rgba(#fd7676, 0.1);
  }
  &.active {
    color: $purple;
    background: rgba($purple, 0.1);
  }
  &.passed {
    color: #02d396;
    background: rgba(#02d396, 0.1);
  }
  span {
    transform: translateY(1px);
  }
}
</style>
