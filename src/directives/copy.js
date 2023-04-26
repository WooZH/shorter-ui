/*
 * @Author: genesischou
 * @Date: 2020-12-23 10:34:51
 * @LastEditTime: 2021-05-28 15:36:59
 * @LastEditors: Please set LastEditors
 * @Description:
 */
export default {
  install: app => {
    app.directive("copy", {
      mounted(el, { value }) {
        if (typeof value === "object") {
          el.$value = value.text;
        } else {
          el.$value = value;
        }
        el.handler = () => {
          if (!el.$value) {
            // 值为空的时候，给出提示。可根据项目UI仔细设计
            if (typeof value === "object" && typeof value.err === "function") {
              value.err();
            }
            return;
          }
          // 动态创建 textarea 标签
          const textarea = document.createElement("textarea");
          // 将该 textarea 设为 readonly 防止 iOS 下自动唤起键盘，同时将 textarea 移出可视区域
          textarea.readOnly = "readonly";
          textarea.style.position = "absolute";
          textarea.style.left = "-9999px";
          // 将要 copy 的值赋给 textarea 标签的 value 属性
          textarea.value = el.$value;
          // 将 textarea 插入到 body 中
          document.body.appendChild(textarea);
          // 选中值并复制
          textarea.select();
          const result = document.execCommand("Copy");
          if (
            result &&
            typeof value === "object" &&
            typeof value.success === "function"
          ) {
            value.success();
          }
          document.body.removeChild(textarea);
        };
        // 绑定点击事件，就是所谓的一键 copy 啦
        el.addEventListener("click", el.handler);
      },
      // 当传进来的值更新的时候触发
      updated(el, { value }) {
        if (typeof value === "object") {
          el.$value = value.text;
        } else {
          el.$value = value;
        }
      },
      // 指令与元素解绑的时候，移除事件绑定
      unmounted(el) {
        el.removeEventListener("click", el.handler);
      }
    });
  }
};
