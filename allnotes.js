/*
 * Copyright 2012 Google Inc. All Rights Reserved.
 * @author manugarg@google.com (Manu Garg)

 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *

 * Directive for JSLint, so that it doesn't complain about these names not being
 * defined.
 */
/*global document, location, localStorage, alert, chrome, confirm */

var bgPage = chrome.extension.getBackgroundPage();

var reload = function () {
  location.reload();
};

function initPage() {
  var allNotesDiv = document.getElementById('all-notes');
  var allPageNotes = bgPage.pageNotes.get();
  var table = document.createElement('table');
  var keys = [];
  for (var key in allPageNotes) {
    keys.push(key);
  }
  keys.sort();
  for (var i = 0; i < keys.length; i++) {
    var row = document.createElement('tr');

    var cell1 = document.createElement('td');
    var link = document.createElement('a');
    link.href = keys[i];
    if (link.protocol == 'chrome-extension:') {
      link.href = 'http://' + keys[i];
    }
    link.innerHTML = keys[i];
    cell1.appendChild(link);
    row.appendChild(cell1);

    var cell2 = document.createElement('td');
    cell2.innerHTML = allPageNotes[keys[i]];
    row.appendChild(cell2);

    var cell3 = document.createElement('td');
    var b = bgPage.deleteButton('Delete', keys[i], reload,
				'Are you sure you want to delete these notes? ');
    cell3.appendChild(b);
    row.appendChild(cell3);
    
    table.appendChild(row);
  }
  allNotesDiv.appendChild(table);
}

document.addEventListener('DOMContentLoaded', function () {
  initPage();
});
