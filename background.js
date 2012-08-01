/**
 * @author manugarg@gmail.com (Manu Garg)
 */
var SYNC_INTERVAL = 5 * 60 * 1000; // In ms. Equivalent to 5 min.
var DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
var REMOTE_FILE_NAME = 'pagenotes.data';
var RED_COLOR = {'color': [255, 0, 0, 255]};
var GREEN_COLOR = {'color': [42, 115, 109, 255]};

var oauth = null;

function setUpOauth() {
  oauth = new OAuth2({
    'client_id': '702868056438.apps.googleusercontent.com',
    'client_secret': 'P-jAwCRjzcXEGZsWZVNQwvWE',
    'api_scope': DRIVE_SCOPE,
    'redirect_url': 'urn:ietf:wg:oauth:2.0:oob'
  });
}

var debug = {
  msg: '',
  log: function(s) { this.msg += s + '\n';}
};

var lastSyncStatus;
chrome.browserAction.setBadgeText({'text': 'pn'});

// Update badge text on tab change.
chrome.tabs.onSelectionChanged.addListener(function(tabId) {
  chrome.tabs.get(tabId, updateBadgeForTab);
});

// Update badge text on tab update.
chrome.tabs.onUpdated.addListener(function(tabId, changeinfo, tab) {
  updateBadgeForTab(tab);
});

function updateBadgeForTab(tab) {
  var tabUrl = tab.url;
  var tabHost = getHostFromUrl(tabUrl);
  var pn = getPageNotes(tabUrl) ? getPageNotes(tabUrl) : getPageNotes(tabHost);
  if (pn) {
    chrome.browserAction.setBadgeText({'text': 'pn', 'tabId': tab.id});
  } else {
    chrome.browserAction.setBadgeText({'text': '0', 'tabId': tab.id});
  }
}

function saveGFile(src) {
  localStorage.gFile = src;
}

function getRemoteFile() {
  return new GoogleFile(localStorage.gFile, saveGFile);
}

function setVisualCues() {
  if (getSyncFailCount() >= 2) {
    chrome.browserAction.setBadgeBackgroundColor(RED_COLOR);
    chrome.browserAction.setTitle({'title': 'Page Notes - Sync is not '+
                                            'happening.'});
  } else {
    chrome.browserAction.setBadgeBackgroundColor(GREEN_COLOR);
    chrome.browserAction.setTitle({'title': 'Page Notes'});
  }
}

function sync() {
  debug.msg = '';
  debug.log('sync: Starting sync at: ' + new Date());

  if (!oauth && localStorage.oauth2) {
     // If oauth2 is stored in localStorage, set it up oauth object.
    setUpOauth();
  }
  if (!oauth || !oauth.hasAccessToken()) {
    setVisualCues();
    debug.log('sync: No Oauth token found.');
    return;
  }
  if (!localStorage.gFile) {
    setVisualCues();
    debug.log('sync: Sync gdoc is not setup.');
    return;
  }
  var remoteFile = getRemoteFile();
  try {
    remoteFile.refreshLocalMetadata(function(gFile) {
      localLastModTime = 0;
      if(localStorage.lastModTime) {
        localLastModTime = parseInt(localStorage.lastModTime, 10);
      }
      remoteLastModTime = parseInt(gFile.getLastUpdateTime(), 10);
      debug.log('sync: Local last mod time: ' + localLastModTime);
      debug.log('sync: Remote last mod time: ' + remoteLastModTime);
      if (remoteLastModTime === localLastModTime) {
        debug.log('sync: Local and remote data are equally recent.');
        return;
      }
      else if (remoteLastModTime > localLastModTime) {
        debug.log('sync: Remote data is more recent.');
        // syncToLocal();
        gFile.getData(setAllPageNotes);
        localStorage.lastModTime = gFile.getLastUpdateTime();
      }
      else {
        debug.log('sync: Local data is more recent.');
        // syncToRemote();
        gFile.setData(getAllPageNotes());
        localStorage.lastModTime = gFile.getLastUpdateTime();
      }
    });
  } catch (e) {
    lastSyncStatus = 'bad';
    incSyncFailCount();
    setVisualCues();
    debug.log(e);
    return;
  }
  lastSyncStatus = 'good';
  resetSyncFailCount();
  localStorage.lastSyncTime = new Date();
  setVisualCues();
}

function incSyncFailCount() {
  if (localStorage.syncFailCount) {
    localStorage.syncFailCount = parseInt(localStorage.syncFailCount, 10) + 1;
    return;
  }
  localStorage.syncFailCount = '1';
}

function resetSyncFailCount() {
  localStorage.syncFailCount = '0';
}

function getSyncFailCount() {
  if (!localStorage.syncFailCount) {
    localStorage.syncFailCount = '0';
  }
  return parseInt(localStorage.syncFailCount, 10);
}

function init() {
  handleMajorUpdate();
  handleFirstRun();
  chrome.tabs.getSelected(null, updateBadgeForTab);
  sync();
}

function handleMajorUpdate() {
  if (localStorage.gDoc) {
    // If it's a major update (1->2), clear old data.
    var item;
    for (item in localStorage) {
      if (localStorage.hasOwnProperty(item)) {
        if (item !== "pagenotes") {
          localStorage.removeItem(item);
        }
      }
    }
    localStorage.majorUpdate = true;
    chrome.tabs.create({'url': chrome.extension.getURL('options.html')});
  }
}

function handleFirstRun() {
  if (!localStorage.runOnce) {
    localStorage.runOnce = true;
    // If sync is not setup, open the options page.
    if (!localStorage.gFile) {
      chrome.tabs.create({'url': chrome.extension.getURL('options.html')});
    }
  }
}

document.addEventListener('DOMContentLoaded', function () {
  window.setInterval(sync, SYNC_INTERVAL);
  init();
});
