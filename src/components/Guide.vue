<template>
  <div v-tooltip.top="`${text}`" class="guide-content">
    <div class="icon-container">
      <svg class="shorter-icon" :style="size" aria-hidden="true">
        <use :xlink:href="`#icon-help`" />
      </svg>
    </div>
  </div>
</template>

<script>
export default {
  name: "Guide",
};
</script>

<script setup>
defineProps({
  text: {
    type: String,
    default: "",
  },
  size: {
    type: Object,
    default: () => {},
  },
});
</script>

<style lang="scss" scoped>
.icon-container {
  cursor: pointer;
  .shorter-icon {
    width: 20px;
    height: 20px;
    color: #a4a5b2;
  }
}
.guide-content {
  @include flex;
  line-height: 16px;
  font-size: 14px;
  // font-family: 'Haas Grot Text';
  // font-weight: 400 !important;
  color: #fff;
  max-width: 400px;
}
</style>
