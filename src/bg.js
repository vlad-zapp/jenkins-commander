//When the tab bar icon is clicked this code runs. It sets the state of the extension.
browser.browserAction.onClicked.addListener(async (info, tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: toggleExtension
    });
});
