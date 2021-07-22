
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
    if(e && e.type === "psid") {
        chrome.runtime.sendMessage({msg: "psid", psid: getPsid(), versionApi: versionApi})
    }
});

setTimeout(function () {
    document.getElementById("root").classList.add("kvt-root");
}, 2000)

