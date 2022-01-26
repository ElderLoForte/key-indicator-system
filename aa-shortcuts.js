//@ts-check
// Shortcut functions just to make full-system testing from GAS easier

function run_updateDataSheet() {
    updateDataSheet();
}

function run_importContacts() {
  let allSheetData = constructSheetData();
    // @ts-ignore
    importContacts(allSheetData);
}

function run_shareFileSys() {
    shareFileSys();
}

function run_updateReports() {
    // @ts-ignore
    updateAreaReports();
    // @ts-ignore
    updateDistrictReports();
    // @ts-ignore
    updateZoneReports();
}