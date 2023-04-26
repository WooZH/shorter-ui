import { Tabs, TabItem } from "./Tabs";
import Layout from "@/layout";
import Tag from "./Tag";
import Dialog from "./Dialog";
import ToastMessage from "./ToastMessage";
import Copy from "./Copy";
import Loading from "./Loading";
import Empty from "./Empty";
import Image from "./Image";
import shorterButton from "./ShorterButton.vue";
import shorterProgress from "./shorterProgress.vue";
import CircleCheckFilled from "./CircleCheckFilled.vue";
import CircleCheck from "./CircleCheck.vue";
import ShorterSkeleton from "./shorterSkeleton.vue";
import ShorterSkeletonItem from "./shorterSkeletonItem.vue";
import vSelect from "vue-select";
import SortIcon from "./sortIcon.vue";
import SmartText from './Smart/SmartText.vue';
import SmartNumber from './Smart/SmartNumber.vue'

const components = [
  Tabs,
  TabItem,
  Tag,
  Dialog,
  Layout,
  Loading,
  Copy,
  Empty,
  ToastMessage,
  Image,
  shorterButton,
  shorterProgress,
  CircleCheckFilled,
  CircleCheck,
  ShorterSkeleton,
  ShorterSkeletonItem,
  SortIcon,
  SmartText,
  SmartNumber
];

export default {
  install: app => {
    components.forEach(component => {
      const name = component.name || component.__name || component?.__file.split('/').reverse()[0].split('.')[0];
      app.component(name, component);
    });
    app.component("VSelect", vSelect);
  },
};
