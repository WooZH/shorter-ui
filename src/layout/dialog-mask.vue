<template>
  <div>
    <div class="screen-mask">
      <slot />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.screen-mask {
  transition: all 0.3s;
  display: flex;
  justify-content: center;
  align-items: center;
  position: fixed;
  width: 100vw;
  height: 100%;
  top: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  z-index: 999;
}
</style>
