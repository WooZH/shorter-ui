<template>
  <div v-if="modelValue" v-copy="{ text: modelValue, success: handleCopySuccess }" class="copy">
    <slot />
    <svg class="shorter-icon" aria-hidden="true">
      <use xlink:href="#icon-copy" />
    </svg>
  </div>
</template>

<script>
export default {
  name: 'Copy'
}
</script>

<script setup>
import { Message } from "@/hooks/useMessage";

const props = defineProps({
  modelValue: {
    type: String,
    default: () => "",
  },
});

function handleCopySuccess() {
  Message("Copied");
}
</script>

<style lang="scss" scoped>
.copy {
  @include flex-center-v;
  cursor: pointer;
  .shorter-icon {
    width: 16px;
    height: 16px;
    color: #a4a5b2;
    margin-left: 8px;
    transform: translateY(-1px);
  }
}
</style>
