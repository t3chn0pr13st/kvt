'use strict';

let versionApi = "2.0.0",
    settings = {};

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

['kvtFastVolumePrice', 'kvtFastVolumePriceRound', 'kvtFastVolumeSize', 'kvtSTIGFastVolSumBot', 'kvtSTIGFastVolSumRcktMon', 'telegramId', 'rcktMonConnect', 'alorToken', 'IsShortTicker'].forEach(function (st) {
    chrome.storage.local.get(st, (result) => {
        settings[st] = result[st]
    })
})

setTimeout(function () {
    let tagName = document.getElementsByTagName('body')[0],
        el = document.createElement("div");

    settings['extensionId'] = chrome.runtime.id
    settings['extensionVer'] = chrome.runtime.getManifest().version

    el.setAttribute("data-kvt-extension", "");
    el.textContent = JSON.stringify(settings)
    tagName.appendChild(el)
});


function injectScript(url, tag, setExtId) {
    var tagName = document.getElementsByTagName(tag)[0],
        el = document.createElement("script");

    el.setAttribute("type", "text/javascript")
    el.setAttribute("src", url)
    tagName.appendChild(el)
}

injectScript(chrome.runtime.getURL("js/helpers.js?t=" + Date.now()), "body")
injectScript(chrome.runtime.getURL("js/alor.js?t=" + Date.now()), "body")

setTimeout(function () {
    injectScript(chrome.runtime.getURL("js/page.js?t=" + Date.now()), "body")
});