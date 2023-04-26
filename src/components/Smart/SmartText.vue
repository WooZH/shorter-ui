<template>
  <div ref="hostEleRef" class="host-container" @mouseenter="handleMouseEnter">
    <template v-if="!byWidth">
      {{ prefix + displayVal }}
    </template>
    <span v-else ref="textBlockRef" class="text-block">{{ prefix + displayVal }}</span>

    <Teleport to="body">
      <div
        v-if="isHover"
        ref="hoverEleRef"
        :class="{
          'hover-container': true,
          'is-hover': isHover,
        }"
        @mouseenter="handleHoverPopHover"
        @mouseleave="handleMouseLeave"
      >
        <span class="float-text">{{ prefix + value }}</span>
        <div v-tooltip.top="'Copy'" v-copy="{ text: prefix + value, success: handleCopySuccess }" class="copy-icon">
          <svg class="shorter-icon" aria-hidden="true">
            <use xlink:href="#icon-account_copy" />
          </svg>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
export default {
  name: "SmartText",
};
</script>

<script setup>
import { computed } from "vue";
import { Message } from "@/hooks/useMessage";

import { trimZeroOfMantissa } from "@/utils/format";

import { useTruncHover } from "./useTruncHover";

const props = defineProps({
  prefix: {
    type: String,
    default: "",
  },
  value: {
    default: "",
    type: [String, Number],
  },
  showPopBy: {
    default: "length",
    validator(value) {
      return ["none", "width", "length", "manual"].includes(value);
    },
  },

  // when trunc by manual
  formatValue: {
    default: "",
    type: [String, Number],
  },

  // when trunc by length
  maxLength: {
    type: Number,
    default: 6,
  },
});

const notShowPop = computed(() => props.showPopBy === "none");
const byLength = computed(() => props.showPopBy === "length");
const byWidth = computed(() => props.showPopBy === "width");
const byManual = computed(() => props.showPopBy === "manual");

const {
  hostEleRef,
  hoverEleRef,
  textBlockRef,

  isHover,
  triggerHover,
  handleMouseLeave,
  handleHoverPopHover,
} = useTruncHover(byWidth);

const displayVal = computed(() => {
  if (props.value == undefined) {
    return "";
  }

  if (byManual.value) {
    return String(props.formatValue);
  }

  if (byLength.value && String(props.value).length > maxNumLen.value) {
    return shortcut(props.value, maxNumLen.value);
  }

  return String(props.value);
});

const maxNumLen = computed(() => {
  let maxLen = props.maxLength;

  const numStr = String(props.value);
  if (numStr.includes(".")) {
    maxLen += 1;
  }
  if (numStr.includes("-")) {
    maxLen += 1;
  }
  if (numStr.includes("$")) {
    maxLen += 1;
  }

  const sepNum = numStr.split("").filter(char => char === ",").length;
  maxLen += sepNum;

  return maxLen;
});

function shortcut(val) {
  const valueString = String(val);
  if (valueString.length <= maxNumLen.value) {
    return valueString;
  }

  let truncStr = valueString.substring(0, maxNumLen.value);
  truncStr = trimZeroOfMantissa(truncStr);

  return truncStr + "...";
}

function handleMouseEnter() {
  if (notShowPop.value) {
    return;
  }

  if (byLength.value && String(props.value).length <= maxNumLen.value) {
    return;
  }

  triggerHover();
}

function handleCopySuccess() {
  Message.success("Copied");
}
</script>

<style lang="scss" scoped>
.host-container {
  max-height: 100%;
  max-width: 100%;

  display: inline-block;
  position: relative;
  overflow-x: visible;
}

.hover-container {
  font-family: "Haas Grot Text";
  visibility: hidden;
  position: absolute;
  top: 0;
  left: 0;

  cursor: default;
  display: inline-flex;
  align-items: center;

  max-height: calc(100% + 8px);
  padding: 2px 4px;

  border-radius: 4px;
  background-color: #fff;

  z-index: 3000;

  transition: transform 0.2s, box-shadow 0.2s;

  .float-text {
    line-height: 1em;
    margin-top: 2px;
    white-space: nowrap;
  }

  &.is-hover {
    box-shadow: 0.05rem 0.1rem 0.3rem -0.03rem rgba(0, 0, 0, 0.45);
  }

  .copy-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;

    width: 0.8em;
    height: 0.8em;
    min-width: 1em;
    min-height: 12px;
    margin-left: 0.8px;
    cursor: pointer;

    .shorter-icon {
      width: 100%;
      height: 100%;
    }
  }
}

.text-block {
  display: inline-block;

  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;

  width: 100%;
  height: 100%;

  &::after {
    content: "";
    display: block;
  }
}
</style>
