'use strict';

const getObjectFromLocalStorage = async function (key) {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.local.get(key, function (value) {
                resolve(value[key]);
            });
        } catch (ex) {
            reject(ex);
        }
    });
};

function injectScript(url, tag, setExtId) {
    var tagName = document.getElementsByTagName(tag)[0],
        el = document.createElement("script");

    el.setAttribute("type", "text/javascript")
    el.setAttribute("src", url)
    tagName.appendChild(el)
}

function getCookies(e) {
    e = RegExp(e + "[^;]+").exec(document.cookie);
    return decodeURIComponent(e ? e.toString().replace(/^[^=]+./, "") : "")
}

function getPsid() {
    return getCookies("psid")
}

async function run() {

    let versionApi = "2.0.0",
        settings = {};

    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request && request.type === "config") {
            sendResponse({msg: "config", psid: getPsid(), versionApi: versionApi});
        }
    });

    if (await getObjectFromLocalStorage("compactStyle")) {
        document.getElementById("root").classList.add("kvt-compactStyle");
    }

    for (const key of ['kvtFastVolumePrice', 'kvtFastVolumePriceRound', 'kvtFastVolumeSize', 'kvtSTIGFastVolSumBot', 'kvtSTIGFastVolSumRcktMon', 'telegramId', 'rcktMonConnect', 'alorToken', 'IsShortTicker', 'debug']) {
        settings[key] = await getObjectFromLocalStorage(key)
    }

    // insert settings in html
    //setTimeout(function () {
        let tagName = document.getElementsByTagName('body')[0],
            el = document.createElement("div");

        settings['extensionId'] = chrome.runtime.id
        settings['extensionVer'] = chrome.runtime.getManifest().version

        el.setAttribute("data-kvt-extension", "");
        el.textContent = JSON.stringify(settings)
        tagName.appendChild(el)
    //}, 3000);

    injectScript(chrome.runtime.getURL("js/helpers.js?t=" + Date.now()), "body")
    injectScript(chrome.runtime.getURL("js/alor.js?t=" + Date.now()), "body")
    injectScript(chrome.runtime.getURL("js/page.js?t=" + Date.now()), "body")
}

run()