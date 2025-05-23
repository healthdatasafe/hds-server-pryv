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

const async = require('async');
const APIError = require('errors').APIError;
const errors = require('errors').factory;
const Result = require('./Result');
const _ = require('lodash');
const { getConfigUnsafe } = require('@pryv/boiler');

let audit, throwIfMethodIsNotDeclared, isAuditActive;

// When storing full events.get request instead of streaming it, the maximum
// array size before returning an error.
const RESULT_TO_OBJECT_MAX_ARRAY_SIZE = 100000;

// The string used as wildcard for method id filters. Must be 1-character long.
const WILDCARD = '*';

/**
 * @typedef {{
 *   idFilter: string;
 *   fns: Array<ApiFunction>;
 * }} Filter
 */

/**
 * @typedef {| string
 *   | ((
 *       context: MethodContext,
 *       params: any,
 *       result: Result,
 *       next: ApiCallback
 *     ) => unknown)} ApiFunction
 */

/**
 * @typedef {(
 *   err?: Error | null,
 *   result?: Result | null
 * ) => unknown} ApiCallback
 */

/**
 * Maps each API method's implementation as a chain of functions (akin to
 * middleware) to its id. Handles method calls coming from HTTP or web sockets.
 */
class API {
  /**
   * Each key is a method id, each value is the array of functions implementing it.
   * @type {Map<string, Array<ApiFunction>>}
   */
  map;

  /**
   * @type {Array<Filter>}
   */
  filters;

  constructor () {
    this.map = new Map();
    this.filters = [];
    const config = getConfigUnsafe();
    isAuditActive = config.get('audit:active');
    if (isAuditActive) {
      audit = require('audit');
      throwIfMethodIsNotDeclared =
      require('audit/src/ApiMethods').throwIfMethodIsNotDeclared;
    }
  }

  // -------------------------------------------------------------- registration

  /**
   * Registers the given function(s) or other registered method(s) with the
   * given method id. The given function(s) will be appended, in order, to the
   * list of previously registered functions. A list of functions registered
   * under a method id can be inserted by using its method id as argument.
   *
   * The method id can end with a '*' wildcard, in which case the function(s)
   * will apply to all method ids that match.
   *
   * Example use:
   *
   * - `api.register('resources.*', commonFn)`
   * - `api.register('resources.get', fn1, fn2, ...)`
   * - `api.register('events.start', fn1, 'events.create', ...)`
   *
   * @param {string} id
   * @param {Array<ApiFunction>} fns
   * @returns {void}
   */
  register (id, ...fns) {
    if (isAuditActive) { throwIfMethodIsNotDeclared(id); }

    const methodMap = this.map;
    const wildcardAt = id.indexOf(WILDCARD);

    // Is this a full method id, without wildcards?
    if (wildcardAt === -1) {
      // Do we need to initialize this method id?
      // if (! methodMap.has(id)) {
      const methodFns = [];
      methodMap.set(id, methodFns);

      // prepend with matching filters registered earlier, if any
      this.applyMatchingFilters(id);
      // }

      // assert: methodMap.has(id)
      const idMethodFns = methodMap.get(id);
      if (idMethodFns == null) { throw new Error('AF: methodMap must contain id at this point.'); }

      // append registered functions
      for (const fn of fns) {
        // Syntax allows strings in the function list, which means that the
        // implementation from that method needs to be copied over.
        //
        if (!_.isFunction(fn)) {
          // If this is not a function, it MUST be a string.

          if (typeof fn !== 'string') { throw new Error('AF: backrefs must be in string form.'); }

          const backrefId = fn;
          if (!methodMap.has(backrefId)) { throw new Error('Trying to use undefined API method as shortcut.'); }

          const backrefMethods = methodMap.get(backrefId);
          if (backrefMethods == null) { throw new Error('AF: must have method list here'); }

          idMethodFns.push(...backrefMethods);
        } else {
          idMethodFns.push(fn);
        }
      }
    } else {
      // assert: wildcardAt >= 0
      if (wildcardAt !== id.length - 1) { throw new Error('Wildcard is only allowed as suffix.'); }

      const filter = {
        idFilter: id,
        fns
      };
      this.applyToMatchingIds(filter);

      // save filter for applying to methods registered later
      this.filters.push(filter);
    }
  }

  /**
   * Searches for filters that match `id` and applies them.
   *
   * @param {string} id
   * @returns {void}
   */
  applyMatchingFilters (id) {
    const filters = this.filters;

    for (const filter of filters) {
      this.applyIfMatches(filter, id);
    }
  }

  /**
   * Searches for existing methods that are matched by this filter.
   *
   * @param {Filter} filter
   * @returns {void}
   */
  applyToMatchingIds (filter) {
    const methodMap = this.map;

    for (const id of methodMap.keys()) {
      this.applyIfMatches(filter, id);
    }
  }

  /**
   * If `filter` matches/applies to `id`, appends the filter functions to the
   * list of functions of `id`.
   *
   * @param {Filter} filter
   * @param {string} id
   * @returns {void}
   */
  applyIfMatches (filter, id) {
    if (matches(filter.idFilter, id)) {
      const methodMap = this.map;
      const methodList = methodMap.get(id);
      if (methodList == null) { throw new Error('AF: method list for this id must not be null.'); }
      methodList.push(...filter.fns);
    }
  }

  // ------------------------------------------------------------ handling calls

  /**
   * @param {MethodContext} context
   * @param {unknown} params
   * @param {ApiCallback} callback
   * @returns {unknown}
   */
  call (context, params, callback) {
    const methodId = context.methodId;
    const methodMap = this.map;
    const methodList = methodMap.get(methodId);

    if (methodList == null) { return callback(errors.invalidMethod(methodId), null); }

    const tracing = context.tracing;
    const tags = context.username != null ? {} : { username: context.username };
    const apiSpanName = 'api:' + methodId;
    tracing.startSpan(apiSpanName, tags);

    const result = new Result({
      arrayLimit: RESULT_TO_OBJECT_MAX_ARRAY_SIZE,
      tracing
    });

    let unanmedCount = 0;
    async.forEachSeries(methodList, function (currentFn, next) {
      // -- Tracing by Function
      const fnName = 'fn:' + (currentFn.name || methodId + '.unamed' + unanmedCount++);
      tracing.startSpan(fnName, {}, apiSpanName);
      const nextCloseSpan = function (err) {
        if (err != null) tracing.setError(fnName, err);
        tracing.finishSpan(fnName);
        if (err != null) result.closeTracing(); // close open span for result that was left open
        next(err);
      };
      // ---

      try {
        currentFn(context, params, result, nextCloseSpan);
      } catch (err) {
        nextCloseSpan(err);
      }
    }, function (err) {
      if (err != null) {
        tracing.setError(apiSpanName, err);
        tracing.finishSpan(apiSpanName);
        return callback(err instanceof APIError ? err : errors.unexpectedError(err));
      }
      if (isAuditActive) {
        result.onEnd(async function () {
          await audit.validApiCall(context, result);
        });
      }
      tracing.finishSpan(apiSpanName);
      callback(null, result);
    });
  }

  // ----------------------------------------------------------- call statistics

  /**
   * @returns {string[]}
   */
  getMethodKeys () {
    const methodMap = this.map;
    return Array.from(methodMap.keys());
  }
}

module.exports = API;

/**
 * @param {string} idFilter
 * @param {string} id
 * @returns {boolean}
 */
function matches (idFilter, id) {
  // i.e. check whether the given id starts with the given filter without the
  // wildcard
  const filterWithoutWildcard = idFilter.slice(0, -1);
  return id.startsWith(filterWithoutWildcard);
}
