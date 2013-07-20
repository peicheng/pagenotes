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
var pageNotes = new PageNotes();
var tagIndex = new TagIndex().get();
if ($.isEmptyObject(tagIndex)) {
  pageNotes.buildTagIndex();
}

var reload = function() {
  location.reload();
};

function initPage() {
  buildTagCloud();
  
  $('#all-notes').html('');
  var allNotesDiv = document.getElementById('all-notes');
  var table = document.createElement('table');

  // Header row
  $(table).append('<tr><th>WebPage</th><th>Notes</th><th>Action</th></tr>');
  
  var keys = [];
  $.each(pageNotes.get(), function(key, value) {
    if (window.location.hash === '') keys.push(key);
    else {
      var tag = window.location.hash;
      if (tagIndex[tag].indexOf(key) != -1) keys.push(key);
    }
  });
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
    notes_div.innerHTML = pageNotes.get(keys[i]);
    $(notes_div).addClass('notes-div');
    cell2.appendChild(notes_div);
    row.appendChild(cell2);

    var cell3 = document.createElement('td');
    var editB = document.createElement('button');
    editB.innerHTML = 'Edit';
    editB.className = 'editB';
    var deleteB = bgPage.deleteButton('Delete', keys[i], reload, 'Are you sure you want to delete these notes? ');
    cell3.appendChild(editB);
    cell3.appendChild(deleteB);
    row.appendChild(cell3);

    table.appendChild(row);
  }
  allNotesDiv.appendChild(table);
  $('div#all-notes').on('click', 'button.editB', Edit);
  $('div#all-notes').on('click', 'button.saveB', Save);
  $('div#all-notes').on('click', 'button.cancelB', Cancel);
}

function Edit(e) {
  var par = $(this).parent().parent(); //tr
  // Open notes div for editing
  var divNotes = par.find('.notes-div');
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
  divNotes.html(pageNotes.get(tdURL));
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
  pageNotes.set(tdURL, divNotes.html());
  localStorage.lastModTime = new Date().getTime();
  // Change button text and behavior
  $(this).html('Edit');
  $(this).removeClass().addClass('editB');
  location.reload();
}

function buildTagCloud() { 
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
    return 0;
  });
  
  $('#tag-cloud').html('');
  $('#tag-cloud').html('<b>Tags: </b>')
  $('#tag-cloud').append('<a class="tag-link" href="">All</a>');
  for (var i = 0; i < tags.length; i++) {
    if (window.location.hash === tags[i].key) {
      $('#tag-cloud').append('<span class="selected-tag">' + tags[i].key + '(' + tags[i].value +')</span>');
    } else {
      $('#tag-cloud').append('<a class="tag-link" href="">' + tags[i].key + '(' + tags[i].value + ')' + '</a>');
    }
  }
  
  $('#tag-cloud').on('click', '.tag-link', function() {
    var tag = $(this).html().match(/(.*)\([0-9]+\)/)[1];
    window.location.hash = tag;
    initPage();
    return false;
  })
}

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
