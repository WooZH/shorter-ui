<template>
  <span class="sort" :class="{ up: status === 1, down: status === 2 }" />
</template>

<script>
export default {
  name: "SortIcon",
};
</script>

<script setup>
defineProps({
  status: {
    type: Number,
    default: 0,
  },
});
</script>

<style lang="scss" scoped>
.sort {
  width: 24px;
  height: 14px;
  display: inline-block;
  position: relative;
  cursor: pointer;
  &::before,
  &::after {
    content: "";
    position: absolute;
    transition: all 0.3s;
    width: 0;
    height: 0;
    border-style: solid;
  }
  &::before {
    top: 2px;
    left: 8px;
    border-width: 0 4px 4px 4px;
    border-color: transparent transparent #606266 transparent;
  }
  &::after {
    bottom: 2px;
    left: 8px;
    border-width: 4px 4px 0 4px;
    border-color: #606266 transparent transparent transparent;
  }
}
.up {
  &::before {
    border-color: transparent transparent #ef7f45 transparent;
  }
}
.down {
  &::after {
    border-color: #ef7f45 transparent transparent transparent;
  }
}
</style>
