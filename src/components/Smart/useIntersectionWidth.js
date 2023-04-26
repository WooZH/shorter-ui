import { ref } from "vue";

export function useIntersectionWidth(byWidth) {
  const textBlockRef = ref();
  const isTextOverflow = ref(false);

  let itsWidthOb;
  function startIntersection() {
    if (!byWidth.value) {
      return;
    }

    itsWidthOb = intersectionBlockWidth();
    checkTextIsOverflow();
    window.addEventListener("resize", checkTextIsOverflow);
  }

  function stopIntersection() {
    if (!byWidth.value) {
      return;
    }

    window.removeEventListener("resize", checkTextIsOverflow);
    if (itsWidthOb) itsWidthOb?.disconnect();
  }

  function checkTextIsOverflow() {
    if (!byWidth.value) {
      return;
    }

    const textBlockEle = textBlockRef.value;
    if (!textBlockEle) return;

    setTimeout(() => {
      isTextOverflow.value = textBlockEle.offsetWidth + 2 <= textBlockEle.scrollWidth;
    }, 300);
  }

  function intersectionBlockWidth() {
    const textBlockEle = textBlockRef.value;
    if (!textBlockEle) {
      setTimeout(() => {
        intersectionBlockWidth();
      }, 300);
      return;
    }

    io = new IntersectionObserver(() => {
      checkTextIsOverflow();
    });
    io.observe(textBlockEle);

    return io;
  }

  return {
    textBlockRef,
    isTextOverflow,
    startIntersection,
    stopIntersection,
  };
}
