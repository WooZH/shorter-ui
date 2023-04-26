<template>
  <div class="dialog-subscribe-notification">
    <div class="flex-center">
      <svg
        class="shorter-icon"
        aria-hidden="true"
        style="width:80px;height:80px;"
      >
        <use xlink:href="#icon-email_2" />
      </svg>
    </div>
    <h3>Thanks for signing up</h3>
    <section>
      <p>
        Check your inbox ({{ email }}) for a welcome note.
      </p>
      <p>
        Add
        <span class="color-primary">shorter@getevue.co</span>
        to the address book to keep you in the loop.
      </p>
    </section>
  </div>
</template>

<script>
export default {
  name: "SubscribeNotification",
	props:{
		email:{
			type:String,
			default:()=>""
		}
	}
};
</script>

<style lang="scss" scoped>
.dialog-subscribe-notification {
  padding: 25px 40px 48px 40px;
  h3 {
    font-weight: 600;
    font-size: 20px;
    margin-top: 24px;
  }
  section {
    margin-top: 12px;
    line-height: 24px;
    font-size: 16px;
    color: #606266;
    word-break: keep-all;
  }
}
</style>
