/**
 * @license
 * Copyright (C) 2020–2023 Pryv S.A. https://pryv.com
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
 * JSON Schema specification of methods data for event streams.
 */

const Action = require('./Action');
const stream = require('./stream');
const itemDeletion = require('./itemDeletion');
const helpers = require('./helpers');
const object = helpers.object;
const array = helpers.array;
const string = helpers.string;
const number = helpers.number;
const boolean = helpers.boolean;

const updatedEvent = helpers.object({
  id: helpers.string(),
  action: helpers.string()
}, {
  id: 'updatedEvent',
  required: ['id', 'action'],
  additionalProperties: false
});

module.exports = {
  get: {
    params: object({
      parentId: string(),
      state: string({ enum: ['default', 'all'] }),
      includeDeletionsSince: number()
    }),
    result: object({
      streams: array({ $ref: '#/definitions/stream' }),
      eventDeletions: array(itemDeletion)
    }, {
      definitions: {
        // TODO: clean this schema $ref thing up
        stream: stream(Action.READ, false, '#/definitions/stream')
      },
      required: ['streams']
    })
  },

  create: {
    params: stream(Action.CREATE),
    result: object({
      stream: stream(Action.READ, true)
    }, {
      required: ['stream'],
      additionalProperties: false
    })
  },

  update: {
    params: object({
      // in path for HTTP requests
      id: string(),
      // = body of HTTP requests
      update: { $ref: '#/definitions/stream' }
    }, {
      definitions: {
        // TODO: clean this schema $ref thing up
        stream: stream(Action.UPDATE, false, '#/definitions/stream')
      },
      required: ['id', 'update']
    }),
    result: object({
      stream: stream(Action.READ, true)
    }, {
      required: ['stream'],
      additionalProperties: false
    })
  },

  del: {
    params: object({
      // in path for HTTP requests
      id: string(),
      // in query string for HTTP requests
      mergeEventsWithParent: boolean()
    }, {
      required: ['id']
    }),
    result: {
      anyOf: [
        object({ stream: stream(Action.READ, true) }, {
          required: ['stream'],
          additionalProperties: false
        }),
        object({ streamDeletion: itemDeletion, updatedEvents: array(updatedEvent) }, {
          required: ['streamDeletion'],
          additionalProperties: false
        })
      ]
    }
  }
};
