import axios from "axios";
const instance = axios.create({
  baseURL: process.env.VUE_APP_API_HTTP,
  timeout: 20000, //20s timeout
});
instance.interceptors.request.use(
  config => {
    return config;
  },
  function(error) {
    return Promise.reject(error);
  },
);

instance.interceptors.response.use(
  response => {
    const res = response;
    if (res.status === 200) {
      return Promise.resolve(res.data);
    }
    return Promise.reject(response);
  },
  error => {
    return Promise.reject(error);
  },
);

export default instance;
