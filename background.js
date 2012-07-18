/**
 * @author manugarg@gmail.com (Manu Garg)
 */
var SYNC_INTERVAL = 5 * 60 * 1000; // In ms. Equivalent to 5 min.
var DOCLIST_SCOPE = 'https://www.googleapis.com/auth/drive.file';
var DOCLIST_FEED = DOCLIST_SCOPE + '/default/private/full/';
var REMOTE_DOC_NAME = 'pagenotes.data'
var RED_COLOR = {'color': [255, 0, 0, 255]}
var GREEN_COLOR = {'color': [42, 115, 109, 255]}

var oauth = null;

function setUpOauth() {
  oauth = new OAuth2({
    'client_id': '702868056438.apps.googleusercontent.com',
    'client_secret': 'P-jAwCRjzcXEGZsWZVNQwvWE',
    'api_scope': DOCLIST_SCOPE,
    'redirect_url': 'urn:ietf:wg:oauth:2.0:oob',
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
  chrome.tabs.get(tabId, updateBadgeForTab)
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

function getRemoteFile() {
  return new GoogleFile(localStorage.gFile, function(gFile) {
        localStorage.gFile = gFile;
      });
}

function setVisualCues() {
  if (lastSyncStatus !== 'good') {
    chrome.browserAction.setBadgeBackgroundColor(RED_COLOR);
    chrome.browserAction.setTitle({'title': 'Page Notes - Sync is not '+
                                            'happening.'})
  } else {
    chrome.browserAction.setBadgeBackgroundColor(GREEN_COLOR);
    chrome.browserAction.setTitle({'title': 'Page Notes'})
  }
}

function sync() {
  debug.msg = ''
  debug.log('sync: Starting sync at: ' + new Date());

  if (!oauth && localStorage['oauth']) {
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
        localLastModTime = parseInt(localStorage.lastModTime);
      }
      remoteLastModTime = parseInt(gFile.getLastUpdateTime());
      debug.log('sync: Local last mod time: ' + localLastModTime);
      debug.log('sync: Remote last mod time: ' + remoteLastModTime);
      if (remoteLastModTime === localLastModTime) {
        debug.log('sync: Local and remote data are equally recent.');
        return;
      }
      else if (remoteLastModTime > localLastModTime) {
        debug.log('sync: Remote data is more recent.');
        // syncToLocal();
        setAllPageNotes(gFile.getData());
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
    lastSyncStatus = 'bad'
    setVisualCues();
    debug.log(e);
    return;
  }
  lastSyncStatus = 'good';
  localStorage.lastSyncTime = new Date();
  setVisualCues();
};

function init() {
  chrome.tabs.getSelected(null, updateBadgeForTab);
  sync();
}

document.addEventListener('DOMContentLoaded', function () {
  window.setInterval(sync, SYNC_INTERVAL);
  init();
})
