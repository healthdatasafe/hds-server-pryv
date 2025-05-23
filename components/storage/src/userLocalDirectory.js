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

/**
 * ToolSet to manipulate User's local directory
 */

const path = require('path');
const fs = require('fs/promises');
const mkdirp = require('mkdirp');

const { getConfig } = require('@pryv/boiler');

module.exports = {
  init,
  ensureUserDirectory,
  getPathForUser,
  deleteUserDirectory,
  getBasePath,
  setBasePathTestOnly
};

let config;
let basePath;

// temporarly set baseBath for tests;
function setBasePathTestOnly (path) {
  basePath = path || config.get('userFiles:path');
}

/**
 * Load config and make sure baseUserDirectory exists
 * This could also handle eventual migrations
 */
async function init () {
  if (basePath) return;
  config = await getConfig();
  const candidateBasePath = config.get('userFiles:path');
  mkdirp.sync(candidateBasePath);
  basePath = candidateBasePath;
}

/**
 * Return and **creates** the desired user path
 * @param {string} userId -- user id (cuid format)
 * @param {string} [extraPath] -- Optional, extra path
 */
async function ensureUserDirectory (userId, extraPath = '') {
  const resultPath = getPathForUser(userId, extraPath);
  await mkdirp(resultPath); // ensures directory exists
  return resultPath;
}

/**
 * Return the local storage for this user. (does not create it)
 * @param {string} userId -- user id (cuid format)
 * @param {string} [extraPath] -- Optional, extra path
 */
function getPathForUser (userId, extraPath = '') {
  if (basePath == null) {
    throw new Error('Run init() first');
  }
  if (!userId || userId.length < 3) {
    throw new Error('Invalid or too short userId: ' + userId);
  }
  const dir1 = userId.substr(userId.length - 1, 1); // last character of id
  const dir2 = userId.substr(userId.length - 2, 1);
  const dir3 = userId.substr(userId.length - 3, 1);
  const resultPath = path.join(basePath, dir1, dir2, dir3, userId, extraPath);
  return resultPath;
}

/**
 * Delete user data folder
 *
 * @param {*} userId -- user id
 */
async function deleteUserDirectory (userId) {
  const userFolder = getPathForUser(userId);
  await fs.rm(userFolder, { recursive: true, force: true });
}

function getBasePath () {
  if (basePath == null) {
    throw new Error('Initialize UserLocalDirectory first');
  }
  return basePath;
}
