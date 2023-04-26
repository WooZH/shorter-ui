import { reactive } from "vue";

export const transaction = reactive({
  hash: "",
  visible: false
});


export function Transaction(hash) {
  if (transaction.visible) return;
  if (transaction.hash === hash) return;
  transaction.hash = hash;
  transaction.visible = true;
  setTimeout(() => {
    transaction.visible = false;
    transaction.content = "";
  }, 4000)
}

Transaction.close = function () {
  transaction.visible = false;
  transaction.content = "";
};
