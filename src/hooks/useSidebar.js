import { ref } from "vue";

const isFold = ref(false);

export function useSidebar() {
  const handleResize = (function () {
    return function () {
      const curWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;

      if (curWidth < 1300) {
        isFold.value = true;
      } else {
        isFold.value = false;
      }
    };
  })();

  return {
    isFold,
    handleResize,
  };
}
