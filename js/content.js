'use strict';

let versionApi = "2.0.0", 
    gotSettings = false,
    settings = {};


function getCookies(e) {
	e = RegExp(e + "[^;]+").exec(document.cookie);
	return decodeURIComponent(e ? e.toString().replace(/^[^=]+./, "") : "")
}

function getPsid() {
	return getCookies("psid")
}

if ('kvtSettings' in localStorage)
{
    settings = JSON.parse(localStorage.getItem('kvtSettings'));
    gotSettings = true;
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request && request.type === "config") {
        sendResponse({msg: "config", psid: getPsid(), versionApi: versionApi});
    }
    else if (request && request.type === "settingsUpdated") {
        settings = request.data;
        localStorage.setItem('kvtSettings', JSON.stringify(settings));
        gotSettings = true;
        if (settings.compactStyle) {
            setTimeout(function () {
                document.getElementById("root").classList.add("kvt-compactStyle");
            }, 2000);
        }
    }
});

function start() {
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
    
    injectScript(chrome.runtime.getURL("js/helpers.js"), "body")
    injectScript(chrome.runtime.getURL("js/alor.js"), "body")
    
    setTimeout(function () {
        injectScript(chrome.runtime.getURL("js/page.js"), "body")
    });
}

function waitForSettingsAndStart() {
    if (gotSettings)
        start();
    else
        setTimeout(waitForSettingsAndStart, 500);
}

waitForSettingsAndStart();
