import { ref, onBeforeUnmount } from 'vue';

import Timer from "@/utils/timer";
import { getContractAddress } from "@/contract";

export function useInterval() {
  const intervalId = ref();

  const intervalStrategy = {
    blockSpeed: () => getContractAddress().blockSpeed * 1000,
    normal: 30 * 1000,
    high: 15 * 1000,
  };

  function addHighPriorityInterval(cb) {
    addTimerInterval(cb, intervalStrategy.high);
  }

  function addNormalPriorityInterval(cb) {
    addTimerInterval(cb, intervalStrategy.normal);
  }

  function addBlockSpeedInterval(cb) {
    addTimerInterval(cb, intervalStrategy.blockSpeed());
  }

  function addTimerInterval(cb, strategy) {
    clearTimerInterval(intervalId.value);
    intervalId.value = Timer.interval(cb, strategy);
  }

  function clearTimerInterval() {
    Timer.clear(intervalId.value);
  }

  onBeforeUnmount(() => {
    clearTimerInterval();
  });

  return {
    addHighPriorityInterval,
    addNormalPriorityInterval,
    addBlockSpeedInterval,
    clearTimerInterval,
  };
}
