const curTab = {
  name: ""
};

export function usePool() {
  function changePoolTab(name) {
    curTab.name = name;
  }

  return {
    curTab,
    changePoolTab
  };
}
