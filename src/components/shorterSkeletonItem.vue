<template>
  <div class="skeleton" :class="{ circle: variant === 'circle' }" />
</template>

<script>
export default {
  name: "ShorterSkeletonItem",
};
</script>

<script setup>
defineProps({
  circle: {
    default: false,
    type: Boolean,
  },
  variant: {
    default: "square",
    type: String,
  },
});
</script>

<style lang="scss" scoped>
.skeleton {
  width: 100%;
  min-width: 10px;
  height: 100%;
  display: inline-block;
  background: linear-gradient(90deg, #f2f2f2 25%, #e6e6e6 37%, #f2f2f2 63%);
  background-size: 400% 100%;
  border-radius: 2px;
  animation: skeleton-loading 1.4s ease infinite;
}
.circle {
  border-radius: 50%;
}

@keyframes skeleton-loading {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}
</style>
