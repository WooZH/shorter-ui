<template>
  <ul class="tabs">
    <li v-for="(tab, i) of tabs" :key="i" :class="['tab-item-' + type, { active: active === i }]" @click="selectTab(i)">
      <span>
        {{ tab.props.title }}
      </span>
    </li>
  </ul>
  <div>
    <slot />
  </div>
</template>

<script>
export default {
  name: "Tabs",
};
</script>

<script setup>
import { provide, computed, ref } from "vue";

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: () => 0,
  },
  type: {
    type: Number,
    default: () => 1,
  },
});

const emit = defineEmits(["update:modelValue", "change"]);

const active = computed(() => props.modelValue);
const tabs = ref([]);

function selectTab(tab) {
  emit("update:modelValue", tab);
  emit("change", tab);
}

provide("tabsState", {
  active,
  tabs,
});
</script>
<style lang="scss" scoped>
.tabs {
  @include flex;
  .tab-item.light {
    &.active {
      background: #fff;
      border-color: $primary;
      color: $primary;
    }
  }
  .tab-item-1 {
    @include flex-center-v;
    height: 45px;
    padding: 0 32px;
    font-size: 16px;
    color: #b9b7b7;
    background: #f4f2f1;
    font-family: $caption;
    cursor: pointer;
    transition: all 0.3s;
    font-weight: 600;

    &.active {
      background: #fff;
      color: $primary;
      font-weight: 600;
    }
    &:not(&:first-child) {
      border-left: 1px solid #fff;
    }
    &:first-child {
      border-top-left-radius: 16px;
    }
    &:last-child {
      border-top-right-radius: 16px;
    }
  }
  .tab-item-2 {
    margin-right: 64px;
    padding: 12px 0;
    font-size: 14px;
    color: #a4a5b2;
    cursor: pointer;
    border: 1px solid transparent;
    font-family: Haas Grot Disp;
    font-weight: 600;
    border-bottom: 2px solid transparent;
    transition: all 0.3s;
    &.active {
      color: $primary;
      border-bottom-color: $primary;
    }
  }
  .tab-item-3 {
    @include flex-center;
    padding: 0 24px;
    font-size: 16px;
    color: #bcbcbc;
    cursor: pointer;
    font-family: $caption;
    transition: all 0.3s;
    font-weight: 600;
    &:not(&:first-child) {
      border-left: 1px solid #ebebeb;
    }
    &:hover {
      color: #333;
    }
    &.active {
      color: #333;
      font-weight: 600;
    }
  }
}
</style>
