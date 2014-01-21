define(function (require) {

    var lib = require('./lib');

    var XHR = (function(){

        var xhrs = [
            function(){
                return new ActiveXObject('Microsoft.XMLHTTP');
            },
            function(){
                return new ActiveXObject('MSXML2.XMLHTTP');
            },
            function(){
                return new XMLHttpRequest();
            }
        ];

            var xhr;
            while ((xhr = xhrs.pop())) {
                try {
                    xhr();
                    return xhr;
                }
                catch(e) {}
            }
    })();

    var headers = {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': ''
            + 'application/json, '
            + 'text/javascript, '
            + 'text/html, '
            + 'application/xml, '
            + 'text/xml, '
            + '*/*'
    };

    var noop = function () {};


    var Ajax = lib.newClass({

        options: {
            url: '',
            data: '',
            headers: null,
            type: 'json',
            method: 'get',
            urlEncoded: true,
            encoding: 'utf-8',
            timeout: 0,
            cache: false
        },

        binds: 'onTimeout, onStateChange',

        initialize: function(options){
            this.setOptions(options);
            lib.binds(this, this.binds);
            this.headers = lib.extend(this.options.headers || {}, headers);
        },

        onStateChange: function(){
            var xhr = this.xhr;
            if (xhr.readyState !== 4 || !this.running) {
                return;
            }
            this.running = false;

            var status;
            try {
                status = xhr.status;
                status = status === 1223 ? 204 : status;
            }
            catch(e) {}

            xhr.onreadystatechange = noop;
            clearTimeout(this.timer);

            this.response = {
                text: xhr.responseText || '',
                xml: xhr.responseXML
            };

            if (status >= 200 && status < 300) {
                this.fire('success', this.response.text);
            }
            else {
                this.fire('failure');
            }
        },

        onTimeout: function(){
            this.fire('timeout');
        },

        send: function(options){
            if (this.running) {
                return this;
            }

            this.running = true;

            lib.isString(options) && (options = {data: options});

            var old = this.options;
            options = lib.extend({
                data: old.data,
                url: old.url,
                method: old.method
            }, options);

            var data = options.data;
            var url = String(options.url);
            var method = options.method.toUpperCase();

            lib.isObject(data) && (data = lib.toQueryString(data));

            var headers = this.headers;
            if (this.options.urlEncoded && 'POST' === method){
                var encoding = this.options.encoding
                    ? '; charset=' + this.options.encoding
                    : '';
                headers['Content-type'] = ''
                    + 'application/x-www-form-urlencoded'
                    + encoding;
            }

            url = url || document.location.pathname;

            var trimPosition = url.lastIndexOf('/');
            if (trimPosition > -1 && (trimPosition = url.indexOf('#')) > -1) {
                url = url.substr(0, trimPosition);
            }

            if (this.options.cache) {
                url += (~url.indexOf('?') ? '&' : '?')
                    + (+new Date()).toString(36);
            }

            if (data && method === 'GET'){
                url += (~url.indexOf('?') ? '&' : '?') + data;
                data = null;
            }

            var xhr = this.xhr = new Ajax.XHR();
            xhr.open(method, url, true);

            xhr.onreadystatechange = this.onStateChange;

            lib.object.each(
                headers,
                function(value, key){
                    try {
                        xhr.setRequestHeader(key, value);
                    }
                    catch(e) {}
                }
            );

            this.fire('request');
            xhr.send(data);
            if (this.options.timeout) {
                this.timer = setTimeout(this.onTimeout, this.options.timeout);
            }
            return this;
        },

        cancel: function(){
            if (this.running) {
                this.running = false;
                clearTimeout(this.timer);

                var xhr = this.xhr;
                xhr.abort();
                xhr.onreadystatechange = noop;

                this.fire('cancel');
            }
            return this;
        }
    });

    var methods = {};
    lib.each(['get', 'post'], function(method) {
        methods[method] = function (data) {
            var object = {
                method: method
            };
            if (data != null) {
                object.data = data;
            }
            return this.send(object);
        };
    });
    Ajax
        .implement(methods)
        .implement(lib.observable)
        .implement(lib.configurable);

    Ajax.XHR = XHR;

    lib.ajax = function (url, options) {
        options = lib.extend(options, {url: url});
        return new Ajax(options).send();
    };

    
    return Ajax;

});
