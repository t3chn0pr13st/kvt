chrome.runtime.onMessageExternal.addListener(function (request, sender, response) {

    if (request.type === "LOCALSTORAGE") {
        chrome.storage.local.get(request.path, function (value) {
            response(value[request.path])
        })
    }
});