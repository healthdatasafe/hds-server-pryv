/**
 * @license
 * Copyright (C) 2020-2021 Pryv S.A. https://pryv.com 
 * 
 * This file is part of Open-Pryv.io and released under BSD-Clause-3 License
 * 
 * Redistribution and use in source and binary forms, with or without 
 * modification, are permitted provided that the following conditions are met:
 * 
 * 1. Redistributions of source code must retain the above copyright notice, 
 *    this list of conditions and the following disclaimer.
 * 
 * 2. Redistributions in binary form must reproduce the above copyright notice, 
 *    this list of conditions and the following disclaimer in the documentation 
 *    and/or other materials provided with the distribution.
 * 
 * 3. Neither the name of the copyright holder nor the names of its contributors 
 *    may be used to endorse or promote products derived from this software 
 *    without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE 
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL 
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER 
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, 
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 * SPDX-License-Identifier: BSD-3-Clause
 */
// @flow

const commonMeta = require('./methods/helpers/setCommonMeta');
const MultiStream = require('multistream');
const DrainStream = require('./methods/streams/DrainStream');
const ArrayStream = require('./methods/streams/ArrayStream');
const async = require('async');

const { Transform, Readable} = require('stream');

import type { Webhook } from 'business/webhooks';

type ResultOptions = {
  arrayLimit?: number, 
}
type StreamDescriptor = {
  name: string, 
  stream: stream$Readable,
}
type APIResult = 
  {[string]: Object} |
  {[string]: Array<Object>};
  
type ToObjectCallback = (err: ?Error, res: ?APIResult) => mixed;

type doneCallBack = () => mixed;

type itemDeletion = {
  id: string,
  deleted: number,
};

type PermissionLevel = 'read' | 'contribute' | 'manage';
type Setting = 'forbidden';

type Permission = {
  streamId: string,
  level: PermissionLevel,
} | {
  feature: string,
  setting: Setting,
};

(async () => {
  await commonMeta.loadSettings();
})();



// Result object used to store API call response body while it is processed.
// In case of events.get call, it stores multiple streams in this.streamsArray.
// ie.: each Stream of data will be sent one after the other
// Otherwise, it works as a simple JS object.
// 
// The result can be sent back to the caller using writeToHttpResponse or
// recovered as a JS object through the toObject() function.
// 
class Result {
  _private: {
    init: boolean, first: boolean, 
    arrayLimit: number, 
    isStreamResult: boolean, 
    streamsArray: Array<StreamDescriptor>, 
    onEndCallback: ?doneCallBack,
    streamsConcatArrays: Object
  }
  meta: ?Object;
  
  // These are used by the various methods to store the result objects. 
  // Never assume these are filled in...
  // Exercise to the reader: How can we get rid of this mixed bag of things?
  accesses: ?Array<any>;
  access: mixed;
  accessDeletion: mixed;
  accessDeletions: mixed;
  relatedDeletions: ?Array<any>;
  matchingAccess: mixed;
  mismatchingAccess: mixed;
  checkedPermissions: mixed;
  error: mixed;

  event: ?Event;
  events: ?Array<Event>;

  type: string;
  name: string;
  permissions: Array<Permission>

  results: Array<Result>;

  webhook: Webhook;
  webhooks: Array<Webhook>;
  
  webhookDeletion: itemDeletion;

  auditLogs: ?Array<{}>;
  

  constructor(params?: ResultOptions) {
    this._private = { 
      init: false, first: true, 
      arrayLimit: 10000, 
      isStreamResult: false, 
      streamsArray: [],  
      onEndCallback: null,
      streamsConcatArrays: {}
    };
    
    if (params && params.arrayLimit != null && params.arrayLimit > 0) {
      this._private.arrayLimit = params.arrayLimit;
    }
  }

  // Array concat stream
  addToConcatArrayStream(arrayName: string, stream: stream$Readable) {
    if (! this._private.streamsConcatArrays[arrayName]) {
      this._private.streamsConcatArrays[arrayName] = new StreamConcatArray();
    }
    this._private.streamsConcatArrays[arrayName].add(stream);    
  }

  // Close
  closeConcatArrayStream(arrayName: string) {
    if (! this._private.streamsConcatArrays[arrayName]) {
      return;
    }
    this.addStream(arrayName, this._private.streamsConcatArrays[arrayName].getStream());
    this._private.streamsConcatArrays[arrayName].close();
  }
  
  // Pushes stream on the streamsArray stack, FIFO.
  // 
  addStream(arrayName: string, stream: stream$Readable) {
    this._private.isStreamResult = true; 
    this._private.streamsArray.push({name: arrayName, stream: stream});
  }
  
  // Returns true if the Result holds any streams, false otherwise.
  // 
  isStreamResult() {
    return this._private.isStreamResult;
  }
  
  // Execute the following when result has been fully sent
  // If already sent callback is called right away
  onEnd(callback: doneCallBack) {
    this._private.onEndCallback = callback;
  }

  // Sends the content of Result to the HttpResponse stream passed in parameters.
  // 
  writeToHttpResponse(res: express$Response, successCode: number) {
    const onEndCallBack = this._private.onEndCallback;
    if (this.isStreamResult()) {
      const stream: Readable = this.writeStreams(res, successCode);
      stream.on('close', function() { 
        if (onEndCallBack) onEndCallBack();
      }.bind(this));
    } else {
      this.writeSingle(res, successCode);
      if (onEndCallBack) onEndCallBack()
    }
  }
  
  writeStreams(res: express$Response, successCode: number): Readable {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.statusCode = successCode;

    const streamsArray = this._private.streamsArray;

    if (! this._private.isStreamResult)
      throw new Error('AF: not a stream result.');
    if (streamsArray.length < 1) 
      throw new Error('streams array empty');

    // Are we handling a single stream?
    if (streamsArray.length === 1) {
      const first = streamsArray[0];
      return first.stream
        .pipe(new ArrayStream(first.name, true))
        .pipe(new ResultStream())
        .pipe(res);
    }

    // assert: streamsArray.length > 1
    const streams = [];
    for (let i=0; i<streamsArray.length; i++) {
      const s = streamsArray[i];
      streams.push(s.stream.pipe(new ArrayStream(s.name, i === 0)));
    }

    return new MultiStream(streams).pipe(new ResultStream()).pipe(res);
  }
  
  writeSingle(res: express$Response, successCode: number) {
    delete this._private;
    res
      .status(successCode)
      .json(commonMeta.setCommonMeta(this));
  }
  
  // Returns the content of the Result object in a JS object.
  // In case the Result contains a streamsArray, it will drain them in arrays.
  // 
  toObject(callback: ToObjectCallback) {
    if (this.isStreamResult()) {
      this.toObjectStream(callback);
    } else {
      this.toObjectSingle(callback);
    }
  }
  
  toObjectStream(callback: ToObjectCallback) {
    const _private = this._private;
    const streamsArray = _private.streamsArray;

    const resultObj = {};
    async.forEachOfSeries(streamsArray, (elementDef, i, done) => {
      const drain = new DrainStream({limit: _private.arrayLimit}, (err, list) => {
        if (err) {
          return done(err);
        }
        resultObj[elementDef.name] = list;
        done();
      });
      elementDef.stream.pipe(drain);
    }, (err) => {
      if (err) {
        return callback(err);
      }
      callback(null, resultObj);
    });
  }
  
  toObjectSingle(callback: ToObjectCallback) {
    delete this._private;
    callback(null, this);
  }
}

// Stream that wraps the whole result in JSON curly braces before being sent to
// Http.response
class ResultStream extends Transform {
  isStart: boolean;
  
  constructor() {
    super({objectMode: true});
    
    this.isStart = true;
  }
  
  _transform(data, encoding, callback) {
    if (this.isStart) {
      this.push('{');
      this.isStart = false;
    }
    this.push(data);
    callback();
  }
  
  _flush(callback) {
    const thing = ', "meta": ' + JSON.stringify(commonMeta.setCommonMeta({}).meta);
    this.push(thing + '}');

    callback();
  }
}

module.exports = Result;


class StreamConcatArray {
  streamsToAdd: Array<stream$Readable>;
  nextFactoryCallBack: Function;
  multistream: MultiStream;
  isClosed: boolean;
  
  constructor() {
    // holds pending stream not yet taken by
    this.streamsToAdd = [];
    this.nextFactoryCallBack = null;
    this.isClosed = false;
    const streamConcact = this;

    function factory(callback) {
      streamConcact.nextFactoryCallBack = callback;
      streamConcact._next();
    }
    this.multistream = new MultiStream(factory, {objectMode: true});
  }

  /**
   * @private
   */
  _next() {
    if (! this.nextFactoryCallBack) return;
    if (this.streamsToAdd.length > 0) {
      const nextStream = this.streamsToAdd.shift();
      this.nextFactoryCallBack(null, nextStream);
      this.nextFactoryCallBack = null;
      return;
    }
    if (this.isClosed) {
      this.nextFactoryCallBack(null, null);
      this.nextFactoryCallBack = null;
    }
  }

  getStream() {  
    return this.multistream;
  }

  add(readableStream: Readable) {
    this.streamsToAdd.push(readableStream);
  }

  close() {
    this.isClosed = true;
    this._next();
  }
}
