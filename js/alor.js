let kvtAlorJWT;

async function kvtSyncAlorAccessToken() {
    if (kvtAlorJWT && !kvtIsTokenExpired(kvtAlorJWT)) return;
    return await fetch('https://oauth.alor.ru/refresh?token=' + kvtSettings.alorToken, {method: 'POST'}).then(e => {
        if (e.ok === true && e.status === 200) {
            return e.json()
        } else {
            throw e
        }
    }).then(e => {
        kvtAlorJWT = e.AccessToken;
    }).catch(err => {
        return err
    })
}

async function kvtGetAlltradesByTicker(ticker) {
    return await fetch('https://api.alor.ru/md/v2/Securities/SPBX/' + ticker + '/alltrades', {
        headers: {
            'Authorization': 'Bearer ' + kvtAlorJWT
        }
    }).then(e => {
        if (e.ok === true && e.status === 200) {
            return e.json()
        } else {
            throw e
        }
    });
}

function kvtIsTokenExpired(token) {
    if (token) {
        try {
            const [, bs] = token.split('.');
            const {exp: exp} = JSON.parse(window.atob(bs).toString())
            if (typeof exp === 'number') {
                return Date.now() + 1000 >= exp * 1000;
            }
        } catch {
            return true;
        }
    }
    return true;
}

async function kvtAlorGetStatsToday(portfolio) {
    await kvtSyncAlorAccessToken()

    return await fetch(`https://api.alor.ru/md/v2/Clients/SPBX/${portfolio}/trades`, {
        headers: {
            'Authorization': 'Bearer ' + kvtAlorJWT
        }
    }).then(e => {
        if (e.ok === true && e.status === 200) {
            return e.json()
        } else {
            throw e
        }
    }).catch(err => {
        return {result: 'error', status: err.status + ' ' + err.statusText};
    })
}

async function kvtAlorGetStatsHistory(portfolio, dateFrom, tradeNumFrom) {

    await kvtSyncAlorAccessToken()

    const url = new URL(`https://api.alor.ru/md/stats/SPBX/${portfolio}/history/trades`);

    if (dateFrom) {
        url.searchParams.append("dateFrom", dateFrom);
    }

    if (tradeNumFrom) {
        url.searchParams.append("from", tradeNumFrom);
    }

    return await fetch(url.toString(), {
        headers: {
            'Authorization': 'Bearer ' + kvtAlorJWT
        }
    }).then(e => {
        if (e.ok === true && e.status === 200) {
            return e.json()
        } else {
            throw e
        }
    }).then(items => {
        if (tradeNumFrom) {
            return items.filter(item => {
                return item.id !== tradeNumFrom
            })
        } else {
            return items
        }
    }).catch(err => {
        return {result: 'error', status: err.status + ' ' + err.statusText};
    })
}