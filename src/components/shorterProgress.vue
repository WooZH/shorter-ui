<template>
  <div class="progress-bar" :style="`height:${strokeWidth}px`">
    <div class="current" :style="`width:${percentage}%; background: ${color}`" />
  </div>
</template>

<script>
export default {
  name: "ShorterProgress",
};
</script>

<script setup>
const props = defineProps({
  color: {
    default: "#f3f3f3",
    type: String,
  },
  percentage: {
    default: 0,
    type: [Number, String],
  },
  strokeWidth: {
    default: 10,
    type: Number,
  },
});
</script>

<style lang="scss" scoped>
.progress-bar {
  width: 100%;
  background: #f8f8f8;
  border-radius: 100px;
  overflow: hidden;
}
.current {
  width: 0;
  border-radius: 100px;
  height: 100%;
  transition: width 0.6s;
}
</style>
