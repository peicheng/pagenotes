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

function GoogleFile(gFileString, onSetValue) {
  this.getValue = function() {
    if (gFileString) {
      try {
        return JSON.parse(gFileString);
      } catch(e) {
        throw 'Not a valid object string: ' + gFileString;
      }
    }
  };
  this.setValue = function(entry) {
    onSetValue(JSON.stringify(entry));
  };
}

GoogleFile.prototype.setGfile = function(feedResponseString) {
  var feedResponse = JSON.parse(feedResponseString);
  if (feedResponse.kind == 'drive#file') {
    this.setValue(feedResponse);
    return;
  }
};
//
GoogleFile.prototype.getLastUpdateTime = function() {
  return new Date(this.getValue().modifiedDate).getTime();
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
  this.setGfile(xhr.responseText);
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
  var response = JSON.parse(xhr.responseText);
  if (response.hasOwnProperty('items') &&
      response.items instanceof Array &&
      response.items.length > 0) {
      this.setValue(response.items[0]);
  }
};
//
GoogleFile.prototype.refreshLocalMetadata = function(callback) {
  var url = this.getValue().selfLink;
  var request = {
    'method': 'GET',
  };
  var xhr = sendRequest(request, url);
  if (xhr.status !== 200) {
    throw 'There was a problem in refreshing the doc entry. ' +
    'Last request status: ' + xhr.status + '\n' + xhr.responseText;
    return;
  }
  this.setGfile(xhr.responseText);
  callback(this);
};
//
GoogleFile.prototype.getData = function() {
  var url = this.getValue().downloadUrl;
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
  var url = 'https://www.googleapis.com/upload/drive/v2/files/' + this.getValue().id;
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
  this.setGfile(xhr.responseText);
};

