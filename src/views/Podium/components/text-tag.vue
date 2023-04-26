<template>
  <p class="text-tag">
    <span>
      <slot />
    </span>
    <TagVue class="sm-tag">IPISTR</TagVue>
  </p>
</template>

<script setup>
import TagVue from "@/components/Tag.vue";
</script>

<style lang="scss" scoped>
.text-tag {
  display: flex;
  align-items: center;
}
.sm-tag {
  height: 20px;
  padding: 1px 8px;
  line-height: 20px;
  margin-left: 8px;
}
</style>
