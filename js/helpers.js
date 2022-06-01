class kvtHelper {

    constructor() {

    }

    _pad(e) {
        return e < 10 ? "0" + e : e
    }

    createUTCOffset(e) {
        let t = 0 < e.getTimezoneOffset() ? "-" : "+",
            s = Math.abs(e.getTimezoneOffset());
        return t + this._pad(Math.floor(s / 60)) + ":" + this._pad(s % 60)
    }

    formatter = new Intl.NumberFormat("ru");

    _ft(e) {
        return this.formatter.format(Number(e).toFixed(2))
    }

    _tsToTime(timestamp) {
        let m = new Date(timestamp);
        return [m.getHours(), m.getMinutes(), m.getSeconds()/*, m.getMilliseconds()*/].map(function (x) {
            return x < 10 ? "0" + x : x
        }).join(":")
    }

    // generate uuidv4
    uuidv4() {
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
            (c ^ window.crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }

    _rt(e) {
        return e.toFixed(2)
    }

    _style(e) {
        if (e < 0) {
            return '<span class="red">' + this._ft(e) + '</span>';
        } else {
            return this._ft(e)
        }
    }

    _c(currency) {
        let symbols = {
            'USD': '$', 'RUB': '₽', 'EUR': '€'
        };

        return symbols[currency] || currency;
    }

    _errW(text) {
        return `<div class="note-error">⚠ ${text}</div>`;
    }


    sizeFormat(val) 
    {
        val = parseFloat(val)
        // Nine Zeroes for Billions
        return Math.abs(Number(val)) >= 1.0e+9
    
            ? (Math.abs(Number(val)) / 1.0e+9).toFixed(2).replace(/[.,]00$/, "") + "b"
            // Six Zeroes for Millions 
            : Math.abs(Number(val)) >= 1.0e+6
    
            ? (Math.abs(Number(val)) / 1.0e+6).toFixed(2).replace(/[.,]00$/, "") + "m"
            // Three Zeroes for Thousands
            : Math.abs(Number(val)) >= 1.0e+3
    
            ? (Math.abs(Number(val)) / 1.0e+3).toFixed(2).replace(/[.,]00$/, "") + "k"
    
            : Math.abs(Number(val));  
    }
}