/**
 * @author manugarg@gmail.com (Manu Garg)
 */

/*
 * Directive for JSLint, so that it doesn't complain about these names not being
 * defined.
 */
/*global document, location, localStorage, alert, chrome, confirm */

"use strict";

var bgPage = chrome.extension.getBackgroundPage();

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
    var errMsg = 'There was an error in setting up sync. Click on "Show ' +
                 'debug info" for more information.'
    document.getElementById('error').innerHTML = errMsg;
    bgPage.debug.log(e);
    return;
  }
  bgPage.lastSyncStatus = '';
  location.reload();
}

function handleSyncButton() {
  var syncButton = document.getElementById('setup_sync');
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

function initUI() {
  if (localStorage.majorUpdate) {
    var errMsg = 'Note: Your sync has been disabled after the last major ' +
                 'update. Unfortunately, you will have to set it up again (click ' +
                 'on "Setup Sync"). Your exsiting data will not be affected.';
    document.getElementById('error').innerHTML = errMsg;
    localStorage.removeItem('majorUpdate');
  }
  var syncButton = document.getElementById('setup_sync');
  var authButton = document.getElementById('auth_button');
  var syncStatus = document.getElementById('sync_status');
  var syncNowButton = document.getElementById('sync_now');
  if (localStorage.gFile) {
    var gFile = bgPage.getRemoteFile();
    if (gFile && gFile.get('alternateLink')) {
      syncStatus.innerHTML = 'Syncing to <a href="' + gFile.get('alternateLink')
        + '">this file</a>. ';
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
  if (!localStorage.pagenotes) {
    document.getElementById('clear_local').disabled = true;
  }
  if (bgPage.lastSyncStatus === 'good') {
    var lastSyncTime = new Date(localStorage.lastSyncTime);
    var syncLast = Math.floor((new Date() - lastSyncTime) / 60000);
    syncStatus.innerHTML += 'Synced ' + (syncLast === 0 ?
        'less than a minute ago.' : syncLast + ' min ago.');
  } else {
    if (bgPage.lastSyncStatus) {
      var errMsg = 'There was an error during sync. Click on "Show ' +
                   'debug info" for more information.'
      document.getElementById('error').innerHTML = errMsg;
    }
  }
  if (localStorage.hasOwnProperty('nextAction') && localStorage.nextAction === 'setup_sync') {
    localStorage.nextAction = '';
    setupSync();
  }
}

function showHideDebugInfo() {
  var showDebugAnchor = document.getElementById('showdebug');
  if (showDebugAnchor.name === 'show') {
    var debugInfo = 'Messages from last sync: \n' + bgPage.debug.msg;
    document.getElementById('debug').innerHTML = debugInfo;
    showDebugAnchor.innerHTML = 'Hide debug info';
    showDebugAnchor.name = 'hide';
  } else {
    document.getElementById('debug').innerHTML = '';
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
  document.getElementById('setup_sync').addEventListener('click', handleSyncButton);
  document.getElementById('sync_now').addEventListener('click', syncNow);
  document.getElementById('showdebug').addEventListener('click', showHideDebugInfo);
});
