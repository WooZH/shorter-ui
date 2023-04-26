import { reactive } from "vue";

export const warn = reactive({
  content: "",
  visible: false
});

export function Warning(content) {
  if (warn.visible) return;
  if (warn.content === content) return;
  warn.content = content;
  warn.visible = true;
}

Warning.close = function() {
  warn.visible = false;
  warn.content = "";
};
