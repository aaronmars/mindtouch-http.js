import { Plug } from './plug.js';
function _doXhr({ xhr, body, progressInfo }) {
    return new Promise((resolve, reject) => {
        xhr.onreadystatechange = function(e) {
            if(e.target.readyState === 4) {
                var status = e.target.status;
                if(status >= 200 && status <= 300) {
                    progressInfo.callback({ loaded: progressInfo.size, total: progressInfo.size });
                    resolve(xhr);
                } else if(status === 403) {
                    reject(new Error('The upload is not allowed for this file'));
                } else {
                    reject(new Error('An error occurred while attempting the file upload'));
                }
            }
        };
        xhr.onerror = function() {
            reject(new Error('An error occurred while initiating the file upload'));
        };
        xhr.send(body);
    });
}
function _doRequest({ method, headers, body = null, progressInfo }) {
    const xhr = new XMLHttpRequest();  // eslint-disable-line no-undef
    xhr.open(method, this.url, true);
    xhr.onprogress = (e) => {
        progressInfo.callback({ loaded: e.loaded, total: progressInfo.size });
    };
    for(const [ header, val ] of Object.entries(headers)) {
        xhr.setRequestHeader(header, val);
    }
    const request = { xhr: xhr, body: body, progressInfo: progressInfo };
    progressInfo.callback({ loaded: 0, total: progressInfo.size });
    return this._readCookies(request).then(_doXhr).then(this._handleCookies.bind(this));
}
export class ProgressPlugBrowser extends Plug {
    _readCookies(request) {
        if(this._cookieManager !== null) {
            return this._cookieManager.getCookieString(this.url).then((cookieString) => {
                if(cookieString !== '') {
                    request.xhr.setRequestHeader('Cookie', cookieString);
                }
            }).then(() => request);
        }
        return Promise.resolve(request);
    }
    _handleCookies(xhr) {
        if(this._cookieManager !== null) {
            return this._cookieManager.storeCookies(this.url, xhr.getResponseHeader('Set-Cookie')).then(() => xhr);
        }
        return Promise.resolve(xhr);
    }
    constructor(url, params) {
        super(url, params);
    }
    post(body, mime, method = 'POST', progressInfo = { size: 0, callback: () => {} }) {
        this._headers['Content-Type'] = mime;
        let params = this._beforeRequest({ method: method, body: body, headers: Object.assign({}, this._headers) });
        params.progressInfo = progressInfo;
        return _doRequest.call(this, params);
    }
    put(body, mime, progressInfo) {
        return this.post(body, mime, 'PUT', progressInfo);
    }
}