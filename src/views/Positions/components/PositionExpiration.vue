<template>
  <div class="position-expiration">
    <svg class="shorter-icon" aria-hidden="true" style="margin-right: 5px; color: #e4e4e4">
      <use xlink:href="#icon-countdown" />
    </svg>
    <span>
      {{ state.duration }}
    </span>
  </div>
</template>

<script setup>
import { onBeforeUnmount, watchEffect, reactive } from "vue";

import { getDuration } from "@/utils/date";

const props = defineProps({
  startTime: {
    type: Number,
    default: 0,
  },
  endTime: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(["onStop"]);

const state = reactive({
  duration: "--",
});

let timer = null;

watchEffect(() => {
  if (props.startTime && props.endTime) {
    const timeDiff = props.endTime - props.startTime;
    if (timeDiff >= 0) {
      timeLoop(timeDiff);
    } else {
      emit("onStop");
    }
  }
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});

function timeLoop(timeDiff) {
  clearInterval(timer);
  getTime(timeDiff);
  timer = setInterval(() => {
    getTime(timeDiff);
    if (timeDiff <= 0) {
      emit("onStop");
      clearInterval(timer);
    } else {
      timeDiff -= 1000;
    }
  }, 1000);
}

function getTime(timeDiff) {
  state.duration = getDuration(timeDiff);
}
</script>

<style lang="scss" scoped>
.position-expiration {
  position: absolute;
  right: 8px;
  top: -20px;
  @include flex-center-v;
  height: 32px;
  padding: 0 12px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e4e4e4;
  color: #a4a5b2;
  span {
    transform: translateY(1px);
  }
}
</style>
