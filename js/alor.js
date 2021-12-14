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