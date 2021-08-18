
'use strict';

let versionApi = "2.0.0";

function getCookies(e) {
	e = RegExp(e + "[^;]+").exec(document.cookie);
	return decodeURIComponent(e ? e.toString().replace(/^[^=]+./, "") : "")
}

function getPsid() {
	return getCookies("psid")
}

chrome.runtime.onMessage.addListener(function (e, t, n) {
    if(e && e.type === "config") {
        chrome.runtime.sendMessage({msg: "config", psid: getPsid(), versionApi: versionApi})
    }
});


chrome.storage.local.get('compactStyle', (result) => {
    if(result['compactStyle']) {
        setTimeout(function () {
            document.getElementById("root").classList.add("kvt-root");
        }, 2000)
    }
});


function injectScript(url, tag, setExtId) {
    var tagName = document.getElementsByTagName(tag)[0],
        element = document.createElement("script");

    element.setAttribute("type", "text/javascript")
    element.setAttribute("src", url)
    setExtId && element.setAttribute("data-kvt-extension-id", chrome.runtime.id)
    tagName.appendChild(element)
}

setTimeout(function () {
    return injectScript(chrome.extension.getURL("js/page.js?t=" + Date.now()), "body", 1)
});