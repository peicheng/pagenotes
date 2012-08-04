var bgPage = chrome.extension.getBackgroundPage();

// Global variable for selected tab.
var tab;

function e(id) {
  return document.getElementById(id);
}

function enableEdit() {
  e('edit').disabled = true;
  e('notes').contentEditable = true;
  e('notes').focus();
}

function afterEdit() {
  e('edit').disabled = false;
  saveNotes();
}

function saveNotes() {
  var data = e('notes').innerHTML.replace(/&nbsp;/gi, ' ').trim();
  if (e('sitelevel').checked === false) {
    bgPage.setPageNotes(tab.url, data);
  } else {
    bgPage.removePageNotes(tab.url);
    bgPage.setPageNotes(tab.host(), data);
  }
  bgPage.updateBadgeForTab(tab);
  localStorage.lastModTime = new Date().getTime();
}

function handleDeleteButton() {
  key = tab.url;
  if (e('sitelevel').checked) {
    key = tab.host();
  }
  bgPage.removePageNotes(key);
  bgPage.updateBadgeForTab(tab);
  localStorage.lastModTime = new Date().getTime();
  window.close();
}

function handleSiteLevelToggle() {
  if (e('sitelevel').checked === false) {
    bgPage.setPageNotes(tab.url, bgPage.getPageNotes(tab.host()));
  } else {
    bgPage.setPageNotes(tab.host(), bgPage.getPageNotes(tab.url));
    bgPage.removePageNotes(tab.url);
  }
}

function setupEventHandlers() {
  e('notes').addEventListener('blur', afterEdit);
  e('notes').addEventListener('click', enableEdit);
  e('edit').addEventListener('click', enableEdit);
  document.addEventListener('keydown', function (event) {
    if (event.which == 13 && !event.shiftKey) {
      event.target.blur();
      event.preventDefault();
    }
  }, true);
  e('delete').addEventListener('click', handleDeleteButton);
  e('sitelevel').addEventListener('change', handleSiteLevelToggle);
}

function updatePopUpForTab(currentTab) {
  tab = currentTab;
  tab.host = function () {
    return bgPage.getHostFromUrl(tab.url);
  };
  // Get notes for the current tab and display.
  if(bgPage.getPageNotes(tab.url)) {
    e('notes').innerHTML = bgPage.getPageNotes(tab.url);
  } else if(bgPage.getPageNotes(tab.host())) {
    e('notes').innerHTML = bgPage.getPageNotes(tab.host());
    e('sitelevel').checked = true;
  } else {
    enableEdit();
  }
}

document.addEventListener('DOMContentLoaded', function () {
  setupEventHandlers();
  chrome.tabs.getSelected(null, updatePopUpForTab);
});
