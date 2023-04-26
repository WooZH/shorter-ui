<template>
  <transition name="fade">
    <div
      v-if="dialogVisible"
      class="dialog-mask"
      :append-to-body="true"
      :modal="true"
      :destroy-on-close="true"
      v-bind="$attrs"
      @click.self="close"
    >
      <div class="dialog-wrap">
        <div class="dialog">
          <div v-if="!hiddenClose" class="close" @click="close">
            <img class="close-btn" src="@/assets/images/close.svg" />
          </div>
          <main class="dialog-main">
            <header v-if="title" class="dialog-title">
              {{ title }}
            </header>
            <section class="dialog-content">
              <slot />
            </section>
          </main>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: "Dialog",
  inheritAttrs: false,
};
</script>

<script setup>
import { computed } from "vue";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: () => false,
  },
  title: {
    type: String,
    default: () => "",
  },
  hiddenClose: {
    type: Boolean,
    default: () => false,
  },
});
const emit = defineEmits(["update:modelValue"]);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: val => {
    emit("update:modelValue", val);
  },
});

function close() {
  emit("update:modelValue", false);
}
</script>

<style lang="scss" scoped>
.dialog-wrap {
  position: relative;
  min-width: 440px;
  border-radius: 24px;
  background: #fff;
  z-index: 1000;
}
.dialog {
  @include flex;
  position: relative;
  .close {
    position: relative;
    transition: all 0.3s;

    @include flex-center;
    position: absolute;
    right: 32px;
    top: 20px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #ffffff;
    cursor: pointer;
    font-size: 18px;
    z-index: 1;
    font-family: Haas Grot Disp;
    font-weight: 700;
    z-index: 1;
    .icon {
      width: 24px;
      height: 24px;
      color: #11142d;
    }

    &:hover {
      box-shadow: 0 10px 12px rgba(#e3e6ec, 0.5);
      img {
        transform: rotate(180deg);
        transition: 0.3s;
      }
    }
  }
}

.dialog-main {
  flex: 1;
}

.dialog-mask {
  width: 100%;
  background: rgba(0, 0, 0, 0.4);
  position: absolute;
  z-index: 2000;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
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
