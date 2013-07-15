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

  // Create header row
  var header = document.createElement('tr');
  var th = document.createElement('th');
  th.innerHTML = 'WebPage';
  header.appendChild(th);
  th = document.createElement('th');
  th.innerHTML = 'Notes';
  header.appendChild(th);
  th = document.createElement('th');
  th.innerHTML = 'Action';
  header.appendChild(th);
  table.appendChild(header);

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
    var notes_div = document.createElement('div');
    notes_div.innerHTML = allPageNotes[keys[i]];
    cell2.appendChild(notes_div);
    row.appendChild(cell2);

    var cell3 = document.createElement('td');
    var editB = document.createElement('button');
    editB.innerHTML = 'Edit';
    editB.className = 'editB';
    var deleteB = bgPage.deleteButton('Delete', keys[i], reload,
				'Are you sure you want to delete these notes? ');
    cell3.appendChild(editB);
    cell3.appendChild(deleteB);
    row.appendChild(cell3);
    
    table.appendChild(row);
  }
  allNotesDiv.appendChild(table);
  $('.editB').bind('click', Edit);
}

function Edit() {
    var par = $(this).parent().parent(); //tr
    // Open notes div for editing
    var divNotes = par.children('td:nth-child(2)').children('div:nth-child(1)');
    divNotes.attr('contentEditable', true);
    divNotes.css('color', '#000');
    divNotes.focus();
    // Change button text and behavior
    this.innerHTML = 'Save';
    this.className = 'saveB';
    $('.saveB').bind('click', Save);
}

function Save() {
    var par = $(this).parent().parent(); //tr
    var tdURL = par.children('td:nth-child(1)').children('a:nth-child(1)').html();
    var divNotes = par.children('td:nth-child(2)').children('div:nth-child(1)');
    divNotes.attr('contentEditable', false);
    divNotes.css('color', '#111');
    // Update notes in the database
    bgPage.pageNotes.set(tdURL, divNotes.html());
    localStorage.lastModTime = new Date().getTime();
    // Change button text and behavior
    this.innerHTML = 'Edit';
    this.className = 'editB';
    $('.editB').bind('click', Edit);
}

document.addEventListener('DOMContentLoaded', function () {
  initPage();
});
