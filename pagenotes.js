/*
 * Copyright 2012 Google Inc. All Rights Reserved.
 * @author manugarg@google.com (Manu Garg)

 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

var PageNotes = function() {};

PageNotes.prototype.getSource = function() {
  return localStorage.pagenotes;
};

PageNotes.prototype.get = function(key) {
  var src = this.getSource();
  var obj = src ? JSON.parse(src) : {};
  return key ? obj[key] : obj;
};

PageNotes.prototype.set = function(key, value) {
  var obj = this.get();
  var tags = extractTags(value);
  if (tags) {
    new TagIndex().updateTags(tags, key);
  }
  obj[key] = value;
  this.setSource(obj);
};

PageNotes.prototype.setSource = function(src) {
  if (typeof src !== 'string') {
    src = JSON.stringify(src);
  }
  localStorage.pagenotes = src;
  this.buildTagIndex();
};

PageNotes.prototype.remove = function(key) {
  var obj = this.get();
  delete obj[key];
  this.setSource(obj);
  this.buildTagIndex();
};

PageNotes.prototype.buildTagIndex = function() {
  var tagIndex = new TagIndex();
  tagIndex.setSource('{}');
  var obj = this.get();
  for (var key in obj) {
    var tags = extractTags(obj[key]);
    if (tags) {
      tagIndex.updateTags(tags, key);
    }
  }
};

function extractTags(text) {
  return text.split(' ').filter(function(x) { return x.match(/^#/); });
}

var TagIndex = function() {};

TagIndex.prototype.getSource = function() {
  return localStorage.TagIndex;
};

TagIndex.prototype.get = function(key) {
  var src = this.getSource();
  var obj = src ? JSON.parse(src) : {};
  return key ? obj[key] : obj;
};

TagIndex.prototype.set = function(key, value) {
  // if there is tag in the value, update the tag index object.
  var obj = this.get();
  obj[key].push(value);
  this.setSource(obj);
};

TagIndex.prototype.setSource = function(src) {
  if (typeof src !== 'string') {
    src = JSON.stringify(src);
  }
  localStorage.TagIndex = src;
};

TagIndex.prototype.remove = function(key) {
  var obj = this.get();
  delete obj[key];
  this.setSource(obj);
};

TagIndex.prototype.updateTags = function(tags, value) {
  var obj = this.get();
  for (var i = 0; i < tags.length; i++) {
    if (!(tags[i] in obj)) {
      obj[tags[i]] = [];
    }
    if (obj[tags[i]].indexOf(value) === -1) {
      obj[tags[i]].push(value);
    }
  }
  this.setSource(obj);
};
  