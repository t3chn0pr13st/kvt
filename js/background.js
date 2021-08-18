chrome.runtime.onMessageExternal.addListener(function (request, sender, sendResponse) {
    if (request.type === "telegramId") {
        chrome.storage.local.get('telegramId', function (result) {
            sendResponse(result.telegramId)
        })
    }
});
