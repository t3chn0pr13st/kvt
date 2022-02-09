"use strict";

let kvth = new kvtHelper(),
    extensionId = document.querySelector("[data-kvt-extension-id]").getAttribute("data-kvt-extension-id").trim(),
    kvtSettings = {};

// get settings
['kvtFastVolumePrice', 'kvtFastVolumePriceRound', 'kvtFastVolumeSize', 'telegramId', 'rcktMonConnect', 'alorToken', 'IsShortTicker'].forEach(function (st) {
    chrome.runtime.sendMessage(extensionId, {type: "LOCALSTORAGE", path: st}, function (val) {
        kvtSettings[st] = val
    })
})


let kvtInit_TIMER = setInterval(() => {
    if (kvtInit()) {
        console.log('[kvt]', 'init TIMER TRUE')
        clearInterval(kvtInit_TIMER)
    } else {
        console.log('[kvt]', 'init TIMER FALSE')
    }
}, 100);


function kvtInit() {
    let kvtRoot = document.getElementById("root")
    if (kvtRoot && kvtRoot.querySelector("header") && !kvtRoot.classList.contains('kvtRoot')) {
        kvtRoot.classList.add('kvtRoot')
        console.log('[kvt]', '!!! INITED !!!')
        kvtRun()
        return true;
    } else {
        return false;
    }
}

setTimeout(function(){
    if (kvtSettings.telegramId) {
        kvt_connect(kvtSettings.telegramId)

        if(kvtSettings.alorToken) {
            alor_connect()
        } else {
            console.log('[kvt][alor]', 'Токена нет');
        }
    } else {
        console.warn('[kvt]', 'telegramId не установлен')
    }
}, 100)

function kvtRun() {
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

                    // Добавляем в меню T&S SPBX кнопку
                    let ptMenu = mutation.target.querySelector(".pro-menu")
                    if (ptMenu && !ptMenu.classList.contains("kvt-menu-load")) {
                        ptMenu.classList.add('kvt-menu-load')
                        let modelItem = Array.from(ptMenu.querySelectorAll('[class*="pro-text-overflow-ellipsis"]'))
                            .find(item => /^подписк/gi.test(item.textContent))

                        if (modelItem && modelItem.parentNode) {
                            modelItem = modelItem.parentNode

                            var deliverySelector = ptMenu.querySelector('[class*="divider"]');
                            ptMenu.insertAdjacentElement("beforeend", deliverySelector.cloneNode(true));

                            let newItem = ptMenu.insertAdjacentElement('beforeend', modelItem.parentNode.cloneNode(true))

                            newItem.querySelector('.pro-icon').innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M8 15C11.866 15 15 11.866 15 8C15 4.134 11.866 1 8 1C4.134 1 1 4.134 1 8C1 11.866 4.134 15 8 15ZM10.6745 9.62376L8.99803 8.43701L8.9829 4.5097C8.98078 3.95742 8.53134 3.51143 7.97906 3.51356C7.42678 3.51568 6.98079 3.96512 6.98292 4.5174L7.00019 9.00001C7.00152 9.34537 7.18096 9.66281 7.47482 9.84425L9.62376 11.3255C10.0937 11.6157 10.7099 11.4699 11 11C11.2901 10.5301 11.1444 9.91391 10.6745 9.62376Z" fill="rgb(var(--pro-icon-color))"></path></svg>';
                            newItem.querySelector('[class*="text"]').textContent = 'T&S SPBX'

                            newItem.onclick = function () {
                                window['__kvtNewWidget_spbTS'] = true
                                modelItem.click()
                            }
                        }

                        // Создаем кнопки быстрого перехода к стакану
                        let s = mutation.target.querySelector('[data-qa-tag="menu-item"] [data-qa-tag="tag"] > .pro-tag-content')
                        if (s) {
                            createSTIG(s.innerHTML)
                            break
                        }
                    }

                    // Создаём СПБ ленту принтов
                    spbTS(mutation.target.closest('[data-widget-type="SUBSCRIPTIONS_WIDGET"]'))

                    // Если добавили новый виджет заявки
                    let el = mutation.target.closest('[data-widget-type="COMBINED_ORDER_WIDGET"]')
                    if (el && !el.classList.contains('kvt-widget-load')) {
                        el.classList.add('kvt-widget-load')
                        add_kvtFastVolumeSizeButtons(el)
                        add_kvtFastVolumePriceButtons(el)
                        add_IsShortTicker(el)
                        console.log('[kvt][IsShortTicker]', '111111111')
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

    // TODO: При смене табов терминала, слетают виджеты
    kvtWidgetsLoad()

    // при загрузке страницы работаем с виджетами заявки
    let widgets = document.querySelectorAll('[data-widget-type="COMBINED_ORDER_WIDGET"]')
    if (widgets.length) {
        widgets.forEach(function (widget) {
            //widget.classList.contains('kvt-widget-load')
            widget.classList.add('kvt-widget-load')
            add_kvtFastVolumeSizeButtons(widget)
            add_kvtFastVolumePriceButtons(widget)
            add_IsShortTicker(widget)
        })
    }

    new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'attributes') {
                if (mutation.target.getAttribute('data-widget-type') === 'COMBINED_ORDER_WIDGET') {
                    let symbol = mutation.target.getAttribute('data-symbol-id')
                    let prevSymbol = mutation.oldValue

                    if (prevSymbol !== symbol) {
                        add_IsShortTicker(mutation.target)
                    }
                }
            }
        })
    }).observe(document.body, {
        childList: true,
        subtree: true,
        attributeOldValue: true,
        attributeFilter: ['data-symbol-id']
    })
}

function alor_connect() {
    kvtSyncAlorAccessToken().then(r => {})

    window.__alorws = new WebSocket('wss://api.alor.ru/ws');

    window.__alorws.onopen = (e) => {
        console.log('[kvt][alor ws]', 'connected to Alor ws');

        if (window.__kvtTs) {
            // TODO: Сделать переподписку
            Object.keys(window.__kvtTs).forEach(key => {
                subscribe_spb_TS(key, window.__kvtTsTickers[key], window.__kvtTs[key])
            });
        }
    };

    window.__alorws.onmessage = (message) => {
        let json = JSON.parse(message.data)

        if(json && json.httpCode === 200) {

        }

        if (json.data && json.guid) {

            let widgetId = kvth.getKeyByValue(window.__kvtTs, json.guid),
                jd = json.data

            insetItemsSpbTS(widgetId, [jd])
            console.log('[kvt][alor ws]', jd.side, jd.symbol, kvth._ft(jd.price) ,jd.qty, kvth._tsToTime(jd.timestamp))
        } else {
            console.warn('[kvt][alor ws]', json)
        }
    }

    window.__alorws.onclose = (event) => {
        if (event.wasClean) {
            console.log(`[kvt][alor ws][close] Соединение закрыто чисто, код=${event.code} причина=${event.reason}`);
        } else {
            // например, сервер убил процесс или сеть недоступна
            // обычно в этом случае event.code 1006
            console.log('[kvt][alor ws][close] Соединение прервано');

            setTimeout(function() {
                alor_connect();
            }, 5000);
        }
    };

    window.__alorws.onerror = (error) => {
        console.warn(`[kvt][alor ws][error] ${error.message}`);
    };
}

function kvt_connect(telegramId) {
    window.__kvtWS = new WebSocket(`wss://kvalood.ru?id=${telegramId}`);
    //window.__kvtWS = new WebSocket(`ws://localhost:28972?id=${telegramId}`);

    window.__kvtWS.onopen = (e) => {
        console.log("[kvt][ws]", "connected to kvts");

        window.__kvtWS.onmessage = (message) => {
            let msg = JSON.parse(message.data);
            console.log('[kvt][ws]', 'Message', msg);

            switch (msg.type) {
                case 'setTicker':
                    setTickerInGroup(msg.ticker, msg.group)
                    break

                case 'getLastTrades': {
                    let widgetId = kvth.getKeyByValue(window.__kvtTs, msg.guid)
                    if (msg.data) {
                        insetItemsSpbTS(widgetId, msg.data)
                    }

                    break;
                }

                case 'IsShortTicker': {
                    let widgetId = kvth.getKeyByValue(window.__kvtIsShortTickers, msg.guid),
                        widget = document.querySelector('[data-widget-id="'+ widgetId +'"]')

                    if (widget && msg.data) {
                        let block = widget.querySelector('.kvt-IsShortTicker span'),
                            arr = Object.keys(msg.data).filter((i) => msg.data[i] === true),
                            blockVal = arr.length > 0 ? arr.join(", ") : '—';

                        if (block) {
                            block.innerHTML = blockVal;
                        } else {
                            let OrderBody = widget.querySelector('[class*="OrderBody-OrderBody-scrollContainer-"]');
                            OrderBody.insertAdjacentHTML("beforeend", '<div class="kvt-IsShortTicker">🩳 <span>' + blockVal +'</span></div>')
                        }
                    }

                    if (msg.tickerDetails.smallCap) {
                        widget.querySelector('[class^=src-components-TickerInfo-TickerInfo-firstColumn-]').insertAdjacentHTML('afterbegin', msg.tickerDetails.smallCap ? '<span title="Компания малой капитализации с повышенной комиссией СПБ биржи">⚠️</span>' : '')
                    }

                    break;
                }
            }
        };
    };

    window.__kvtWS.onclose = (event) => {
        if (event.wasClean) {
            console.log('[kvt][ws]', `Соединение закрыто чисто, код=${event.code} причина=${event.reason}`);
        } else {
            // например, сервер убил процесс или сеть недоступна
            // обычно в этом случае event.code 1006
            console.log('[kvt][ws]', 'Соединение прервано');

            setTimeout(function() {
                kvt_connect(telegramId);
            }, 5000);
        }
    };

    window.__kvtWS.onerror = (error) => {
        console.warn('[kvt][ws]', 'error', error.message);
    };
}

function rcktMonConnect() {
    let RcktMonWS = new WebSocket('ws://localhost:51337');

    RcktMonWS.onopen = (e) => {
        console.log('[kvt][RcktMon]', 'connected to RcktMon');

        RcktMonWS.onmessage = (message) => {
            const msg = JSON.parse(message.data);
            console.log('[kvt][RcktMon][Message]', msg);
            setTickerInGroup(msg.ticker, msg.group);
        }
    };

    RcktMonWS.onclose = (event) => {
        if (event.code !== 1006) {
            if (event.wasClean) {
                console.log('[kvt][RcktMon][ws close]', `Соединение закрыто чисто, код=${event.code} причина=${event.reason}`);
            } else {
                console.log('[kvt][RcktMon][ws close]', 'Соединение прервано');
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
        console.error('[kvt][STIG]', 'Виджет не найден')
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
            vel.style.cssText = "color: " + kvtGroups[i]/* + " !important;"*/;
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
            ticker = widget.getAttribute('data-symbol-id'),
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

            }, 500);
        }
    }
}

function add_kvtFastVolumeSizeButtons(widget) {
    if (widget && kvtSettings.kvtFastVolumeSize) {
        setTimeout(function(){
            let block = widget.querySelector('[class*="src-modules-CombinedOrder-components-OrderSummary-OrderSummary-orderSummary-"]')
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
        }, 1)
    }
}

function add_IsShortTicker (widget) {
    if (kvtSettings.IsShortTicker) {

        console.log('[kvt][IsShortTicker]', widget, widget.getAttribute("data-symbol-id"))

        setTimeout(function() {
            let widgetId = widget.getAttribute('data-widget-id')

            !window.__kvtIsShortTickers ? window.__kvtIsShortTickers = [] : 0

            window.__kvtIsShortTickers[widgetId] = kvth.uuidv4()

            if (window.__kvtWS && window.__kvtWS.readyState === 1) {
                window.__kvtWS.send(JSON.stringify({
                    user_id: kvtSettings.telegramId,
                    type: 'IsShortTicker',
                    symbol: widget.getAttribute("data-symbol-id"),
                    guid: window.__kvtIsShortTickers[widgetId]
                }));

                let block = widget.querySelector('.kvt-IsShortTicker')
                if (block) block.remove()
            }
        }, 1)
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

function kvtWidgetsLoad() {
    let kvtWidgets = JSON.parse(localStorage.getItem("_kvt-widgets") || "{}")

    if (Object.keys(kvtWidgets).length) {
        setTimeout(function() {
            console.log('[kvt][kvtWidgetsLoad]', 'БД Есть виджеты')
            Object.keys(kvtWidgets).forEach(i => {
                let widget = document.querySelector('[data-widget-id=' + i + ']')

                if (widget) {
                    console.log('[kvt][kvtWidgetsLoad]', 'widget YES', i, widget)
                    spbTS(widget)
                } else {
                    console.log('[kvt][kvtWidgetsLoad]', 'widget NO', i, widget)
                    //delete kvtWidgets[i]
                }
            })

            //localStorage.setItem("_kvt-widgets", JSON.stringify(kvtWidgets))
        }, 1)
    } else {
        console.log('[kvt][kvtWidgetsLoad]', 'Виджетов нет')
    }
}

function spbTS(widget) {

    if (widget && !widget.getAttribute('data-kvt-widget-load')) {
        let kvtWidgets = JSON.parse(localStorage.getItem("_kvt-widgets") || "{}"),
            widgetID = widget.getAttribute("data-widget-id")

        console.log('[kvt][spbTS]', 'вызвали изменение виджета', widgetID)

        if (window[`__kvtNewWidget_spbTS`] || typeof kvtWidgets[widgetID] !== 'undefined') {
            window[`__kvtNewWidget_spbTS`] = false;

            widget.setAttribute('data-kvt-widget-load', 'SpbTS')

            let symbol = widget.getAttribute("data-symbol-id") || ''

            kvtWidgets[widgetID] = symbol
            localStorage.setItem("_kvt-widgets", JSON.stringify(kvtWidgets))

            initSpbTS(widget, symbol)
            console.log('[kvt][spbTS]', 'хотим подписаться на ', widgetID, symbol)
            if (symbol) {
                subscribe_spb_TS(widgetID, symbol)
            } else {
                console.log('[kvt][spbTS]', 'symbol ПУСТОЙ', symbol)
            }

            observeWidgetChangeTicker(widget)

            // отписка при закрытии виджета
            widget.querySelector('[class*="packages-core-lib-components-WidgetBody-WidgetBody-icons"]').addEventListener("click", function () {
                unsubscribe_spb_TS(widgetID)
                kvtWidgets = JSON.parse(localStorage.getItem("_kvt-widgets") || "{}")
                delete kvtWidgets[widgetID]
                localStorage.setItem("_kvt-widgets", JSON.stringify(kvtWidgets))
            })
        }
    }
}

function initSpbTS(widget, symbol) {

    widget.querySelector('[class*="-WidgetBody-title-"]').textContent = "T&S SPBX " + symbol

    if (widget.getAttribute('data-kvt-widget-init')) {
        widget.querySelector('.kvt-spb-ts tbody').innerHTML = ''
    } else {
        widget.setAttribute('data-kvt-widget-init', 'SpbTS')
        let widgetContent = widget.querySelector('.widget')
        widgetContent.parentNode.removeChild(widgetContent)

        widget.lastElementChild.firstChild.insertAdjacentHTML("beforeend",
            '<div class="kvt-spb-ts"><div class="kvt-spb-ts-inner"><table class="kvt-spb-ts-table"><thead><tr><th>Price</th><th>Size</th><th>Vol.$</th><th>Time</th></tr></thead><tbody></tbody></table></div></div>')
    }
}

function insetItemsSpbTS(widgetId, data) {

    let widget = document.querySelector('[data-widget-id="'+ widgetId +'"]')
    if (widget) {
        let lenta = widget.querySelector('.kvt-spb-ts-table tbody')

        if (lenta) {
            if (data.length > 1) {

                let todayDate = new Date().getUTCDate(),
                    sepDate = todayDate;

                for (let jd of data) {
                    let jdTime = new Date(jd.timestamp),
                        jdDate = jdTime.getUTCDate();

                    if (jdDate !== todayDate && sepDate !== jdDate) {
                        sepDate = jdDate
                        lenta.insertAdjacentHTML('beforeend', `<tr class="type-separator"><td colspan="4"">🔸🔸🔹🔹 ${(jdTime.getUTCDate() + "").padStart(2, "0")}-${(jdTime.getUTCMonth() + 1 + "").padStart(2, "0")}-${jdTime.getUTCFullYear()} 🔹🔹🔸🔸</td></tr>`)
                    }

                    lenta.insertAdjacentHTML('beforeend', `<tr class="type-${jd.side}" data-ts-id="${jd.id}"><td>${kvth._ft(jd.price)}</td><td>${jd.qty}</td><td>${kvth._ft(jd.qty *jd.price)}</td><td>${kvth._tsToTime(jd.timestamp).padStart(12)}</td></tr>`)
                }
            } else {
                for (let jd of data) {
                    lenta.insertAdjacentHTML('afterbegin', `<tr class="type-${jd.side}" data-ts-id="${jd.id}"><td>${kvth._ft(jd.price)}</td><td>${jd.qty}</td><td>${kvth._ft(jd.qty *jd.price)}</td><td>${kvth._tsToTime(jd.timestamp).padStart(12)}</td></tr>`)
                    if (299 < lenta.children.length) {
                        lenta.lastChild.remove();
                    }
                }
            }
        }
    } else {
        unsubscribe_spb_TS(widgetId)
    }

}

function observeWidgetChangeTicker(widget) {

    console.log('[kvt][observeWidgetChangeTicker]')

    new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'attributes') {
                let symbol = mutation.target.getAttribute('data-symbol-id')
                let prevSymbol = mutation.oldValue

                console.log('[kvt][observeWidgetChangeTicker]', 'newTicker', symbol)
                console.log('[kvt][observeWidgetChangeTicker]', 'prevTicker', prevSymbol)

                if (prevSymbol !== symbol) {
                    initSpbTS(widget, symbol)
                    let widgetID = mutation.target.getAttribute("data-widget-id")
                    unsubscribe_spb_TS(widgetID)
                    subscribe_spb_TS(widgetID, symbol)
                }
            }
        })
    }).observe(widget, {
        attributeOldValue: true,
        attributeFilter: ['data-symbol-id']
    })
}

function subscribe_spb_TS(widgetId, ticker, guid) {
    !window.__kvtTs ? window.__kvtTs = [] : 0
    !window.__kvtTsTickers ? window.__kvtTsTickers = [] : 0

    if (!guid) {
        window.__kvtTs[widgetId] = kvth.uuidv4()
    }

    window.__kvtTsTickers[widgetId] = ticker

    console.log('[kvt][T&S][subscribe]', 'subscribe_spb_TS', widgetId, ticker)

    // Запросим 200 последних принтов
    if (window.__kvtWS && window.__kvtWS.readyState === 1) {
        window.__kvtWS.send(JSON.stringify({
            user_id: kvtSettings.telegramId,
            type: 'getLastTrades',
            ticker: ticker,
            guid: window.__kvtTs[widgetId]
        }));
    }

    if (window.__alorws && window.__alorws.readyState === 1) {
        window.__alorws.send(JSON.stringify({
            "opcode": "AllTradesGetAndSubscribe",
            "code": ticker,
            "exchange": "SPBX",
            "delayed": false,
            "token": kvtAlorJWT,
            "guid": window.__kvtTs[widgetId]
        }));

        console.log('[kvt][T&S][subscribe]', 'Вроде подписался')
    } else {
        console.log('[kvt][T&S][subscribe]', 'Не подписался, сокет не готов')
    }
}

function unsubscribe_spb_TS(widgetId) {

    console.log('[kvt][T&S][unsubscribe]', '', widgetId)

    if (window.__kvtTs && window.__kvtTs[widgetId]) {
        if (window.__alorws && window.__alorws.readyState === 1) {
            window.__alorws.send(JSON.stringify({
                "opcode": "unsubscribe",
                "token": kvtAlorJWT,
                "guid": window.__kvtTs[widgetId]
            }));

            console.log('[kvt][T&S][unsubscribe]', 'отписался от ', widgetId)
        } else {
            console.log('[kvt][T&S][unsubscribe]', 'Не отписался, сокет не готов')
        }

        delete window.__kvtTs[widgetId]
        delete window.__kvtTsTickers[widgetId]
    } else {
        console.log('[kvt][T&S][unsubscribe]', 'такой подписки нет')
    }
}