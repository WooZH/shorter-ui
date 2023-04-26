<template>
  <span>{{ prefix }}</span>
  <span><SmartText v-bind="smartTextAttr" /></span>
</template>

<script>
export default {
  name: "SmartNumber",
};
</script>

<script setup>
import { computed, watchEffect, ref } from "vue";
import { formatNum, addThousandsSep, replaceZero, toNonExponential } from "@/utils/format";

const props = defineProps({
  prefix: {
    type: String,
    default: "",
  },
  value: {
    type: [Number, String],
    require: true,
    default: 0,
  },
  type: {
    default: "price",
    validator(value) {
      return ["price", "quantity", "amount"].includes(value);
    },
  },
  speicalAmount: {
    required: false,
    default: null,
    validator(value) {
      // next two place, special amount ruler
      return ["unsettledAndPhase2", "poolDetail"].includes(value);
    },
  },
});

/*
 * props to smartText can be ({
 *  showPopBy: undefined,
 *  value: undefined,
 *  prefix: undefined,
 *  formatValue: undefined,
 *  maxLength: undefined,
 * });
 */
const smartTextAttr = ref({});

const isPriceType = computed(() => props.type === "price");
const isQuantityType = computed(() => props.type === "quantity");
const isAmountType = computed(() => props.type === "amount");

watchEffect(() => {
  if (props.value == null || props.value === "" || Number.isNaN(props.value) || props.value === "NaN") {
    nullValueAction();
    return;
  }

  // 0, '0', '0.0'
  if (Number.parseFloat(props.value) === 0) {
    zeroValueAction();
    return;
  }

  if (isAmountType.value) {
    amountValueAction();
  }

  if (isQuantityType.value) {
    quantityValueAction();
  }

  if (isPriceType.value) {
    priceValueAction();
  }
});

function nullValueAction() {
  smartTextAttr.value = {
    showPopBy: "none",
    value: props.value,
  };
}

function zeroValueAction() {
  const prefix = isAmountType.value || isPriceType.value ? "$" : "";
  smartTextAttr.value = {
    showPopBy: "none",
    prefix,
    value: props.value,
  };
}

function amountValueAction() {
  if (!props.speicalAmount) {
    let formatValue = formatNum(props.value);
    if (formatValue === "0.00") formatValue = "0";

    smartTextAttr.value = {
      showPopBy: "none",
      value: formatValue,
      formatValue,
      prefix: "$",
    };
  }

  if (props.speicalAmount === "poolDetail") {
    const value = addThousandsSep(props.value);
    const formatValue = formatNum(props.value, 2, true);

    smartTextAttr.value = {
      showPopBy: "manual",
      value,
      formatValue,
      prefix: "$",
    };
  }

  if (props.speicalAmount === "unsettledAndPhase2") {
    const rzValue = addThousandsSep(toNonExponential(props.value));
    const isMoreThanFourDeci = String(rzValue).split(".")?.[1].length > 4;

    const fourDeciVal = formatNum(props.value, 4);
    const formatValue = isMoreThanFourDeci ? fourDeciVal + "..." : fourDeciVal;
    const showPopBy = isMoreThanFourDeci ? "manual" : "none";

    smartTextAttr.value = {
      showPopBy,
      value: rzValue,
      formatValue,
      prefix: "$",
    };
  }
}

function quantityValueAction() {
  if (props.value >= 10 ** 4) {
    const value = addThousandsSep(props.value);
    const formatValue = formatNum(props.value, 2, true);

    smartTextAttr.value = {
      showPopBy: "manual",
      value,
      formatValue,
    };
  } else {
    const value = addThousandsSep(toNonExponential(props.value));

    smartTextAttr.value = {
      showPopBy: "length",
      value,
      maxLength: 10,
    };
  }
}

function priceValueAction() {
  if (props.value >= 10 ** -6) {
    const value = addThousandsSep(props.value);

    smartTextAttr.value = {
      showPopBy: "length",
      value,
      prefix: "$",
      maxLength: 7,
    };
  } else {
    const rzValue = replaceZero(props.value);
    const formatValue = rzValue.length > 10 ? rzValue.substring(0, 10) + "..." : rzValue;
    const value = rzValue.length > 10 ? toNonExponential(props.value) : formatValue;
    const showPopBy = rzValue.length > 10 ? "manual" : "none";

    smartTextAttr.value = {
      showPopBy,
      value,
      formatValue,
      prefix: "$",
      maxLength: 7,
    };
  }
}
</script>

<style lang="scss" scoped></style>
