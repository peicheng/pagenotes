var bgPage = chrome.extension.getBackgroundPage();

function sendRequest(request, url, body) {
  var xhr = new XMLHttpRequest();
  var header;
  xhr.open(request.method, url + '?' + bgPage.stringify(request.parameters),
      false);
  xhr.setRequestHeader('GData-Version', '3.0');
  for (var header in request.headers) {
    if (request.headers.hasOwnProperty(header)) {
      xhr.setRequestHeader(header, request.headers[header]);
    }
  }
  xhr.setRequestHeader('Authorization', bgPage.oauth.getAuthorizationHeader(
       url, request.method, request.parameters));
  xhr.send(body);
  return xhr;
}

function GoogleDoc(entrystring) {
  this.getEntry = function() { return JSON.parse(entrystring);};
  this.setEntry = function(entry) { entrystring = JSON.stringify(entry); };
}

GoogleDoc.prototype.parseFeed = function(feedResponseString) {
  var feedResponse = JSON.parse(feedResponseString);
  if (feedResponse.entry) {
    this.setEntry(feedResponse.entry);
    return;
  }
  feed = feedResponse.feed;
  if (feed.entry) {
    if (feed.entry instanceof Array) {
      this.setEntry(feed.entry[0]);
    } else {
      this.setEntry(feed.entry);
    }
  }
};
//
GoogleDoc.prototype.persist = function() {
  if (this.getEntry()) {
    localStorage.gDoc = JSON.stringify(this.getEntry());
  }
};
//
GoogleDoc.prototype.getEtag = function() {
  return this.getEntry().gd$etag;
};
//
GoogleDoc.prototype.getId = function() {
  return this.getEntry().id.$t;
};
//
GoogleDoc.prototype.getResourceId = function() {
  return this.getEntry().gd$resourceId.$t.split(':')[1];
};
//
GoogleDoc.prototype.getEditMediaLink = function() {
  var docLinks = this.getEntry().link;
  for (var i = 0; i < docLinks.length; i++) {
    if (docLinks[i].rel == 'edit-media') {
      return docLinks[i].href;
    }
  }
};
//
GoogleDoc.prototype.getSelfLink = function() {
  var docLinks = this.getEntry().link;
  for (var i = 0; i < docLinks.length; i++) {
    if (docLinks[i].rel == 'self') {
      return docLinks[i].href;
    }
  }
};
//
GoogleDoc.prototype.getLastUpdateTime = function() {
  var lastUpdateTime = new Date(this.getEntry().updated.$t);
  return lastUpdateTime.getTime();
};
//
GoogleDoc.prototype.createNewDoc = function(docName) {
  if (!docName) { throw 'Doc name is not defined'; }
  var url = 'https://docs.google.com/feeds/default/private/full';
  var request = {
    'method': 'POST',
    'headers': {
      'Content-Type': 'text/plain',
      'Slug': docName
    },
    'parameters': {
      'alt': 'json'
    },
    'body': ''
  };
  var xhr = sendRequest(request, url);
  if (xhr.status != 201) {
    throw 'There was a problem in setting up the sync. ' +
    'Last request status: ' + xhr.status + '\n' + xhr.responseText;
    return;
  }
  this.parseFeed(xhr.responseText);
  this.persist();
};
//
GoogleDoc.prototype.getDocByName = function(docName) {
  if (!docName) { throw 'Doc name is not defined'; }
  var url = 'https://docs.google.com/feeds/default/private/full';
  var request = {
    'method': 'GET',
    'parameters': {
      'alt': 'json',
      'title': docName,
      'title-exact': 'true'
    }
  };
  var xhr = sendRequest(request, url);
  if (xhr.status != 200) {
    throw 'There was a problem in searching for the doc - ' + docName + '.' +
    'Last request status: ' + xhr.status + '\n' + xhr.responseText;
    return;
  }
  this.parseFeed(xhr.responseText);
  this.persist();
};
//
GoogleDoc.prototype.refreshLocalMetadata = function(callback) {
  var url = this.getSelfLink();
  var request = {
    'method': 'GET',
    'headers': {
      'If-None-Match': this.getEtag()
    },
    'parameters': {
      'alt': 'json'
    }
  };
  var xhr = sendRequest(request, url);
  if (xhr.status !== 200 && xhr.status !== 304 && xhr.status !== 412) {
    throw 'There was a problem in refreshing the doc entry. ' +
    'Last request status: ' + xhr.status + '\n' + xhr.responseText;
    return;
  }
  if (xhr.status !== 304 && xhr.status !== 412) {
    this.parseFeed(xhr.responseText);
    this.persist();
  }
  callback();
};
//
GoogleDoc.prototype.getData = function() {
  var url = 'https://docs.google.com/feeds/download/documents/Export';
  var request = {
    'method': 'GET',
    'parameters': {
      'docId': this.getResourceId(),
      'exportFormat': 'txt'
    }
  };
  var xhr = sendRequest(request, url);
  if (xhr.status != 200) {
    throw 'There was a problem downloading the doc. ' +
    'Last request status: ' + xhr.status + '\n' + xhr.responseText;
    return;
  }
  return xhr.responseText;
};
//
GoogleDoc.prototype.setData = function(data) {
  var url = this.getEditMediaLink();
  var request = {
    'method': 'PUT',
    'headers': {
      'If-Match': '*',
      'Content-Type': 'text/plain'
    },
    'parameters': {
      'alt': 'json'
    }
  };
  var xhr = sendRequest(request, url, data);
  if (xhr.status != 200) {
    throw 'There was a problem in updating the doc. ' +
    'Last request status: ' + xhr.status + '\n' + xhr.responseText;
    return;
  }
  this.parseFeed(xhr.responseText);
  this.persist();
};

