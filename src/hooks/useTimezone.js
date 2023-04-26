import { computed, reactive } from "vue";

const tz = reactive({
  value: Math.round((new Date().getTimezoneOffset() * -1) / 60),
  text: computed(() => {
    let temp = tz.value >= 0 ? `+${tz.value}` : tz.value;
    return `UTC${temp}`;
  })
});

const tzList = (function() {
  const arr = [];
  for (let i = 13; i >= -12; i--) {
    let temp = i >= 0 ? `+${i}` : `-${-1 * i}`;
    arr.push({
      text: `UTC${temp}`,
      value: i
    });
  }
  return arr;
})();

export function useTimezone() {
  return {
    tz,
    tzList
  };
}
