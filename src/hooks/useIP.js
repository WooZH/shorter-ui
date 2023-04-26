import { reactive } from "vue";

export const ipError = reactive({
  type: "",
  visible: false,
});

export function showIpError() {
  ipError.visible = true;
}

export function closeIpError() {
  ipError.visible = false;
}

export function toggleIpError(state) {
  if (state === false || ipError.visible === true) {
    closeIpError();
  } else if (state === true || ipError.visible === false) {
    showIpError();
  }
}
