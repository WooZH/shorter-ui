import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { useIntersectionWidth } from "./useIntersectionWidth";

export function useTruncHover(byWidth) {
  let hoverTimeoutId;
  const hostEleRef = ref();
  const hoverEleRef = ref();
  const isHover = ref(false);

  const { textBlockRef, isTextOverflow, startIntersection, stopIntersection } = useIntersectionWidth(byWidth);

  onMounted(() => {
    startIntersection();
    window.addEventListener("scroll", handleMouseLeave, true);
  });

  onUnmounted(() => {
    stopIntersection();
    window.removeEventListener("scroll", handleMouseLeave);
  });

  function triggerHover() {
    if (byWidth.value && !isTextOverflow.value) {
      return;
    }

    isHover.value = true;
    nextTick(() => {
      setHoverContainerStyle();
      hoverTimeoutId = setTimeout(() => {
        isHover.value = false;
      }, 200);
    });
  }

  function handleMouseLeave() {
    isHover.value = false;
  }

  function handleHoverPopHover() {
    clearTimeout(hoverTimeoutId);
  }

  function setHoverContainerStyle() {
    if (!hoverEleRef.value) return;

    const x = hostEleRef.value?.getBoundingClientRect().left;
    const y = hostEleRef.value?.getBoundingClientRect().top;
    const hostStyle = window.getComputedStyle(hostEleRef.value);
    const clientHeight = hostStyle.height;
    const color = hostStyle.color;

    hoverEleRef.value.style.top = y - 2 + "px";
    hoverEleRef.value.style.left = x + "px";
    hoverEleRef.value.style.fontSize = hostStyle.fontSize;
    hoverEleRef.value.style.height = clientHeight;
    hoverEleRef.value.style.visibility = "visible";
    hoverEleRef.value.style.color = color;
  }

  return {
    hostEleRef,
    hoverEleRef,
    textBlockRef,

    isHover,
    triggerHover,
    handleMouseLeave,
    handleHoverPopHover,
  };
}
