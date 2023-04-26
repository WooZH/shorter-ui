<template>
  <transition name="fade">
    <div class="mask">
      <Loading class="loading" />
    </div>
  </transition>
</template>

<script>
export default {
  name: 'maskLoading'
}
</script>

<script setup>
import Loading from "./Loading.vue";
</script>

<style lang="scss" scoped>
.mask {
  width: 100%;
  background: rgba(255, 255, 255, 0.8);
  position: absolute;
  z-index: 100;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.loading {
  width: 40px;
  height: 40px;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
