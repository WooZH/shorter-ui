<template>
  <div v-if="isActive && !keepState">
    <slot />
  </div>
  <div v-show="isActive && keepState">
    <slot />
  </div>
</template>

<script>
export default {
  name: "TabItem"
}
</script>

<script setup>
import { computed, inject, watchEffect, getCurrentInstance } from "vue";

const props = defineProps({
  title: {
    type: String,
    default: () => "",
  },
  keepState: {
    type: Boolean,
    default: () => false,
  },
});

const vm = getCurrentInstance();
const { tabs, active } = inject("tabsState");

const index = computed(() => tabs.value.findIndex(target => target.uid === vm.uid));
const isActive = computed(() => index.value === active.value);

watchEffect(() => {
  if (index.value === -1) {
    tabs.value.push(vm);
  }
});
</script>
