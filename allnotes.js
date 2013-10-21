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
var pageNotes = {};
var tagIndex = {};

function extractTags(text) {
  // Hack to get a clean plain text string from HTML
  var t = $.parseHTML(text).map(function(x) {
    return $('<div>').html(x).text()
  }).join(' ');
  return t.replace(/(\n|\t)+/g, ' ').split(' ').filter(function(x) { return x.match(/^#/); });
}

function markupTagsInNotes(notes) {
  var tags = extractTags(notes);
  for (var j = 0; j < tags.length; j++) {
    var tag = tags[j];
    var tagClass = 'tag-link';
    if (tag === window.location.hash) tagClass += ' selected-tag';
    notes = notes.replace(tag, '<a class="' + tagClass + '" href="">' + tag + '</a>');
  }
  return notes;
}

var reload = function() {
  location.reload();
};

function initPage() {
  pageNotes = new PageNotes().getAll();
  for (var i in pageNotes) {
    if (typeof pageNotes[i] === "string") { // old format
      break;
    }
    else {                                  // new format
      pageNotes[i] = pageNotes[i][0];
    }
  }
  buildTagCloud();
  
  $('#all-notes').html('');
  var allNotesDiv = document.getElementById('all-notes');
  var table = document.createElement('table');
  allNotesDiv.appendChild(table);
  table.className = 'tablesorter';
  table.id = 'notesTable';

  // Header row
  $(table).append('<thead><tr><th>WebPage</th><th width=160px;>Last Modified</th><th>Notes</th><th width=120px>&nbsp;</th></tr></thead>');
  var tbody = document.createElement('tbody');
  table.appendChild(tbody);
  
  var keys = [];
  $.each(pageNotes, function(key, value) {
    if (window.location.hash === '') keys.push(key);
    else {
      if (tagIndex[window.location.hash].indexOf(key) != -1) keys.push(key);
    }
  });
  keys.sort();
  
  for (var i = 0; i < keys.length; i++) {
    var row = document.createElement('tr');
    tbody.appendChild(row);

    var cell1 = document.createElement('td');
    cell1.className = 'url';
    var link = document.createElement('a');
    link.href = keys[i];
    if (link.protocol == 'chrome-extension:') {
      link.href = 'http://' + keys[i];
    }
    link.innerHTML = keys[i];
    cell1.appendChild(link);
    row.appendChild(cell1);

    var cell2 = document.createElement('td');
    cell2.className = 'date';
    var date_div = document.createElement('div');
    var date = new Date(pageNotes[keys[i]][1]).toLocaleString();
    date_div.innerHTML = date;
    $(date_div).addClass('date-div');
    cell2.appendChild(date_div);
    row.appendChild(cell2);
    
    var cell3 = document.createElement('td');
    cell3.className = 'notes';
    var notes_div = document.createElement('div');
    var notes = pageNotes[keys[i]][0];
    notes_div.innerHTML = markupTagsInNotes(notes);
    $(notes_div).addClass('notes-div');
    cell3.appendChild(notes_div);
    row.appendChild(cell3);


    var cell4 = document.createElement('td');
    cell4.className = 'button';
    var editB = document.createElement('button');
    editB.innerHTML = 'Edit';
    editB.className = 'editB';
    var deleteB = bgPage.deleteButton('Delete', keys[i], reload, 'Are you sure you want to delete these notes? ');
    cell4.appendChild(editB);
    cell4.appendChild(deleteB);
    row.appendChild(cell4);
  }
  $('div#all-notes').on('click', 'button.editB', Edit);
  $('div#all-notes').on('click', 'button.saveB', Save);
  $('div#all-notes').on('click', 'button.cancelB', Cancel);
  $('#notesTable').tablesorter({
    theme: 'default',
    headerTemplate: '{content}{icon}',
    headers: {
      // disable sorting of the first column (we start counting at zero)
      3: { sorter: false }
    },
    sortList: [[0,0], [1,1]]
  });
}

function Edit(e) {
  var par = $(this).parent().parent(); //tr
  var tdURL = par.children('td:nth-child(1)').children('a:nth-child(1)').html();
  // Open notes div for editing
  var divNotes = par.find('.notes-div');
  divNotes.html(pageNotes[tdURL][0]);
  divNotes.addClass('editable');
  divNotes.focus();
  moveCursorToTheEnd(divNotes.get(0));
  // Change button text and behavior
  $(this).html('Save');
  $(this).removeClass().addClass('saveB');
  var cancelB = document.createElement('button');
  $(cancelB).html('Cancel');
  $(cancelB).removeClass().addClass('cancelB');
  // Replace Delete button with Cancel button
  par.find('.deleteB').replaceWith($(cancelB));
}

function Cancel() {
  var par = $(this).parent().parent(); //tr
  var tdURL = par.children('td:nth-child(1)').children('a:nth-child(1)').html();
  var divNotes = par.find('.notes-div');
  var editSaveButton = par.find('.saveB');
  divNotes.html(pageNotes[tdURL][0]);
  divNotes.removeClass('editable');
  // Change button text and behavior
  editSaveButton.html('Edit');
  editSaveButton.removeClass().addClass('editB');
  // Replace Cancel button with Delete button
  var deleteB = bgPage.deleteButton('Delete', tdURL, reload, 'Are you sure you want to delete these notes? ');
  $(this).replaceWith($(deleteB));
  }

function Save(e) {
  var par = $(this).parent().parent(); //tr
  var tdURL = par.children('td:nth-child(1)').children('a:nth-child(1)').html();
  var divNotes = par.find('.notes-div');
  divNotes.removeClass('editable');
  divNotes.css('color', '#111');
  // Update notes in the database
  new PageNotes().set(tdURL, divNotes.html());
  localStorage.lastModTime = new Date().getTime();
  // Change button text and behavior
  $(this).html('Edit');
  $(this).removeClass().addClass('editB');
  location.reload();
}

function buildTagIndex() {
  for (var key in pageNotes) {
    var tags = extractTags(pageNotes[key][0]);
    if (tags) {
      for (var i = 0; i < tags.length; i++) {
        if (!(tags[i] in tagIndex)) {
          tagIndex[tags[i]] = [];
        }
        if (tagIndex[tags[i]].indexOf(key) === -1) {
          tagIndex[tags[i]].push(key);
        }
      }
    }
  }
}

function buildTagCloud() {
  // Build tagIndex first
  buildTagIndex();
  var tags = [];
  for (var key in tagIndex) {
    tags.push({
      'key': key,
      'value': tagIndex[key].length
    });
  }
  tags.sort(function(a, b) {
    if (a.value > b.value) return -1;
    if (a.value < b.value) return 1;
    if (a.key > b.key ) return 1;
    if (a.key < b.key ) return -1;
    return 0;
  });
  
  $('#tag-cloud').html('');
  $('#tag-cloud').append('<li><a class="tag-link" href="">All</a></li>');
  for (var i = 0; i < tags.length; i++) {
    if (window.location.hash === tags[i].key) {
      $('#tag-cloud').append('<li><a class="tag-link selected-tag" href="">' + tags[i].key + '(' + tags[i].value +')</a></li>');
    } else {
      $('#tag-cloud').append('<li><a class="tag-link" href="">' + tags[i].key + '(' + tags[i].value + ')' + '</a></li>');
    }
  }
}

$(document).on('click', '.tag-link', function() {
  var tag = $(this).html();
  // Remove the count number from the tag
  if (tag.match(/(.*)\([0-9]+\)/)) {
    tag = tag.match(/(.*)\([0-9]+\)/)[1];
  }
  if($(this).attr('class').indexOf('selected-tag') == -1) {
    window.location.hash = tag;
  } else {
    window.location.hash = '';
  }
  initPage();
  return false;
});

// Based on this response on stackoverflow:
// http://stackoverflow.com/questions/1125292/how-to-move-cursor-to-end-of-contenteditable-entity/3866442#3866442
function moveCursorToTheEnd(element) {
  var range = document.createRange(); // Create a range (a range is a like the selection but invisible)
  range.selectNodeContents(element);  // Select the entire contents of the element with the range
  range.collapse(false);              // collapse the range to the end point. false means collapse to end rather than the start
  var sel = window.getSelection();    // get the selection object (allows you to change selection)
  sel.removeAllRanges();              // remove any selections already made
  sel.addRange(range);                // make the range you have just created the visible selection
}

document.addEventListener('DOMContentLoaded', function() {
  initPage();
});
