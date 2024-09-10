//@ts-check
// Shortcut functions just to make full-system testing from GAS easier



function run_updateDataSheet() {
    updateDataSheet();
}

function run_importContacts() {
    let allSheetData = constructSheetData();
    importContacts(allSheetData);
}

function run_shareFileSys() {
    shareFileSystem();
}

function run_updateReports() {
    updateAreaReports();
    updateDistrictReports();
    updateZoneReports();
}

function run_markDuplicates() {
    let allSheetData = constructSheetData();
    markDuplicates(allSheetData);
}

function run_updateForm() {
    updateForm();
}

function clearCache() {
    let cacheIds = [CONFIG.dataFlow_areaId_cacheKey, CONFIG.dataFlow_allSheetData_cacheKey];
    let cache = CacheService.getDocumentCache();
    cache.removeAll(cacheIds);
}

function run_constructSheetData() {
    let allSheetData = constructSheetData();
}

function setUpTriggers() {
    updateTimeBasedTriggers()
    updateSpreadsheetTriggers()
}

// carefull with running this one I have never done it. But it could work very well. I just put all of the funtions needed to reset the entire thing in this function. 
function entireReset() {
  updateFSV4();
  createMissingReports();
  shareFileSystem();
}
