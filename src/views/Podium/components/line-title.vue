<template>
  <div class="line-wrap">
    <div class="line-title">
      <div class="line" />
      <p class="title"><slot name="title" /></p>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.line-title {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}
.line {
  width: 4px;
  height: 16px;
  background: #ff7f45;
  border-radius: 2px;
  margin-right: 12px;
}
.title {
  font-size: 16px;
  line-height: 16px;
  font-family: "Haas Grot Text";
  font-weight: 600;
  color: #909399;
}
</style>
