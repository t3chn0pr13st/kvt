'use strict';

let kvth = new kvtHelper();

let storage = chrome.storage.local,
    kvtSettings = {},
    config = {};

// запрос на данные ТИ
document.addEventListener('DOMContentLoaded', function () {
    chrome.tabs.query({currentWindow: !0, active: !0}, function (e) {
        e = e[0];
        chrome.tabs.sendMessage(e.id, {type: "config"})
    })
});

// ответ на данные ТИ
chrome.runtime.onMessage.addListener(function (e, t, o) {
    if (e && "config" === e.msg) {
        config = e;
    }
});

// input settings
let settingsInput = ['fromDate', 'toDate', 'telegramId', 'alorToken', 'alorPortfolio', 'kvtFastVolumePrice', 'kvtFastVolumeSize'];
settingsInput.forEach(function (st) {
    storage.get(st, (result) => {
        var t = document.getElementById(st);
        if(result[st]) {
            t.value = kvtSettings[st] = result[st];
        }
        t.onchange = function () {
            var obj= {};
            obj[st] = kvtSettings[st] = t.value || '';
            storage.set(obj);
        }
    });
});

// checkbox settings
let settingsSwitch = ['compactStyle', 'showNullOperation', 'rcktMonConnect', 'kvtFastVolumePriceRound', 'IsShortTicker', 'alorStats'];
settingsSwitch.forEach(function (st) {
    storage.get(st, (result) => {
        var t = document.getElementById(st);

        if(result[st]) {
            t.checked = kvtSettings[st] = true;
        }
        t.onchange = function () {
            var obj= {};
            obj[st] = kvtSettings[st] = t.checked || false;
            storage.set(obj);
        }
    });
});


// Кнопка загрузить отчет
document.getElementById('kvShowReport').addEventListener('click', async function (e) {
    let reportWindow = document.getElementById('reportWindow'),
        m = new Date(),
        i = kvth.createUTCOffset(m),
        fromDate = document.getElementById('fromDate').value,
        toDate = document.getElementById('toDate').value,
        c = (m.getMonth() + 1 + "").padStart(2, "0"),
        l = (m.getDate() + "").padStart(2, "0");

    fromDate = fromDate ? fromDate.replace(" ", "T") : m.getFullYear() + "-" + c + "-" + l + "T00:00:00";
    toDate = toDate ? toDate.replace(" ", "T") : m.getFullYear() + "-" + c + "-" + l + "T23:59:59";
    fromDate += i;
    toDate += i;

    reportWindow.innerHTML = 'Загрузка...';

    if (kvtSettings.alorStats) {
        try {
            let alorDate = new Date(fromDate),
                alorTime = new Date(fromDate).getTime(),
                df = alorDate.getFullYear() + '-' + (alorDate.getMonth() + 1 + "").padStart(2, "0") + '-' + alorDate.getDate(),
                alor_operations = [],
                operationsToday = await kvtAlorGetStatsToday(kvtSettings.alorPortfolio),
                operationsHistory = await kvtAlorGetStatsHistory(kvtSettings.alorPortfolio, df),
                result = [];

            //console.log(operationsToday)
            //console.log(df)

            if (operationsToday.result === 'error') {
                throw new Error(operationsToday.status)
            }
            if (operationsHistory.result === 'error') {
                throw new Error(operationsHistory.status)
            }

            await getStats()

            // Если операций больше 1000, ищем ласт сделку, и от неё отталкиваемся еще раз
            async function getStats(last_order_id) {
                let operationsHistory = await kvtAlorGetStatsHistory(kvtSettings.alorPortfolio, df, last_order_id)

                if (operationsHistory.result === 'error') {
                    throw new Error(operationsHistory.status)
                }

                alor_operations.push(...operationsHistory)

                if (operationsHistory.length >= 999) {
                    let last_order = operationsHistory[operationsHistory.length - 1];
                    console.error('last order', last_order)
                    await getStats(last_order.id)
                }
            }

            console.log('Загружено', alor_operations.length)
            console.log('Сегодняшних', operationsToday.length)

            alor_operations.push(...operationsToday)

            alor_operations = alor_operations.filter(i => {
                console.log(new Date(i.date).getTime() > alorTime)
                return new Date(i.date).getTime() > alorTime
            })


            // alor_operations.splice(0, 1);
            //console.table(alor_operations)
            //console.error(alor_operations.length)

            const yesterday = {}, //Определим позы оставшиеся со вчера
                tickers = {}

            //Расчет поз которые были на начало дня, которые потом отсечем
            /*for (trade of alor_operations){
                if (!yesterday[trade.symbol]){
                    yesterday[trade.symbol] = 0;
                }
                yesterday[trade.symbol] += (trade.qty * (trade.side == "buy" ? -1 : 1));
            }

            console.table(yesterday)*/

            //Отсекаем "вчерашние" позы
            /*for (trade of alor_operations){
                aqty = yesterday[trade.symbol];
                if (!aqty) {
                    continue
                }
                cqty = trade.qty
                if ((cqty * aqty) < 0) {
                    trade.qty = 0;
                    yesterday[trade.symbol] -= cqty; //увеличим срезаемые операции, если были операции не гасящие вчерашний остаток
                } else {
                    pqty = Math.min(cqty, aqty); //отрежем операции гасящие вчерашний остаток
                    trade.qty -= pqty;
                    yesterday[trade.symbol] -= pqty;
                }
            }*/

            alor_operations.reverse()

            alor_operations.forEach(function (e) {

                if (e.symbol && e.qty) {

                    let t = e.symbol;

                    if (void 0 === tickers[t]) {
                        let ts = {};
                        ts["Тикер"] = t;
                        ts["Валюта"] = 'USD';
                        ts["Сумма покупок"] = 0;
                        ts["Сумма продаж"] = 0;
                        ts["Сделок покупки"] = 0;
                        ts["Сделок продажи"] = 0;
                        ts["Финансовый результат"] = 0;
                        ts["Количество"] = 0;
                        ts["Сумма открытой позы"] = 0;

                        tickers[t] = ts;
                    }

                    if (e.side === "sell") {
                        tickers[t]["Сделок продажи"]++
                        tickers[t]["Сумма продаж"] += Math.abs((e.price * e.qty) || 0)
                        tickers[t]["Количество"] -= (e.qty || 0);
                    } else if (e.side === "buy") {
                        tickers[t]["Сделок покупки"]++
                        tickers[t]["Сумма покупок"] += Math.abs((e.price * e.qty) || 0)
                        tickers[t]["Количество"] += e.qty;
                    }
                }
            })

            Object.keys(tickers).forEach(function (e) {
                return result.push(tickers[e])
            })

            console.table(tickers)

            let total = {},
                currencies = [];

            result.forEach(function (e) {

                if (void 0 === total[e['Валюта']]) {
                    total[e['Валюта']] = {
                        commission: 0,
                        result: 0,
                        buyCount: 0,
                        sellCount: 0,
                        declineCount: 0,
                        buySum: 0,
                        sellSum: 0
                    }
                }
                /*if (e["Количество"] > 0) {
                    e["Сумма покупок"] -= e["Сумма открытой позы"]
                } else if (e["Количество"] < 0) {
                    e["Сумма продаж"] += e["Сумма открытой позы"]
                }*/

                e["Финансовый результат"] = e["Сумма продаж"] - e["Сумма покупок"]

                total[e['Валюта']].result += e["Финансовый результат"]
                total[e['Валюта']].buyCount += e['Сделок покупки']
                total[e['Валюта']].sellCount += e['Сделок продажи']
                total[e['Валюта']].buySum += e['Сумма покупок']
                total[e['Валюта']].sellSum += e['Сумма продаж']
            });

            // Итоговая таблица
            Object.keys(total).forEach(function (e) {
                total[e].currency = e;
                return currencies.push(total[e])
            })

            let topTable = '<div class="top-table">';
            currencies.forEach(function (e) {
                topTable += '' +
                    '<div>' +
                    '<span>Чистыми:</span> ' + kvth._ft(e.result) + ' ' + kvth._c(e.currency) + '<br/>' +
                    'Оборот: ' + kvth._ft(e.buySum + e.sellSum) + ' ' + kvth._c(e.currency) + '<br/>' +
                    '<span title="buy/sell (совершенных/отмененных)">Сделок:</span> ' + e.buyCount + ' / ' + e.sellCount + ' (' + (e.buyCount + e.sellCount) + ' / ' + e.declineCount + ') ' +
                    '</div>'
                ;
            });
            topTable += '</div>';

            reportWindow.innerHTML = topTable;

            /*
             * Итоговая таблица по тикерам
             */
            let table = '<table class="report_table" id="sortable">' +
                '<thead><tr>' +
                '<th>тикер</th>' +
                '<th>профит</th>' +
                '<th title="buy/sell (совершенных)">кол-во сделок</th>' +
                '<th>сумма buy/sell</th>' +
                '<th></th>' +
                '</tr></thead><tbody>';

            result.forEach(function (e) {
                if (!kvtSettings.showNullOperation && e["Финансовый результат"] === 0/* || e['Сумма открытой позы']*/) {
                    return false;
                }

                table += '<tr' + (e['Количество'] !== 0 ? ' class="open-ticker"' : '') + '>' +
                    '<td>' + e['Тикер'] + '</td>' +
                    '<td data-sort="' + kvth._rt(e['Финансовый результат']) + '">' + kvth._style(e['Финансовый результат']) + '</td>' +
                    '<td>' + e['Сделок покупки'] + ' / ' + e['Сделок продажи'] + ' (' + (e['Сделок покупки'] + e['Сделок продажи']) + ')</td>' +
                    '<td data-sort="' + kvth._rt(e['Сумма покупок'] + e['Сумма продаж']) + '">' + kvth._ft(e['Сумма покупок']) + ' / ' + kvth._ft(e['Сумма продаж']) + '</td>' +
                    '<td data-sort="' + e['Валюта'] + '">' + kvth._c(e['Валюта']) + '</td>' +
                    '</tr>';
            });
            table += '</tbody></table><div class="note">* открытые позиции не учитываются в результате и помечаются в таблице <span class="open-ticker">цветом</span></div>';

            reportWindow.innerHTML += table;

            new Tablesort(document.getElementById('sortable'));

            return result;
            /*} else {
                reportWindow.innerHTML = 'Нет сделок за выбранный период или ТИ вернул фигу';
            }*/


            /*if (stats.result && stats.result === 'error') {
                reportWindow.innerHTML = '';
                chrome.notifications.create("", {
                    title: "Финансовый результат Алор",
                    message: "Не удалось загрузить",
                    type: "basic",
                    iconUrl: "icons/icon48.png"
                })
            }*/

        } catch (e) {
            reportWindow.innerHTML = 'Не удалось загрузить финансовый результат Алор. Ошибка: ' + e.message

            chrome.notifications.create("", {
                title: "Финансовый результат Алор",
                message: "Ошибка: " + e.message,
                type: "basic",
                iconUrl: "icons/icon48.png"
            })
        }
    } else {

        fetch("https://api-invest.tinkoff.ru/trading/user/operations?appName=invest_terminal&appVersion=" + config.versionApi + "&sessionId=" + config.psid, {
            method: "POST",
            body: JSON.stringify({to: toDate, from: fromDate, overnightsDisabled: !0})
        }).then(function (e) {
            return e.json();
        }).then(function (e) {

            let operations = ((e.payload || {}).items || []).filter(function (e) {
                    return ((e || {}).ticker || "").toUpperCase()
                }),
                result = []

            if (operations.length) {

                let tickers = {},
                    operationsReversed = operations.reverse();

                operationsReversed.forEach(function (e) {

                    if (e.ticker && e.currency) {

                        let t = e.ticker;

                        if (void 0 === tickers[t]) {
                            let ts = {};
                            ts["Тикер"] = t;
                            ts["Валюта"] = e.currency;
                            ts["Комиссия"] = 0;
                            ts["Сумма покупок"] = 0;
                            ts["Сумма продаж"] = 0;
                            ts["Сделок покупки"] = 0;
                            ts["Сделок продажи"] = 0;
                            ts["Совершенных сделок"] = 0;
                            ts["Отмененных сделок"] = 0;
                            ts["Финансовый результат"] = 0;
                            ts["Финансовый результат с учётом комиссии"] = 0;
                            ts["Количество"] = 0;
                            ts["Цена"] = 0;
                            ts["Сумма открытой позы"] = 0;

                            tickers[t] = ts;
                        }

                        if (e.status === "decline") {
                            tickers[t]["Отмененных сделок"]++;
                        } else if (e.status === "done") {
                            if (e.operationType === "Sell") {
                                tickers[t]["Сделок продажи"]++
                                tickers[t]["Комиссия"] += Math.abs(e.commission || 0)
                                tickers[t]["Сумма продаж"] += Math.abs(e.payment || 0)
                                tickers[t]["Количество"] -= (e.quantity || 0);

                                if (tickers[t]["Количество"] === 0) {
                                    tickers[t]["Сумма открытой позы"] = 0;
                                } else {
                                    tickers[t]["Сумма открытой позы"] -= Math.abs(e.payment || 0)
                                }

                            } else if (e.operationType === "Buy") {
                                tickers[t]["Сделок покупки"]++
                                tickers[t]["Комиссия"] += Math.abs(e.commission || 0)
                                tickers[t]["Сумма покупок"] += Math.abs(e.payment || 0)
                                tickers[t]["Количество"] += e.quantity;

                                if (tickers[t]["Количество"] === 0) {
                                    tickers[t]["Сумма открытой позы"] = 0;
                                } else {
                                    tickers[t]["Сумма открытой позы"] += Math.abs(e.payment || 0)
                                }
                            }
                        }
                    }
                })

                Object.keys(tickers).forEach(function (e) {
                    return result.push(tickers[e])
                })

                let total = {},
                    currencies = [];

                result.forEach(function (e) {

                    if (void 0 === total[e['Валюта']]) {
                        total[e['Валюта']] = {
                            commission: 0,
                            result: 0,
                            buyCount: 0,
                            sellCount: 0,
                            declineCount: 0,
                            buySum: 0,
                            sellSum: 0
                        }
                    }
                    if (e["Количество"] > 0) {
                        e["Сумма покупок"] -= e["Сумма открытой позы"]
                    } else if (e["Количество"] < 0) {
                        e["Сумма продаж"] += e["Сумма открытой позы"]
                    }

                    e["Финансовый результат"] = e["Сумма продаж"] - e["Сумма покупок"]
                    e["Финансовый результат с учётом комиссии"] = e["Сумма продаж"] - e["Сумма покупок"] - e["Комиссия"]

                    total[e['Валюта']].result += e["Финансовый результат с учётом комиссии"]
                    total[e['Валюта']].commission += e["Комиссия"]
                    total[e['Валюта']].buyCount += e['Сделок покупки']
                    total[e['Валюта']].sellCount += e['Сделок продажи']
                    total[e['Валюта']].declineCount += e['Отмененных сделок']
                    total[e['Валюта']].buySum += e['Сумма покупок']
                    total[e['Валюта']].sellSum += e['Сумма продаж']
                });

                // Итоговая таблица
                Object.keys(total).forEach(function (e) {
                    total[e].currency = e;
                    return currencies.push(total[e])
                })

                let topTable = '<div class="top-table">';
                currencies.forEach(function (e) {
                    topTable += '' +
                        '<div>' +
                        '<span>Чистыми:</span> ' + kvth._ft(e.result) + ' ' + kvth._c(e.currency) + '<br/>' +
                        'Комиссия: ' + kvth._ft(e.commission) + ' ' + kvth._c(e.currency) + '<br/>' +
                        'Оборот: ' + kvth._ft(e.buySum + e.sellSum) + ' ' + kvth._c(e.currency) + '<br/>' +
                        '<span title="buy/sell (совершенных/отмененных)">Сделок:</span> ' + e.buyCount + ' / ' + e.sellCount + ' (' + (e.buyCount + e.sellCount) + ' / ' + e.declineCount + ') ' +
                        '</div>'
                    ;
                });
                topTable += '</div>';

                reportWindow.innerHTML = topTable;

                /*
                 * Итоговая таблица по тикерам
                 */
                let table = '<table class="report_table" id="sortable">' +
                    '<thead><tr>' +
                    '<th>тикер</th>' +
                    '<th>профит</th>' +
                    '<th>comm</th>' +
                    '<th title="buy/sell (совершенных/отмененных)">кол-во сделок</th>' +
                    '<th>сумма buy/sell</th>' +
                    '<th></th>' +
                    '</tr></thead><tbody>';

                result.forEach(function (e) {
                    if (!kvtSettings.showNullOperation && e["Финансовый результат"] === 0/* || e['Сумма открытой позы']*/) {
                        return false;
                    }

                    table += '<tr' + (e['Количество'] !== 0 ? ' class="open-ticker"' : '') + '>' +
                        '<td>' + e['Тикер'] + '</td>' +
                        '<td data-sort="' + kvth._rt(e['Финансовый результат с учётом комиссии']) + '">' + kvth._style(e['Финансовый результат с учётом комиссии']) + '</td>' +
                        '<td data-sort="' + kvth._rt(e['Комиссия']) + '">' + kvth._ft(e['Комиссия']) + '</td>' +
                        '<td>' + e['Сделок покупки'] + ' / ' + e['Сделок продажи'] + ' (' + (e['Сделок покупки'] + e['Сделок продажи']) + ' / ' + e["Отмененных сделок"] + ')</td>' +
                        '<td data-sort="' + kvth._rt(e['Сумма покупок'] + e['Сумма продаж']) + '">' + kvth._ft(e['Сумма покупок']) + ' / ' + kvth._ft(e['Сумма продаж']) + '</td>' +
                        '<td data-sort="' + e['Валюта'] + '">' + kvth._c(e['Валюта']) + '</td>' +
                        '</tr>';
                });
                table += '</tbody></table><div class="note">* открытые позиции не учитываются в результате и помечаются в таблице <span class="open-ticker">цветом</span></div>';

                reportWindow.innerHTML += table;

                new Tablesort(document.getElementById('sortable'));

                return result;
            } else {
                reportWindow.innerHTML = 'Нет сделок за выбранный период или ТИ вернул фигу';
            }
        }).catch(function (error) {
            reportWindow.innerHTML = '';
            console.error(error)
            chrome.notifications.create("", {
                title: "Финансовый результат",
                message: "Не удалось загрузить",
                type: "basic",
                iconUrl: "icons/icon48.png"
            })
        });
    }
});


// Установка времени
document.querySelectorAll('[data-set-time]').forEach(function (el) {
    el.addEventListener('click', function () {

        let m = new Date(),
            fromDate = document.getElementById('fromDate'),
            toDate = document.getElementById('toDate'),
            year = m.getFullYear(),
            mount = (m.getMonth() + 1 + "").padStart(2, "0"),
            day = (m.getDate() + "").padStart(2, "0");

        let time = year + "-" + mount + "-" + day + "T";

        switch (el.getAttribute('data-set-time')) {
            case 'from_morning':
            default:
                fromDate.value = time + '06:59'
                toDate.value = ''
                break

            case 'from_week' :
                let day = getMonday(m)
                fromDate.value = year + "-" + mount + "-" + day + "T" + '06:59'
                toDate.value = ''
                break
        }

        fromDate.onchange()
        toDate.onchange()
    })
})

function getMonday(d) {
    d = new Date(d);
    var day = d.getDay(),
        diff = d.getDate() - day + (day === 0 ? -6:1); // adjust when day is sunday
    return (diff + "").padStart(2, "0");
}

/**
 * Загружаем группы тикеров
  */
let tickersWindow = document.getElementById('tickersWindow'),
    tickersGroups = document.getElementById('tickersGroups'),
    groupTickersList = document.getElementById('groupTickersList'),
    listTickersDelete = [];

// загрузить группы тикеров
document.getElementById('kvLoadGroupsTicker').addEventListener('click', function (e) {
    fetch("https://www.tinkoff.ru/api/invest/favorites/groups/list?appName=invest_terminal&appVersion=" + config.versionApi + "&sessionId=" + config.psid, {})
        .then(res => res.json())
        .then(res => {
            res.payload.groups.forEach(s => {
                const option = document.createElement("option");
                option.value = s.id;
                option.text = s.name;
                tickersGroups.appendChild(option);
            })

            tickersWindow.classList.remove("d-none");
        })
});

// загрузить тикеры группы
tickersGroups.addEventListener('change', opt => {

    fetch("https://www.tinkoff.ru/api/invest/favorites/groups/instruments/get?tag=All&sortType=Custom&groupId=" + opt.target.value + "&limit=1000&offset=0&appName=invest_terminal&appVersion=" + config.versionApi + "&sessionId=" + config.psid)
        .then(res => res.json())
        .then(e => {
            listTickersDelete.splice(0, listTickersDelete.length)
            groupTickersList.value = e.payload.instruments.map(item => listTickersDelete.push(item.ticker) && item.ticker).join(' ');
        })
})

// сохранить тикеры группы
document.getElementById('saveGroupTickers').addEventListener('click', function (e) {

    let groupId = tickersGroups.value,
        items = groupTickersList.value.split(' ').map(item => item.toUpperCase());

    fetch("https://www.tinkoff.ru/api/invest/favorites/groups/instruments/delete?groupId=" + groupId + "&appName=invest_terminal&appVersion=" + config.versionApi + "&sessionId=" + config.psid, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({instruments: listTickersDelete})
    }).then(
        res => res.json()
    ).then(res => {
        fetch("https://www.tinkoff.ru/api/invest/favorites/groups/instruments/add?groupId=" + groupId + "&appName=invest_terminal&appVersion=" + config.versionApi + "&sessionId=" + config.psid, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({instruments: items})
        }).then(
            res => res.json()
        ).then(e => {
            chrome.notifications.create("", {
                title: "Тикеры",
                message: e.status === 'Ok' ? 'Успешно сохранено' : e.payload.message,
                type: "basic",
                iconUrl: "icons/icon48.png"
            })
        });
    })
})


/**
 * Принты
 */
document.getElementById('kvLoadPrintsTicker').addEventListener('click', function (e) {
    loadPrintsTicker()
});

document.getElementById('printTicker').addEventListener("keydown", function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        loadPrintsTicker()
    }
});

function loadPrintsTicker() {
    let printsWindow = document.getElementById('printsWindow'),
        printTicker = document.getElementById('printTicker').value;

    if (printTicker) {
        printsWindow.innerHTML  = 'Загрузка...';

        const loadAlltrades = async () => {
            await kvtSyncAlorAccessToken();
            if(kvtAlorJWT) {
                return await kvtGetAlltradesByTicker(printTicker.toUpperCase())
            }
        }

        loadAlltrades().then(r => {
            if(r && r.length) {
                r.reverse();

                let table = '<table class="report_table">' +
                    '<thead><tr>' +
                    '<th>цена</th>' +
                    '<th>объем шт</th>' +
                    '<th>объём $</th>' +
                    '<th>время</th>' +
                    '</tr></thead><tbody>';

                r.forEach(function (e) {
                    table += '<tr' + (e.side === 'sell' ? ' class="side-sell"' : ' class="side-buy"') + '>' +
                        '<td>' + kvth._ft(e.price) + '</td>' +
                        '<td>' + e.qty + '</td>' +
                        '<td>' + kvth._ft(e.qty * e.price) + '</td>' +
                        '<td>' + kvth._tsToTime(e.timestamp) + '</td>' +
                        '</tr>';
                });
                table += '</tbody></table>';

                printsWindow.innerHTML = table;
            } else {
                printsWindow.innerHTML  = 'Нет сделок';
            }
        }).catch(err => {
            let error;
            console.log(typeof err.status)
            switch (err.status) {
                case 404: error = err.statusText + ', такого тикера нет'; break;
                case 403: error = err.statusText + ', проверьте токен в настройках'; break;
                default: error = err.status + ' ' + err.statusText;
            }
            printsWindow.innerHTML = kvth._errW(error);
        })
    } else {
        printsWindow.innerHTML  = 'укажите тикер';
    }
}


