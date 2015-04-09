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

"use strict";

var bgPage = chrome.extension.getBackgroundPage();

function e(id) {
  return document.getElementById(id);
}

function notify(msg) {
    e('error').innerHTML = msg;
}

function setupSync() {
  // Clear debug log.
  bgPage.debug.msg = '';
  try {
    if (!bgPage.oauth || !bgPage.oauth.hasAccessToken()) {
      if (!confirm('You\'ll be redirected to Google website to set ' +
                  'up authentication.')) {
        return;
      }
      localStorage.nextAction = 'setup_sync';
      if (!bgPage.oauth) {
        bgPage.setUpOauth();
      }
      bgPage.oauth.authorize(function () { location.reload(); });
      return;
    }
    if (!localStorage.gFile) {
      var gFile = new bgPage.GoogleFile(null, bgPage.saveGFile);
      gFile.searchFileByName(bgPage.REMOTE_FILE_NAME);
      if (!localStorage.gFile) {
        gFile.createNewFile(bgPage.REMOTE_FILE_NAME);
        localStorage.lastModTime = new Date().getTime();
      }
    }
  } catch (e) {
    notify('There was an error in setting up sync. Click on "Show debug info" ' +
           'for more information.');
    bgPage.debug.log(e);
    return;
  }
  bgPage.lastSyncStatus = '';
  localStorage.firstSync = 'true';
  location.reload();
}

function handleSyncButton() {
  var syncButton = e('setup_sync');
  if (syncButton.name === 'cancel_sync') {
    if (confirm('Are you sure you want to clear the sync setup?')) {
      localStorage.removeItem('gFile');
      bgPage.oauth.clearAccessToken();
      bgPage.lastSyncStatus = '';
      location.reload();
    }
  } else {
    setupSync();
  }
}

function clearLocalData() {
  if (confirm('Are you sure you want to delete all local data?')) {
    localStorage.removeItem('pagenotes');
    location.reload();
  }
}

function updateFeatureButtons()  {
  var options_keys = [];
  var els = document.getElementsByClassName('feature_option');
  for (var i=0; i < els.length; i++) {
    options_keys.push(els[i].id);
  }
  options_keys.forEach(function(key) {
    var stored_value = bgPage.options.get(key);
    if (typeof stored_value != 'undefined') {
      e(key).checked = stored_value;
    }
    e(key).addEventListener('change', function() {
      bgPage.options.set(key, e(key).checked);
    });
  });
}

function initUI() {
  updateFeatureButtons();
  if (localStorage.majorUpdate) {
    notify('Note: Your sync has been disabled after the last major update. ' +
           'Unfortunately, you will have to set it up again (click on ' +
           '"Setup Sync"). Your existing data will not be lost.');
    localStorage.removeItem('majorUpdate');
  }
  var syncButton = e('setup_sync');
  var authButton = e('auth_button');
  var syncStatus = e('sync_status');
  var syncNowButton = e('sync_now');
  if (localStorage.gFile) {
    var gFile = bgPage.getRemoteFile();
    if (gFile && gFile.get('alternateLink')) {
      syncStatus.innerHTML = 'Syncing to <a href="' +
                             gFile.get('alternateLink') + '">this file</a>. ';
    }
    syncButton.innerHTML = 'Stop Syncing';
    syncButton.name = 'cancel_sync';
    syncNowButton.disabled = false;
  } else {
    syncStatus.innerHTML = 'Not syncing now. ';
    syncButton.innerHTML = 'Setup Sync';
    syncButton.name = 'setup_sync';
    syncNowButton.disabled = true;
    bgPage.lastSyncStatus = '';
  }
  if (!bgPage.pageNotes.getSource()) {
    e('clear_local').disabled = true;
  }
  if (bgPage.lastSyncStatus === 'good') {
    var lastSyncTime = new Date(localStorage.lastSyncTime);
    var syncLast = Math.floor((new Date() - lastSyncTime) / 60000);
    syncStatus.innerHTML += 'Synced ' + (syncLast === 0 ?
        'less than a minute ago.' : syncLast + ' min ago.');
  } else {
    if (bgPage.lastSyncStatus) {
      notify('There was an error during sync. Click on "Show debug info" for ' + 
             'more information.');
    }
  }
  if (localStorage.hasOwnProperty('nextAction') && localStorage.nextAction === 'setup_sync') {
    localStorage.nextAction = '';
    setupSync();
  }
}

function showHideDebugInfo() {
  var showDebugAnchor = e('showdebug');
  if (showDebugAnchor.name === 'show') {
    var debugInfo = 'Messages from last sync: \n' + bgPage.debug.msg;
    e('debug').innerHTML = debugInfo;
    showDebugAnchor.innerHTML = 'Hide debug info';
    showDebugAnchor.name = 'hide';
  } else {
    e('debug').innerHTML = '';
    showDebugAnchor.innerHTML = 'Show debug info';
    showDebugAnchor.name = 'show';
  }
}

function syncNow() {
  bgPage.sync();
  location.reload();
}

document.addEventListener('DOMContentLoaded', function () {
  initUI();
  e('setup_sync').addEventListener('click', handleSyncButton);
  e('sync_now').addEventListener('click', syncNow);
  e('showdebug').addEventListener('click', showHideDebugInfo);
  e('clear_local').addEventListener('click', clearLocalData);
});
