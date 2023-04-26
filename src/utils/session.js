/**
 * window.sessionStorage 浏览器临时缓存
 * @method set 设置临时缓存
 * @method get 获取临时缓存
 * @method remove 移除临时缓存
 * @method clear 移除全部临时缓存
 */
export const Session = {
  // 设置临时缓存
  set(key, val) {
    window.sessionStorage.setItem(key, JSON.stringify(val));
  },
  // 获取临时缓存
  get(key) {
    let json = window.sessionStorage.getItem(key);
    return JSON.parse(json);
  },
  // 移除临时缓存 @key
  remove(key) {
    window.sessionStorage.removeItem(key);
  },
  // 移除全部临时缓存
  clear() {
    window.sessionStorage.clear();
  }
}
