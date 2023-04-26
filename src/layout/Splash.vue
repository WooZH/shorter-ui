<template>
  <div class="wrap">
    <div class="symbol">
      <svg class="splash-logo" aria-hidden="true">
        <use xlink:href="#icon-logo_2" />
      </svg>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.wrap {
  background-color: rgba($color: #ffffff, $alpha: 0.9);
  backdrop-filter: blur(10px);
  width: 100vw;
  height: 100vh;

  display: flex;
  justify-content: center;
  align-items: center;

  position: absolute;
  top: 0;
  left: 0;
  z-index: 9999;
}
.symbol .splash-logo {
  position: relative;
  width: 100px;
  height: 100px;
  animation: jump 2s infinite ease-in-out;
}
@keyframes jump {
  0% {
    transform: translateY(0%) scale(1.05, 0.95);
  }
  45% {
    transform: translateY(-50%) scale(1, 1);
  }
  50% {
    transform: translateY(-50%) scale(1, 1);
  }
  55% {
    transform: translateY(-50%) scale(1, 1);
  }
  100% {
    transform: translateY(0%) scale(1.05, 0.95);
  }
}
</style>
