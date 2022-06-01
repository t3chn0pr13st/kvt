"use strict";

let kvtd = false,
    kvth,
    kvtSettings,
    kvtStates = {
        alor: {},
        kvts: {},
        rcktMon: {}
    },
    timeouts = {},
    kvtGroups = {
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
    },
    kvtWidgets = {
        spbTS: {
            name: 'T&S SPBX',
            icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M8 15C11.866 15 15 11.866 15 8C15 4.134 11.866 1 8 1C4.134 1 1 4.134 1 8C1 11.866 4.134 15 8 15ZM10.6745 9.62376L8.99803 8.43701L8.9829 4.5097C8.98078 3.95742 8.53134 3.51143 7.97906 3.51356C7.42678 3.51568 6.98079 3.96512 6.98292 4.5174L7.00019 9.00001C7.00152 9.34537 7.18096 9.66281 7.47482 9.84425L9.62376 11.3255C10.0937 11.6157 10.7099 11.4699 11 11C11.2901 10.5301 11.1444 9.91391 10.6745 9.62376Z" fill="rgb(var(--pro-icon-color))"></path></svg>',
            template: '<div class="kvt-widget"><div class="kvt-widget-inner"><table class="kvt-widget-table"><thead><tr><th>Price</th><th>Size</th><th>Vol.$</th><th>Time</th></tr></thead><tbody class="kvt-widget-content"></tbody></table></div></div>',
            templateItem: (jd) => {
                return `<tr class="type-${jd.side}" data-ts-id="${jd.id}"><td>${kvth._ft(jd.price)}</td><td>${jd.qty}</td><td>${kvth._ft(jd.qty * jd.price)}</td><td>${kvth._tsToTime(jd.timestamp).padStart(12)}</td></tr>`
            },
            unsubscribe: unsubscribe_spbTS
        },
        getdp: {
            name: 'GETDP',
            icon: '',
            template: '<div class="kvt-widget"><div class="kvt-widget-inner"><table class="kvt-widget-table"><thead><tr><th>Ticker</th><th>Size</th><th>Price</th><th>Vol.$</th><th>Time</th></tr></thead><tbody class="kvt-widget-content"></tbody></table></div></div>',
            templateItem: (jd) => {
                return `<tr class="type-${jd.side}" data-ts-id="${jd.id}"><td class="item-ticker"><div><span>${jd.text}</span><span class="item-ticker-symbol">${jd.symbol}</span><span>${jd.smallCap ? '⚠️' : ''}</span></div></td><td>${kvth.sizeFormat(jd.qty)}</td><td>${kvth._ft(jd.price)}</td><td class="item-total">${kvth.sizeFormat(jd.qty * jd.price)}</td><td class="item-timestamp">${kvth._tsToTime(jd.timestamp).padStart(12)}</td></tr>`
            },
            unsubscribe: unsubscribe_getdp
        }
    };


let kvtInject_TIMER = setInterval(() => {
    if (document.querySelector("[data-kvt-extension]") !== null) {
        clearInterval(kvtInject_TIMER)

        kvth = new kvtHelper()
        kvtSettings = JSON.parse(document.querySelector("[data-kvt-extension]").innerHTML)

        if (kvtSettings.debug) {
            kvtd = null
        }

        // Подключаемся к сервисам
        if (kvtSettings.telegramId && kvtSettings.kvtToken) {
            kvt_connect()
        
            if (kvtSettings.alorToken) {
                if (kvtSettings.alorTS) {
                    alor_connect()
                } else {
                    kvtd ?? console.log('[kvt][alor]', 'Нет необходимости подключаться');
                    kvtStateSet('alor', 3, `Нет необходимости подключаться`)
                }                
            } else {
                kvtd ?? console.log('[kvt][alor]', 'Токена нет');
                kvtStateSet('alor', 0, `Токена нет`)
            }
        } else {
            kvtd ?? console.warn('[kvt]', 'telegramId и/или kvt токен не установлен')
            kvtStateSet('kvts', 0, `telegramId и/или kvt токен не установлен`)
            kvtStateSet('alor', 0, `telegramId и/или kvt токен не установлен`)
        }

        // Подключение к rcktMon
        if (kvtSettings.rcktMonConnect) {
            rcktMonConnect();
        } else {
            kvtd ?? console.warn('[kvt]', `Опция 'Переключать тикеры из RcktMon' выключена`)
            kvtStateSet('rcktMon', 0, `Опция 'Переключать тикеры из RcktMon' выключена`)
        }

        // Запуск оболочки
        let kvtInit_TIMER = setInterval(() => {
            let kvtRoot = document.getElementById("root")
            if (kvtRoot && kvtRoot.querySelector("header") && !kvtRoot.classList.contains('kvtRoot')) {
                kvtRoot.classList.add('kvtRoot')
                kvtd ?? console.log('[kvt]', '!!! INITED !!!')
                kvtRun()
                clearInterval(kvtInit_TIMER)
            }
        }, 100);

    } else {
        // Загрузка не удалась.
    }
}, 100);


function kvtRun() {

    // STATE: Индикация соединений
    document.querySelector('[class*=src-containers-Profile-styles-buttons-]').insertAdjacentHTML('afterbegin', '<div class="kvt-state"></div>')
    let kvtState = document.querySelector('.kvt-state')
    Object.keys(kvtStates).forEach(i => {
        kvtState.insertAdjacentHTML('beforeend', `<div data-kvt-state-name="${i}" data-kvt-state-value="${(kvtStates[i].state || 0)}" title="${i} - ${(kvtStates[i].msg || 'нет попыток подключиться')}"></div>`)
    });

    /**
     *
     */
    new MutationObserver(function (mutationsList, observer) {
        for (let mutation of mutationsList) {
            if (!mutation.removedNodes.length) {
                if (mutation.target && mutation.type === 'childList') {

                    // Добавляем в меню кнопку виджета
                    let ptMenu = mutation.target.querySelector(".pro-menu")
                    if (ptMenu && !ptMenu.classList.contains("kvt-menu-load")) {
                        ptMenu.classList.add('kvt-menu-load')
                        let modelItem = Array.from(ptMenu.querySelectorAll('[class*="pro-text-overflow-ellipsis"]'))
                            .find(item => /^подписк/gi.test(item.textContent))

                        if (modelItem && modelItem.parentNode) {
                            modelItem = modelItem.parentNode

                            var deliverySelector = ptMenu.querySelector('[class*="divider"]');
                            ptMenu.insertAdjacentElement("beforeend", deliverySelector.cloneNode(true));

                            Object.keys(kvtWidgets).forEach(i => {
                                let newItem = ptMenu.insertAdjacentElement('beforeend', modelItem.parentNode.cloneNode(true))

                                newItem.querySelector('.pro-icon').innerHTML = kvtWidgets[i].icon;
                                newItem.querySelector('[class*="text"]').textContent = kvtWidgets[i].name
                                newItem.onclick = function () {
                                    window['__kvtNewWidget'] = i
                                    modelItem.click()
                                }
                            })
                        }

                        // Создаем кнопки быстрого перехода к стакану
                        let s = mutation.target.querySelector('[data-qa-tag="menu-item"] [data-qa-tag="tag"] > .pro-tag-content')
                        if (s) {
                            createSTIG(s.innerHTML)
                            break
                        }
                    }

                    // Создаём Виджеты
                    kvtCreateWidget(mutation.target.closest('[data-widget-type="SUBSCRIPTIONS_WIDGET"]'))

                    // Если добавили новый виджет заявки
                    let el = mutation.target.closest('[data-widget-type="COMBINED_ORDER_WIDGET"]')
                    if (el && !el.classList.contains('kvt-widget-load')) {
                        el.classList.add('kvt-widget-load')
                        add_kvtFastVolumeSizeButtons(el)
                        add_kvtFastVolumePriceButtons(el)
                        add_IsShortTicker(el)
                    }
                }

                if (mutation.target && mutation.type === 'characterData') {

                    // Добавим быстрый объем в $. следим за input цены справа вверху в виджете заявки
                    if (mutation.target.parentElement && mutation.target.parentElement.matches('[class*="src-containers-Animated-styles-clickable-"]')) {
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

                // При смене табов отписываемся от разных данных
                if (mutation.target.getAttribute('id') === 'SpacePanel') {
                    if (window.__kvtTs) {
                        for (let item of window.__kvtTs) {
                            unsubscribe_spbTS(item.widgetId)
                        }
                    }

                    if (window.__kvtGetdp) {
                        for (let item of window.__kvtTs) {
                            unsubscribe_getdp(item.widgetId)
                        }
                    }
                }
            }
        })
    }).observe(document.body, {
        childList: true,
        subtree: true,
        attributeOldValue: true,
        attributeFilter: ['data-symbol-id', 'data-space-id']
    })    
}

function alor_connect(resubscribe = false) {
    kvtSyncAlorAccessToken().then(res => {

        if (res.AccessToken) {
            window.__alorws = new WebSocket('wss://api.alor.ru/ws');

            window.__alorws.onopen = (e) => {
                if (window.__kvtTs && resubscribe) {
                    for (let item of window.__kvtTs) {
                        kvtd ?? console.warn('subscribe_spb_TS_1')
                        subscribe_spb_TS(item.widgetId, item.ticker, item.guid)
                    }
                }
            };

            window.__alorws.onmessage = (message) => {
                let json = JSON.parse(message.data)

                kvtd ?? console.log('[kvt][alor ws]', json)
                
                if (json.httpCode === 200) {
                    kvtd ?? console.log('[kvt][alor ws]', 'Подключен к вебсокету Alor'); // FIXME: надо что-то с этим сделать. Будет постоянно лезть при подписке.
                    kvtStateSet('alor', 2, `Подключен к вебсокету Alor`, 200)
                }

                if (json.httpCode === 400) {
                    kvtd ?? console.log('[kvt][alor ws]', `Ошибка подключения. Сообщение: ${json.message}`);
                    kvtStateSet('alor', 1, `Ошибка подключения. Сообщение: ${json.message}`, json.httpCode)
                }

                // if (json.httpCode === 401) {
                //     kvtd ?? console.log('[kvt][alor ws]', `Ошибка подключения. Сообщение: ${json.message}`);
                //     kvtStateSet('alor', 1, `Ошибка подключения. Сообщение: ${json.message}`, json.httpCode)
                // }

                if (json.data && json.guid) {
                    let obj = getKvtTsByGuid(json.guid),
                        jd = json.data

                    if (obj) {
                        insetItemsContent(obj.widgetId, [jd])
                    }
                }
            }

            window.__alorws.onclose = (event) => {
                if (event.wasClean) {
                    kvtd ?? console.log(`[kvt][alor ws][close] Соединение закрыто чисто, код=${event.code} причина=${event.reason}`);
                    kvtStateSet('alor', 0, `Соединение прервано`)
                } else {
                    // например, сервер убил процесс или сеть недоступна
                    // обычно в этом случае event.code 1006
                    kvtd ?? console.log('[kvt][alor ws][close] Соединение прервано', event);
                    kvtStateSet('alor', 0, `Соединение прервано`)

                    setTimeout(function() {
                        kvtd ?? console.log('[kvt][alor ws] Пробуем переподписаться', event);
                        alor_connect(true);
                    }, 5000);
                }
            };

            window.__alorws.onerror = (error) => {
                kvtd ?? console.warn(`[kvt][alor ws][error] ${error.message}`);
                kvtStateSet('alor', 0, `Ошибка сокета: ${error.message}`)
            };
        } else {
            kvtStateSet('alor', 0, `${res.status} ${res.statusText}`, res.status)
        }
    })
}

function kvt_connect(resubscribe = false) {
    window.__kvtWS = new WebSocket(`wss://kvalood.ru?id=${kvtSettings.telegramId}&token=${kvtSettings.kvtToken}&ver=${kvtSettings.extensionVer}`);
    //window.__kvtWS = new WebSocket(`ws://localhost:28972?id=${kvtSettings.telegramId}&token=${kvtSettings.kvtToken}&ver=${kvtSettings.extensionVer}`);

    window.__kvtWS.onopen = (e) => {
        kvtd ?? console.log("[kvt][kvts ws]", "Подключен к серверу kvts");
        kvtStateSet('kvts', 2, `Подключен к серверу kvts`)

        // Переподписка на Getdp
        if (window.__kvtGetdp && resubscribe) {
            for (let item of window.__kvtGetdp) {
                subscribe_getdp(item.widgetId, item.ticker, item.guid)
                kvtd ?? console.warn('subscribe_getdp_1')
            }
        }

        // Переподписка на TS
        if (window.__kvtTs && resubscribe) {
            for (let item of window.__kvtTs) {
                kvtd ?? console.warn('subscribe_spb_TS_5')
                subscribe_spb_TS(item.widgetId, item.ticker, item.guid)
            }
        }

        window.__kvtWS.onmessage = (message) => {
            let msg = JSON.parse(message.data);

            switch (msg.type) {
                case 'setTicker':
                    setTickerInGroup(msg.ticker, msg.group, 'kvtSTIGFastVolSumBot') // TODO: Wtf?
                    break

                case 'getLastTrades': {
                    let obj = getKvtTsByGuid(msg.guid)
                    if (msg.data && obj) {
                        insetItemsContent(obj.widgetId, msg.data)
                    }

                    break;
                }

                case 'IsShortTicker': {
                    let widgetId = Object.keys(window.__kvtIsShortTickers).find(key => window.__kvtIsShortTickers[key] === msg.guid),
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

                case 'getdp': {
                    let obj = window.__kvtGetdp.find(item => item.guid === msg.guid)
                    if (msg.data) {
                        kvtd ?? console.warn('insetItemsContent_3 getdp')
                        insetItemsContent(obj.widgetId, msg.data)
                    }

                    break;
                }
            }
        };
    };

    window.__kvtWS.onclose = (event) => {
        let msg
        if (event.wasClean) {
            msg = `Соединение закрыто чисто, код=${event.code} причина=${event.reason}`
        } else {
            msg = `Соединение прервано, код=${event.code} причина=${event.reason}`

            setTimeout(function() {
                kvt_connect(true);
            }, 5000);
        }

        kvtd ?? console.log('[kvt][kvts ws][close]', msg);
        kvtStateSet('kvts', 0, msg)
    };

    window.__kvtWS.onerror = (error) => {
        kvtd ?? console.warn('[kvt][kvts ws][error]', error.message);
    };
}

function rcktMonConnect() {
    window.__RcktMonWS = new WebSocket('ws://localhost:51337');

    window.__RcktMonWS.onopen = (e) => {
        kvtd ?? console.log('[kvt][RcktMon ws]', 'connected to RcktMon');
        kvtStateSet('rcktMon', 2, 'connected to RcktMon')
    };

    window.__RcktMonWS.onmessage = (message) => {
        const msg = JSON.parse(message.data);
        kvtd ?? console.log('[kvt][RcktMon ws][Message]', msg);
        setTickerInGroup(msg.ticker, msg.group, 'kvtSTIGFastVolSumRcktMon');
    }

    window.__RcktMonWS.onclose = (event) => {
        let msg
        if (event.wasClean) {
            msg = `Соединение закрыто чисто, код=${event.code} причина=${event.reason}`
        } else {
            msg = `Соединение прервано, код=${event.code} причина=${event.reason}`
            if (event.code !== 1006) {
                setTimeout(function () {
                    rcktMonConnect();
                }, 5000);
            }
        }
        kvtd ?? console.log('[kvt][RcktMon ws][close]', msg);
        kvtStateSet('rcktMon', 0, msg)
    };

    window.__RcktMonWS.onerror = (error) => {
        kvtd ?? console.warn('[kvt][RcktMon ws][error]', error.message);
    };
}


function setTickerInGroup(ticker, group_id, type) {
    let widget = getGroupWidget(group_id);

    if (!widget) {
        kvtd ?? console.error('[kvt][setTickerInGroup]', 'Виджет не найден')
        return null;
    }
    let reactObjectName = Object.keys(widget).find(function (key) {
        return key.startsWith("__reactFiber$")
    });

    let target = widget[reactObjectName].memoizedProps.children.find(function (child) {
        return typeof child === 'object' && child !== null
    })

    target && target._owner.memoizedProps.selectSymbol(ticker)

    if (type && kvtSettings[type]) {
        set_kvtFastSum(widget, kvtSettings[type])
    }
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
                if (!activeGroupsIds.includes(group_id)) {
                    activeGroupsIds.push(group_id)
                }
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
                        vel.setAttribute('title', vol + ' шт');
                        vel.innerHTML = kvth.sizeFormat(i);

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

        kvtd ?? console.log('[kvt][IsShortTicker]', widget, widget.getAttribute("data-symbol-id"))

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

function set_kvtFastSum (widget, sum) {

    let timeoutName = widget.getAttribute('data-widget-id') + widget.getAttribute('data-symbol-id') + 'fast'

    if (!timeouts[timeoutName]) {
        timeouts[timeoutName] = setTimeout(function(){
            // TODO: Найти более адекватный источник данных (мб запрос ttps://api-invest.tinkoff.ru/trading/stocks/get?ticker=*)
            let price = parseFloat(widget.querySelector('[class^="src-components-OrderHeader-styles-price-"] > div').innerHTML.replace(/\s+/g, '').replace(/[,]+/g, '.'))

            set_kvtFastVolume(widget, (sum / price).toFixed())

            timeouts[timeoutName] = null

        }, 500);
    }
}

function customRound(val, n = 100) {
    return Math.round(val / n) * n;
}

function kvtWidgetsLoad() {
    let kvtWidgets = JSON.parse(localStorage.getItem("_kvt-widgets") || "{}")

    if (Object.keys(kvtWidgets).length) {
        setTimeout(function() {
            kvtd ?? console.log('[kvt][kvtWidgetsLoad] БД Есть виджеты')
            Object.keys(kvtWidgets).forEach(i => {
                let widget = document.querySelector('[data-widget-id=' + i + ']')

                if (widget) {
                    kvtd ?? console.log('[kvt][kvtWidgetsLoad] Виджет есть', i, widget)
                    kvtCreateWidget(widget)
                } else {
                    kvtd ?? console.log('[kvt][kvtWidgetsLoad] Виджета НЕТ, но он в БД', i, widget)
                    //delete kvtWidgets[i]
                }
            })

            //localStorage.setItem("_kvt-widgets", JSON.stringify(kvtWidgets))
        }, 1)
    } else {
        kvtd ?? console.log('[kvt][kvtWidgetsLoad]', 'Виджетов нет')
    }
}

function kvtCreateWidget(widget) {
    if (widget && !widget.getAttribute('data-kvt-widget-load')) {
        let kvtWidgets = JSON.parse(localStorage.getItem("_kvt-widgets") || "{}"),
            widgetID = widget.getAttribute("data-widget-id"),
            symbol = widget.getAttribute("data-symbol-id") || '',
            widgetType,
            onClose = function () {};

        if (typeof kvtWidgets[widgetID] !== 'undefined') {
            widgetType = kvtWidgets[widgetID]
        } else if (window[`__kvtNewWidget`]) {
            widgetType = window[`__kvtNewWidget`]
            window[`__kvtNewWidget`] = false;
        }

        kvtd ?? console.log('[kvt][kvtCreateWidget]', 'вызвали изменение виджета', widgetID)

        if (widgetType) {
            widget.setAttribute('data-kvt-widget-load', widgetType)
            kvtd ?? console.log('Установим seAttribute', 'data-kvt-widget-load', widgetType)
            kvtWidgets[widgetID] = widgetType
            localStorage.setItem("_kvt-widgets", JSON.stringify(kvtWidgets))
        }

        if (widgetType === 'spbTS') {
            initWidget(widget, widgetType, symbol)
            kvtd ?? console.log('[kvt][spbTS]', 'хотим подписаться на ', widgetID, symbol)
            
            if (symbol.length) {
                kvtd ?? console.warn('subscribe_spb_TS_3')
                subscribe_spb_TS(widgetID, symbol)
            }
            observeWidgetChangeTicker(widget, widgetType, (newSymbol) => {
                unsubscribe_spbTS(widgetID);
                kvtd ?? console.warn('subscribe_spb_TS_4')
                subscribe_spb_TS(widgetID, newSymbol);
            })
            onClose = unsubscribe_spbTS
        }

        if (widgetType === 'getdp') {
            initWidget(widget, widgetType, symbol)
            subscribe_getdp(widgetID, symbol)
            observeWidgetChangeTicker(widget, widgetType, (newSymbol) => {
                unsubscribe_getdp(widgetID);                
                subscribe_getdp(widgetID, newSymbol);
            })
            onClose = unsubscribe_getdp
        }

        // отписка при закрытии виджета
        widget.querySelector('[class*="packages-core-lib-components-WidgetBody-WidgetBody-icons"]').addEventListener("click", function () {
            onClose(widgetID)
            kvtWidgets = JSON.parse(localStorage.getItem("_kvt-widgets") || "{}")
            delete kvtWidgets[widgetID]
            localStorage.setItem("_kvt-widgets", JSON.stringify(kvtWidgets))
        })
    }
}

function initWidget(widget, widgetType, symbol = '') {
    widget.querySelector('[class*="-WidgetBody-title-"]').textContent = `${kvtWidgets[widgetType].name} ${symbol}`

    if (widget.getAttribute('data-kvt-widget-init')) {
        widget.querySelector('.kvt-widget-content').innerHTML = ''
    } else {
        widget.setAttribute('data-kvt-widget-init', widgetType)
        let widgetContent = widget.querySelector('.widget')
        widgetContent.parentNode.removeChild(widgetContent)

        widget.lastElementChild.firstChild.insertAdjacentHTML("beforeend", kvtWidgets[widgetType].template)
    }
}

function insetItemsContent(widgetId, data) {
    let widget = document.querySelector('[data-widget-id="'+ widgetId +'"]'),
        wContent = widget ? widget.querySelector('.kvt-widget-content') : 0,
        wType = widget && wContent ? widget.getAttribute('data-kvt-widget-load') : 0;

    if (widget && wContent && wType) {
        if (data.length > 1) {
            wContent.innerHTML = ''
            let todayDate = new Date().getUTCDate(),
                sepDate = todayDate;

            for (let jd of data) {
                let jdTime = new Date(jd.timestamp),
                    jdDate = jdTime.getUTCDate();

                if (jdDate !== todayDate && sepDate !== jdDate) {
                    sepDate = jdDate
                    wContent.insertAdjacentHTML('beforeend', `<tr class="type-separator"><td colspan="100%">🔸🔸🔹🔹 ${(jdTime.getUTCDate() + "").padStart(2, "0")}-${(jdTime.getUTCMonth() + 1 + "").padStart(2, "0")}-${jdTime.getUTCFullYear()} 🔹🔹🔸🔸</td></tr>`)
                }

                wContent.insertAdjacentHTML('beforeend', kvtWidgets[wType].templateItem(jd))
            }
        } else {
            for (let jd of data) {
                wContent.insertAdjacentHTML('afterbegin', kvtWidgets[wType].templateItem(jd))
                if (399 < wContent.children.length) {
                    wContent.lastChild.remove();
                }
            }
        }
    }    
}

function observeWidgetChangeTicker(widget, widgetType, callback) {
    new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'attributes') {
                let symbol = mutation.target.getAttribute('data-symbol-id')
                let prevSymbol = mutation.oldValue

                kvtd ?? console.log('[kvt][observeWidgetChangeTicker]', `newTicker: ${symbol}`, `prevTicker: ${prevSymbol}`)

                if (prevSymbol !== symbol) {
                    initWidget(widget, widgetType, symbol)
                    callback(symbol)
                }
            }
        })
    }).observe(widget, {
        attributeOldValue: true,
        attributeFilter: ['data-symbol-id']
    })
}

function subscribe_spb_TS(widgetId, ticker, guid = '') {
    !window.__kvtTs ? window.__kvtTs = [] : 0
    let obj = {widgetId: widgetId, guid: guid ? guid : kvth.uuidv4(), ticker: ticker}

    window.__kvtTs = window.__kvtTs.filter(i => i.widgetId !== widgetId);
    window.__kvtTs.push(obj)

    kvtd ?? console.log('[kvt][subscribe_spb_TS]', 'subscribe_spb_TS', obj.widgetId, obj.ticker)

    if (kvtSettings.alorTS) {
        let subscribe_alorws_TIMER = setInterval(() => {
            if (kvtStates.alor.httpCode === 403) {  // TODO: !== 200 ???
                clearInterval(subscribe_alorws_TIMER)
            } else if (window.__alorws && window.__alorws.readyState === 1) {
                window.__alorws.send(JSON.stringify({
                    "opcode": "AllTradesGetAndSubscribe",
                    "code": ticker,
                    "exchange": "SPBX",
                    "delayed": false,
                    "token": kvtAlorJWT,
                    "guid": obj.guid
                }));
    
                clearInterval(subscribe_alorws_TIMER)
    
                kvtd ?? console.log('[kvt][subscribe_spb_TS]', 'Вроде подписался')
            } else {
                kvtd ?? console.log('[kvt][subscribe_spb_TS]', 'Не подписался, сокет не готов')
            }
        }, 100);

        if (window.__kvtWS && window.__kvtWS.readyState === 1) {
            window.__kvtWS.send(JSON.stringify({
                user_id: kvtSettings.telegramId,
                type: 'getLastTrades',
                ticker: ticker,
                guid: obj.guid
            }));
        }   
    } else {        
        if (window.__kvtWS && window.__kvtWS.readyState === 1) {
            window.__kvtWS.send(JSON.stringify({
                user_id: kvtSettings.telegramId,
                type: 'subscribeTS',
                ticker: ticker,
                guid: obj.guid
            }));
        }
    }    
}

function unsubscribe_spbTS(widgetId) {

    kvtd ?? console.log('[kvt][unsubscribe_spbTS]', widgetId)

    let obj = window.__kvtTs ? window.__kvtTs.find(item => item.widgetId === widgetId) : 0

    if (obj) {
        if (kvtSettings.alorTS) {
            if (window.__alorws && window.__alorws.readyState === 1) {
                window.__alorws.send(JSON.stringify({
                    "opcode": "unsubscribe",
                    "token": kvtAlorJWT,
                    "guid": obj.guid
                }));

                kvtd ?? console.log('[kvt][unsubscribe_spbTS][alor] отписался от ', widgetId)
            }
        } else {
            if (window.__kvtWS && window.__kvtWS.readyState === 1) {
                window.__kvtWS.send(JSON.stringify({
                    user_id: kvtSettings.telegramId,
                    type: 'unsubscribeTS',
                    guid: obj.guid
                }));
    
                kvtd ?? console.log('[kvt][unsubscribe_getdp]', 'отписался от ', widgetId)
            }
        }

        // удалим
        window.__kvtTs = window.__kvtTs.filter((item) => item.widgetId !== widgetId);
    }
}

function kvtStateSet(name, state, msg, httpCode) {
    kvtStates[name] = {state: state, msg: msg, httpCode: httpCode}

    let st = document.querySelector(`[data-kvt-state-name=${name}]`)
    if (st) {
        st.setAttribute("data-kvt-state-value", state)
        st.setAttribute("title", `${name} - ${msg}`)
    }
}

function subscribe_getdp(widgetId, ticker, guid) {
    !window.__kvtGetdp ? window.__kvtGetdp = [] : 0

    let obj = {widgetId: widgetId, guid: guid ? guid : kvth.uuidv4(), ticker: ticker}

    window.__kvtGetdp = window.__kvtGetdp.filter(i => i.widgetId !== widgetId);
    window.__kvtGetdp.push(obj)

    kvtd ?? console.log('[kvt][subscribe_getdp]', 'subscribe_getdp', widgetId)

    // Запросим последние getdp записи    
    if (window.__kvtWS && window.__kvtWS.readyState === 1) {
        window.__kvtWS.send(JSON.stringify({
            user_id: kvtSettings.telegramId,
            type: 'getdp',
            ticker: ticker,
            guid: obj.guid
        }));

        clearInterval(subscribe_getdp_TIMER)

        kvtd ?? console.log('[kvt][subscribe_getdp]', 'подписался')
    } else {
        kvtd ?? console.log('[kvt][subscribe_getdp]', 'Не подписался, сокет не готов', window.__kvtWS, window.__kvtWS.readyState) // TODO: Удалить это, или будет спам ошибок 
    }
}

function unsubscribe_getdp(widgetId) {

    kvtd ?? console.log('[kvt][unsubscribe_getdp]', widgetId)

    let obj = window.__kvtGetdp ? window.__kvtGetdp.find(item => item.widgetId === widgetId) : 0

    if (obj) {
        if (window.__kvtWS && window.__kvtWS.readyState === 1) {
            window.__kvtWS.send(JSON.stringify({
                user_id: kvtSettings.telegramId,
                type: 'unsubscribe',
                guid: obj.guid
            }));

            kvtd ?? console.log('[kvt][unsubscribe_getdp]', 'отписался от ', widgetId)
        } else {
            kvtd ?? console.log('[kvt][unsubscribe_getdp]', 'Не отписался, сокет не готов')
        }

        window.__kvtGetdp = window.__kvtGetdp.filter((item) => item.widgetId !== widgetId);
    } else {
        kvtd ?? console.log('[kvt][unsubscribe_getdp]', 'такой подписки нет')
    }
}

function getKvtTsByGuid(guid) {
    return window.__kvtTs ? window.__kvtTs.find(item => item.guid === guid) : 0
}