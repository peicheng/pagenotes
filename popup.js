var bgPage = chrome.extension.getBackgroundPage();

// Global variable for selected tab.
var tab;

function e(id) {
  return document.getElementById(id);
}

function enableEdit() {
  e('notes').contentEditable = true;
  e('notes').style.color = '#000';
  e('notes').focus();
  e('edit').innerHTML = 'Save';
}

function afterEdit() {
  e('notes').contentEditable = false;
  e('notes').style.color = '#222';
  saveNotes();
  e('edit').innerHTML = 'Edit';
}

function editButton() {
  if (e('edit').innerHTML.trim() === 'Save') {
    afterEdit();
  } else if (e('edit').innerHTML.trim() === 'Edit') {
    enableEdit();
  }
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
  if (!confirm('Are you sure you want to delete notes for this page?')) {
    return;
  }
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
  // Handle this toggle, only if we are not in edit mode already.
  // This button reads 'Save' in edit mode.
  if (e('edit').innerHTML.trim() === 'Edit') {
    if (e('sitelevel').checked === false) {
      bgPage.setPageNotes(tab.url, bgPage.getPageNotes(tab.host()));
    } else {
      bgPage.setPageNotes(tab.host(), bgPage.getPageNotes(tab.url));
      bgPage.removePageNotes(tab.url);
    }
  }
}

function setupEventHandlers() {
  e('edit').addEventListener('click', editButton);
  document.addEventListener('keydown', function (event) {
    if (event.which == 13 && !event.shiftKey) {
      event.target.blur();
      event.preventDefault();
      afterEdit();
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

window.setTimeout(function () { e('sitelevel').blur(); }, 100);

document.addEventListener('DOMContentLoaded', function () {
  setupEventHandlers();
  chrome.tabs.getSelected(null, updatePopUpForTab);
});
