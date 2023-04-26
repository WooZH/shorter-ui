<template>
  <div class="skeleton-item">
    <div v-show="loading" class="template">
      <slot name="template" />
    </div>
    <div v-show="!loading" class="default">
      <slot name="default" />
    </div>
  </div>
</template>
<script>
export default {
  name: "ShorterSkeleton",
};
</script>
<script setup>
defineProps({
  loading: {
    default: true,
    type: Boolean,
  },
});
</script>

<style lang="scss" scoped>
.skeleton-item {
  position: relative;
}
</style>
