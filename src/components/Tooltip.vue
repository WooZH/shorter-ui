<template>
  <!-- tooltip -->
  <transition name="tooltip">
    <div v-show="tooltipShow" class="shorter-tooltip" :style="tooltipStyle">
      <span class="shorter-tooltip-text" v-html="text" />
      <div
        class="shorter-tooltip-arrow"
        :class="[
          { left: placements == 'left' },
          { bottom: placements == 'bottom' },
          { right: placements == 'right' },
          { top: placements == 'top' },
        ]"
      />
    </div>
  </transition>
</template>

<script setup>
import { ref, computed } from "vue";

// 显示弹框
const tooltipShow = ref(false);

// 提示内容
const text = ref();

// 方向
const placements = ref("left");

// 显示
function showTip() {
  tooltipShow.value = true;
}

function hiddenTip() {
  tooltipShow.value = false;
}

// 位置
const tooltipPosition = ref({
  x: 0,
  y: 0,
});

const tooltipStyle = computed(() => {
  return {
    transform: `translate3d(${tooltipPosition.value.x}px,${tooltipPosition.value.y}px,0)`,
  };
});
</script>

<style lang="scss" scoped>
.shorter-tooltip {
  padding: 10px;
  font-size: 14px;
  font-family: "Haas Grot Disp";
  font-weight: 700;
  line-height: 1.2;
  min-width: 10px;
  word-wrap: break-word;
  position: fixed;
  left: 0;
  top: 0;
  background: #303133;
  color: #fff;
  z-index: 8000;
  display: inline-block;
  border-radius: 8px;
  pointer-events: none;
}

// 小箭头
.shorter-tooltip-arrow {
  position: absolute;
  width: 0;
  height: 0;
  border-width: 8px;
  border-style: solid;
}

// 如果在左侧
.shorter-tooltip-arrow.left {
  border-color: transparent transparent transparent #303133;
  right: -15px;
  top: 50%;
  transform: translate3d(0, -50%, 0);
}
// 如果在下侧
.shorter-tooltip-arrow.bottom {
  top: -15px;
  border-color: transparent transparent #303133 transparent;
  left: 50%;
  transform: translate3d(-50%, 0, 0);
}
// 如果在右侧
.shorter-tooltip-arrow.right {
  left: -15px;
  top: 50%;
  transform: translate3d(0, -50%, 0);
  border-color: transparent #303133 transparent transparent;
}
// 如果在上侧
.shorter-tooltip-arrow.top {
  bottom: -15px;
  border-color: #303133 transparent transparent transparent;
  left: 50%;
  transform: translate3d(-50%, 0, 0);
}

/* 动画 */
.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transition: opacity 0.3s ease;
}
.tooltip-leave-from,
.tooltip-enter-to {
  transition: opacity 0.1s ease;
}
</style>
