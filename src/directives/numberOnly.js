export default {
  install: app => {
    app.directive("numberOnly", {
      mounted(el) {
        el.keydownHandler = e => {
          const charCode = e.which || e.keyCode;

          const isCommandMode = e.ctrlKey || e.metaKey;
          const inShiftMode = e.shiftKey;

          if (isCommandMode) {
            return true;
          }
          //only number
          // 48 - 57 字母区域数字
          // 96-105  windows系统 小键盘数字
          if (
            charCode > 31 &&
            (charCode < 96 || charCode > 105) & (charCode < 48 || charCode > 57) & (charCode !== 9) &&
            charCode !== 37 &&
            charCode !== 39 &&
            e.key !== "."
          ) {
            e.preventDefault();
          }
          //shiftMode
          if (inShiftMode && charCode >= 48 && charCode <= 57) {
            e.preventDefault();
          }

          //Decimal repeat
          if (el.value.includes(".") && (charCode === 190 || charCode === 110)) {
            e.preventDefault();
          }

          return true;
        };

        el.inputHanlder = e => {
          el.value = e.target.value.replace(/[^\d.]/g, "");
        };

        el.pasteHanlder = e => {
          const clipData = e.clipboardData;
          const str = clipData.getData('text');
          if (!Number.isNaN(Number.parseFloat(str))) {
            el.value = str;
          } else {
            el.value = e.target.value
          }
          el.dispatchEvent(new Event("input"))

          e.preventDefault();
        }

        el.addEventListener("keydown", el.keydownHandler);
        el.addEventListener("input", el.inputHanlder);
        el.addEventListener("paste", el.pasteHanlder)
      },
      unmounted(el) {
        el.removeEventListener("keydown", el.keydownHandler);
        el.removeEventListener("input", el.inputHanlder);
        el.removeEventListener("paste", el.pasteHanlder);
      },
    });
  },
};
