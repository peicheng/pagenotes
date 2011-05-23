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
  if (entrystring !== undefined) {
    this.entry = JSON.parse(entrystring);
  }
}

GoogleDoc.prototype.parseFeed = function(feedResponseString) {
  var feedResponse = JSON.parse(feedResponseString);
  if (feedResponse.entry) {
    this.entry = feedResponse.entry;
    return;
  }
  feed = feedResponse.feed;
  if (feed.entry) {
    if (feed.entry instanceof Array) {
      delete this.entry;
      this.entry = feed.entry[0];
    } else {
      delete this.entry;
      this.entry = feed.entry;
    }
  }
};
//
GoogleDoc.prototype.persist = function() {
  localStorage.gDoc = JSON.stringify(this.entry);
};
//
GoogleDoc.prototype.getEtag = function() {
  return this.entry.gd$etag;
};
//
GoogleDoc.prototype.getId = function() {
  return this.entry.id.$t;
};
//
GoogleDoc.prototype.getResourceId = function() {
  return this.entry.gd$resourceId.$t.split(':')[1];
};
//
GoogleDoc.prototype.getEditMediaLink = function() {
  var editMediaLink;
  for (var i = 0; i < this.entry.link.length; i++) {
    if (this.entry.link[i].rel == 'edit-media') {
      editMediaLink = this.entry.link[i].href;
      break;
    }
  }
  return editMediaLink;
};
//
GoogleDoc.prototype.getSelfLink = function() {
  var selfLink;
  for (var i = 0; i < this.entry.link.length; i++) {
    if (this.entry.link[i].rel == 'self') {
      selfLink = this.entry.link[i].href;
      break;
    }
  }
  return selfLink;
};
//
GoogleDoc.prototype.getExportLink = function() {
  return this.entry.content.src;
};
//
GoogleDoc.prototype.getLastUpdateTime = function() {
  var lastUpdateTime = new Date(this.entry.updated.$t);
  return lastUpdateTime.getTime();
};
//
GoogleDoc.prototype.createRemoteDataFile = function() {
  var url = 'https://docs.google.com/feeds/default/private/full';
  var request = {
    'method': 'POST',
    'headers': {
      'Content-Type': 'text/plain',
      'Slug': 'Page Notes Data'
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
  if (this.entry)
    this.persist();
};
//
GoogleDoc.prototype.getRemoteDataFile = function() {
  var url = 'https://docs.google.com/feeds/default/private/full';
  var request = {
    'method': 'GET',
    'parameters': {
      'alt': 'json',
      'title': 'Page Notes Data',
      'title-exact': 'true'
    }
  };
  var xhr = sendRequest(request, url);
  if (xhr.status != 200) {
    throw 'There was a problem in searching for the existing doc.' +
    'Last request status: ' + xhr.status + '\n' + xhr.responseText;
    return;
  }
  this.parseFeed(xhr.responseText);
  if (this.entry)
    this.persist();
};
//
GoogleDoc.prototype.refresh = function(callback) {
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
    if (this.entry) {
      this.persist();
    }
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
  if (this.entry)
    this.persist();
};

