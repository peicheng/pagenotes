function getPageNotes(key) {
  return localStorage['pagenotes'][key];
}

function setPageNotes(key, value) {
  localStorage['pagenotes'][key] = value;
}

function removePageNotes(key) {
  delete localStorage['pagenotes'][key];
}

function getAllPageNotes() {
  return JSON.stringify(localStorage['pagenotes']);
}

function setAllPageNotes(data) {
  delete localStorage['pagenotes'];
  localStorage['pagenotes'] = JSON.parse(data);
}
