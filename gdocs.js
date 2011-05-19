var bgPage = chrome.extension.getBackgroundPage();

function sendRequest(request, url){
  var xhr = new XMLHttpRequest();
  xhr.open(request.method, url + '?' + bgPage.stringify(request.parameters), false);
  for (var header in request.headers) {
    xhr.setRequestHeader(header, request.headers[header]);
  }
  xhr.setRequestHeader('Authorization', bgPage.oauth.getAuthorizationHeader(url, request.method, request.parameters));
  xhr.send();
  return xhr;
}

function GdocsEntry(entrystring) {
  if (typeof(entrystring) != 'undefined') {
    this.entry = JSON.parse(entrystring);
  }
}

GdocsEntry.prototype.parseFeed = function(feed_response) {
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
GdocsEntry.prototype.persist = function() {
  localStorage['remoteDocEntry'] = JSON.stringify(this.entry);
};
//
GdocsEntry.prototype.getEtag = function() {
  return this.entry.gd$etag;
};
//
GdocsEntry.prototype.getId = function() {
  return this.entry.id.$t;
};
//
GdocsEntry.prototype.getEditMediaLink = function() {
  var edit_media_link;
  for (var e in this.entry.link) {
    if (this.entry.link[e].rel == 'edit-media') {
      edit_media_link = this.entry.link[e].href;
      break;
    }
  }
  return edit_media_link;
};
//
GdocsEntry.prototype.getSelfLink = function() {
  var self_link;
  for (var e in this.entry.link) {
    if (this.entry.link[e].rel == 'self') {
      self_link = this.entry.link[e].href;
      break;
    }
  }
  return self_link;
};
//
GdocsEntry.prototype.getLastUpdateTime = function() {
  var last_update_time = new Date(this.entry.updated.$t);
  return last_update_time.getTime();
};
//
GdocsEntry.prototype.refresh = function() {
  //  alert(this.getEtag());
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
  var xhr = sendRequest(request, url);
  if(xhr.status == 304 || xhr.status == 412)
    return;  // Nothing has changed.
  if(xhr.status != 200) {
    alert('There was a problem in refreshing the doc entry.');
    alert(xhr.responseText);
    return;
  }
  //  alert(xhr.responseText);
  this.parseFeed(xhr.responseText);
  if(this.entry)
    this.persist();
};
//
GdocsEntry.prototype.createRemoteDataFile = function () {
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
GdocsEntry.prototype.getRemoteDataFile= function() {
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