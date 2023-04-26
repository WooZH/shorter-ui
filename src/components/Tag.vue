<template>
  <i :class="['tag', color, { 'with-icon': icon }]">
    <img v-if="icon" class="icon" :src="state.icon" />
    <slot />
  </i>
</template>

<script>
export default {
  name: "Tag",
};
</script>

<script setup>
import { reactive } from "vue";

const props = defineProps({
  color: {
    type: String,
    default: () => "default",
  },
  icon: {
    type: String,
    default: () => "",
  },
});
const state = reactive({});
if (props.icon) {
  state.icon = require(`@/assets/icons/${props.icon}.svg`);
}
</script>

<style lang="scss" scoped>
.tag {
  display: inline-block;
  padding: 2px 8px;
  background: #f8f8f8;
  color: #a4a5b2;
  border-radius: 4px;
  font-size: 12px;
  font-style: normal;
  font-weight: 500;
  line-height: 24px;
  &.white {
    background: #fff;
    color: #a4a5b2;
  }
  &.orange {
    color: $primary;
    background: rgba($primary, 0.1);
  }
  &.purple {
    color: $purple;
    background: rgba($purple, 0.1);
  }
  &.green {
    color: $green;
    background: rgba($green, 0.1);
  }
  &.blue {
    color: $blue;
    background: rgba($blue, 0.1);
  }
  &.red {
    color: $red;
    background: rgba($red, 0.1);
  }
  &.dark {
    color: #333;
    background: rgba(#333, 0.12);
  }
  &.brown {
    color: #a25e26;
    background: rgba(#a25e26, 0.1);
  }
}
.with-icon {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 8px;
  .icon {
    width: 17px;
    height: 17px;
    margin-right: 4px;
  }
}
</style>
