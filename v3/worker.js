chrome.action.onClicked.addListener(tab => chrome.tabs.create({
  index: tab.index + 1,
  url: 'data/window/index.html'
}));
