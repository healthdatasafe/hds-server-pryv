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
const winston = require('winston');

// setup logging levels (match logging methods below)
const levels = Object.freeze({
  debug: 3,
  info: 2,
  warn: 1,
  error: 0
});
winston.setLevels(levels);
winston.addColors({
  debug: 'blue',
  info: 'green',
  warn: 'yellow',
  error: 'red'
});

/**
 * Returns a logging singleton providing component-specific loggers.
 * (I.e. wrapper around Winston prefixing log messages with per-component prefixes.)
 *
 * @param logsSettings
 */
module.exports = function (logsSettings) {
  // apply settings

  // (console transport is present by default)
  let consoleSettings = winston['default'].transports.console;
  consoleSettings.silent = ! logsSettings.console.active;
  if (logsSettings.console.active) {
    consoleSettings.level = logsSettings.console.level;
    consoleSettings.colorize = logsSettings.console.colorize;
    consoleSettings.timestamp = logsSettings.console.timestamp || true;
  }
  if (winston['default'].transports.file) {
    // in production env it seems winston already includes a file transport...
    winston.remove(winston.transports.File);
  }
  if (logsSettings.file.active) {
    winston.add(winston.transports.File, {
      level: logsSettings.file.level,
      filename: logsSettings.file.path,
      maxsize: logsSettings.file.maxFileBytes,
      maxFiles: logsSettings.file.maxNbFiles,
      timestamp: true,
      json: false
    });
  }

  // return singleton

  var loggers = new Map(),
      prefix = logsSettings.prefix;
  return {
    /**
     * Returns a logger for the given component. Keeps track of initialized
     * loggers to only use one logger per component name.
     *
     * @param {String} componentName
     */
    getLogger: function (componentName) {
      const context = prefix + componentName;
      
      // Return memoized instance if we have produced it before.
      const existingLogger = loggers.get(context);
      if (existingLogger) return existingLogger;
      
      // Construct a new instance. We're passing winston as a logger here. 
      const logger = new LoggerImpl(context, winston);
      loggers.set(context, logger);
      
      return logger; 
    }, 
  };
};

class LoggerImpl {
  
  /**
   * Creates a new logger for the§ given component.
   *
   * @param {String} context
   * @constructor
   */
  constructor(context, winstonLogger) {
    this.messagePrefix = context ? '[' + context + '] ' : '';
    this.winstonLogger = winstonLogger;
  }
  
  debug(msg, metaData) {
    this.log('debug', msg, metaData);
  }
  info(msg, metaData) {
    this.log('info', msg, metaData);
  }
  warn(msg, metaData) {
    this.log('warn', msg, metaData);
  }
  error(msg, metaData) {
    this.log('error', msg, metaData);
  }
  
  log(level, message, metaData) {
    const msg = this.messagePrefix + message;
    const meta = metaData ? JSON.stringify(metaData) : {};
    
    this.winstonLogger[level](msg, meta);
  }
}