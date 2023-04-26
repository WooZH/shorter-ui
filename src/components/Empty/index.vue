<template>
  <div class="empty">
    <svg class="shorter-icon" aria-hidden="true">
      <use xlink:href="#icon-empty" />
    </svg>
    <span>
      {{ content }}
    </span>
  </div>
</template>

<script>
export default {
  name: "Empty",
};
</script>

<script setup>
defineProps({
  content: {
    type: String,
    default: "",
  },
});
</script>

<style lang="scss" scoped>
.empty {
  @include flex-center;
  flex-direction: column;
  padding: 40px 0;
  svg {
    width: 100px;
    height: 100px;
  }
  span {
    color: #a4a5b2;
    margin-top: 14px;
  }
}
</style>
