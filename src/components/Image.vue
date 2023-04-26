<template>
  <img v-if="src" :src="src" :class="['template-img', { circle }]" />
  <svg v-else class="svg-icon" aria-hidden="true">
    <use xlink:href="#icon-default" />
  </svg>
</template>

<script>
export default {
  name: "Image",
};
</script>

<script setup>
const props = defineProps({
  circle: {
    type: Boolean,
    default: () => false,
  },
  src: {
    type: String,
    default: "",
  },
});
</script>
<style lang="scss" scoped>
.template-img {
  &.circle {
    border-radius: 50%;
  }
  .shorter-icon {
    width: 100%;
    height: 100%;
  }
}
</style>
