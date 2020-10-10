////////////////////////////////////  VARIABLES

const pathname = getPathOfUrl();
const userName = getPathOfUrl(document.querySelector(".user-box .title a").href).substring(1);
const userId = document.querySelector(".about img").getAttribute("src").replace("/action/user-image?uid=", "");
const indexPath = "/" + userName + "/index";

let popup;
let popupoverlay;
let currentBatch = 1;
let listCount;
let listsToExport = [];
let output = "";

////////////////////////////////////  INIT

// only if the user is on their profile
if (document.querySelector(".global-menu .create-list")) {
  HTML();

  // start export if user clicked the export all link and was redirected to the archive
  if (pathname == indexPath + "?export=true") {
    startExportAll();
  }
}

////////////////////////////////////  EXPORT

async function startExportAll() {
  const listLinksToOpen = document.querySelectorAll(".body_folder .list a");
  if (!listLinksToOpen) {
    showPopup("No lists found.", true);
    return;
  }

  startOutput();

  await asyncForEach([...listLinksToOpen], async (link) => {
    let list = await openListInArchive(link);
    await editListAndAddToOutput(list);
  });

  finishOutput();
}

async function startExportVisible() {
  const listSelector = ".list-container";
  const listSelectorInArchive = "#list_container .slot";

  const listNodes = document.querySelectorAll(listSelector + ", " + listSelectorInArchive);

  if (!listNodes || listNodes.length < 1) {
    showPopup("No visible lists found.", true);
    return;
  }

  listsToExport = [...listNodes];

  startOutput();

  await asyncForEach(listsToExport, async (list) => {
    await editListAndAddToOutput(list);
  });

  finishOutput();
}

function openListInArchive(link) {
  let listOpenPromise = new Promise(function (resolve, reject) {
    link.click();
    let listId = link.getAttribute("id").replace("list_" + userId + "_", "");

    let attempt = 1;
    let checkIfIsInEditMode = setInterval(function () {
      if (document.querySelector("#listbox-" + listId + " .menu")) {
        resolve(document.querySelector("#listbox-" + listId));
        clearInterval(checkIfIsInEditMode);
      } else {
        if (attempt > 100) {
          reject("List could not be backed up.");
          clearInterval(checkIfIsInEditMode);
        }
        attempt = attempt + 1;
      }
    }, 100);
  });

  listOpenPromise.then(
    function (list) {
      return list;
    },
    function (errorMsg) {
      alert(errorMsg);
    }
  );

  return listOpenPromise;
}

function editListAndAddToOutput(list) {
  let listEditPromise = new Promise(function (resolve, reject) {
    const editButton = list.querySelector(".menu .item a[href*=edit-list]");
    if (!editButton) {
      reject("List could not be edited.");
    }
    editButton.click();

    let attempt = 1;
    let checkIfIsInEditMode = setInterval(function () {
      if (list.querySelector(".category_editor")) {
        let listContent = list.querySelector("textarea").innerHTML;
        list.querySelector(".cancel.button_1_of_3").click();
        resolve(listContent);
        clearInterval(checkIfIsInEditMode);
      } else {
        if (attempt > 100) {
          reject("List could not be backed up.");
          clearInterval(checkIfIsInEditMode);
        }
        attempt = attempt + 1;
      }
    }, 100);
  });

  listEditPromise.then(
    function (listContent) {
      output += "\n\n\n--------------------------------------------------------\n\n\n";

      output += getListOutput(list, listContent);
    },
    function (errorMsg) {
      alert(errorMsg);
    }
  );

  return listEditPromise;
}

////////////////////////////////////  HELPERS

function replaceAll(str, whatStr, withStr) {
  return str.split(whatStr).join(withStr);
}

function getPathOfUrl(url, tld) {
  let href;
  if (!url) {
    href = window.location.href;
  } else {
    href = url;
  }
  let ending;
  if (!tld) {
    ending = ".com/";
  } else {
    ending = "." + tld + "/";
  }
  return href.substring(href.indexOf(ending) + ending.length - 1);
}

function startOutput() {
  document.querySelector("#export-loading").style.display = "block";
  popupoverlay.style.display = "block";
  const url = location.href.replace("?export=true", "");
  output = "<h1>Here are your lists:</h1><textarea id='export-output'>Export of " + url;
}

function finishOutput() {
  document.querySelector("#export-loading").style.display = "none";
  popupoverlay.style.display = "none";
  showPopup(output + "</textarea>", true);
}

function getListOutput(list, listContent) {
  if (!list || !listContent) return;

  let listId;
  if (list.querySelector(".listbox")) {
    listId = list.querySelector(".listbox").getAttribute("id").replace("listbox-", "");
  } else {
    listId = list.querySelector("[id*=listbox-content-slot]").getAttribute("id").replace("listbox-content-slot-", "");
  }

  let listLink = "Link: " + list.querySelector(".box-title a").getAttribute("href");

  let listTitle = list.querySelector(".box-title a").innerHTML.replace('<span class="box-subtitle">', "").replace("</span>", "").replace(/\s\s+/g, " ").trim();

  let listDates = "created on " + list.querySelector(".dates").innerHTML.replace("∞", "").replace("+", "").replace(" <br>", ", last updated on ").replace(/\s\s+/g, " ").trim();

  let listImage = list.querySelector(".icon");
  if (listImage) {
    listImage = "\nIcon: " + listImage.getAttribute("src").replace("&small=1", "");
  } else {
    listImage = "";
  }

  return listTitle + "\n" + listLink + "\n(" + listDates + ")" + listImage + "\n\n" + adjustListContent(listContent, listId);
}

function adjustListContent(content, listId) {
  // Add image urls
  const attachmentUrl = "https://listography.com/user/" + userId + "/list/" + listId + "/attachment/";
  content = content.replace(/\[([a-z]+)\]/g, "[$1: " + attachmentUrl + "$1]");

  return content;
}

// "forEach" is not async. here is our own async version of it.
// usage: await asyncForEach(myArray, async () => { ... })
const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

////////////////////////////////////  HTML

function HTML() {
  createPopup();
  createLoading();

  createExportAllButton();
  createExportVisibleButton();
}

function createExportAllButton() {
  const menu = document.querySelector(".global-menu tbody");
  const tr = document.createElement("tr");
  const td = document.createElement("td");

  const button = document.createElement("input");
  button.type = "button";
  button.value = "export all";
  button.className = "export-button";

  if (onIndexPage()) {
    button.onclick = startExportAll;
  } else {
    button.onclick = goToIndex;
  }

  td.appendChild(button);
  tr.appendChild(td);
  menu.appendChild(tr);
}

function createExportVisibleButton() {
  const menu = document.querySelector(".global-menu tbody");
  const tr = document.createElement("tr");
  const td = document.createElement("td");

  const button = document.createElement("input");
  button.type = "button";
  button.value = "export visible";
  button.className = "export-button";
  button.onclick = startExportVisible;

  td.appendChild(button);
  tr.appendChild(td);
  menu.appendChild(tr);
}

function onIndexPage() {
  return pathname.startsWith(indexPath) && pathname.indexOf("?v") < 0;
}

function goToIndex() {
  location.href = indexPath + "?export=true";
}

function createPopup() {
  popupoverlay = document.createElement("div");
  popupoverlay.className = "export-popup-overlay";
  popup = document.createElement("div");
  popup.className = "export-popup";

  document.body.appendChild(popup);
  document.body.appendChild(popupoverlay);

  hidePopup();
}

function createLoading() {
  let loading = document.createElement("div");
  loading.setAttribute("id", "export-loading");
  loading.style.display = "none";
  loading.innerHTML = "<h1>Loading...</h1><h2>Please wait.</h2>This may take a while if you have more than 100 lists.";

  document.body.appendChild(loading);
}

function showPopup(text, allowClosing) {
  if (text) popup.innerHTML = text;
  popupoverlay.style.display = "block";
  popup.style.display = "block";
  document.body.style.overflow = "hidden";

  if (allowClosing) {
    popupoverlay.onclick = hidePopup;
  }
}

function hidePopup() {
  popup.style.display = "none";
  popupoverlay.style.display = "none";
  document.body.style.overflow = "auto";
}
