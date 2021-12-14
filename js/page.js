"use strict";

let extensionId = document.querySelector("[data-kvt-extension-id]").getAttribute("data-kvt-extension-id").trim();

let kvtSettings = {}
let kvth = new kvtHelper();

// get settings
['kvtFastVolumePrice', 'kvtFastVolumePriceRound', 'kvtFastVolumeSize', 'telegramId', 'rcktMonConnect', 'alorToken'].forEach(function (st) {
    chrome.runtime.sendMessage(extensionId, {type: "LOCALSTORAGE", path: st}, function (val) {
        kvtSettings[st] = val
    })
})

setTimeout(function(){

    if (kvtSettings.telegramId) {
        kvt_connect(kvtSettings.telegramId)
    } else {
        console.warn('[kvt]', 'telegramId не установлен')
    }

    if (kvtSettings.rcktMonConnect) {
        rcktMonConnect();
    } else {
        console.warn('[kvt]', 'rcktMonConnect не включен')
    }


    /**
     *
     */
    new MutationObserver(function (mutationsList, observer) {
        for (let mutation of mutationsList) {
            if (!mutation.removedNodes.length) {
                if (mutation.target && mutation.type === 'childList') {


                    // Создаем кнопки быстрого перехода к стакану
                    let s = mutation.target.querySelector('[data-qa-tag="menu-item"] [data-qa-tag="tag"] > .pro-tag-content')
                    if (s) {
                        createSTIG(s.innerHTML)
                        break
                    }
                }

                if (mutation.target && mutation.type === 'characterData') {

                    // Добавим быстрый объем в $. следим за input цены справа вверху в виджете заявки
                    if (mutation.target.parentElement.matches('[class*="src-containers-Animated-styles-clickable-"]')) {
                        add_kvtFastVolumePriceButtons(mutation.target.parentElement.closest('[data-widget-type="COMBINED_ORDER_WIDGET"]'));
                    }
                }
            }

        }
    }).observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    })

}, 100);


function kvt_connect(telegramId) {
    let ws = new WebSocket(`wss://kvalood.ru?id=${telegramId}`);

    ws.onopen = (e) => {
        console.log("[kvt]", "connected to kvts");

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
            }, 5000);
        }
    };

    ws.onerror = (error) => {
        console.warn('[kvt][error]', error.message);
    };
}

function rcktMonConnect() {
    let RcktMonWS = new WebSocket('ws://localhost:51337');

    RcktMonWS.onopen = (e) => {
        console.log("[kvt]", "connected to RcktMon");

        RcktMonWS.onmessage = (message) => {
            const msg = JSON.parse(message.data);
            console.log('[RcktMon][Message]', msg);
            setTickerInGroup(msg.ticker, msg.group);
        }
    };

    RcktMonWS.onclose = (event) => {
        if (event.code !== 1006) {
            if (event.wasClean) {
                console.log('[RcktMon][ws close]', `Соединение закрыто чисто, код=${event.code} причина=${event.reason}`);
            } else {
                console.log('[RcktMon][ws close]', 'Соединение прервано');
                setTimeout(function() {
                    rcktMonConnect();
                }, 5000);
            }
        }
    };

    RcktMonWS.onerror = (error) => {
        console.warn('[RcktMon][error]', error.message);
    };
}

function setTickerInGroup(ticker, group_id) {
    let widget = getGroupWidget(group_id);

    if (!widget) {
        console.error('[kvt]', 'Виджет не найден')
        return null;
    }
    let reactObjectName = Object.keys(widget).find(function (key) {
        return key.startsWith("__reactFiber$")
    });

    let target = widget[reactObjectName].memoizedProps.children.find(function (child) {
        return typeof child === 'object' && child !== null
    })

    target && target._owner.memoizedProps.selectSymbol(ticker.toUpperCase())
}

let kvtGroups = {
    1: "rgb(255, 212, 80)",
    2: "rgb(255, 123, 118)",
    3: "rgb(163, 129, 255)",
    4: "rgb(77, 195, 247)",
    5: "rgb(174, 213, 127)",
    6: "rgb(77, 161, 151)",
    7: "rgb(255, 183, 76)",
    8: "rgb(248, 163, 77)",
    9: "rgb(255, 136, 99)",
    10: "rgb(238, 128, 93)",
    11: "rgb(255, 120, 167)",
    12: "rgb(212, 93, 140)",
    13: "rgb(188, 113, 201)",
    14: "rgb(124, 174, 255)",
    15: "rgb(75, 208, 225)",
    16: "rgb(115, 176, 119)",
}

function getGroupWidget(group_id){
    let orderWidgetObject;
    document.querySelectorAll('[data-widget-type="COMBINED_ORDER_WIDGET"]').forEach(function (widget) {
        if (widget.querySelector('div[class^="packages-core-lib-components-GroupMenu-GroupMenu-icon"][style*="color: ' + kvtGroups[group_id] + '"]')) {
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
            if (widget.querySelector('div[class^="packages-core-lib-components-GroupMenu-GroupMenu-icon"][style*="color: ' + kvtGroups[group_id] + '"]')) {
                activeGroupsIds.push(group_id)
            }
        }
    })
    return activeGroupsIds.sort((a, b) => a - b);
}

function createSTIG(ticker) {

    let a = getActiveGroupsWidget()

    if (a.length) {
        let t = document.querySelector('[class*=src-components-Menu-styles-item-]'),
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
            vel.style.cssText = "color: " + kvtGroups[i] + " !important;";
            vel.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="7" fill="currentColor"></circle></svg>';

            el.insertAdjacentElement("beforeEnd", vel);
            vel.onclick = e => {
                setTickerInGroup(ticker, i)
            }
        }
    }
}

let timeouts = {};

function add_kvtFastVolumePriceButtons(widget) {

    if (widget && kvtSettings.kvtFastVolumePrice) {
        let widgetId = widget.getAttribute('data-widget-id'),
            ticker = widget.getAttribute('data-widget-symbol-id'),
            timeoutName = widgetId + '-' + ticker;

        if (!timeouts[timeoutName]) {
            timeouts[timeoutName] = setTimeout(function(){

                let block = widget.querySelector('[class^="src-modules-CombinedOrder-components-OrderSummary-OrderSummary-orderSummary-"]'),
                    price = parseFloat(widget.querySelector('[class^="src-components-OrderHeader-styles-price-"] > div').innerHTML.replace(/\s+/g, '').replace(/[,]+/g, '.'))

                let insertBlock = widget.querySelector('.kvtFastVolumePrice');
                if (!insertBlock) {
                    block.insertAdjacentHTML("beforebegin", '<div class="kvtFastVolumePrice"></div>');
                    insertBlock = widget.querySelector('.kvtFastVolumePrice');
                } else {
                    insertBlock.innerHTML = ''
                }

                let vols = [];
                for (let i of kvtSettings.kvtFastVolumePrice.split(',')) {
                    let vol = (i / price).toFixed();

                    if (kvtSettings.kvtFastVolumePriceRound) {
                        vol = customRound(vol)
                    }

                    if (!vols.includes(vol) && vol !== 0) {
                        vols.push(vol);

                        let vel = document.createElement('span')
                        vel.setAttribute('data-kvt-volume', vol);
                        vel.innerHTML = vol;

                        insertBlock.insertAdjacentElement('beforeend', vel)
                        vel.onclick = e => {
                            set_kvtFastVolume(widget, vol)
                        }
                    }
                }

                timeouts[timeoutName] = null

            }, 800);
        }
    }
}

function add_kvtFastVolumeSizeButtons(widget) {
    if (widget && kvtSettings.kvtFastVolumeSize) {
        let block = widget.querySelector('[class^="src-modules-CombinedOrder-components-OrderSummary-OrderSummary-orderSummary-"]')
        let insertBlock = widget.querySelector('.kvtFastVolumeSize');

        if (!insertBlock) {
            block.insertAdjacentHTML("beforebegin", '<div class="kvtFastVolumeSize"></div>');
            insertBlock = widget.querySelector('.kvtFastVolumeSize');
        } else {
            insertBlock.innerHTML = ''
        }

        for (let vol of kvtSettings.kvtFastVolumeSize.split(',')) {
            vol = vol.replace(/\D/g,'')
            let vel = document.createElement('span')
            vel.setAttribute('data-kvt-volume', vol);
            vel.innerHTML = vol;

            insertBlock.insertAdjacentElement('beforeend', vel)
            vel.onclick = e => {
                set_kvtFastVolume(widget, vol)
            }
        }
    }
}

let reactGetEl = function (t) {
    var e = Object.keys(t).find(function (t) {
        return t.startsWith("__reactProps$")
    });
    return e ? t[e] : null
}

function set_kvtFastVolume(widget, vol) {
    let input = widget.querySelector('[class^="src-modules-CombinedOrder-components-OrderForm-OrderForm-leftInput-"]')
    input = input.nextSibling
    input = input.querySelector('input')

    vol = vol.toString()

    let i = reactGetEl(input)

    i.onChange({
        target: {value: vol},
        currentTarget: {value: vol}
    })
}

function customRound(val, n = 100) {
    return Math.round(val / n) * n;
}

// при загрузке страницы достаём виджеты цены
let kvtFastVolumeButtons_TIMER = setInterval(() => {
    let widgets = document.querySelectorAll('[data-widget-type="COMBINED_ORDER_WIDGET"]')
    if (widgets.length) {
        widgets.forEach(function (widget) {
            add_kvtFastVolumePriceButtons(widget)
            add_kvtFastVolumeSizeButtons(widget)
        })
        clearInterval(kvtFastVolumeButtons_TIMER)
    }
}, 1000);
