/*
 * Copyright 2012 Manu Garg.
 * @author manugarg@google.com (Manu Garg)
 
 * Directive for JSLint, so that it doesn't complain about these names not being
 * defined.
 */
/*global chrome, document, localStorage, window */

var bgPage = chrome.extension.getBackgroundPage();

// Global variable for selected tab.
var tab;
var notes;

function e(id) {
  return document.getElementById(id);
}

function enableEdit() {
  e('notes').className = 'editable';
  e('notes').focus();
  e('checkbox-div').style.display = 'block';
  moveCursorToTheEnd(e('notes'));
  e('edit').innerHTML = 'Save';
  // TODO(manugarg): May be replace Delete button with Cancel here.
}

function afterEdit() {
  e('notes').className = '';
  if (saveNotes()) {
    e('edit').innerHTML = 'Edit';
    window.close();
  }
}

function saveNotes() {
  e('warning').innerHTML = '';
  var data = e('notes').innerHTML.replace(/&nbsp;/gi, ' ').trim();
  // If encrypt is checked.
  var encrypted = false;
  if (e('encrypt').checked === true) {
    var pp = e('encrypt-passphrase').value.trim();
    if (pp === '') {
      e('warning').innerHTML = 'Passphrase cannot be empty.';
      enableEdit();
      return 0;
    }
    var vp = e('verify-passphrase').value.trim();
    if (pp !== vp) {
      e('warning').innerHTML = 'Passphrases don\'t match.';
      enableEdit();
      return 0;
    }
    // Try to encrypt now
    var enc = bgPage.CryptoJS.AES.encrypt(data, pp);
    data = enc.toString();
    encrypted = true;
  }
  notes = [data, new Date(), encrypted];
  if (e('sitelevel').checked === false) {
    bgPage.pageNotes.setNotesObj(tab.url, notes);
  } else {
    bgPage.pageNotes.remove(tab.url);
    bgPage.pageNotes.setNotesObj(tab.host(), notes);
  }
  bgPage.updateBadgeForTab(tab);
  localStorage.lastModTime = new Date().getTime();
  return 1;
}

function handleDecrypt() {
  e('warning').innerHTML = '';
  var pp = e('decrypt-passphrase').value;
  if (pp === '') {
    // Prompt for decrypt passphrase if not prompted already
    if (e('decrypt-passphrase-div').style.display === 'none') {
      e('decrypt-passphrase-div').style.display = 'block';
      return;
    }
    e('warning').innerHTML = 'Decrypt passphrase cannot be empty.';
    return;
  }
  //	var data = e('notes').innerHTML.trim();
  var decrypted = bgPage.CryptoJS.AES.decrypt(notes[0], pp).toString(bgPage.CryptoJS.enc.Utf8);
  if (decrypted === '') {
    e('warning').innerHTML = 'Wrong passphrase.';
    return;
  }
  e('notes').innerHTML = decrypted;
  e('decrypt-passphrase-div').style.display = 'none';
  e('edit').innerHTML = 'Edit';
  e('encrypt').checked = true;
  e('encrypt-passphrase-div').style.display = 'block';
  e('encrypt-passphrase').value = pp;
  e('verify-passphrase').value = pp;
}

function setupEditButtonHandler() {
  e('edit').addEventListener('click', function() {
    if (e('edit').innerHTML.trim() === 'Save') {
      // Save has been clicked.
      afterEdit();
    } else if (e('edit').innerHTML.trim() === 'Edit') {
      // Edit has been clicked.
      enableEdit();
      var enable_enc = bgPage.options.get('enable_encryption');
      if ((typeof enable_enc === 'undefined' || !enable_enc) && e('encrypt').checked === false) {
        e('encryption-option').style.display = 'none';
      }
    } else if (e('edit').innerHTML.trim() === 'Decrypt') {
      handleDecrypt();
    }
  }, true);
  e('encrypt').addEventListener('click', function() {
    if (e('encrypt').checked === true) {
      e('encrypt-passphrase-div').style.display = 'block';
    } else {
      e('encrypt-passphrase-div').style.display = 'none';
    }
  }, true);
}

function fixDeleteButton(key) {
  if (key === '') {
    e('delete').disabled = true;
    return;
  }
  var callback = function() {
    bgPage.updateBadgeForTab(tab);
    window.close();
  };
  e('control-div').replaceChild(
    bgPage.deleteButton(
      'Delete', key, callback,
      'Are you sure you want to delete notes for this page? '),
    e('delete'));
}

function updatePopUpForTab(currentTab) {
  tab = currentTab;
  tab.host = function() {
    return bgPage.getHostFromUrl(tab.url);
  };
  // Get notes for the current tab and display.
  var key = tab.url;
  notes = bgPage.pageNotes.getNotesObj(key);
  if (!notes) {
    key = tab.host();
    notes = bgPage.pageNotes.getNotesObj(key);
    if (notes) {
      e('sitelevel').checked = true;
    }
  }

  if (!notes) {
    enableEdit();
  } else {
    if (notes.length >= 3 && notes[2]) {
      e('notes').innerHTML = '***************';
      e('edit').innerHTML = 'Decrypt';
    } else {
      e('notes').innerHTML = notes[0];
    }
  }

  fixDeleteButton(key);
  if (!localStorage.gFile) {
    document.getElementById("setup-sync").style.visibility = "";
  }
}

// Based on this response on stackoverflow:
// http://stackoverflow.com/questions/1125292/how-to-move-cursor-to-end-of-contenteditable-entity/3866442#3866442

function moveCursorToTheEnd(element) {
  var range = document.createRange(); // Create a range (a range is a like the selection but invisible)
  range.selectNodeContents(element); // Select the entire contents of the element with the range
  range.collapse(false); // collapse the range to the end point. false means collapse to end rather than the start
  var sel = window.getSelection(); // get the selection object (allows you to change selection)
  sel.removeAllRanges(); // remove any selections already made
  sel.addRange(range); // make the range you have just created the visible selection
}

window.setTimeout(function() {
  e('sitelevel').blur();
}, 100);

document.addEventListener('DOMContentLoaded', function() {
  setupEditButtonHandler();
  chrome.tabs.getSelected(null, updatePopUpForTab);
});
