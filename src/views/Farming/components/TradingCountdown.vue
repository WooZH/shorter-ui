<template>
  <div class="countdown">
    <table v-if="!loading">
      <tr>
        <td v-if="state.days >= 1">
          {{ state.duration[0] }}
        </td>
        <td>{{ state.duration[1] }}</td>
        <td>{{ state.duration[2] }}</td>
        <td>{{ state.duration[3] }}</td>
      </tr>
      <tr>
        <th v-if="state.days >= 1">Days</th>
        <th>Hours</th>
        <th>Minutes</th>
        <th>Seconds</th>
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
import { reactive, onBeforeUnmount, watch } from "vue";
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
  loading: {
    type: Boolean,
    default: () => false,
  },
});
const emit = defineEmits(["onStop"]);

const state = reactive({
  hours: 0,
  minutes: 0,
  seconds: 0,
  duration: ["00", "00", "00", "00"],
});

let timer = null;

startCountdown();
watch(
  () => props.endTime,
  () => {
    startCountdown();
  },
);

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});

function startCountdown() {
  if (props.startTime && props.endTime) {
    const timeDiff = props.endTime - props.startTime;
    if (timeDiff >= 0) {
      getTime(timeDiff);
      timeLoop(timeDiff);
    } else {
      emit("onStop");
    }
  }
}

function timeLoop(timeDiff) {
  clearInterval(timer);
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
  state.duration = duration.format("DD:HH:mm:ss").split(":");
  state.days = state.duration[0];
}
</script>

<style lang="scss" scoped>
.countdown {
  text-align: center;
  margin-left: -(16px+4px);
  table {
    table-layout: fixed;
    width: 300px;
  }

  th {
    text-align: center;
    padding-top: 2px;
    font-size: 14px;
    font-weight: normal;
    color: #a4a5b2;
  }

  td {
    width: 72px;
    text-align: center;
    padding-left: 16px;
    padding-right: 16px;
    font-size: 32px;
  }

  td:not(td:last-child) {
    position: relative;
    &::after {
      content: ":";
      position: absolute;
      right: -5px;
      bottom: 2px;
    }
  }
}
</style>
