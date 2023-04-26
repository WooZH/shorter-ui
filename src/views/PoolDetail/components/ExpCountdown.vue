<template>
  <div class="countdown">
    <table v-if="!loading">
      <tr>
        <th v-if="countdownMode === 1">Years</th>
        <th v-if="countdownMode === 1 || countdownMode === 2">Months</th>
        <th v-if="countdownMode === 1 || countdownMode === 2 || countdownMode === 3">Days</th>
        <th v-if="countdownMode === 2 || countdownMode === 3 || countdownMode === 4">Hours</th>
        <th v-if="countdownMode === 3 || countdownMode === 4">Minutes</th>
        <th v-if="countdownMode === 4">Seconds</th>
      </tr>

      <tr>
        <td v-if="countdownMode === 1">0{{ state.remainDateList[0] }}</td>
        <td v-if="countdownMode === 1 || countdownMode === 2">
          {{ state.remainDate[1] }}
        </td>
        <td v-if="countdownMode === 1 || countdownMode === 2 || countdownMode === 3">
          {{ state.remainDate[2] }}
        </td>
        <td v-if="countdownMode === 2 || countdownMode === 3 || countdownMode === 4" class="time">
          {{ state.duration[1] }}
        </td>
        <td v-if="countdownMode === 3 || countdownMode === 4" class="time">
          {{ state.duration[2] }}
        </td>
        <td v-if="countdownMode === 4">
          {{ state.duration[3] }}
        </td>
      </tr>
    </table>

    <shorterSkeleton v-if="loading" animated style="height: 60px">
      <template #template>
        <shorterSkeletonItem style="width: 160px; height: 16px" />
        <br />
        <shorterSkeletonItem style="width: 160px; height: 32px; margin-top: 5px" />
      </template>
    </shorterSkeleton>
  </div>
</template>

<script setup>
import { reactive, onBeforeUnmount, watch, computed } from "vue";
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
    default: false,
  },
  isLiquidating: {
    type: Boolean,
    default: () => false,
  },
});
const emit = defineEmits(["onStop"]);

let timer = null;

const state = reactive({
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  duration: ["00", "00", "00", "00"],
  remainDate: [],
  remainDateList: [],
});


startCountdown();

watch(
  () => props.endTime,
  () => {
    startCountdown();
  },
);

const countdownMode = computed(() => {
  if (state.remainDateList[0] >= 1) {
    return 1; // years months days
  } else {
    if (state.remainDateList[1] >= 1) {
      return 2; //months days hours
    } else {
      if (state.remainDateList[2] >= 1) {
        return 3; //days hours minutes
      } else {
        return 4; // hours minutes seconds
      }
    }
  }
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});

function startCountdown() {
  if (props.startTime && props.endTime) {
    const timeDiff = props.endTime - props.startTime;
    if (timeDiff >= 0) {
      timeLoop(timeDiff);
    } else {
      emit("onStop");
    }
  }
}

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
  state.days = duration.days();

  state.remainDate = duration.format("YYYY:MM:DD:HH:mm:ss").split(":");
  state.remainDateList = state.remainDate.map(item => {
    let itemTmp = Number(item);
    return itemTmp;
  });
  state.duration = duration.format("DD:HH:mm:ss").split(":");
}
</script>

<style lang="scss" scoped>
.countdown {
  position: absolute;
  right: 0;
  top: -114px;
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
