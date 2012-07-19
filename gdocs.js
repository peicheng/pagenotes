/**
 * @author manugarg@gmail.com (Manu Garg)
 */

/*
 * Directive for JSLint, so that it doesn't complain about these names not being
 * defined.
 */
/*global location, localStorage, alert, chrome, confirm, XMLHttpRequest */

"use strict";

var bgPage = chrome.extension.getBackgroundPage();

function stringify(parameters) {
  var p, params = [];
  for (p in parameters) {
    params.push(encodeURIComponent(p) + '=' +
                encodeURIComponent(parameters[p]));
  }
  return params.join('&');
}

function sendRequest(request, url) {
  var header, xhr = new XMLHttpRequest();
  if (request.parameters) {
    url = url + '?' + stringify(request.parameters);
  }
  xhr.open(request.method, url, false);
  for (header in request.headers) {
    if (request.headers.hasOwnProperty(header)) {
      xhr.setRequestHeader(header, request.headers[header]);
    }
  }
  xhr.setRequestHeader('Authorization', bgPage.oauth.getAuthorizationHeader());
  xhr.send(request.body);
  return xhr;
}

function GoogleFile(gFileString, onSetValue) {
  this.getValue = function () {
    if (gFileString) {
      try {
        return JSON.parse(gFileString);
      } catch (e) {
        throw 'Not a valid object string: ' + gFileString;
      }
    }
  };
  this.setValue = function (entry) {
    onSetValue(JSON.stringify(entry));
  };
}

GoogleFile.prototype.setGfile = function (feedResponseString) {
  var feedResponse = JSON.parse(feedResponseString);
  if (feedResponse.kind === 'drive#file') {
    this.setValue(feedResponse);
    return;
  }
};

GoogleFile.prototype.getLastUpdateTime = function () {
  return new Date(this.getValue().modifiedDate).getTime();
};

GoogleFile.prototype.createNewFile = function (fileName) {
  if (!fileName) { throw 'File name is not defined'; }
  var request, xhr, url = 'https://www.googleapis.com/drive/v2/files';
  request = {
    'method': 'POST',
    'headers': {
      'Content-Type': 'application/json'
    },
    'body': JSON.stringify({
      'title': fileName,
      'mimeType': 'text/plain'
    })
  };
  xhr = sendRequest(request, url);
  if (xhr.status !== 200) {
    throw 'There was a problem in setting up the sync. ' +
      'Last request status: ' + xhr.status + '\n' + xhr.responseText;
  }
  this.setGfile(xhr.responseText);
};

GoogleFile.prototype.searchFileByName = function (fileName) {
  if (!fileName) { throw 'File name is not defined'; }
  var request, response, xhr, url = 'https://www.googleapis.com/drive/v2/files';
  request = {
    'method': 'GET',
    'parameters': {
      'q': 'title=\'' + fileName + '\' and trashed = false'
    }
  };
  xhr = sendRequest(request, url);
  if (xhr.status !== 200) {
    throw 'There was a problem in searching for the doc - ' + fileName + '.' +
      'Last request status: ' + xhr.status + '\n' + xhr.responseText;
  }
  response = JSON.parse(xhr.responseText);
  if (response.hasOwnProperty('items') &&
      response.items instanceof Array &&
      response.items.length > 0) {
    this.setValue(response.items[0]);
  }
};

GoogleFile.prototype.refreshLocalMetadata = function (callback) {
  var request, xhr, url = this.getValue().selfLink;
  request = {
    'method': 'GET'
  };
  xhr = sendRequest(request, url);
  if (xhr.status !== 200) {
    throw 'There was a problem in refreshing the doc entry. ' +
      'Last request status: ' + xhr.status + '\n' + xhr.responseText;
  }
  this.setGfile(xhr.responseText);
  callback(this);
};

GoogleFile.prototype.getData = function () {
  var request, xhr, url = this.getValue().downloadUrl;
  request = {
    'method': 'GET'
  };
  xhr = sendRequest(request, url);
  if (xhr.status !== 200) {
    throw 'There was a problem downloading the doc. ' +
      'Last request status: ' + xhr.status + '\n' + xhr.responseText;
  }
  return xhr.responseText;
};

GoogleFile.prototype.setData = function (data) {
  var request, xhr, url = 'https://www.googleapis.com/upload/drive/v2/files/' + this.getValue().id;
  // Make sure data is not undefined.
  data = data || '';
  request = {
    'method': 'PUT',
    'headers': {
      'Content-Type': 'text/plain',
    },
    'parameters': {
      'uploadType': 'media'
    },
    'body': data
  };
  xhr = sendRequest(request, url);
  if (xhr.status !== 200) {
    throw 'There was a problem in updating the doc. ' +
      'Last request status: ' + xhr.status + '\n' + xhr.responseText;
  }
  this.setGfile(xhr.responseText);
};

