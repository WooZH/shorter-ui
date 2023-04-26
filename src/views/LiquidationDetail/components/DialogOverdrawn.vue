<template>
  <div class="overdrawn">
    <p>
      This position was
      <span v-if="aborted">aborted</span>
      <span v-else>overdrawn</span>
      . Its state will be rendered into
      <span>Legacy</span>
      soon. Keep track of the liquidation detail page and cut in at perfect timing.
    </p>
    <shorterButton type="primary" style="width: 100%; height: 56px" @click="$emit('close')">Got it!</shorterButton>
  </div>
</template>

<script setup>
const props = defineProps({
  aborted: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close"]);
</script>

<style lang="scss" scoped>
.overdrawn {
  padding: 32px;
  width: 500px;
  p {
    font-size: 16px;
    line-height: 24px;
    margin-bottom: 30px;
    span {
      color: $primary;
      font-weight: 600;
    }
  }
}
</style>
