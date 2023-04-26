// 引入组件
import { nextTick, createApp } from "vue";
import tooltip from "../components/Tooltip.vue";

// 清除监听
function clearEvent(el) {
  if (el._tipHandler) {
    el.removeEventListener("mouseenter", el._tipHandler, true);
  }
  if (el._tipMouseleaveHandler) {
    el.removeEventListener("mouseleave", el._tipMouseleaveHandler, true);
  }
  delete el._tipHandler;
  delete el._tipMouseleaveHandler;
  delete el._tipOptions;
  delete el._tipInstance;
}

// 位置定位
function calculationLocation(el, target, placements) {
  if (!el || !target) return;
  el.tooltipPosition.y = 0;
  el.tooltipPosition.x = 0;
  let elGet = el.$el;
  if (el.$el.toString() === "[object HTMLDivElement]") {
  } else {
    elGet = elGet.nextElementSibling;
  }
  let el_dom = elGet.getBoundingClientRect();
  let target_dom = target.getBoundingClientRect();

  if (placements === "left") {
    el.tooltipPosition.x = target_dom.x - el_dom.width - 10;
    el.tooltipPosition.y = target_dom.y - el_dom.height / 2 + target_dom.height / 2;
  } else if (placements === "bottom") {
    el.tooltipPosition.x = target_dom.x + target_dom.width / 2 - el_dom.width / 2;
    el.tooltipPosition.y = target_dom.y + el_dom.height + 10;
  } else if (placements === "right") {
    el.tooltipPosition.x = target_dom.x + target_dom.width + 10;
    el.tooltipPosition.y = target_dom.y - el_dom.height / 2 + target_dom.height / 2;
  } else if (placements === "top") {
    el.tooltipPosition.x = target_dom.x + target_dom.width / 2 - el_dom.width / 2;
    el.tooltipPosition.y = target_dom.y - el_dom.height - 10;
  }
}

// 方向
const allPlacements = ["left", "bottom", "right", "top"];

export default {
  install(app) {
    app.directive("tooltip", {
      mounted(el, binding) {
        clearEvent(el);
        el._tipOptions = binding.value;
        el._tipHandler = () => {
          const limitPlacementQueue = allPlacements.filter(placement => binding.modifiers[placement]);
          const placements = limitPlacementQueue.length ? limitPlacementQueue : allPlacements;
          if (!el._tipInstance) {
            el._synopsis = createApp(tooltip);
            el._root = document.createElement("div");
            document.body.appendChild(el._root);
            el._root.id = `tooltip_${new Date().getTime()}`;
            el._tipInstance = el._synopsis.mount(el._root);
          }
          el._tipInstance.placements = placements[0];
          el._tipInstance.showTip();
          el._tipInstance.text = el._tipOptions;
          nextTick(() => {
            calculationLocation(el._tipInstance, el, placements[0]);
          });
          el._scrollHandler = () => {
            if (el._tipInstance.tooltipShow) calculationLocation(el._tipInstance, el, placements[0]);
          };
          window.addEventListener("scroll", el._scrollHandler);
        };
        el._tipMouseleaveHandler = () => {
          if (el._tipInstance) {
            el._tipInstance.hiddenTip();
          }
        };
        el.addEventListener("mouseenter", el._tipHandler);
        el.addEventListener("mouseleave", el._tipMouseleaveHandler);
      },
      updated(el, binding) {
        el._tipOptions = binding.value;
      },
      unmounted(el) {
        if (el._tipInstance) {
          el._synopsis.unmount();
          document.body.removeChild(el._root);
        }
        window.removeEventListener("scroll", el._scrollHandler, true);
      },
    });
  },
};
