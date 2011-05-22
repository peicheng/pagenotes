var bgPage = chrome.extension.getBackgroundPage();

function sendRequest(request, url, body) {
  var xhr = new XMLHttpRequest();
  xhr.open(request.method, url + '?' + bgPage.stringify(request.parameters), false);
  for (var header in request.headers) {
    xhr.setRequestHeader(header, request.headers[header]);
  }
  xhr.setRequestHeader('Authorization', bgPage.oauth.getAuthorizationHeader(url, request.method, request.parameters));
  xhr.send(body);
  return xhr;
}

function GoogleDoc(entrystring) {
  if (entrystring !== undefined) {
    this.entry = JSON.parse(entrystring);
  }
}

GoogleDoc.prototype.parseFeed = function(feed_response) {
  var feed_response = JSON.parse(feed_response)
  if('entry' in feed_response) {
    this.entry = feed_response.entry;
    return;
  }
  feed = feed_response.feed;
  //alert(JSON.stringify(feed));
  if ('entry' in feed) {
    // alert(feed.entry);
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
  localStorage['gDoc'] = JSON.stringify(this.entry);
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
  for (var e in this.entry.link) {
    if (this.entry.link[e].rel == 'edit-media') {
      editMediaLink = this.entry.link[e].href;
      break;
    }
  }
  return editMediaLink;
};
//
GoogleDoc.prototype.getSelfLink = function() {
  var self_link;
  for (var i=0; i < this.entry.link.length; i++) {
    if (this.entry.link[i].rel == 'self') {
      self_link = this.entry.link[i].href;
      break;
    }
  }
  return self_link;
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
GoogleDoc.prototype.refresh = function(callback) {
  // alert(this.getEtag());
  var url = this.getSelfLink();
  var request = {
    'method': 'GET',
    'headers': {
      'GData-Version': '3.0',
      'If-None-Match': this.getEtag()
    },
    'parameters': {
      'alt': 'json'
    }
  };

  var f = function(gdocEntry) {
    return function (resp, xhr) {
      if (xhr.status !== 200 && xhr.status !== 304 && xhr.status !== 412) {
        alert('There was a problem in refreshing the doc entry.');
        alert(xhr.status);
        return;
      }
      if (xhr.status !== 304 && xhr.status !== 412) {
        gdocEntry.parseFeed(xhr.responseText);
        if(gdocEntry.entry) {
          gdocEntry.persist();
        }
      }
      callback();
    };
  }
  bgPage.oauth.sendSignedRequest(url, f(this), request);
};
//
GoogleDoc.prototype.createRemoteDataFile = function () {
  var url = 'https://docs.google.com/feeds/default/private/full';
  var request = {
    'method': 'POST',
    'headers': {
      'GData-Version': '3.0',
      'Content-Type': 'text/plain',
      'Slug': 'Page Notes Data'
    },
    'parameters': {
      'alt': 'json',
    },
    'body': ''
  };
  var xhr = sendRequest(request, url);
  if(xhr.status != 201) {
    alert('There was a problem in setting up the sync.');
    alert(xhr.reponseText);
    return;
  }
  //  alert(xhr.responseText);
  this.parseFeed(xhr.responseText);
  if (this.entry)
    this.persist();
};
//
GoogleDoc.prototype.getRemoteDataFile= function() {
  var url = 'https://docs.google.com/feeds/default/private/full';
  var request = {
    'method': 'GET',
    'headers': {
      'GData-Version': '3.0',
    },
    'parameters': {
      'alt': 'json',
      'title': 'Page Notes Data',
      'title-exact': 'true'
    }
  };
  var xhr = sendRequest(request, url);
  if(xhr.status != 200) {
    alert('There was a problem in searching for the existing doc.');
    alert(xhr.reponseText);
    return;
  }
  // alert(xhr.responseText);
  this.parseFeed(xhr.responseText);
  // alert(this.entry);
  if (this.entry)
    this.persist();
};
GoogleDoc.prototype.getData = function() {
  var url = 'https://docs.google.com/feeds/download/documents/Export';
  var request = {
    'method': 'GET',
    'headers': {
      'GData-Version': '3.0',
    },
    'parameters': {
      'docId': this.getResourceId(),
      'exportFormat': 'txt'
    }
  };
  var xhr = sendRequest(request, url);
  if(xhr.status != 200) {
    alert('There was a problem downloading the doc.');
    alert(xhr.status);
    return;
  }
  // alert(xhr.status);
  // alert(xhr.responseText);
  return xhr.responseText;
};
GoogleDoc.prototype.setData = function(data) {
  var url = this.getEditMediaLink();
  var request = {
    'method': 'PUT',
    'headers': {
      'GData-Version': '3.0',
      'If-Match': '*',
      'Content-Type': 'text/plain'
    },
    'parameters': {
      'alt': 'json'
    }
  };
  var xhr = sendRequest(request, url, data);
  if(xhr.status != 200) {
    alert('There was a problem in updating the doc.');
    alert(xhr.status);
    return;
  }
  this.parseFeed(xhr.responseText);
  if (this.entry)
    this.persist();
};