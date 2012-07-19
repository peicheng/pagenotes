/**
 * @author manugarg@gmail.com (Manu Garg)
 */

/*
 * Directive for JSLint, so that it doesn't complain about these names not being
 * defined.
 */
/*global location, alert, chrome, confirm, XMLHttpRequest */

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

function GoogleFile(sourceString, setSource) {
  this.src = sourceString;
  this.setSource = setSource;
}

GoogleFile.prototype.set = function (obj) {
  this.src = JSON.stringify(obj);
  this.setSource(this.src);
};

GoogleFile.prototype.get = function (key) {
  var obj = this.src ? JSON.parse(this.src) : {};
  return key ? obj[key] : obj;
};

GoogleFile.prototype.update = function (response) {
  var obj = JSON.parse(response);
  if (obj.kind === 'drive#file') {
    this.set(obj);
  }
};

GoogleFile.prototype.getLastUpdateTime = function () {
  return new Date(this.get('modifiedDate')).getTime();
};

/**
 * Create a new Google drive file..
 *
 * @param {Function} fileName Name of the new file.
 */
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
  this.update(xhr.responseText);
};

/**
 * Search for a file in Google drive by name.
 *
 * @param {Function} fileName Name to search by.
 */
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
    this.set(response.items[0]);
  }
};

/**
 * Download remote file's metadata and store it locally.
 *
 * @param {Function} callback(gFile) Function to call after local metadata refresh.
 */
GoogleFile.prototype.refreshLocalMetadata = function (callback) {
  var request, xhr, url = this.get('selfLink');
  request = {
    'method': 'GET'
  };
  xhr = sendRequest(request, url);
  if (xhr.status !== 200) {
    throw 'There was a problem in refreshing the doc entry. ' +
      'Last request status: ' + xhr.status + '\n' + xhr.responseText;
  }
  this.update(xhr.responseText);
  callback(this);
};

/**
 * Get data from the remote file.
 *
 */
GoogleFile.prototype.getData = function () {
  var request, xhr, url = this.get('downloadUrl');
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

/**
 * Upload local data to the remote file.
 *
 * @param {Function} data Data to upload.
 */
GoogleFile.prototype.setData = function (data) {
  var request, xhr, url = 'https://www.googleapis.com/upload/drive/v2/files/' + this.get('id');
  // Make sure data is not undefined.
  data = data || '';
  request = {
    'method': 'PUT',
    'headers': {
      'Content-Type': 'text/plain'
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
  this.update(xhr.responseText);
};

