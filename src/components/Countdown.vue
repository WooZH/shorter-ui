<template>
  <span>{{ state.duration }}</span>
</template>

<script>
export default {
  name: "Countdown",
};
</script>

<script setup>
import { onBeforeUnmount, watchEffect, reactive } from "vue";
import dayjs from "@/plugins/dayjs";

const props = defineProps({
  startTime: {
    type: Number,
    default: 0,
  },
  endTime: {
    type: Number,
    default: 0,
  },
  ruler: {
    type: String,
    default: "mm:ss",
  },
});

const emit = defineEmits(["onStop"]);

const state = reactive({
  minutes: 0,
  seconds: 0,
  duration: "00:00",
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
  const duration = dayjs.duration(timeDiff);
  state.duration = duration.format(props.ruler);
}
</script>
<style lang="scss" scoped>
.countdown {
  @include flex-center;
  height: 34px;
  padding: 0 12px;
  font-size: 18px;
  font-weight: 600;
  color: $primary;
  background: #fef8f6;
  border-radius: 8px;
}
</style>
