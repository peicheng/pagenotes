/**
 * @author manugarg@gmail.com (Manu Garg)
 */

var bgPage = chrome.extension.getBackgroundPage();

function stringify(parameters) {
  var params = [];
  for(var p in parameters) {
    params.push(encodeURIComponent(p) + '=' +
                encodeURIComponent(parameters[p]));
  }
  return params.join('&');
}

function sendRequest(request, url, body) {
  var xhr = new XMLHttpRequest();
  var header;
  xhr.open(request.method, url + '?' + stringify(request.parameters),
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

function GoogleDoc(entryString, onSetEntry) {
  this.getEntry = function() {
    if (entryString) {
      try {
        return JSON.parse(entryString);
      } catch(e) {
        throw 'Not a valid object string: ' + entryString;
      }
    }
  };
  this.setEntry = function(entry) {
    entryString = JSON.stringify(entry);
    onSetEntry(entryString);
  };
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
GoogleDoc.prototype.getLink = function(linkType) {
  var docLinks = this.getEntry().link;
  for (var i = 0; i < docLinks.length; i++) {
    if (docLinks[i].rel == linkType) {
      return docLinks[i].href;
    }
  }
};
//
GoogleDoc.prototype.getLastUpdateTime = function() {
  return new Date(this.getEntry().updated.$t).getTime();
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
};
//
GoogleDoc.prototype.searchDocByName = function(docName) {
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
};
//
GoogleDoc.prototype.refreshLocalMetadata = function(callback) {
  var url = this.getLink('self');
  var request = {
    'method': 'GET',
    'headers': {
      'If-None-Match': this.getEntry().gd$etag
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
  }
  callback(this);
};
//
GoogleDoc.prototype.getData = function() {
  var url = 'https://docs.google.com/feeds/download/documents/Export';
  var docId = this.getEntry().gd$resourceId.$t.split(':')[1];
  var request = {
    'method': 'GET',
    'parameters': {
      'docId': docId,
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
  var url = this.getLink('edit-media');
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
};

