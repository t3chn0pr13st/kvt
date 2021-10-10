chrome.runtime.onMessageExternal.addListener(function (request, sender, sendResponse) {
    if (request.type === "telegramId") {
        chrome.storage.local.get('telegramId', function (result) {
            sendResponse(result.telegramId)
        })
    }

    if (request.type === "rcktMonConnect") {
        chrome.storage.local.get('rcktMonConnect', function (result) {
            sendResponse(result.rcktMonConnect)
        })
    }
});
