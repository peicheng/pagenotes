/**
 * @author manugarg@gmail.com (Manu Garg)
 */
var SYNC_INTERVAL = 5 * 60 * 1000; // In ms. Equivalent to 5 min.
var DOCLIST_SCOPE = 'https://docs.google.com/feeds';
var DOCLIST_FEED = DOCLIST_SCOPE + '/default/private/full/';
var GOOGLE_ACCOUNTS = 'https://www.google.com/accounts';
var REMOTE_DOC_NAME = 'Page Notes Data [Do Not Edit]'
var RED_COLOR = {'color': [255, 0, 0, 255]}
var GREEN_COLOR = {'color': [42, 115, 109, 255]}

var oauth = null;

function setUpOauth() {
  oauth = ChromeExOAuth.initBackgroundPage({
    'request_url': GOOGLE_ACCOUNTS + '/OAuthGetRequestToken',
    'authorize_url': GOOGLE_ACCOUNTS + '/OAuthAuthorizeToken',
    'access_url': GOOGLE_ACCOUNTS + '/OAuthGetAccessToken',
    'consumer_key': 'anonymous',
    'consumer_secret': 'anonymous',
    'scope': DOCLIST_SCOPE,
    'app_name': 'Page Notes - Chrome Extension'
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
  return new GoogleDoc(localStorage.gDoc, function(gDoc) {
        localStorage.gDoc = gDoc;
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

  if (!oauth && localStorage['oauth_token' + DOCLIST_SCOPE]) {
    setUpOauth();
  }
  if (!oauth || !oauth.hasToken()) {
    setVisualCues();
    debug.log('sync: No Oauth token found.');
    return;
  }
  if (!localStorage.gDoc) {
    setVisualCues();
    debug.log('sync: Sync gdoc is not setup.');
    return;
  }
  var remoteFile = getRemoteFile();
  try {
    remoteFile.refreshLocalMetadata(function(gDoc) {
      localLastModTime = 0;
      if(localStorage.lastModTime) {
        localLastModTime = parseInt(localStorage.lastModTime);
      }
      remoteLastModTime = parseInt(gDoc.getLastUpdateTime());
      debug.log('sync: Local last mod time: ' + localLastModTime);
      debug.log('sync: Remote last mod time: ' + localLastModTime);
      if (remoteLastModTime === localLastModTime) {
        debug.log('sync: Local and remote data are equally recent.');
        return;
      }
      else if (remoteLastModTime > localLastModTime) {
        debug.log('sync: Remote data is more recent.');
        // syncToLocal();
        setAllPageNotes(gDoc.getData());
        localStorage.lastModTime = gDoc.getLastUpdateTime();
      }
      else {
        debug.log('sync: Local data is more recent.');
        // syncToRemote();
        gDoc.setData(getAllPageNotes());
        localStorage.lastModTime = gDoc.getLastUpdateTime();
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
