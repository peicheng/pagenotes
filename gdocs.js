/**
 * @author manugarg@gmail.com (Manu Garg)
 */

var bgPage = chrome.extension.getBackgroundPage();

function stringify(parameters) {
  var params = [];
  for (var p in parameters) {
    params.push(encodeURIComponent(p) + '=' +
                encodeURIComponent(parameters[p]));
  }
  return params.join('&');
}

function sendRequest(request, url) {
  var xhr = new XMLHttpRequest();
  var header;
  if (request.parameters) {
    url = url + '?' + stringify(request.parameters);
  }
  xhr.open(request.method, url, false);
  for (var header in request.headers) {
    if (request.headers.hasOwnProperty(header)) {
      xhr.setRequestHeader(header, request.headers[header]);
    }
  }
  xhr.setRequestHeader('Authorization', bgPage.oauth.getAuthorizationHeader());
  xhr.send(request.body);
  return xhr;
}

function GoogleFile(entryString, onSetEntry) {
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

GoogleFile.prototype.parseFeed = function(feedResponseString) {
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
GoogleFile.prototype.parseFeed2 = function(feedResponseString) {
  var feedResponse = JSON.parse(feedResponseString);
  if (feedResponse.kind == 'drive#file') {
    this.setEntry(feedResponse);
    return;
  }
  if (feedResponse.kind == 'drive#fileList') {
    if (feedResponse.items.length > 0) {
      this.setEntry(feedResponse.items[0]);
    }
  }
};
//
GoogleFile.prototype.getLink = function(linkType) {
  var docLinks = this.getEntry().link;
  for (var i = 0; i < docLinks.length; i++) {
    if (docLinks[i].rel == linkType) {
      return docLinks[i].href;
    }
  }
};
//
GoogleFile.prototype.getLastUpdateTime = function() {
  return new Date(this.getEntry().modifiedDate).getTime();
};
//
GoogleFile.prototype.createNewFile = function(fileName) {
  if (!fileName) { throw 'File name is not defined'; }
  var url = 'https://www.googleapis.com/drive/v2/files';
  var request = {
    'method': 'POST',
    'headers': {
      'Content-Type': 'application/json',
    },
    'body': JSON.stringify({
      'title': fileName,
      'mimeType': 'text/plain'
    })
  };
  var xhr = sendRequest(request, url);
  if (xhr.status != 200) {
    throw 'There was a problem in setting up the sync. ' +
    'Last request status: ' + xhr.status + '\n' + xhr.responseText;
    return;
  }
  this.parseFeed2(xhr.responseText);
};
//
GoogleFile.prototype.searchFileByName = function(fileName) {
  if (!fileName) { throw 'File name is not defined'; }
  var url = 'https://www.googleapis.com/drive/v2/files';
  var request = {
    'method': 'GET',
    'parameters': {
      'q': 'title=\'' + fileName + '\'',
    }
  };
  var xhr = sendRequest(request, url);
  if (xhr.status != 200) {
    throw 'There was a problem in searching for the doc - ' + fileName + '.' +
    'Last request status: ' + xhr.status + '\n' + xhr.responseText;
    return;
  }
  this.parseFeed2(xhr.responseText);
};
//
GoogleFile.prototype.refreshLocalMetadata = function(callback) {
  var url = this.getEntry().selfLink;
  var request = {
    'method': 'GET',
  };
  var xhr = sendRequest(request, url);
  if (xhr.status !== 200) {
    throw 'There was a problem in refreshing the doc entry. ' +
    'Last request status: ' + xhr.status + '\n' + xhr.responseText;
    return;
  }
  this.parseFeed2(xhr.responseText);
  callback(this);
};
//
GoogleFile.prototype.getData = function() {
  var url = this.getEntry().downloadUrl;
  var request = {
    'method': 'GET',
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
GoogleFile.prototype.setData = function(data) {
  var url = 'https://www.googleapis.com/upload/drive/v2/files/' + this.getEntry().id;
  // Make sure data is not undefined.
  data = data ? data : '';
  var request = {
    'method': 'PUT',
    'headers': {
        'Content-Type': 'text/plain',
        'Content-Length': data.length
    },
    'parameters': {
      'uploadType': 'media'
    },
    'body': data
  };
  var xhr = sendRequest(request, url);
  if (xhr.status != 200) {
    throw 'There was a problem in updating the doc. ' +
    'Last request status: ' + xhr.status + '\n' + xhr.responseText;
    return;
  }
  this.parseFeed2(xhr.responseText);
};

