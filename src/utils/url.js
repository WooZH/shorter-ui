import md5 from "blueimp-md5";
import uuid from "uuid";

export function openUrl(url, id = "default") {
  var a = document.createElement("a");
  a.setAttribute("href", url);
  a.setAttribute("target", "_blank");
  a.setAttribute("id", id);

  if (!document.getElementById(id)) {
    document.body.appendChild(a);
  }
  a.click();
}

export function isInDebugMod(url = window.location.href) {
  const u = new URL(url);
  return u.searchParams.get("debug") === "true" ? true : false;
}

export function getSignature() {
  const signature = md5(uuid() + new Date().getTime());
  return signature;
}

export function getUrlParams(name) {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  return urlParams.get(name);
}
