let globalCbId = -1;

/*
* proxy class of `visibilitychange` event
* */
class VisibilityChange {
  VisibilitychangeEvent = "visibilitychange";
  VisibilityStatesMap = {
    visible: "visible",
    hidden: "hidden",
    prerender: "prerender",
  };

  #alreadyInit = false;
  #cbs = {};
    
  get isVisible() {
    return !document.hidden;
  }
    
  get visibilityState() {
    return document.visibilityState;
  }

  #initListen() {
    if (this.#alreadyInit) {
      return;
    }

    const eventListener = event => {
      for (var i in this.#cbs) {
        this.#cbs[i].call(globalThis, this.visibilityState, event);
      }
    };
    document.addEventListener(this.VisibilitychangeEvent, eventListener);

    this.#alreadyInit = true;
  }

  onChange(callback) {
    const listenerId = ++globalCbId;
    this.#cbs[listenerId] = callback;

    this.#initListen();

    return listenerId;
  }

  onVisible(callback) {
    const listenerId = this.onChange((state, originEvent) => {
      if (state === this.VisibilityStatesMap.visible) {
        callback(originEvent);
      }
    });

    return listenerId;
  }

  onHidden(callback) {
    const listenerId = this.onChange((state, originEvent) => {
      if (state === this.VisibilityStatesMap.hidden) {
        callback(originEvent);
      }
    });

    return listenerId;
  }

  removeBind(listenerId) {
    delete this.#cbs[listenerId];
  }
}

let visibilityChangeInstance;
export function getVCInstance() {
    if (!visibilityChangeInstance) {
        visibilityChangeInstance = new VisibilityChange();
    }
    return visibilityChangeInstance;
}
