"use strict";
const tus = require('tus-js-client');
const https = require('https');
const fs = require('fs');

const errorMsg = e =>
  (e.originalRequest.status === 403 && 'invalid credentials')
  || e.originalRequest.responseText
  || (typeof e === 'string' && e)
  || e.message;

const handle = (list, ...args) =>
  [].concat(list).forEach(fn =>
    typeof fn === 'function' && fn.apply(this, args));

module.exports = class CloudflareStream {

  // Create a new CloudflareStreamPromise with mandatory credentials:
  // { zone|email|key:String }
  constructor(credentials) {
    // check credentials
    if (!credentials.zone || !credentials.email || !credentials.key) {
      throw('Cloudflare credentials required: { zone, email, key }');
    }

    // set credentials
    this.credentials = credentials;

    // access to tus with default credentials
    tus.defaultOptions.headers = {
      'X-Auth-Email': credentials.email,
      'X-Auth-Key': credentials.key,
    };

    // url parameters
    this.url = {
      hostname: 'api.cloudflare.com',
      path: `/client/v4/zones/${credentials.zone}/media`,  
    };
    this.url.uploads = `https://${this.url.hostname}${this.url.path}`;
  }

  // get path based on options passed to the api:
  // { id|type:String }
  path(options = {}) {
    return [this.url.path].concat(options.id
    ? [options.id].concat(/^(embed|preview)$/.test(options.type) ? options.type : [])
    : []).join('/');
  }

  // access to the cloudflare API, takes a path string or options:
  // String|{ id|type|method|payload:String headers:Object }
  api(options = {}) {
    return new Promise((resolve, reject) => {
      const isPath = typeof options === 'string';
      const path = isPath ? options : this.path(options);
      if (isPath) options = {};
      const req = https.request({
        hostname: this.url.hostname,
        path,
        method: options.method || 'GET',
        headers: Object.assign({
          'X-Auth-Email': this.credentials.email,
          'X-Auth-Key': this.credentials.key,
        }, options.headers),
      }, (res) => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => {
          // decode response data as json
          try {
            const decoded = JSON.parse(data);
            if (decoded.errors && decoded.errors.length > 0) {
              reject(decoded.errors);
            } else resolve(decoded.result || decoded);

          // or return as string (e.g. html, etc)
          } catch (e) {
            resolve(data);
          }
        });
      });
      req.on('error', e => reject(errorMsg(e)));

      // allow payloads to be sent if required
      if (options.payload) req.send(options.payload);
      req.end();
    });
  }

  // simplified tus Upload api, including options:
  // file:String|Buffer, { name:String, meta:Object, onStart|onProgress|OnSuccess|onError:Function }
  Upload(file, options = {}) {
    return new Promise((resolve, reject) => {
      const isPath = typeof file !== 'object';
      const buffer = isPath ? fs.readFileSync(file) : file;
      if (!buffer) return reject('Input file required: Upload(file, options)');

      const metadata = Object.assign({}, options.meta);
      if (options.name || isPath) {
        metadata.name = options.name || file.replace(/^.*?([^\/]*?)(\.\w+)?$/, '$1');

        if (isPath && file.slice(-3) === 'mp4') metadata.type = 'video/mp4';
      }

      const upload = new tus.Upload(buffer, {
        endpoint: this.url.uploads,
        chunkSize: 5242880,
        metadata,
        onError: e => handle([options.onError, reject], errorMsg(e)),
        onProgress: options.onProgress,
        onSuccess: () => this.api(upload.url)
          .then(e => handle([options.onSuccess, resolve], e)) // resolve and fire 'onSuccess' handler
          .catch(e => handle([options.onError, reject], e)), // reject and fire 'onError' handler
      });
      upload.start();

      // fire 'onStart' handler (returns tus upload object)
      handle(options.onStart, upload);
    });
  }

  // available Cloudflare Stream API methods
  getList() { return this.api(); }
  getVideo(id) { return this.api({ id }); }
  getLink(id) { return this.api({ id, type: 'preview' }); }
  getEmbed(id) { return this.api({ id, type: 'embed' }); }
  deleteVideo(id) { return this.api({ id, method: 'DELETE' }); }

  // access to tus with default credentials
  get tus() { return tus; }
};
