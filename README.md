# Cloudflare Stream Promise

A Cloudflare Stream API client for Node, wrapped around the finger of [tus](https://github.com/tus/tus-js-client), and forked from the eventful [larkin-nz/cloudflare-stream](https://github.com/larkin-nz/cloudflare-stream) ... so you can easily upload videos to [Cloudflare Stream](https://developers.cloudflare.com/stream/). Promise.

## Getting Started

Let's start off by installing the package via NPM.

```sh
npm i cloudflare-stream-promise
```

Once you've done that, you'll want to create an instance of a [CloudflareStream](#cloudflarestream) with your [credentials](#credentials).

```js
CloudflareStream = require('cloudflare-stream-promise');

const stream = new CloudflareStream({
  email: 'boom@tish', // Account email
  key: 'XXX', // Cloudflare Account ID
  zone: 'YYY', // Cloudflare API Zone ID
});
```

Kewl. Ready to rock. Let's create an [Upload](#upload) from a [file](#file-stringbuffer) and some [upload options](#uploadoptions-object) (that  promises to complete!):

```js
stream.Upload(filepath, {
  name: 'bam! the movie', // this name appears in the Cloudflare Stream dashboard
  meta: { // optionally include / override some metadata
    type: 'video/mp4', // mime type is included by default
  },
})
.then(e => console.log(e)) // fires on success!
.catch(e => console.log('Error', e)); // explodes into action on an error (duh)
```

OK, but how soon is now? You can also choose from a variety of callbacks: [onStart](#uploadoptionsonstart-function--tus-js-client-upload-), [onProgress](#uploadoptionsonprogress-function-bytesuploaded-number-bytestotal-number), [onSuccess](#uploadoptionsonsuccess-function-videodetails-object), and [onError](#uploadoptionsonerror-function--errordetails-object) can all be included in your [upload options](#uploadoptions-object):


```js
stream.Upload(filepath, {
  onStart: upload => console.log(upload), // use to e.g. upload.abort()
  onProgress: (bytes, total) => console.log(`${Math.floor(100 * bytes / total)}%`),
  onSuccess: e => console.log(e) // mirrors promise resolution
  onError: e => console.log('Error', e) // mirrors promise rejection
})
.then(e => console.log(e)) // mirrored by onSuccess callback
.catch(e => console.log('Error', e)); // mirrored by onError callback

```

Groovetown. What other fun things can we do?


```js
// get everything you've got
stream.getList()
.then(list => Promise.all([list,
  // get just your favourite
  stream.getVideo(list[0].uid),
  // get the link to your favourite
  stream.getLink(list[0].uid),
  // get the embed code for your favourite
  stream.getEmbed(list[0].uid),
]))
// get bored and delete your favourite
.then(results => stream.deleteVideo(results[0][0].uid)
  .then(() => results.concat('easy come easy go.')))
.then(output => console.log(output))
.catch(e => console.log('Error', e));
```


## API Documentation

### CloudflareStream
```js
class CloudflareStream {

  constructor(credentials: Object);

  Upload(file: String|Buffer, uploadOptions?: Object) => Object

  getList() => Array
  getVideo(videoId: String) => Object
  getLink(videoId: String) => String
  getEmbed(videoId: String) => String
  deleteVideo(videoId: String) => Null
  
  api(apiOptions: String|Object) => Array|Object|String|Null
  path(pathOptions?: Object) => String
  
  credentials: Object
  url: Object
  tus: <tus-js-client>
}
```

#### constructor(credentials)

##### credentials

```js
{
  email: String,
  key: String,
  zone: String,
}
```

##### credentials.email

An `email` is always required, it should be the email address which you use to sign in with Cloudflare.

##### credentials.key

A `key` is always required, it should be the [API Key](https://support.cloudflare.com/hc/en-us/articles/200167836-Where-do-I-find-my-Cloudflare-API-key-
) which matches the email address which you use to sign in with Cloudflare.

##### credentials.zone

A `zone` is always required, and must be a valid [Cloudflare DNS Zone](https://www.cloudflare.com/learning/dns/glossary/dns-zone/) which is accessable using the specified email address and API key.


#### Upload(file, uploadOptions)

Takes a local file path (or file buffer) alongside various options (including an [onProgress](#uploadoptionsonprogress-function-bytesuploaded-number-bytestotal-number) callback). Returns a promise.

##### file: String|Buffer

A `file` is always required, and can be a path on the local filesystem or a buffer. [Cloudflare recommends](https://developers.cloudflare.com/stream/getting-started/input-files/) videos have an MP4 container, AAC audio codec, H264 video codec, and 30 or below frames per second. Cloudflare currently impose a 5GB limit per upload.

##### uploadOptions?: Object

```js
{
  name?: String,
  meta?: Object,
  onStart?: Function (<tus-js-client: Upload),
  onProgress?: Function (bytesUploaded: Number, bytesTotal: Number),
  OnSuccess?: Function (videoDetails: Object),
  onError?: Function (errorDetails: Object)
}
```

##### uploadOptions.name?: String

The `name` option is equivalent to `meta.name` and appears alongside the video on the Cloudflare Stream dashboard. If not explicitly set it is derived from the path (if available): `/path/to/{name}.mp4`.

##### uploadOptions.meta?: Object

The `meta` object allow for arbitrary `key:value` pairs to be stored alongside the video. Two values are stored automatically (where available), but can be overwritten: `meta.name` (see above) and `meta.type: 'video/mp4'` (if path has .mp4 extension)

##### uploadOptions.onStart?: Function (`<tus-js-client: Upload>`)

The `onStart` option sets a callback to be fired when the upload starts. Returned arguments include the wrapped [tus-js-client's](https://github.com/tus/tus-js-client#new-tusuploadfile-options) instantiated `upload` object, allowing the upload to be paused with `upload.abort()` and then restarted with `upload.start()`. It is also useful for accessing other [tus options and values](https://github.com/tus/tus-js-client#new-tusuploadfile-options).

##### uploadOptions.onProgress?: Function (bytesUploaded: Number, bytesTotal: Number)

Use the `onProgress` callback to keep track of upload progress.

##### uploadOptions.onSuccess?: Function (videoDetails: Object)

The `onSuccess` callback fires once the upload is complete and mirrors the promise resolution. Returned arguments include a [videoDetails object](#videodetails-object) similar to that returned by a call to `getVideo`.

##### uploadOptions.onError?: Function => errorDetails: Object

The `onError` callback fires on any error and mirrors the promise rejection. The `errorDetails` object argument should always contain a `message` with information about the error.



#### getList() => videoDetails: Object

Returns an array of [videoDetails objects](#videodetails-object).


#### getVideo(videoId: String) => videoDetails: Object

Takes a `videoId` and returns a `videoDetails` objects (see example below).


#### getLink(videoId: String) => videoLink: String

Takes a `videoId` and returns a `videoLink` HTML string, including an anchor pointing to the video on a Cloudflare-hosted preview page:

```html
<a href="https://watch.cloudflarestream.com/dd5d531a12de0c724bd1275a3b2bc9c6">Permanent Redirect</a>.
```

#### getEmbed(videoId: String) => videoEmbed: String

Takes a `videoId` and returns a `videoEmbed` HTML string, including a <stream\> element and <script\> tag to load the player in dynamically:

```html
<stream src="dd5d531a12de0c724bd1275a3b2bc9c6"></stream><script data-cfasync="false" defer type="text/javascript" src="https://embed.videodelivery.net/embed/r4xu.fla9.latest.js?video=dd5d531a12de0c724bd1275a3b2bc9c6"></script>
```

#### deleteVideo(videoId: String)

Takes a `videoId` and deletes the corresponding video.


### Advanced

#### api(apiOptions: String|Object) => Array|Object|String|Null

The underlying method for everything except [Upload](#uploadfile-uploadoptions). Takes a URL path (String) or apiOptions (object) and returns one of many(!) possibilities. See the [Cloudflare API documentation](https://api.cloudflare.com/#stream-videos) for more detail.

##### apiOptions?
```js
{
  id?: String,
  type?: String,
  method?: String,
  payload?: String,
  headers?: Object
}
```

##### apiOptions.id?: String

Sets the path to a specific video.

##### apiOptions.type?: String

If included 'embed' or 'preview' are currently available.

##### apiOptions.method?: String

Defaults to 'GET'.

##### apiOptions.payload?: String

Currently not required. For sending data to an endpoint.

##### apiOptions.headers?: String

Currently not required. For sending custom headers to an endpoint.


#### path(pathOptions?: Object) => String

Takes [pathOptions](#pathoptions) and returns a path to a resource. Defaults to the base API endpoint, e.g. `https://api.cloudflare.com/client/v4/zones/{credentials.zone}/media`

##### pathOptions?
```js
{
  id?: String,
  type?: String,
}
```

##### pathOptions.id?: String

Sets the path to a specific video.

##### apiOptions.type?: String

If included must be either 'embed' or 'preview'.


#### credentials: Object

Returns the credentials supplied to the constructor.

#### url: Object

Returns the deconstructed base API endpoint.


#### tus: `<tus-js-client>`

Returns the wrapped [<tus-js-client>](https://github.com/tus/tus-js-client). Go wild!


#### videoDetails: Object

Returned by a successful [Upload](#uploadfile-uploadoptions), calls to [getVideo](#getvideovideoid-string--videodetails-object), and for each video returned by [getList](#getlist--videodetails-object).

Example output:
```js
{
  "uid": "dd5d531a12de0c724bd1275a3b2bc9c6",
  "thumbnail": "https://cloudflarestream.com/dd5d531a12de0c724bd1275a3b2bc9c6/thumbnails/thumb.png",
  "readyToStream": false,
  "status": {
    "state": "inprogress",
    "step": "encoding",
    "pctComplete": "78.18"
  },
  "meta": {},
  "labels": [],
  "created": "2018-01-01T01:00:00.474936Z",
  "modified": "2018-01-01T01:02:21.076571Z",
  "size": 62335189,
  "preview": "https://watch.cloudflarestream.com/dd5d531a12de0c724bd1275a3b2bc9c6"
}
```