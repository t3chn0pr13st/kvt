"use strict";

let extensionId = document.querySelector("[data-kvt-extension-id]").getAttribute("data-kvt-extension-id").trim();

let settings = {};

// get settings
['kvtFastVolume', 'kvtFastVolumeRound', 'telegramId', 'rcktMonConnect'].forEach(function (st) {
    chrome.runtime.sendMessage(extensionId, {type: "LOCALSTORAGE", path: st}, function (val) {
        settings[st] = val
    })
})

setTimeout(function(){

    if (settings.telegramId) {
        kvt_connect(settings.telegramId)
    } else {
        console.warn('[kvt]', 'telegramId не установлен')
    }

    if (settings.rcktMonConnect) {
        rcktMonConnect();
    } else {
        console.warn('[kvt]', 'rcktMonConnect не включен')
    }

    function kvt_connect(telegramId) {
        var ws = new WebSocket(`wss://kvalood.ru?id=${telegramId}`);

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

    let timeouts = {};

    function add_kvtFastVolumeButtons(widget) {

        if (widget && settings.kvtFastVolume) {

            //
            let widgetId = widget.getAttribute('data-widget-id'),
                ticker = widget.getAttribute('data-widget-symbol-id'),
                timeoutName = widgetId + '-' + ticker;

            if (!timeouts[timeoutName]) {
                timeouts[timeoutName] = setTimeout(function(){

                    let block = widget.querySelector('[class^="src-modules-CombinedOrder-components-OrderSummary-OrderSummary-orderSummary-"]'),
                        price = parseFloat(widget.querySelector('[class^="src-components-OrderHeader-styles-price-"] > div').innerHTML.replace(/\s+/g, '').replace(/[,]+/g, '.'))

                    let insertBlock = widget.querySelector('.kvtFastVolume');
                    if (!insertBlock) {
                        block.insertAdjacentHTML("beforebegin", '<div class="kvtFastVolume"></div>');
                        insertBlock = widget.querySelector('.kvtFastVolume');
                    } else {
                        insertBlock.innerHTML = ''
                    }

                    let vols = [];
                    for (let i of settings.kvtFastVolume.split(',')) {
                        let vol = (i / price).toFixed();

                        if (settings.kvtFastVolumeRound) {
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



    /**
     *
     */
    new MutationObserver(function (mutationsList, observer) {
        for (let mutation of mutationsList) {
            if (!mutation.removedNodes.length) {
                if (mutation.target && mutation.type === 'childList') {

                    // Добавляем в меню TS кнопку и открываем виджет при клике
                    let ptMenu = mutation.target.querySelector(".pt-menu")
                    if (ptMenu && !ptMenu.classList.contains("kvt-menu-load")) {
                        let items = Array.from(ptMenu.querySelectorAll('[class*="Menu-styles-textInner"]'))
                        for (let itemInner of items) {
                            if (/заявка/gi.test(itemInner.textContent)) {
                                let itm = itemInner.parentNode.parentNode;
                                ptMenu.classList.add('kvt-menu-load')

                                var deliverySelector = ptMenu.querySelector('[class*="divider"]');
                                ptMenu.insertAdjacentElement("beforeend", deliverySelector.cloneNode(!0));

                                var i = ptMenu.insertAdjacentElement("beforeend", itm.cloneNode(!0));
                                i.querySelector('svg').innerHTML = '<path fill-rule="evenodd" clip-rule="evenodd" d="M8 15C11.866 15 15 11.866 15 8C15 4.134 11.866 1 8 1C4.134 1 1 4.134 1 8C1 11.866 4.134 15 8 15ZM10.6745 9.62376L8.99803 8.43701L8.9829 4.5097C8.98078 3.95742 8.53134 3.51143 7.97906 3.51356C7.42678 3.51568 6.98079 3.96512 6.98292 4.5174L7.00019 9.00001C7.00152 9.34537 7.18096 9.66281 7.47482 9.84425L9.62376 11.3255C10.0937 11.6157 10.7099 11.4699 11 11C11.2901 10.5301 11.1444 9.91391 10.6745 9.62376Z" fill="currentColor"></path>';
                                i.querySelector('[class*="text"]').textContent = "Лента принтов СПБ";

                                for (let itm of items) {
                                    if (/подписки/gi.test(itm.textContent)) {
                                        i.onclick = e => {
                                            itm.click()
                                        }
                                    }
                                }
                            }
                        }
                    }

                    //spbTS(mutation.target.closest('[data-widget-type="SUBSCRIPTIONS_WIDGET"]'))

                    // Создаем кнопки быстрого перехода к стакану
                    let s = mutation.target.querySelector('[class*="src-components-Menu-styles-tag-"]')
                    if (s) {
                        createSTIG(s.innerHTML)
                        break
                    }
                }

                if (mutation.target && mutation.type === 'characterData') {

                    // Добавим быстрый объем в $. следим за input цены справа вверху в виджете заявки
                    if (mutation.target.parentElement.matches('[class*="src-containers-Animated-styles-clickable-"]')) {
                        add_kvtFastVolumeButtons(mutation.target.parentElement.closest('[data-widget-type="COMBINED_ORDER_WIDGET"]'));
                    }
                }
            }

        }
    }).observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    })


    function spbTS(widget) {

    }

    function subscribe_spb_TS(t, e, r) {

    }
}, 100);
