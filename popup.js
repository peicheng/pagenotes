var bgPage = chrome.extension.getBackgroundPage();

function e(id) {
  return document.getElementById(id);
}

function retrievePageNotes(tab) {
  var notes = e('notes');
  var editButton = e('editbutton');

  // Get notes for the current tab and display.
  notes.innerHTML = '&nbsp;';
  tabUrl = tab.url;
  tabHost = bgPage.getHostFromUrl(tabUrl);
  if(bgPage.getPageNotes(tabUrl)) {
    notes.innerHTML = bgPage.getPageNotes(tabUrl);
  } else if(bgPage.getPageNotes(tabHost)) {
    notes.innerHTML = bgPage.getPageNotes(tabHost);
    e('site-level').checked = true;
  } else {
    editButton.value = 'Edit';
    editButton.innerHTML = 'Add';
    e('site-level-div').style.display = 'none';
  }

  // Add event listener to the Edit/Save button.
  editButton.addEventListener('click', function() {
    if (this.value === 'Edit') {
      notes.contentEditable = true;
      notes.focus();
      e('site-level-div').style.display = 'block';
      this.innerHTML = 'Save';
      this.value = 'Save';
    } else if (this.value === 'Save') {
      notes.contentEditable = false;
      if (e('site-level').checked === false) {
        bgPage.setPageNotes(tabUrl, notes.innerHTML);
        bgPage.updateBadgeForTab(tab);
      } else {
        bgPage.setPageNotes(tabHost, notes.innerHTML);
        bgPage.updateBadgeForTab(tab);
      }
      localStorage.lastModTime = new Date().getTime();
      window.close();
    }
  });
  // Add event listener to the Delete button.
  e('delete-button').addEventListener('click', function() {
    key = tabUrl;
    if (e('site-level').checked) {
      key = tabHost;
    }
    bgPage.removePageNotes(key);
    bgPage.updateBadgeForTab(tab);
    localStorage.lastModTime = new Date().getTime();
    window.close();
  });
  // Add event listner to the site-level checkbox
  e('site-level').addEventListener('change', function() {
    editButton.value = 'Save';
    editButton.innerHTML = 'Save';
  });
}

// Chrome extensions API call to get the current tab (URL).
chrome.tabs.getSelected(null, retrievePageNotes);

