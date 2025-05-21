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
const path = require('path');
const fs = require('fs');

// An extension is configured by entering a path to a nodejs module into the
// configuration file. It is then loaded by the server and executed in place
// when the extension functionality is needed. See customAuthStepFn for an
// example of an extension.
//

class Extension {
  path;
  fn;

  constructor (path, fn) {
    this.path = path;
    this.fn = fn;
  }
}

// Loads extensions from a `defaultFolder` or from the path indicated in
// the configuration file.
//

class ExtensionLoader {
  defaultFolder;

  constructor (defaultFolder) {
    this.defaultFolder = defaultFolder;
  }

  // Tries loading the extension identified by name. This will try to load from
  // below `defaultFolder` first, by appending '.js' to `name`.
  //
  /**
   * @param {string} name
   * @returns {Extension}
   */
  load (name) {
    // not explicitly specified —> try to load from default folder
    const defaultModulePath = path.join(this.defaultFolder, name + '.js');
    // If default location doesn't contain a module, give up.
    if (!fs.existsSync(defaultModulePath)) { return null; }
    // assert: file `defaultModulePath` has existed just before
    return this.loadFrom(defaultModulePath);
  }

  // Tries loading an extension from path. Throws an error if not successful.
  //
  /**
   * @param {string} path
   * @returns {Extension}
   */
  loadFrom (path) {
    try {
      const fn = require(path);
      if (typeof fn !== 'function') { throw new Error(`Not a function (${typeof fn})`); }
      return new Extension(path, fn);
    } catch (err) {
      throw new Error(`Cannot load function module @'${path}': ${err.message}`);
    }
  }
}
module.exports = {
  ExtensionLoader,
  Extension
};

/** @typedef {() => void} ExtensionFunction */
