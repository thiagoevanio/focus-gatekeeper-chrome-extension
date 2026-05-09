const openOptionsButton = document.querySelector("#openOptions");
const openExampleButton = document.querySelector("#openExample");

openOptionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

openExampleButton.addEventListener("click", () => {
  chrome.tabs.create({ url: "https://example.com" });
});
