var bgPage = chrome.extension.getBackgroundPage();

function setupSync() {
  try {
    if(!bgPage.oauth || !bgPage.oauth.hasAccessToken()) {
      if(!confirm('You\'ll be redirected to Google website to set '+
                  'up authentication.')){
        return;
      }
      localStorage.nextAction = 'setup_sync';
      if (!bgPage.oauth) {
        bgPage.setUpOauth();
      }
      bgPage.oauth.authorize(function(){location.reload()});
      return;
    }
    if(!localStorage.gFile) {
      gFile = new bgPage.GoogleFile(null, function(gFile){
          localStorage.gFile = gFile;
        });
      gFile.searchFileByName(bgPage.REMOTE_DOC_NAME);
      if(!localStorage.gFile) {
        gFile.createNewFile(bgPage.REMOTE_DOC_NAME);
        localStorage.lastModTime = new Date().getTime();
      }
    }
  } catch (e) {
    alert(e);
  }
  bgPage.lastSyncStatus = '';
  location.reload();
}

function handleSyncButton() {
  syncButton = document.getElementById('sync_button');
  if (syncButton.name === 'cancel_sync') {
    if (confirm('Are you sure you want to clear the sync setup?')) {
      localStorage.removeItem('gFile');
      bgPage.oauth.clearTokens();
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
  var syncButton = document.getElementById('sync_button');
  var authButton = document.getElementById('auth_button');
  var syncStatus = document.getElementById('sync_status');
  if (localStorage.gFile) {
    var gFile = bgPage.getRemoteFile().getEntry();
    if (gFile && gFile.alternateLink) {
      syncStatus.innerHTML = 'Syncing to <a href="' + gFile.alternateLink
        + '">this file</a>. ';
    }
    syncButton.innerHTML = 'Stop Syncing';
    syncButton.name = 'cancel_sync';
  } else {
    syncStatus.innerHTML = 'Not syncing now. '
    syncButton.innerHTML = 'Setup Sync';
    syncButton.name = 'setup_sync';
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
      syncStatus.innerHTML += 'There was a problem in syncing. Look at' +
                              ' debug info for more details.';
    }
  }
  if ('nextAction' in localStorage && localStorage.nextAction === 'setup_sync') {
    localStorage.nextAction = '';
    setupSync();
  }
}

function showHideDebugInfo() {
  var showDebugAnchor = document.getElementById('showdebug');
  if (showDebugAnchor.name === 'show') {
    debugInfo = 'Messages from last sync: \n' + bgPage.debug.msg
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
  document.getElementById('sync_button').addEventListener('click', handleSyncButton);
  document.getElementById('sync_now').addEventListener('click', syncNow);
  document.getElementById('showdebug').addEventListener('click', showHideDebugInfo);
})
