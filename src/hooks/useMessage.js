import { createApp } from "vue";
import ToastMessage from "@/components/ToastMessage";

let queue = []; //message队列
const defaultTop = 10;

export function Message(option) {
  const dom = document.createElement("div");
  const id = `message-${queue.length}`;
  document.body.appendChild(dom);

  if (typeof option === "object") {
    option = {
      modelValue: true,
      ...option,
    };
  } else {
    option = {
      modelValue: true,
      content: option,
    };
  }

  const app = createApp(ToastMessage, {
    destroy: () => {
      queue = queue.slice(1);
      const el = dom.firstElementChild;
      if (el) {
        el.style.transform = `translateX(${2 * defaultTop}px)`;
        el.style.opacity = "0";
        setTimeout(() => {
          app.unmount(dom);
          if (document.body.contains(dom)) document.body.removeChild(dom);
        }, 300);
      }
    },
    ...option,
  });

  const vm = app.mount(dom);

  vm.$el.setAttribute("id", id);

  setTimeout(() => {
    vm.$el.style.marginTop = `${defaultTop}px`;
  });

  //存在其他message,该index之前的所有message往下移动
  if (queue.length > 0) {
    moveDownMessages(queue.length);
  }
  queue.push(vm.$el);

  function moveDownMessages(end) {
    const height = 120;
    const margin = 15;
    for (let index = 0; index < end; index++) {
      const el = queue[index];
      const distance = (height + margin) * (end - index) + defaultTop;
      setTimeout(() => {
        el.style.marginTop = `${distance}px`;
      });
    }
  }
}

Message.success = function(content) {
  Message({ type: "success", content });
};

Message.warning = function(content) {
  Message({ type: "warning", content });
};

Message.error = function(content) {
  Message({ type: "error", content });
};
