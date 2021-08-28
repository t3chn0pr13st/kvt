let extensionId = document.querySelector("[data-kvt-extension-id]").getAttribute("data-kvt-extension-id").trim();

chrome.runtime.sendMessage(extensionId, {type: "telegramId"}, function (telegramId) {
    if (telegramId) {
        kvt_connect(telegramId)
    } else {
        console.warn('[kvt] - telegramId не установлен')
    }
});

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

function getGroupWidget(group_id){
    let orderWidgetObject,
        groups = {
            3: "rgb(163, 129, 255);",
            6: "rgb(77, 161, 151);",
            8: "rgb(248, 163, 77);",
            10: "rgb(238, 128, 93);",
            14: "rgb(124, 174, 255);"
        }
    document.querySelectorAll('[data-widget-type="COMBINED_ORDER_WIDGET"]').forEach(function (widget) {
        if (widget.querySelector('div[class^="packages-core-lib-containers-WidgetLayout-GroupMenu-styles-groupSelector"][style="color: ' + groups[group_id] + '"]')) {
            orderWidgetObject = widget;
        }
    })
    return orderWidgetObject;
}