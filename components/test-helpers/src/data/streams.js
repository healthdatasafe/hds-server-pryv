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
const timestamp = require('unix-timestamp');
const { TAG_ROOT_STREAMID, TAG_PREFIX } = require('api-server/src/methods/helpers/backwardCompatibility');

module.exports = [
  {
    id: 's_0',
    name: 'Root Stream 0',
    parentId: null,
    created: timestamp.now(),
    createdBy: 'test',
    modified: timestamp.now(),
    modifiedBy: 'test',
    children: [
      {
        id: 's_0_0',
        name: 'Child Stream 0.0',
        parentId: 's_0',
        created: timestamp.now(),
        createdBy: 'test',
        modified: timestamp.now(),
        modifiedBy: 'test',
        children: []
      },
      {
        id: 's_0_1',
        name: 'Child Stream 0.1',
        parentId: 's_0',
        created: timestamp.now(),
        createdBy: 'test',
        modified: timestamp.now(),
        modifiedBy: 'test',
        children: []
      }
    ]
  },
  {
    id: 's_1',
    name: 'Root Stream 1',
    parentId: null,
    clientData: {
      stringProp: 'O Brother',
      numberProp: 1
    },
    created: timestamp.now(),
    createdBy: 'test',
    modified: timestamp.now(),
    modifiedBy: 'test',
    children: [
      {
        id: 's_1_0',
        name: 'Child Stream 1.0',
        parentId: 's_1',
        created: timestamp.now(),
        createdBy: 'test',
        modified: timestamp.now(),
        modifiedBy: 'test',
        children: []
      }
    ]
  },
  {
    id: 's_2',
    name: 'Root Stream 2',
    parentId: null,
    created: timestamp.now(),
    createdBy: 'test',
    modified: timestamp.now(),
    modifiedBy: 'test',
    children: [
      {
        id: 's_2_0',
        name: 'Child Stream 2.0 (trashed)',
        parentId: 's_2',
        trashed: true,
        created: timestamp.now(),
        createdBy: 'test',
        modified: timestamp.now(),
        modifiedBy: 'test',
        children: [
          {
            id: 's_2_0_0',
            name: 'Child Stream 2.0.0',
            parentId: 's_2_0',
            created: timestamp.now(),
            createdBy: 'test',
            modified: timestamp.now(),
            modifiedBy: 'test',
            children: []
          }
        ]
      },
      {
        id: 's_2_1',
        name: 'Child Stream 2.1',
        parentId: 's_2',
        created: timestamp.now(),
        createdBy: 'test',
        modified: timestamp.now(),
        modifiedBy: 'test',
        children: [
          {
            id: 's_2_1_0',
            name: 'Child Stream 2.1.0',
            parentId: 's_2_1',
            created: timestamp.now(),
            createdBy: 'test',
            modified: timestamp.now(),
            modifiedBy: 'test',
            children: []
          }
        ]
      }
    ]
  },
  {
    id: 's_3',
    name: 'Root Stream 3 (trashed)',
    parentId: null,
    trashed: true,
    created: timestamp.now(),
    createdBy: 'test',
    modified: timestamp.now(),
    modifiedBy: 'test',
    children: [
      {
        id: 's_3_0',
        name: 'Child Stream 3.0',
        parentId: 's_3',
        created: timestamp.now(),
        createdBy: 'test',
        modified: timestamp.now(),
        modifiedBy: 'test',
        children: []
      }
    ]
  },
  // deletions
  {
    id: 's_4',
    deleted: timestamp.now('-5m')
  },
  {
    id: 's_5',
    deleted: timestamp.now('-1d')
  },
  {
    id: 's_6',
    deleted: timestamp.now('-2y') // to be cleaned up by Mongo TTL
  },
  // auditing
  {
    id: 's_7',
    name: 'Root Stream 7 - for auditing',
    parentId: null,
    created: timestamp.now('-10h'),
    createdBy: 'test',
    modified: timestamp.now('-10h'),
    modifiedBy: 'test',
    children: [
      {
        id: 's_7_0',
        name: 'Child Stream 7.0, event is trashed, used for merge on delete',
        parentId: 's_7',
        trashed: true,
        created: timestamp.now(),
        createdBy: 'test',
        modified: timestamp.now(),
        modifiedBy: 'test',
        children: []
      }
    ]
  },
  {
    id: 's_8',
    name: 'Root Stream 8 - for auditing',
    parentId: null,
    created: timestamp.now('-10h'),
    createdBy: 'test',
    modified: timestamp.now('-10h'),
    modifiedBy: 'test',
    children: []
  },
  // migrated tags
  {
    id: TAG_ROOT_STREAMID,
    name: 'Tags Migrated',
    parentId: null,
    created: timestamp.now(),
    createdBy: 'test',
    modified: timestamp.now(),
    modifiedBy: 'test',
    children: [
      {
        id: TAG_PREFIX + 'cali',
        name: 'cali',
        parentId: TAG_ROOT_STREAMID,
        created: 1632320812.196,
        createdBy: 'test',
        modified: 1632320812.196,
        modifiedBy: 'test',
        children: []
      },
      {
        id: TAG_PREFIX + 'docious',
        name: 'docious',
        parentId: TAG_ROOT_STREAMID,
        created: 1632320812.196,
        createdBy: 'test',
        modified: 1632320812.196,
        modifiedBy: 'test',
        children: []
      },
      {
        id: TAG_PREFIX + 'expiali',
        name: 'expiali',
        parentId: TAG_ROOT_STREAMID,
        created: 1632320812.196,
        createdBy: 'test',
        modified: 1632320812.196,
        modifiedBy: 'test',
        children: []
      },
      {
        id: TAG_PREFIX + 'fragilistic',
        name: 'fragilistic',
        parentId: TAG_ROOT_STREAMID,
        created: 1632320812.196,
        createdBy: 'test',
        modified: 1632320812.196,
        modifiedBy: 'test',
        children: []
      },
      {
        id: TAG_PREFIX + 'super',
        name: 'super',
        parentId: TAG_ROOT_STREAMID,
        created: 1632320812.196,
        createdBy: 'test',
        modified: 1632320812.196,
        modifiedBy: 'test',
        children: []
      }
    ]
  }
];
