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

var Options = function() {};

Options.prototype.get = function(key) {
  var obj = this.getAll();
  // obj is not defined
  if (!obj) return undefined;
  return obj[key];
};

Options.prototype.getAll = function() {
  var src = this.getSource();
  return src ? JSON.parse(src) : {};
}

Options.prototype.set = function(key, value) {
  var src = this.getSource();
  var obj = src ? JSON.parse(src) : {};
  obj[key] = value;
  this.setSource(obj);
};

Options.prototype.getSource = function() {
  return localStorage.options;
};

Options.prototype.setSource = function(src) {
  if (typeof src !== 'string') {
    src = JSON.stringify(src);
  }
  localStorage.options = src;
};

Options.prototype.remove = function(key) {
  var src = this.getSource();
  var obj = src ? JSON.parse(src) : {};
  delete obj[key];
  this.setSource(obj);
};
