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
            document.getElementById("root").classList.add("kvt-compactStyle");
        }, 2000)
    }
});


function injectScript(url, tag, setExtId) {
    var tagName = document.getElementsByTagName(tag)[0],
        el = document.createElement("script");

    el.setAttribute("type", "text/javascript")
    el.setAttribute("src", url)
    el.setAttribute("data-kvt-extension-ver", chrome.runtime.getManifest().version)
    setExtId && el.setAttribute("data-kvt-extension-id", chrome.runtime.id)

    tagName.appendChild(el)
}

injectScript(chrome.runtime.getURL("js/helpers.js?t=" + Date.now()), "body", 1)
injectScript(chrome.runtime.getURL("js/alor.js?t=" + Date.now()), "body", 1)

setTimeout(function () {
    injectScript(chrome.runtime.getURL("js/page.js?t=" + Date.now()), "body", 1)
});