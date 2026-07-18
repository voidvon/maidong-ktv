/**
 * KTV Song API - JS Hot Update Module
 * ====================================
 * 从 Gitee 热更新, App 无需发版即可修复 API 变更
 *
 * 用法:
 *   const api = new KtvApi({proxy: 'http://127.0.0.1:7897'})
 *   const url = await api.getSongUrl('7678785')
 *   // → http://download.origjoy.com/E/ts/.../7678785.ts?sign=...
 */

(function(global) {
  'use strict';

  // KTV_BRIDGE_API: 2 (Android 缓存校验标记，请勿删除)

  // ─── 配置 ──────────────────────────────────────────
  const CONFIG = {
    APP_ID:  'd4eeacc6cec3434fbc8c41608a3056a0',
    APP_KEY: '024210cba40d4385a93e6c2d3249bfb5',
    SDK_KEY: '19042303a8374f67ae3fe1e25c97936f',
    VN:      '4.1.3.03161025',
    HOST:    'http://e.ac19.cn',
    MWS:     'https://mws.cherryonline.cn',
    RSA_PUBKEY: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAucL0oFErd7REM6TSNa3EZdN1YaOs4J1eCybLPyoQ9ru3q1HU67agC9FzhrCG/RvAQUya5iPmQ8Caed05vqcCVcyJChmkSOGQ7DVShe2rGuTMNlpoRV6UzfcraaVS++7m2K/+kSZJ8OAhhhVuqPruMjsFYpdtstAwvyZT28b+eENwzpp9UHqsooZc7FZ0H8kTbs6XMkw4nIWo+4HoPAhNLEY+xdHvwY6drF/3WDTvsaoMrs73TVQCEEHzZNIz2H/is9VLMnIyOfnfcJi9br78Fj2xHzxu3sAySBOTVLmUMxqYh/g1ox5OXGcW93HJkQLkBi42tFAEkWYlYyl93+jbbQIDAQAB',
    XF_RANGES: ['103.236.91','223.104','180.168','112.96','116.21','111.199','120.204','121.32']
  };

  // ─── 工具函数 ──────────────────────────────────────
  function randomHex(n) {
    var s = ''; while (n--) s += '0123456789abcdef'[Math.random()*16|0]; return s;
  }

  function randomXF() {
    var r = CONFIG.XF_RANGES;
    return r[Math.random()*r.length|0] + '.' + (Math.random()*254+1|0);
  }

  // ─── MD5 ───────────────────────────────────────────
  function md5(input) {
    function add(a, b) {
      var low = (a & 0xffff) + (b & 0xffff);
      var high = (a >>> 16) + (b >>> 16) + (low >>> 16);
      return (high << 16) | (low & 0xffff);
    }
    function rol(value, shift) { return (value << shift) | (value >>> (32 - shift)); }
    function wordHex(value) {
      var out = '';
      for (var i = 0; i < 4; i++) out += ('0' + ((value >>> (i * 8)) & 255).toString(16)).slice(-2);
      return out;
    }

    // MD5 works on UTF-8 bytes, then appends 0x80 and the original bit length.
    var utf8 = unescape(encodeURIComponent(input));
    var bytes = [];
    for (var i = 0; i < utf8.length; i++) bytes.push(utf8.charCodeAt(i));
    var bitLengthLow = (bytes.length << 3) >>> 0;
    var bitLengthHigh = (bytes.length >>> 29) >>> 0;
    bytes.push(0x80);
    while ((bytes.length % 64) !== 56) bytes.push(0);
    for (i = 0; i < 4; i++) bytes.push((bitLengthLow >>> (i * 8)) & 255);
    for (i = 0; i < 4; i++) bytes.push((bitLengthHigh >>> (i * 8)) & 255);

    var shifts = [
      7,12,17,22, 7,12,17,22, 7,12,17,22, 7,12,17,22,
      5,9,14,20, 5,9,14,20, 5,9,14,20, 5,9,14,20,
      4,11,16,23, 4,11,16,23, 4,11,16,23, 4,11,16,23,
      6,10,15,21, 6,10,15,21, 6,10,15,21, 6,10,15,21
    ];
    var constants = [];
    for (i = 0; i < 64; i++) constants[i] = (Math.abs(Math.sin(i + 1)) * 4294967296) | 0;
    var a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;

    for (var offset = 0; offset < bytes.length; offset += 64) {
      var words = [];
      for (i = 0; i < 16; i++) {
        var at = offset + i * 4;
        words[i] = bytes[at] | (bytes[at+1] << 8) | (bytes[at+2] << 16) | (bytes[at+3] << 24);
      }
      var a = a0, b = b0, c = c0, d = d0;
      for (i = 0; i < 64; i++) {
        var f, g;
        if (i < 16) { f = (b & c) | ((~b) & d); g = i; }
        else if (i < 32) { f = (d & b) | ((~d) & c); g = (5 * i + 1) % 16; }
        else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
        else { f = c ^ (b | (~d)); g = (7 * i) % 16; }
        var oldD = d;
        d = c;
        c = b;
        b = add(b, rol(add(add(a, f), add(constants[i], words[g])), shifts[i]));
        a = oldD;
      }
      a0 = add(a0, a); b0 = add(b0, b); c0 = add(c0, c); d0 = add(d0, d);
    }
    return wordHex(a0) + wordHex(b0) + wordHex(c0) + wordHex(d0);
  }

  // ─── RSA Encrypt ───────────────────────────────────
  async function rsaEncrypt(plaintext) {
    if (global.android && typeof global.android.rsaEncryptPkcs1 === 'function') {
      var encrypted = global.android.rsaEncryptPkcs1(CONFIG.RSA_PUBKEY, plaintext);
      if (!encrypted) throw new Error('native RSA encryption failed');
      return encrypted;
    }
    throw new Error('RSA/PKCS1 bridge is unavailable');
  }

  // ─── HTTP ──────────────────────────────────────────
  function nativeResponse(raw) {
    var value = JSON.parse(raw || '{}');
    if (value.error) throw new Error(value.error);
    return {body: value.body || '', status: Number(value.status || 0)};
  }

  async function httpGet(url, timeout) {
    timeout = timeout || 8000;
    var headers = {
      'Accept': '*/*',
      'User-Agent': 'Dalvik/2.1.0',
      'X-Forwarded-For': randomXF(),
      'X-Real-IP': randomXF()
    };
    if (global.android && typeof global.android.httpGet === 'function') {
      return nativeResponse(global.android.httpGet(url, JSON.stringify(headers), timeout));
    }
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.timeout = timeout;
      xhr.onload = function() { resolve({body:xhr.responseText, status:xhr.status}); };
      xhr.onerror = function() { reject(new Error('network error')); };
      xhr.ontimeout = function() { reject(new Error('timeout')); };
      xhr.send();
    });
  }

  async function httpPost(url, body, timeout) {
    timeout = timeout || 8000;
    var headers = {'Content-Type':'application/json', 'Accept':'*/*', 'User-Agent':'Dalvik/2.1.0'};
    if (global.android && typeof global.android.httpPost === 'function') {
      return nativeResponse(global.android.httpPost(url, body, JSON.stringify(headers), timeout));
    }
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.timeout = timeout;
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = function() { resolve({body:xhr.responseText, status:xhr.status}); };
      xhr.onerror = function() { reject(new Error('network error')); };
      xhr.ontimeout = function() { reject(new Error('timeout')); };
      xhr.send(body);
    });
  }

  // ─── KtvApi Class ──────────────────────────────────
  function KtvApi(options) {
    options = options || {};
    this.proxy = options.proxy || '';
    this.mac = options.mac || randomHex(16);
    this.sn = this.mac;
    this.token = '';
    this.debug = options.debug || false;
  }

  KtvApi.prototype = {
    _log: function(msg) { if (this.debug) console.log('[KtvApi]', msg); },

    // 1. MWS Login
    mwsLogin: async function() {
      var self = this;
      var plaintext = JSON.stringify({device_id: self.mac});
      self._log('MWS login...');
      try {
        var encrypted = await rsaEncrypt(plaintext);
        var body = JSON.stringify({
          encrypted_data: encrypted, ip: '172.16.32.15', dns: '', router: '',
          subnet_mask: '255.255.255.0', channel: 'common', mode: 'ott'
        });
        var resp = await httpPost(CONFIG.MWS + '/mls-api/v1/login', body);
        if (resp.status === 200) {
          var data = JSON.parse(resp.body);
          if (data.authorized) {
            self.mac = data.device_id || self.mac;
            self.sn = self.mac;
            self._log('MWS login OK: ' + self.mac);
            return true;
          }
        }
        self._log('MWS login FAIL: ' + resp.status);
        return false;
      } catch(e) {
        self._log('MWS login error: ' + e.message);
        return false;
      }
    },

    // 2. Get Auth Token
    getToken: async function() {
      var self = this;
      var ts = Math.floor(Date.now() / 1000);
      var params = 'appid=' + CONFIG.APP_ID +
        '&mac=' + self.mac + '_' + self.sn +
        '&sn=' + self.sn +
        '&time=' + ts +
        '&ver=2.0&vn=' + CONFIG.VN;
      var sign = md5(params + CONFIG.APP_KEY);
      var url = CONFIG.HOST + '/i.php?' + params + '&sign=' + sign;
      self._log('Getting token...');
      try {
        var resp = await httpGet(url);
        if (resp.status === 200) {
          var data = JSON.parse(resp.body);
          if (data.code === 200) {
            self.token = data.token;
            self._log('Token OK');
            return self.token;
          }
        }
        self._log('Token FAIL: ' + resp.status);
        return null;
      } catch(e) {
        self._log('Token error: ' + e.message);
        return null;
      }
    },

    // 3. Get Song Download URL
    getSongUrl: async function(musicno, resolution, h265) {
      resolution = resolution || '720';
      h265 = !!h265;
      var self = this;
      for (var att = 0; att < 3; att++) {
        try {
          // token 过期重试时也要在下一轮重新获取，不能带空 token 继续请求。
          if (!self.token && !(await self.getToken())) return null;
          var ts = Math.floor(Date.now() / 1000);
          var params = 'appid=' + CONFIG.APP_ID +
            '&device=' + self.mac + '_' + self.sn +
            '&ish265=' + (h265 ? '1' : '0') + '&ls=1' +
            '&musicno=' + encodeURIComponent(musicno) +
            '&resolution=' + encodeURIComponent(resolution) +
            '&sn=' + self.sn +
            '&time=' + ts +
            '&token=' + self.token;
          var sign = md5(params + CONFIG.SDK_KEY);
          var url = CONFIG.HOST + '/music/do.php?' + params + '&sign=' + sign;

          var resp = await httpGet(url);
          if (resp.status === 200) {
            var data = JSON.parse(resp.body);
            if (data.code === 200) {
              var u = data.data || '';
              if (u && u.indexOf('wb66.cn') === -1 && u.indexOf('http') === 0) {
                self._log('URL OK: ' + musicno);
                return u;
              }
              return u || '';
            }
            if (data.code === 20002) { self.token = ''; continue; }
          }
          if (resp.status === 403 || resp.status === 500) {
            await new Promise(function(r){setTimeout(r,1000+att*1000);});
            continue;
          }
          return null;
        } catch(e) {
          if (att >= 1) return null;
        }
      }
      return null;
    },

    // 4. Full init sequence
    init: async function() {
      if (!(await this.mwsLogin())) return false;
      if (!(await this.getToken())) return false;
      return true;
    }
  };

  // ─── 导出 ──────────────────────────────────────────
  global.KtvApi = KtvApi;
  global.KtvApiConfig = CONFIG;
  global.KtvBridgeApiVersion = 2;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {KtvApi: KtvApi, CONFIG: CONFIG};
  }

})(typeof window !== 'undefined' ? window : this);
