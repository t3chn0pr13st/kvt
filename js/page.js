let extensionId = document.querySelector("[data-kvt-extension-id]").getAttribute("data-kvt-extension-id").trim();
let rcktMonSocket = null;

chrome.runtime.sendMessage(extensionId, {type: "telegramId"}, function (telegramId) {
    if (telegramId) {
        kvt_connect(telegramId)
    } else {
        console.warn('[kvt]', 'telegramId не установлен')
    }
});

rcktMonConnect();

let kvt_timeout = 1000;
function kvt_connect(telegramId) {
    var ws = new WebSocket(`wss://kvalood.ru?id=${telegramId}`);

    ws.onopen = (e) => {
        console.log("[kvt]", "Соединение установлено");

        ws.onmessage = (message) => {
            let msg = JSON.parse(message.data);
            console.log('[kvt][Message]', msg);
            setTickerInGroup(msg.ticker, msg.group)
        };
    };

    ws.onclose = (event) => {
        if (event.wasClean) {
            console.log('[kvt][ws close]', `Соединение закрыто чисто, код=${event.code} причина=${event.reason}`);
        } else {
            // например, сервер убил процесс или сеть недоступна
            // обычно в этом случае event.code 1006
            console.log('[kvt][ws close]', 'Соединение прервано');

            setTimeout(function() {
                kvt_connect(telegramId);
            }, Math.min(50000, kvt_timeout += kvt_timeout));
        }
    };

    ws.onerror = (error) => {
        console.warn('[kvt][error]', error.message);
    };
}

function rcktMonConnect() {

    if (rcktMonSocket){
        rcktMonSocket.onmessage = null;
        rcktMonSocket.onclose = null;
        rcktMonSocket.onerror = null;
        rcktMonSocket = null;
    }

    try {

        rcktMonSocket = new WebSocket('ws://localhost:51337');

        rcktMonSocket.onmessage = (message) => {
            const msg = JSON.parse(message.data);
            console.log('[RcktMon][Message]', msg);
            setTickerInGroup(msg.ticker, msg.group);
        }
    
        rcktMonSocket.onclose = () => {
            setTimeout(() => rcktMonConnect(), 5000);
        }

        rcktMonSocket.onerror = () => {
            setTimeout(() => rcktMonConnect(), 5000);
        }

    } catch {
        setTimeout(() => rcktMonConnect(), 5000);
    }
}

function setTickerInGroup(ticker, group_id) {
    let widget = getGroupWidget(group_id);

    if (!widget) {
        console.error('[kvt]', 'Виджет не найден')
        return null;
    }
    let reactObjectName = Object.keys(widget).find(function (key) {
        return key.startsWith("__reactInternalInstance$")
    });

    let target = widget[reactObjectName].memoizedProps.children.find(function (child) {
        return Array.isArray(child)
    }).find(function (item) {
        return !!((item._owner || {}).memoizedProps || {}).selectSymbol
    });

    target && target._owner.memoizedProps.selectSymbol(ticker.toUpperCase())
}

let kvtGroups = {
    1: "rgb(255, 212, 80);",
    2: "rgb(255, 123, 118);",
    3: "rgb(163, 129, 255);",
    4: "rgb(77, 195, 247);",
    5: "rgb(174, 213, 127);",
    6: "rgb(77, 161, 151);",
    7: "rgb(255, 183, 76);",
    8: "rgb(248, 163, 77);",
    9: "rgb(255, 136, 99);",
    10: "rgb(238, 128, 93);",
    11: "rgb(255, 120, 167);",
    12: "rgb(212, 93, 140);",
    13: "rgb(188, 113, 201);",
    14: "rgb(124, 174, 255);",
    15: "rgb(75, 208, 225);",
    16: "rgb(115, 176, 119);",
}

function getGroupWidget(group_id){
    let orderWidgetObject;
    document.querySelectorAll('[data-widget-type="COMBINED_ORDER_WIDGET"]').forEach(function (widget) {
        if (widget.querySelector('div[class^="packages-core-lib-containers-WidgetLayout-GroupMenu-styles-groupSelector"][style="color: ' + kvtGroups[group_id] + '"]')) {
            orderWidgetObject = widget;
        }
    })
    return orderWidgetObject;
}

// Все активные виджеты
function getActiveGroupsWidget() {
    let activeGroupsIds = [];

    document.querySelectorAll('[data-widget-type="COMBINED_ORDER_WIDGET"]').forEach(function (widget) {
        for (var group_id in kvtGroups) {
            if (widget.querySelector('div[class^="packages-core-lib-containers-WidgetLayout-GroupMenu-styles-groupSelector"][style="color: ' + kvtGroups[group_id] + '"]')) {
                activeGroupsIds.push(group_id)
            }
        }
    })
    return activeGroupsIds.sort((a, b) => a - b);
}

new MutationObserver(function (mutationsList, observer) {
    for (let mutation of mutationsList) {
        if (mutation.target.tagName) {
            let s = mutation.target.querySelector('[class*="src-components-Menu-styles-tag-"]')
            if (s) {
                createSTIG(s.innerHTML)
                break
            }
        } else {
            let s = mutation.target.parentElement.matches('[class*="src-components-Menu-styles-tag-"]')
            if (s) {
                createSTIG(mutation.target.textContent);
            }
        }
    }
}).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
})

function createSTIG(ticker) {

    let a = getActiveGroupsWidget()

    if (a.length) {
        let t = document.querySelector('[class*=src-components-Menu-styles-inactive-]'),
            el = document.querySelector('.kvt-stigButtons');

        if (el != null) {
            el.innerHTML = '';
        } else {
            el = document.createElement('div');
            el.className = 'kvt-stigButtons';
            t.insertAdjacentElement("afterend", el);
        }

        for (let i of a) {
            let vel = document.createElement('div')
            vel.className = 'kvt-stig-item';
            vel.style.cssText = "color: " + kvtGroups[i];
            vel.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="7" fill="currentColor"></circle></svg>';

            el.insertAdjacentElement("beforeEnd", vel);
            vel.onclick = e => {
                setTickerInGroup(ticker, i)
            }
        }
    }
}