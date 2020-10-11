let pathname;
let userName;
let userId;
let indexPath;
let listCount;
let output = "";

if (document.readyState !== "loading") {
  init();
} else {
  document.addEventListener("DOMContentLoaded", init);
}

////////////////////////////////////  INIT

function init() {
  const isOnOwnProfile = document.querySelector(".global-menu .create-list");

  if (isOnOwnProfile) {
    // Init variables
    const userProfileLink = document.querySelector(".user-box .title a").href;
    const userImageSrc = document.querySelector(".about img").getAttribute("src");
    pathname = getPathOfUrl();
    userName = getPathOfUrl(userProfileLink).substring(1);
    userId = userImageSrc.replace("/action/user-image?uid=", "");
    indexPath = "/" + userName + "/index";

    // Init HTML
    HTML();

    // Start export-all if url contains ?export=true
    if (pathname == indexPath + "?export=true") {
      openModal();
      setTimeout(startExportAll, 0);
    }
  }
}

////////////////////////////////////  EXPORT VISIBLE

async function startExportVisible() {
  const listSelector = ".list-container";
  const listSelectorInArchive = "#list_container .slot";

  const listNodes = document.querySelectorAll(listSelector + ", " + listSelectorInArchive);

  if (!listNodes || listNodes.length < 1) {
    showErrorInModal("No visible lists found.");
    return;
  }

  prepareModalForExport();

  listCount = 0;

  await asyncForEach([...listNodes], async (list) => {
    await editListAndAddToOutput(list);
  });

  prepareModalForFinish();
}

////////////////////////////////////  EXPORT ALL

async function startExportAll() {
  const listLinksToOpen = document.querySelectorAll(".body_folder .list a");
  if (!listLinksToOpen) {
    showErrorInModal("No lists found.");
    return;
  }

  prepareModalForExport();

  listCount = 0;

  await asyncForEach([...listLinksToOpen], async (link) => {
    let list = await openListInArchive(link);
    await editListAndAddToOutput(list);
  });

  prepareModalForFinish();
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

////////////////////////////////////  GET LIST

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
        if (!listContent) {
          listContent = "(empty list)";
        }

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
      if (list && listContent) {
        output += prepareListContentForExport(list, listContent);
        listCount++;
      }
    },
    function (errorMsg) {
      alert(errorMsg);
    }
  );

  return listEditPromise;
}

////////////////////////////////////  OUTPUT

function prepareListContentForExport(list, listContent) {
  // Get list ID
  let listId;
  if (list.querySelector(".listbox")) {
    listId = list.querySelector(".listbox").getAttribute("id").replace("listbox-", "");
  } else {
    listId = list.querySelector("[id*=listbox-content-slot]").getAttribute("id").replace("listbox-content-slot-", "");
  }

  // Link to list
  const listLink = "Link: " + list.querySelector(".box-title a").getAttribute("href");

  // List title (= category + actual title)
  const listTitle = list.querySelector(".box-title a").innerHTML.replace('<span class="box-subtitle">', "").replace("</span>", "").replace(/\s\s+/g, " ").trim();

  // Creation and modification dates
  const listDates = "created on " + list.querySelector(".dates").innerHTML.replace("∞", "").replace("+", "").replace(" <br>", ", last updated on ").replace(/\s\s+/g, " ").trim();

  // List image
  let listImage = list.querySelector(".icon");
  if (listImage) {
    listImage = "\nIcon: " + listImage.getAttribute("src").replace("&small=1", "");
  } else {
    listImage = "";
  }

  // The actual list
  const actualList = addImageLinks(listContent, listId);

  return listTitle + "\n" + listLink + "\n(" + listDates + ")" + listImage + "\n\n" + actualList;
}

function addImageLinks(listContent, listId) {
  const attachmentUrl = "https://listography.com/user/" + userId + "/list/" + listId + "/attachment/";
  return listContent.replace(/\[([a-z]+)\]/g, "[$1: " + attachmentUrl + "$1]");
}

////////////////////////////////////  HELPERS

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

// "forEach" is not async. here is our own async version of it.
// usage: await asyncForEach(myArray, async () => { ... })
const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

////////////////////////////////////  HTML

function HTML() {
  // Create Button
  const menu = document.querySelector(".global-menu tbody");
  const button = `
    <tr>
      <td>
        <input type="button" value="export" class="export-button">
      </td>
    </tr>
  `;
  menu.insertAdjacentHTML("beforeend", button);
  menu.querySelector(".export-button").addEventListener("click", showOptions);

  // Create Modal
  const page = document.querySelector("#page");
  const modal = `
    <div class="export-modal">
      <div class="export-modal-close">&times;</div>
      <h1 class="export-heading"></h1>
      <div class="export-text"></div>
    </div>
    <div class="export-modal-overlay"></div>
  `;
  page.insertAdjacentHTML("afterend", modal);
  document.querySelector(".export-modal-close").addEventListener("click", closeModal);
}

function showOptions() {
  document.querySelector(".export-heading").innerHTML = "Export";
  document.querySelector(".export-text").innerHTML = `
    <div class="export-options">
      <label><input type="checkbox" value="edit">Export real, unformatted content (e.g. * instead of ●)</label>
      <label><input type="checkbox" value="urls">Include list urls</label>
      <label><input type="checkbox" value="dates">Include list dates (created on, modified on)</label>
      <label><input type="checkbox" value="links">Include links</label>
      <label><input type="checkbox" value="images">Include images (as urls)</label>
    </div>
    <div class="export-buttons">
      <input type="button" value="Export all lists..." class="export-all" />
      <input type="button" value="Export visible lists..." class="export-visible" />
    </div>
  `;

  document.querySelector(".export-all").addEventListener("click", () => {
    const onListIndexPage = pathname.startsWith(indexPath) && pathname.indexOf("?v") < 0;

    if (onListIndexPage) {
      startExportAll();
    } else {
      navigateToListIndexPage();
    }
  });

  document.querySelector(".export-visible").addEventListener("click", startExportVisible);

  openModal();
}

function navigateToListIndexPage() {
  location.href = indexPath + "?export=true";
}

function openModal() {
  document.querySelector(".export-modal").style.display = "block";
  document.querySelector(".export-modal-overlay").style.display = "block";
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.querySelector(".export-modal").style.display = "none";
  document.querySelector(".export-modal-overlay").style.display = "none";
  document.body.style.overflow = "auto";
}

function prepareModalForExport() {
  document.querySelector(".export-modal-close").style.display = "none";
  document.querySelector(".export-heading").innerHTML = "Exporting";
  document.querySelector(".export-heading").classList.add("loading");
  document.querySelector(
    ".export-text"
  ).innerHTML = `<p>This might take a while if you have many lists.</p><p>You will see your lists being edited in the background.<br />Don't worry, they and their modification date will not be changed.</p>`;
}

function prepareModalForFinish() {
  const currentUrl = location.href.replace("?export=true", "");
  const now = new Date();
  const currentDateTime = now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate() + " " + now.getHours() + ":" + now.getMinutes();

  document.querySelector(".export-modal-close").style.display = "block";
  document.querySelector(".export-heading").classList.remove("loading");
  document.querySelector(".export-heading").innerHTML = "Exported " + listCount + " lists";
  document.querySelector(".export-text").innerHTML =
    `<p>You can now copy them below and save them somewhere on your computer.</p>
    <textarea class="export-output">Export of ` +
    currentUrl +
    `
Export date: ` +
    currentDateTime +
    output +
    `</textarea>
  `;
}

function showErrorInModal(text) {
  document.querySelector(".export-text").innerHTML = "No lists found!";
}
