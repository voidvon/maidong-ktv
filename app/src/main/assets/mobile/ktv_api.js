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
  function md5(string) {
    function r(n,c){return(n<<c)|(n>>>(32-c));}
    function q(x,y){var l=(x&0xFFFF)+(y&0xFFFF);var m=(x>>16)+(y>>16)+(l>>16);return(m<<16)|(l&0xFFFF);}
    function f(x,y,z){return(x&y)|((~x)&z);}
    function g(x,y,z){return(x&z)|(y&(~z));}
    function h(x,y,z){return x^y^z;}
    function i(x,y,z){return y^(x|(~z));}
    function ff(a,b,c,d,x,s,t){return q(r(q(q(a,f(b,c,d)),q(x,t)),s),b);}
    function gg(a,b,c,d,x,s,t){return q(r(q(q(a,g(b,c,d)),q(x,t)),s),b);}
    function hh(a,b,c,d,x,s,t){return q(r(q(q(a,h(b,c,d)),q(x,t)),s),b);}
    function ii(a,b,c,d,x,s,t){return q(r(q(q(a,i(b,c,d)),q(x,t)),s),b);}
    function cvt(str){
      var out=[],len=str.length;
      for(var i=0;i<len;){var c=str.charCodeAt(i++);
        if(c<128)out.push(c);
        else if(c<2048){out.push((c>>6)|192);out.push((c&63)|128);}
        else{out.push((c>>12)|224);out.push(((c>>6)&63)|128);out.push((c&63)|128);}
      }return out;
    }
    var b=cvt(string),a=1732584193,b1=-271733879,b2=-1732584194,b3=271733878,i,olda,oldb,oldc,oldd;
    for(i=0;i<b.length;i+=64){
      var x=[],j;
      for(j=0;j<64;j++)x[j]=i+j<b.length?b[i+j]:0;
      olda=a;oldb=b1;oldc=b2;oldd=b3;
      a=ff(a,b1,b2,b3,x[0],7,-680876936);b3=ff(b3,a,b1,b2,x[1],12,-389564586);b2=ff(b2,b3,a,b1,x[2],17,606105819);b1=ff(b1,b2,b3,a,x[3],22,-1044525330);
      a=ff(a,b1,b2,b3,x[4],7,-176418897);b3=ff(b3,a,b1,b2,x[5],12,1200080426);b2=ff(b2,b3,a,b1,x[6],17,-1473231341);b1=ff(b1,b2,b3,a,x[7],22,-45705983);
      a=ff(a,b1,b2,b3,x[8],7,1770035416);b3=ff(b3,a,b1,b2,x[9],12,-1958414417);b2=ff(b2,b3,a,b1,x[10],17,-42063);b1=ff(b1,b2,b3,a,x[11],22,-1990404162);
      a=ff(a,b1,b2,b3,x[12],7,1804603682);b3=ff(b3,a,b1,b2,x[13],12,-40341101);b2=ff(b2,b3,a,b1,x[14],17,-1502002290);b1=ff(b1,b2,b3,a,x[15],22,1236535329);
      a=gg(a,b1,b2,b3,x[1],5,-165796510);b3=gg(b3,a,b1,b2,x[6],9,-1069501632);b2=gg(b2,b3,a,b1,x[11],14,643717713);b1=gg(b1,b2,b3,a,x[0],20,-373897302);
      a=gg(a,b1,b2,b3,x[5],5,-701558691);b3=gg(b3,a,b1,b2,x[10],9,38016083);b2=gg(b2,b3,a,b1,x[15],14,-660478335);b1=gg(b1,b2,b3,a,x[4],20,-405537848);
      a=gg(a,b1,b2,b3,x[9],5,568446438);b3=gg(b3,a,b1,b2,x[14],9,-1019803690);b2=gg(b2,b3,a,b1,x[3],14,-187363961);b1=gg(b1,b2,b3,a,x[8],20,1163531501);
      a=gg(a,b1,b2,b3,x[13],5,-1444681467);b3=gg(b3,a,b1,b2,x[2],9,-51403784);b2=gg(b2,b3,a,b1,x[7],14,1735328473);b1=gg(b1,b2,b3,a,x[12],20,-1926607734);
      a=hh(a,b1,b2,b3,x[5],4,-378558);b3=hh(b3,a,b1,b2,x[8],11,-2022574463);b2=hh(b2,b3,a,b1,x[11],16,1839030562);b1=hh(b1,b2,b3,a,x[14],23,-35309556);
      a=hh(a,b1,b2,b3,x[1],4,-1530992060);b3=hh(b3,a,b1,b2,x[4],11,1272893353);b2=hh(b2,b3,a,b1,x[7],16,-155497632);b1=hh(b1,b2,b3,a,x[10],23,-1094730640);
      a=hh(a,b1,b2,b3,x[13],4,681279174);b3=hh(b3,a,b1,b2,x[0],11,-358537222);b2=hh(b2,b3,a,b1,x[3],16,-722521979);b1=hh(b1,b2,b3,a,x[6],23,76029189);
      a=hh(a,b1,b2,b3,x[9],4,-640364487);b3=hh(b3,a,b1,b2,x[12],11,-421815835);b2=hh(b2,b3,a,b1,x[15],16,530742520);b1=hh(b1,b2,b3,a,x[2],23,-995338651);
      a=ii(a,b1,b2,b3,x[0],6,-198630844);b3=ii(b3,a,b1,b2,x[7],10,1126891415);b2=ii(b2,b3,a,b1,x[14],15,-1416354905);b1=ii(b1,b2,b3,a,x[5],21,-57434055);
      a=ii(a,b1,b2,b3,x[12],6,1700485571);b3=ii(b3,a,b1,b2,x[3],10,-1894986606);b2=ii(b2,b3,a,b1,x[10],15,-1051523);b1=ii(b1,b2,b3,a,x[1],21,-2054922799);
      a=ii(a,b1,b2,b3,x[8],6,1873313359);b3=ii(b3,a,b1,b2,x[15],10,-30611744);b2=ii(b2,b3,a,b1,x[6],15,-1560198380);b1=ii(b1,b2,b3,a,x[13],21,1309151649);
      a=ii(a,b1,b2,b3,x[4],6,-145523070);b3=ii(b3,a,b1,b2,x[11],10,-1120210379);b2=ii(b2,b3,a,b1,x[2],15,718787259);b1=ii(b1,b2,b3,a,x[9],21,-343485551);
      a=q(a,olda);b1=q(b1,oldb);b2=q(b2,oldc);b3=q(b3,oldd);
    }
    function hex(v){var s='';for(var i=0;i<4;i++)s+=('0'+(v>>(i*8+4)&0x0F).toString(16)).slice(-2)+('0'+(v>>(i*8)&0x0F).toString(16)).slice(-2);return s;}
    return hex(a)+hex(b1)+hex(b2)+hex(b3);
  }

  // ─── RSA Encrypt ───────────────────────────────────
  function pemToArrayBuffer(pem) {
    var b64 = pem.replace(/-----.*?-----/g,'').replace(/\s/g,'');
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    return bytes.buffer;
  }

  async function rsaEncrypt(plaintext) {
    try {
      // Try Web Crypto API (Android 5.0+)
      var keyData = pemToArrayBuffer(
        '-----BEGIN PUBLIC KEY-----\n' + CONFIG.RSA_PUBKEY + '\n-----END PUBLIC KEY-----');
      var key = await crypto.subtle.importKey('spki', keyData,
        {name:'RSA-OAEP',hash:'SHA-256'}, false, ['encrypt']);
      var encoded = new TextEncoder().encode(plaintext);
      var encrypted = await crypto.subtle.encrypt({name:'RSA-OAEP',hash:'SHA-256'}, key, encoded);
      return btoa(String.fromCharCode.apply(null, new Uint8Array(encrypted)));
    } catch(e) {
      // Fallback: use PKCS1v15
      var keyData = pemToArrayBuffer(
        '-----BEGIN PUBLIC KEY-----\n' + CONFIG.RSA_PUBKEY + '\n-----END PUBLIC KEY-----');
      var key = await crypto.subtle.importKey('spki', keyData,
        {name:'RSA-PKCS1-v1_5',hash:'SHA-1'}, false, ['encrypt']);
      var encoded = new TextEncoder().encode(plaintext);
      var encrypted = await crypto.subtle.encrypt('RSA-PKCS1-v1_5', key, encoded);
      return btoa(String.fromCharCode.apply(null, new Uint8Array(encrypted)));
    }
  }

  // ─── HTTP ──────────────────────────────────────────
  async function httpGet(url, timeout) {
    timeout = timeout || 8000;
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.timeout = timeout;
      xhr.setRequestHeader('Accept', '*/*');
      xhr.setRequestHeader('User-Agent', 'Dalvik/2.1.0');
      xhr.setRequestHeader('X-Forwarded-For', randomXF());
      xhr.setRequestHeader('X-Real-IP', randomXF());
      xhr.onload = function() { resolve({body:xhr.responseText, status:xhr.status}); };
      xhr.onerror = function() { reject(new Error('network error')); };
      xhr.ontimeout = function() { reject(new Error('timeout')); };
      xhr.send();
    });
  }

  async function httpPost(url, body, timeout) {
    timeout = timeout || 8000;
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.timeout = timeout;
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Accept', '*/*');
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
    getSongUrl: async function(musicno) {
      var self = this;
      if (!self.token) {
        if (!(await self.getToken())) return null;
      }
      for (var att = 0; att < 3; att++) {
        try {
          var ts = Math.floor(Date.now() / 1000);
          var params = 'appid=' + CONFIG.APP_ID +
            '&device=' + self.mac + '_' + self.sn +
            '&ish265=0&ls=1' +
            '&musicno=' + musicno +
            '&resolution=720' +
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

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {KtvApi: KtvApi, CONFIG: CONFIG};
  }

})(typeof window !== 'undefined' ? window : this);
