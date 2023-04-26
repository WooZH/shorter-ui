<template>
  <transition name="slide-fade">
    <div v-if="modelValue" class="toast-message">
      <div class="icon-container" :class="type">
        <!-- <CircleCheck /> -->
        <svg
          v-if="type === 'success'"
          class="icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1024 1024"
          data-v-7ba3a139=""
        >
          <path
            fill="currentColor"
            d="M512 896a384 384 0 1 0 0-768 384 384 0 0 0 0 768zm0 64a448 448 0 1 1 0-896 448 448 0 0 1 0 896z"
          />
          <path
            fill="currentColor"
            d="M745.344 361.344a32 32 0 0 1 45.312 45.312l-288 288a32 32 0 0 1-45.312 0l-160-160a32 32 0 1 1 45.312-45.312L480 626.752l265.344-265.408z"
          />
        </svg>
        <svg
          v-else-if="type === 'error'"
          class="icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1024 1024"
          data-v-2ca287e0=""
        >
          <path
            fill="currentColor"
            d="m466.752 512-90.496-90.496a32 32 0 0 1 45.248-45.248L512 466.752l90.496-90.496a32 32 0 1 1 45.248 45.248L557.248 512l90.496 90.496a32 32 0 1 1-45.248 45.248L512 557.248l-90.496 90.496a32 32 0 0 1-45.248-45.248L466.752 512z"
          />
          <path
            fill="currentColor"
            d="M512 896a384 384 0 1 0 0-768 384 384 0 0 0 0 768zm0 64a448 448 0 1 1 0-896 448 448 0 0 1 0 896z"
          />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" class="icon" data-v-2ca287e0="">
          <path
            fill="currentColor"
            d="M512 64a448 448 0 1 1 0 896 448 448 0 0 1 0-896zm0 832a384 384 0 0 0 0-768 384 384 0 0 0 0 768zm48-176a48 48 0 1 1-96 0 48 48 0 0 1 96 0zm-48-464a32 32 0 0 1 32 32v288a32 32 0 0 1-64 0V288a32 32 0 0 1 32-32z"
          />
        </svg>
      </div>
      <main class="toast-message-main">
        <header v-if="title" class="title">
          {{ title }}
        </header>
        <section v-if="content" class="toast-message-content" v-html="content" />
        <section v-else class="toast-message-content">
          <slot />
        </section>
      </main>
      <div class="close" @click="onClose">×</div>
    </div>
  </transition>
</template>

<script>
export default {
  name: "ToastMessage",
  inheritAttrs: false,
};
</script>

<script setup>
import { watchEffect } from "vue";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: () => false,
  },
  title: {
    type: String,
    default: () => "",
  },
  content: {
    type: String,
    default: () => "",
  },
  destroy: {
    type: Function,
    default: () => {},
  },
  type: {
    type: String,
    default: () => "success",
    validator(value) {
      return ["success", "warning", "error"].includes(value);
    },
  },
});
const emit = defineEmits(["update:modelValue"]);

let timer = null;

watchEffect(() => {
  clearTimeout(timer);
  if (props.modelValue) {
    timer = setTimeout(() => {
      onClose();
    }, 3000);
  }
});

function onClose() {
  emit("update:modelValue", false);
  props.destroy();
}
</script>

<style lang="scss" scoped>
.toast-message {
  @include flex;
  position: fixed;
  width: 320px;
  right: 64px;
  top: 96px;
  margin-left: -325px;
  background: #fff;
  box-shadow: 0px 10px 40px -4px rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  z-index: 10000;
  transition: 0.3s;
  .toast-message-content {
    font-family: "Haas Grot Text";
    word-break: break-word;
    :deep .message-link {
      display: inline-block;
      text-decoration: underline;
      color: #d08fff;
      margin-top: 8px;
    }
  }
}
.title {
  font-weight: 600;
  margin-bottom: 5px;
}

.icon-container {
  @include flex-center-h;
  width: 56px;
  padding-top: 16px;
  border-radius: 16px 0px 0px 16px;
  color: #fff;
  font-size: 24px;
  .icon {
    width: 24px;
    height: 24px;
  }
  &.success {
    background: #02d396;
  }
  &.error {
    background: #ef5a4f;
  }
  &.warning {
    background: #484040;
  }
}
.toast-message-main {
  max-width: 320px;
  flex: 1;
  padding: 16px 20px 16px 24px;
  display: flex;
  align-items: center;
}

.close {
  @include flex-center;
  width: 24px;
  height: 24px;
  // margin-left:8px;
  margin: 16px 24px 16px 4px;
  border-radius: 50%;
  background: #ffffff;
  cursor: pointer;
  font-size: 24px;
  z-index: 1;
  font-family: Haas Grot Disp;
  font-weight: 600;
}

.slide-fade-enter-active {
  opacity: 1;
  transition: all 0.3s;
}

.slide-fade-leave-active {
  transition: all 0.3s;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}
</style>
