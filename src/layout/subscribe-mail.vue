<template>
  <div class="subscribe-input-group" :class="{ 'subscribe-dialog': type }">
    <input
      v-model="mail"
      class="subscribe-input"
      type="text"
      placeholder="Your E-mail"
      :class="{ 'valid-fail': warn_tip }"
    />
    <div v-if="type" v-show="warn_tip" class="valid-fail-text">
      <span>{{ warn_text }}</span>
    </div>
    <button class="btn btn-primary subscribe-btn" :disabled="loading" :class="{ loading: loading }" @click="submit">
      <span class="text-default">Subscribe</span>
      <span class="text-loading"><span class="circle" /></span>
    </button>
  </div>
  <div v-if="!type" v-show="warn_tip" class="valid-fail-text">
    <span>
      {{ warn_text }}
    </span>
  </div>
</template>
<script setup>
import { ref, watch } from "vue";
import axios from "axios";

const props = defineProps({
  type: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["success", "fail"]);
const loading = ref(false);
const mail = ref("");
const warn_text = ref("");
const warn_tip = ref(false);

watch(
  () => mail.value,
  (oldValue, newValue) => {
    if (oldValue !== newValue) {
      warn_tip.value = false;
    }
  },
);
// subscribe

const API_KEY = "tzxxlbbcCiqjpt4OGVOCL3YdIm4Yb2yU";
function submit() {
  const reg =
    /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
  if (!mail.value) {
    warn_text.value = "Please type in your email address";
  } else {
    warn_text.value = "Invalid email address";
  }

  if (reg.test(mail.value)) {
    warn_tip.value = false;
    loading.value = true;
    let formData = [];
    const data = {
      email: mail.value,
      first_name: "",
      last_name: "",
      double_opt_in: true,
    };

    for (const name in data) {
      var encodedKey = encodeURIComponent(name);
      var encodedValue = encodeURIComponent(data[name]);
      formData.push(encodedKey + "=" + encodedValue);
    }
    formData = formData.join("&");
    const url = "https://subscribe.shorter.finance/proxy/v2/subscribers";
    subscribe(url, formData)
      .then(res => {
        if (res.data.email) {
          // subscribe success
          emit("success", mail.value);
          mail.value = "";
        }
        loading.value = false;
      })
      .catch(error => {
        const errorMessage = error.response.data;

        const default_error_text = "Something went wrong, please try again later";
        warn_tip.value = true;
        warn_text.value = errorMessage.error.email[0] || default_error_text;
        loading.value = false;
        emit("fail", mail.value);
      });
  } else {
    warn_tip.value = true;
    loading.value = false;
    cancelWarnTip();
  }
}

function cancelWarnTip() {
  setTimeout(() => {
    warn_tip.value = false;
  }, 3000);
}

async function subscribe(url = "", formData) {
  console.log(url, formData);
  const request = axios.create({});
  request.defaults.headers.common["Authorization"] = `Bearer ${API_KEY}`;
  request.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded";

  const response = (await request.post(url, formData)) || {};
  return response;
}
</script>
<style lang="scss" scoped>
.btn {
  width: 240px;
  height: 60px;
  border-radius: 8px;
  font-size: 20px;
  // @include flexCenter;
  font-weight: 400;
  border: 0;
  cursor: pointer;
  transition: all 0.3s;
  &:hover {
    transform: translateY(-4px);
  }
}
.btn-primary {
  color: #fcfbfa;
  background-color: #ef814e;
  &:hover {
    color: #fcfbfa;
  }
}
.subscribe-input-group {
  margin-top: 48px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  .subscribe-input {
    transition: all 0.3s;
    background-color: #fcfbfa;
    color: #333;
    width: 344px;
    height: 48px;
    border: 1px solid #dfdfdf;
    padding: 14px 24px;
    border-radius: 8px 0 0 8px;
    border-right: 0;
    &::placeholder {
      font-size: 14px;
      line-height: 20px;
      color: #a4a5b2;
    }
    &:focus {
      border-color: #ef814e;
    }
  }
  .subscribe-btn {
    transform: translateX(-4px);
    border-radius: 2px 8px 8px 2px;
    width: 158px;
    height: 48px;
    font-size: 16px;
    &:hover {
      transform: translateY(0) translateX(-2px);
    }
  }
}
.subscribe-input-group {
  .valid-fail {
    border-color: #ff6461;
    background-color: #fdf3f3;
  }
}
.valid-fail-text {
  color: rgba(#ff6461, 1);
  margin-top: 8px;
  font-size: 16px;
  line-height: 24px;
  position: absolute;
  display: flex;
  display: flex;
  justify-content: flex-start;
  align-items: center;
}
.valid-fail-icon {
  margin-right: 4px;
}

.subscribe-dialog {
  position: relative;
  flex-direction: column;
  margin-top: 16px;
  align-items: flex-start;
  .valid-fail-text {
    position: relative;
  }
  .subscribe-input {
    width: 100%;
    height: 56px;
    border-radius: 8px;
    border: 1px solid #dfdfdf;
  }
  .subscribe-btn {
    transform: translateX(0);
    width: 100%;
    height: 56px;
    margin-top: 32px;
    border-radius: 8px;
    &:hover {
      transform: translateY(-1px) translateX(0);
    }
  }
  .valid-fail-text {
    margin-bottom: -18px;
  }
}
.text-loading {
  transition: all 0.3s;
  width: 0;
  opacity: 0;
}
.text-default {
  transition: all 0.3s;
}
.loading {
  transition: all 0.3s;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(#ef814e, 0.8);
  cursor: not-allowed;
  pointer-events: none;
  .text-loading {
    width: 16px;
    height: 16px;
    opacity: 1;
    transform: translateX(14px);
    transform-origin: left center;
  }
}

.circle {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 1px solid #dfdfdf;
  border-color: #fcfbfa;
  border-right-color: transparent;
  border-width: 2px;
  animation: round 1s infinite;
  border-radius: 50%;
}

@keyframes round {
  from {
    transform: rotate(0);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
