<template>
  <div class="countdown">
    <table v-if="!loading">
      <tr>
        <th>Minutes</th>
        <th>Seconds</th>
      </tr>
      <tr>
        <td>{{ state.duration[0] }}</td>
        <td>{{ state.duration[1] }}</td>
      </tr>
    </table>

    <shorterSkeleton v-else animated style="height: 60px">
      <template #template>
        <shorterSkeletonItem style="width: 160px; height: 16px" />
        <br />
        <shorterSkeletonItem style="width: 160px; height: 32px; margin-top: 5px" />
      </template>
    </shorterSkeleton>
  </div>
</template>

<script setup>
import { reactive, onBeforeUnmount, watchEffect } from "vue";
import dayjs from "@/plugins/dayjs";

const props = defineProps({
  endTime: {
    type: Number,
    default: 0,
  },

  endCallback: {
    type: Function,
    default: () => {},
  },
  loading: {
    type: Boolean,
    default: () => false,
  },
});

const emit = defineEmits(["onStop"]);

const state = reactive({
  minutes: 0,
  seconds: 0,
  duration: ["00", "00"],
  loaded: false,
});

let timer = null;

watchEffect(() => {
  if (props.endTime) {
    const timeDiff = props.endTime - new Date().getTime();
    if (timeDiff >= 0) {
      timeLoop(timeDiff);
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
  state.duration = duration.format("mm:ss").split(":");
}
</script>

<style lang="scss" scoped>
.countdown {
  position: absolute;
  right: 0;
  top: -150px;
  text-align: center;

  th {
    width: 50px;
    font-size: 12px;
    color: #a4a5b2;
    font-weight: 500;
  }
  td {
    padding-top: 6px;
    font-size: 28px;
    font-weight: 600;
  }
  tr td:not(td:last-child) {
    position: relative;
    &::after {
      content: ":";
      position: absolute;
      right: -5px;
      top: 50%;
      transform: translateY(-50%);
    }
  }
}
</style>
