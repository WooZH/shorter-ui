<template>
  <div class="warn">
    <p>
      {{ warn.content }}
    </p>
  </div>
</template>

<script setup>
import { warn } from "@/hooks/useWarning";
</script>

<style lang="scss" scoped>
.warn {
  @include flex-center;
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  height: 56px;
  background: #ff614c;
  p {
    @include ellipsis(1);
    padding: 0 32px;
    color: #fff;
    font-weight: 600;
    font-size: 14px;
  }
}
</style>
