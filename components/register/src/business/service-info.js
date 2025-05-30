/**
 * @license
 * Copyright (C) 2020–2025 Pryv S.A. https://pryv.com
 *
 * This file is part of Open-Pryv.io and released under BSD-Clause-3 License
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *   may be used to endorse or promote products derived from this software
 *   without specific prior written permission.
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
const config = require('../config');

const STUB_VALUE_FOR_OPEN_SOURCE = '1.6.0';

// get version from the file that is in the container
const info = Object.assign({}, config.get('service'));
const reportingSettings = config.get('reporting');
if (reportingSettings == null) {
  info.version = STUB_VALUE_FOR_OPEN_SOURCE;
} else {
  info.version = reportingSettings.templateVersion;
}

// add eventual missing '/';
['access', 'api', 'register'].forEach((key) => {
  if (info[key].slice(-1) !== '/') {
    info[key] += '/';
  }
});

module.exports = info;

const regexSchemaAndPath = /(.+):\/\/(.+)/gm;

/**
 * Copied over from the JS lib's `Service.buildAPIEndpoint()`
 * TODO: refactor code shared across client & server components into internal lib
 * @param {string} username
 * @param {string} token
 * @returns {string}
 */
module.exports.getAPIEndpoint = function (username, token) {
  const tokenAndAPI = {
    endpoint: info.api.replace('{username}', username),
    token
  };
  if (!tokenAndAPI.token) {
    let res = tokenAndAPI.endpoint + '';
    if (!tokenAndAPI.endpoint.endsWith('/')) {
      res += '/';
    }
    return res;
  }
  regexSchemaAndPath.lastIndex = 0;
  const res = regexSchemaAndPath.exec(tokenAndAPI.endpoint);
  // add a trailing '/' to end point if missing
  if (!res[2].endsWith('/')) {
    res[2] += '/';
  }
  return res[1] + '://' + tokenAndAPI.token + '@' + res[2];
};
