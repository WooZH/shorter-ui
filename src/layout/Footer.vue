<template>
  <footer class="footer">
    <div class="lt">
      <div class="title">
        <p class="footer-logo shorter">Shorter.Finance</p>
        <p style="font-weight: 400; font-size: 16px">100% on-chain / 100% open-source</p>
      </div>
      <div class="producer">
        <svg class="shorter-icon" aria-hidden="true">
          <use xlink:href="#icon-ipi" />
        </svg>
        <div class="info">
          <p>Developed by IPI Labs. © 2019-2022</p>
          <div>
            <a target="_blank" href="https://docs.shorter.finance/miscellaneous/terms-of-service.html">
              Terms of Service
            </a>
            <a target="_blank" href="https://docs.shorter.finance/miscellaneous/privacy-policy.html">Privacy Policy</a>
          </div>
        </div>
      </div>
    </div>
    <div class="rt">
      <div class="links">
        <!-- <a>Stats</a> -->
        <a @click="dialogsVisible.setting = true">Settings</a>
      </div>

      <div class="footer-right">
        <div class="follow-us">
          <Media @mail="showMailDialog" />
        </div>
      </div>
    </div>
    <Dialog v-model="dialogsVisible.setting" width="464px">
      <DialogSetting />
    </Dialog>
    <Dialog v-model="dialogsVisible.subscribeNotification" width="560px">
      <DialogSubscribeNotification :email="state.subscribedEmail" />
    </Dialog>
    <Transition name="fade">
      <dialogSubscribeSuccess
        v-if="state.openMailSuccess"
        :address="state.address"
        @close="state.openMailSuccess = false"
      />
    </Transition>
    <Transition name="fade">
      <dialogSubscribe v-if="state.openMail" @close="state.openMail = false" @success="subscribeSuccess" />
    </Transition>
  </footer>
</template>

<script setup>
import { reactive, ref } from "vue";

import dialogSubscribeSuccess from "./dialog-subscribe-success.vue";
import dialogSubscribe from "./dialog-subscribe.vue";
import DialogSetting from "./DialogSetting.vue";
import DialogSubscribeNotification from "./DialogSubscribeNotification.vue";
import Media from "./Media.vue";

/*
  1、邮件订阅功能使用getrevue，账号：znlg1110@163.com
  2、添加订阅者的接口定义文档：https://www.getrevue.co/api#post-/v2/subscribers；开发时应注意：double_opt_in字段写为false；
  3、取消订阅的接口定义：https://www.getrevue.co/api#post-/v2/subscribers/unsubscribe；
  4、API key is tzxxlbbcCiqjpt4OGVOCL3YdIm4Yb2yU；
*/

const state = reactive({
  form: {
    email: "",
    emailInvalid: false,
  },
  subscribedEmail: "",
  loading: {
    subscribe: false,
  },
  openMailSuccess: false,
  openMail: false,
  address: "",
});

const dialogsVisible = reactive({
  setting: false,
});

function showMailDialog() {
  state.openMail = true;
}

function subscribeSuccess(address) {
  state.openMail = false;
  state.address = address;
  state.openMailSuccess = true;
}
</script>

<style lang="scss" scoped>
.footer {
  @include flex;
  justify-content: space-between;
  max-width: 1536px;
  margin: 32px 3% 0;
  padding: 32px 0;
  border-top: 1px solid #e4e4e4;
}

.lt {
  .title {
    .shorter {
      color: #666;
      margin-bottom: 8px;
    }

    p {
      color: #b6b6b6;
    }
  }

  .producer {
    margin-top: 32px;
    @include flex-center-v;

    svg {
      width: 46px;
      height: 28.73px;
      color: #afafaf;
      margin-right: 16px;
    }

    p {
      color: #b6b6b6;
      margin-bottom: 8px;
    }

    a {
      text-decoration: underline;
      transition: all 0.3s;

      &:hover {
        color: $primary;
      }

      &:last-child {
        border-left: 1px solid #333;
        margin-left: 6px;
        padding-left: 6px;
      }
    }
  }
}

.rt {
  color: #b6b6b6;
  text-align: right;

  .links {
    a {
      text-decoration: underline;

      &:hover {
        color: $primary;
      }

      &:first-child {
        margin-right: 16px;
      }
    }
  }

  .subscribe-container {
    input {
      width: 240px;
      height: 40px;
      padding: 2px 23px 0;
      line-height: 40px;
      border-radius: 12px;
      border: 1px solid #a4a5b2;
      background: transparent;

      &:focus {
        background: #fff;
      }

      &.error {
        border-color: #ff6461 !important;
        box-shadow: 0 0 0 2px rgba(255, 101, 101, 0.3);
      }
    }

    .btn-subscribe {
      width: 108px;
      height: 40px;
      margin-left: 16px;
      border-radius: 12px;
      background: transparent;

      span {
        transform: translateY(2px);
      }
    }
  }

  .medias {
    a {
      display: inline-block;
      width: 24px;
      height: 24px;
      margin-left: 16px;

      svg {
        width: 24px;
        height: 24px;
        transition: all 0.5s;
      }

      &:hover svg {
        color: #333;
      }
    }
  }
}
</style>
<style lang="scss" scoped>
@media (min-width: 1920px) {
  .footer {
    margin: 32px auto 0;
  }
}

.footer-logo {
  font-size: 18px;
  font-family: $caption;
  font-weight: 600;
  color: #333333;
  line-height: 24px;
  margin-right: 10px;
}

.footer-right {
  margin-top: 76px;

  .sub-mail {
    .sub-slogan {
      height: 14px;
    }

    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .follow-us {
    margin-left: 50px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
