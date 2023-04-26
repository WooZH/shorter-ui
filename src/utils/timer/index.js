import { getVCInstance  } from "./visibilityChange";

let globalTimerId = -1;

class Timer {
  #alreadyInit = false;
  #lastState = document.hidden
  #timerConfigMap = {};
  #vc = getVCInstance();

  /*
  * Run callback every `visibleInterval` milliseconds if page is visible and
  * every `hiddenInterval` milliseconds if page is hidden.
  *
  *   this.interval(() => {
  *       checkNewMails();
  *   }, 60 * 1000, 10 * 60 *1000);
  *
  * can skip `hiddenInterval` and callback will be called only if
  * page is visible.
  *
  *   this.interval(function () {
  *       updateCountdown();
  *   }, 1000);
  *
  * It is analog of `setInterval(callback, interval)` but use visibility
  * state.
  *
  * It return timer ID, that you can use in `this.clear(id)` to stop
  * timer (`clearInterval` analog).
  *
  * Warning: timer ID is different from interval ID from `setInterval`, so don’t use it in `clearInterval`.
  * On change state from hidden to visible timers will be execute.
  */
  interval(callback, visibleInterval, hiddenInterval) {
    this.#init();

    const id = ++globalTimerId;

    this.#timerConfigMap[id] = {
      callback,
      visibleInterval,
      hiddenInterval,
      id: null,
      atOnceRunId: null,
      lastRunTime: null,
    };

    this.#run(id);

    return id;
  }



  /* clear timer from `this.interval` method by its id (`interval` method return it).
  *
  *  eg:
  *   slideshow = this.interval(() => {
  *       changeSlide();
  *   }, 5 * 1000);
  *
  *   $('.stopSlideshow').click(() => {
  *       this.clear(slideshow);
  *   });
  */
  clear(id) {
    if (!id || !this.#timerConfigMap[id]) {
      return false;
    }

    this.#stop(id);
    delete this.#timerConfigMap[id];

    return true;
  }

  #init() {
    if (this.#alreadyInit) {
      return;
    }

    this.#lastState = this.#vc.isVisible;
    this.#vc.onChange(() => {
      this.#stopAllAndReRun();
      this.#lastState = this.#vc.isVisible;
    });

    this.#alreadyInit = true;
  }

  // Try to run timer by it’s id.
  // It will be use `visibleInterval` or `hiddenInterval` depending on this state.
  // If page is hidden and `hiddenInterval` is null, it will not run timer.
  // Argument `atOnce` say, that timers must be execute at once after state change.
  #run(id, atOnce) {
    const config = this.#timerConfigMap[id];
    const { hiddenInterval, visibleInterval } = config;
    if (!this.#vc.isVisible && !hiddenInterval) return;

    const interval = this.#vc.isVisible ? visibleInterval : hiddenInterval;

    const runner = () => {
      config.lastRunTime = new Date();
      config.callback.call(globalThis);
    };
    
    if (!atOnce) {
      config.id = setInterval(runner, interval);
    } else {
      const now = new Date();
      const hasPassedTime = now - config.lastRunTime;

      if (interval > hasPassedTime) {
        config.atOnceRunId = setTimeout(() => {
          config.id = setInterval(runner, interval);
          runner();
        }, interval - hasPassedTime);
      } else {
        config.id = setInterval(runner, interval);
        runner();
      }
    }
  }

  /*
  *  internal stop, clear all timer of id;
  * */
  #stop(id) {
    const timerConfig = this.#timerConfigMap[id];

    clearInterval(timerConfig.id);
    clearTimeout(timerConfig.atOnceRunId);

    timerConfig.id = null;
    timerConfig.atOnceRunId = null;
  }

  /*
  * when visible state change, stop all interval and rerun it;
  */
  #stopAllAndReRun() {
    if (this.#vc.isVisible !== this.#lastState) {
      for (const i in this.#timerConfigMap) {
        this.#stop(i);
        // run once when page visible
        this.#run(i, this.#vc.isVisible);
      }
    }
  }
}

const VisibilityTimer = new Timer();

export default VisibilityTimer;
