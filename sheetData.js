/*
        SheetData
        Handles sheet setup, headers, column indices, pulling and pushing data, etc.

        v1.10

        Public class methods:

        getSheet()
        getTabName()

        getIndex(key)
        getKey(index)
        hasIndex(index) Boolean - has values in that index?
        hasKey(key) Boolean - has values in that key?

        getHeaders()  (unimplemented)

        getValues()   Returns an array of arrays (an array of rows)
        getData()     Returns an array of objects

        getAll(key)   Returns all values for the key
        getAllFromIndex(index)  Returns all values at the index



*/



//The SheetData class is kind of hacked together. Basically, if you want to use it, call constructSheetData() and treat what it returns as an Enum. This is for several reasons, but it's mostly to get around some weirdness with Apps Script (the static keyword doesn't exist) and the fact that Enums aren't natively implemented in Javascript. If I can find a better way to do this I'll implement it later, but for now it's the best solution I've found.

//NOTE 1: DO NOT use any of the public fields - treat them like private ones. They have getter and setter functions instead.
//NOTE 2: DO NOT run any of the methods defined below the class. Same idea: just treat them like private class methods.
//NOTE 3: DO NOT make instances of the SheetData class. Run sheetDataConstructor() ONCE before ever touching the class, then extract whichever property values you need from the object it returns. They are predefined instances of the class - use them instead.

class SheetData {

  /*
  Private Fields (actually public but don't tell anyone)

  tabName: The name of the Sheet this SheetData is tied to.
  nextFreeColumn: The index of the leftmost column with no defined key.
  sheet: The Sheet object this SheetData is tied to.
  headerRow: The row index of the header row.

  keyToIndex: An object whose properties are keys (strings) representing what data goes in a column (ex "areaID", "stl2", "np").
              Its values are the indices (starting with 0) of the column with that data.
  */

  constructor(tabName, initialKeyToIndex, headerRow) {

    this.tabName = tabName;
    this.keyToIndex = initialKeyToIndex;
    this.headerRow = headerRow;

    this.nextFreeColumn = initNextFreeColumn(initialKeyToIndex);

    this.sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tabName);
    if (this.sheet == null) throw `Couldn't construct SheetData: no sheet found with name '${tabName}'`;



    /*  Internal functions  */

    function initNextFreeColumn(keyToIndex) {
      let currentMax = 0;
      for (let key in keyToIndex) {
        let index = keyToIndex[key];
        if (typeof index != 'number')
          throw new TypeError(`Index value '${index}' is not a number!`);

        currentMax = Math.max(currentMax, index);
      }
      return currentMax + 1;
    }



  }





  /*   Change from running on construct to running on get headers?
      initInitialHeaders_(keyToIndex) {
        let headers = [];
  
        for (let key in keyToIndex) {
          let index = keyToIndex[key];
  
          if (typeof headers[index] != 'undefined')
            throw "Data collision error!";
          if (typeof SheetData.HEADER_NAMES[key] == 'undefined')
            throw `Couldn't find initial header for key $'{key}'`
  
          headers[index] = SheetData.HEADER_NAMES[key];
        }
  
        return headers;
      }
    */


  //Private class methods

  /**
   * Returns the index of the rightmost column which has not yet been assigned a key.
   */
  getNextFreeColumn_() {
    return this.nextFreeColumn;
  }

  addColumnAt_(key, index) {
    if (key == "") return;
    if (typeof this.keyToIndex[key] != 'undefined')
      throw "Data collision error!"

    this.keyToIndex[key] = index;
    this.nextFreeColumn = Math.max(this.nextFreeColumn, index + 1);
  }

  addColumnWithHeader_(key, header) {
    if (key == "") return;
    if (typeof this.keyToIndex[key] != 'undefined')
      throw "Data collision error!"

    this.keyToIndex[key] = this.nextFreeColumn;
    this.nextFreeColumn++;

    //                              TODO     Add header to data sheet?
  }

  addColumn_(key) {
    this.addColumnWithHeader_(key, "UNIMPLEMENTED");
  }





  /*   Public class methods   */


  /**
   * Returns the Sheet object for this sheet.
   */
  getSheet() {
    return this.sheet;
  }

  /**
   * Returns the Sheet name of this sheet.
   */
  getTabName() {
    return this.tabName;
  }

  /**
   * Returns the index, starting with 0, of the header row of this sheet.
   */
  getHeaderRow() {
    return this.headerRow;
  }

  /**
   * Returns the index for the column with the given key string.
   */
  getIndex(key) {
    if (typeof this.keyToIndex[key] != 'undefined')
      return this.keyToIndex[key];
    else
      throw `Couldn't get index from key: key '${key}' not found in sheet '${this.tabName}'`
  }

  /**
   * Returns the key string for the column with the given index.
   */
  getKey(index) {
    if (this.hasIndex(index))
      return this.indexToKey[index];
    else
      throw `Couldn't get key from index: index '${index}' not defined in sheet '${this.tabName}'`
  }

  /**
   * Returns true if this SheetData object has a defined key attached to the given index.
   */
  hasIndex(index) {
    return typeof this.indexToKey[index] != 'undefined';
  }

  /**
   * Returns true if this SheetData object has a defined value for the given key.
   */
  hasKey(key) {
    let b = this.keyToIndex;
    let out = this.keyToIndex[key];
    let type = typeof this.keyToIndex[key];
    return typeof this.keyToIndex[key] != 'undefined';
  }

  /**
   * Returns the header row of this sheet.
   */
  getHeaders() {
    let range = this.getSheet().getRange(this.headerRow+1,1,1,this.getSheet().getLastColumn());
    return range.getValues()[0];
  }

  /**
   * Returns the data from this sheet as a two dimensional array. Does not include headers or rows above the header row.
   */
  getValues() {
    let values = this.getSheet().getDataRange().getValues();
    for (let i = this.headerRow + 1; i > 0; i--) values.shift(); //Skip header rows
    return values;
  }

  /**
   * Returns the data from this sheet as an array of objects. Each object represents a row in this sheet and contains the data for that row as properties. Does not include headers or rows above the header row.
   */
  getData() {
    let outValues = [];
    let values = this.getValues();
    for (let row of values) {
      let rowObj = {};
      for (let i = 0; i < row.length; i++) {
        let key = this.indexToKey[i];
        rowObj[key] = row[i];
      }
      outValues.push(rowObj);
    }

    return outValues;
  }

  /**
   * Inserts rows of data into the Sheet. Takes an array of row objects.
   * @param data The data to insert.
   */
  insertData(data) {
    if (data.length==0) return;

    let values = [];
    let skippedKeys = new Set();
    let maxIndex = 0;

    for (let rowData of data) {
      let arr = [];
      for (let key in rowData) {

        if (!this.hasKey(key)) {
          skippedKeys.add(key);
        } else {
          arr[this.getIndex(key)] = rowData[key];
          maxIndex = Math.max(maxIndex, this.getIndex(key));
        }

      }
      values.push(arr);
    }

    //Force all rows to be of the same length
    for (let arr of values)
      if (typeof arr[maxIndex] == 'undefined')
        arr[maxIndex] = "";
    
    for (let key of skippedKeys)
      Logger.log(`Skipped key ${key} while pushing to sheet ${this.tabName}. Sheet doesn't have that key`);

    this.insertValues(values);
  }

  /**
   * Inserts rows of data into the Sheet. Takes a 2D array.
   * @param values The values to insert.
   */
  insertValues(values) {
    if (values.length==0) return;
    this.getSheet().insertRowsBefore(this.headerRow+2, values.length); //Insert rows BEFORE the row AFTER the header row, so it won't use header formatting
    let range = this.getSheet().getRange(this.headerRow+2, 1, values.length, values[0].length);
    range.setValues(values);
  }

  /**
   * Returns an array of all the defined keys in this SheetData.
   */
  getKeys() {
    return Object.keys(this.keyToIndex);
  }

  /**
   * Returns an array of all the values in the sheet for the given key.
   */
  getAllOfKey(key) {
    let index = this.keyToIndex[key];
    return this.getAllOfIndex(index);
  }

  /**
   * Returns an array of all the values in the sheet for the column with the given index.
   */
  getAllOfIndex(index) {
    let values = this.getValues();
    let arr = [];

    for (let row = 0; row < values.length; row++) {
      let val = values[row][index];
      arr.push(val);
    }

    return arr;
  }




}







//                The following are basically SheetData methods - they form an external constructor, treating SheetData like an Enum. They're only separate from the class because static variables don't work properly in Apps Script.
//                populateExtraColumnData()
//                sheetDataConstructor()







function populateExtraColumnData_(allSheetData) {
  let formSheetData = allSheetData.form;
  let dataSheetData = allSheetData.data;

  let formSheet = formSheetData.getSheet();
  let dataSheet = dataSheetData.getSheet();
  let formCols = formSheet.getRange(1, 1, 1, formSheet.getLastColumn()).getValues()[0];
  let dataCols = dataSheet.getRange(1, 1, 1, dataSheet.getLastColumn()).getValues()[0];
  let firstFormCol = formSheetData.getNextFreeColumn_();
  let firstDataCol = dataSheetData.getNextFreeColumn_();

  for (let i = firstDataCol; i < dataCols.length; i++) {
    let key = dataCols[i];
    dataSheetData.addColumnAt_(key, i);
  }
  Logger.log("TODO: Make handling of blank/undefined columns or keys more robust")
  for (let i = firstFormCol; i < formCols.length; i++) {            //          TODO Make this clearer and handle blank/undefined columns or keys
    let key = formCols[i];

    if (key == "") continue;
    formSheetData.addColumnAt_(key, i);

    if (!dataSheetData.hasKey(key)) {
      dataSheetData.addColumnWithHeader_(key);
    }
  }


}



function buildIndexToKey_(allSheetData) {
  for (let sdKey in allSheetData) {

    let sd = allSheetData[sdKey];

    sd.indexToKey = [];
    for (let key in sd.keyToIndex) {
      let i = sd.keyToIndex[key];

      if (typeof sd.indexToKey[i] != 'undefined')
        throw `Data collision on index ${i} while building indexToKey in SheetData '${sdKey}' - tried to add key '${key}' but found value '${indexToKey[i]}'`

      sd.indexToKey[i] = key;
    }


  }
}








/**
 * WIP - nonfunctional
 */
function setSheetUp_(sheetData) {
  throw "UNIMPLEMENTED";
  let sheetName = sheetData.getTabName();
  let headers = sheetData.getHeaders();

  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let ui = SpreadsheetApp.getUi();

  // Checks to see if the sheet exists or not.
  let sheet = ss.getSheetByName(sheetName)
  if (!sheet) {
    Logger.log(`Sheet '${sheetName}' not found. Creating`)
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);     // Creating Header
  }

  return sheet;
}










//Basically a pseudo-constructor. Used to treat SheetData like an Enum

function constructSheetData() {
  return constructSheetData(false);
}

/**
 * Returns all defined instances of the SheetData Enum.
 * @param {Boolean} forceConstruct If true, skips checking the cache and forces a recalculation. Default value is false.
 */
function constructSheetData(forceConstruct) {

  //Check the cache for allSheetData
  let cache = CacheService.getDocumentCache();
  if (CACHE_SHEET_DATA && !forceConstruct) {
    let allSheetData_JSON = cache.get('allSheetData');
    if (allSheetData_JSON != null) {
      Logger.log(`Pulling allSheetData from cache`)
      let allSheetData = JSON.parse(allSheetData_JSON);
      return allSheetData;
    }
  }



  /*    Static properties and parameters     */

    SheetData.CONSTRUCTED = true;
    SheetData.KEY_FROM_HEADER = {     //NOT USED
      "Area Name": "areaName",
      "Status Log": "log",
      "hasContactData": "hasContactData",
      "Response Pulled": "responsePulled",
      "isDuplicate": "isDuplicate",
      "Form Timestamp": "formTimestamp",
      "Submission Email": "submissionEmail",
      "Area Email": "areaEmail",
      "Area ID": "areaID",
      "Sunday's Date": "kiDate",
      "NP": "np",
      "SA": "sa",
      "BD": "bd",
      "BC": "bc",
      "RCA": "rca",
      "RC": "rc",
      "CKI": "cki",
      "Service Hours": "serviceHrs",
      "Form Notes": "formNotes",
      "Date Contact Generated": "dateContactGenerated",
      "Name 1": "name1",
      "Position 1": "position1",
      "isTrainer 1": "isTrainer1",
      "Name 1": "name2",
      "Position 2": "position2",
      "isTrainer 2": "isTrainer2",
      "Name 3": "name3",
      "Position 3": "position3",
      "isTrainer 3": "isTrainer3",
      "District Leader": "districtLeader",
      "ZL1": "zoneLeader1",
      "ZL2": "zoneLeader2",
      "ZL3": "zoneLeader3",
      "STL1": "stl1",
      "STL2": "stl2",
      "STL3": "stl3",
      "STLT1": "stlt1",
      "STLT2": "stlt2",
      "STLT3": "stlt3",
      "AP1": "assistant1",
      "AP2": "assistant2",
      "AP3": "assistant3",
      "District": "district",
      "Zone": "zone",
      "unitString": "unitString",
      "hasMultipleUnits": "hasMultipleUnits",
      "languageString": "languageString",
      "isSeniorCouple": "isSeniorCouple",
      "isSisterArea": "isSisterArea",
      "hasVehicle": "hasVehicle",
      "Vehicle Miles": "vehicleMiles",
      "vinLast8": "vinLast8",
      "Apt Address": "aptAddress",
      "Form Comments": "formNotes",
      "Folder Name": "folderName",
      "Parent Folder": "parentFolder",
      "Folder": "folder",
      "sheetID1": "sheetID1",
      "sheetID2": "sheetID2",



    }






    let offset = 0

    let initialColumnOrders = {

      //FORM RESPONSE COLUMN ORDER
      zoneFilesys: {
        "folderName": 0,
        "parentFolder": 1,
        "folder": 2,
        "sheetID1": 3,
        "sheetID2": 4,



      },
      distFilesys: {
        "folderName": 0,
        "parentFolder": 1,
        "folder": 2,
        "sheetID1": 3,
        "sheetID2": 4,



      },
      areaFilesys: {
        "folderName": 0,
        "parentFolder": 1,
        "folder": 2,
        "sheetID1": 3,
        "sheetID2": 4,



      },


      form: {
        "areaName": 0,
        "responsePulled": 1,
        "isDuplicate": 2,
        "formTimestamp": 3,
        "submissionEmail": 4,
        "kiDate": 5,
        "np": 6,
        "sa": 7,
        "bd": 8,
        "bc": 9,
        "rca": 10,
        "rc": 11,
        "cki": 12,
        "serviceHrs":13,
        "formNotes": 14
        //...additional form data (ex. baptism sources)
      },

      //CONTACT SHEET COLUMN ORDER
      contact: {
        "dateContactGenerated": 0 + offset,
        "areaEmail": 1 + offset,
        "areaName": 2 + offset,

        "name1": 3 + offset,
        "position1": 4 + offset,
        "isTrainer1": 5 + offset,
        "name2": 6 + offset,
        "position2": 7 + offset,
        "isTrainer2": 8 + offset,
        "name3": 9 + offset,
        "position3": 10 + offset,
        "isTrainer3": 11 + offset,


        "district": 12 + offset,
        "zone": 13 + offset,
        "unitString": 14 + offset,
        "hasMultipleUnits": 15 + offset,
        "languageString": 16 + offset,
        "isSeniorCouple": 17 + offset,
        "isSisterArea": 18 + offset,
        "hasVehicle": 19 + offset,
        "vehicleMiles": 20 + offset,
        "vinLast8": 21 + offset,
        "aptAddress": 22 + offset
      },


      //DATA SHEET COLUMN ORDER
      data: {
        "areaName": 0,
        "log": 1,
        "areaEmail": 2,
        "isDuplicate": 3,
        "formTimestamp": 4,    //form data
        "areaID": 5,
        "kiDate": 6,    //form data


        "np": 7,    //form data
        "sa": 8,    //form data
        "bd": 9,    //form data
        "bc": 10,    //form data
        "rca": 11,    //form data
        "rc": 12,    //form data
        "cki": 13,    //form data
        "serviceHrs": 14,    //form data

        "name1": 15,
        "position1": 16,
        "isTrainer1": 17,
        "name2": 18,
        "position2": 19,
        "isTrainer2": 20,
        "name3": 21,
        "position3": 22,
        "isTrainer3": 23,

        "districtLeader": 24,
        "zoneLeader1": 25,
        "zoneLeader2": 26,
        "zoneLeader3": 27,
        "stl1": 28,
        "stl2": 29,
        "stl3": 30,
        "stlt1": 31,
        "stlt2": 32,
        "stlt3": 33,
        "assistant1": 34,
        "assistant2": 35,
        "assistant3": 36,

        "district": 37,
        "zone": 38,
        "unitString": 39,
        "hasMultipleUnits": 40,
        "languageString": 41,
        "isSeniorCouple": 42,
        "isSisterArea": 43,
        "hasVehicle": 44,
        "vehicleMiles": 45,
        "vinLast8": 46,
        "aptAddress": 47,
        "formNotes": 48,    //form data
        //...additional form data (ex. baptism sources)
      }

    }



    let tabNames = {
      form: "Form Responses",
      data: "Data",
      contact: "Contact Data",
      zoneFilesys: "Zone Filesys V3",
      distFilesys: "Dist Filesys V3",
      areaFilesys: "Area Filesys V3"
    }

    let headerRows = {
      form: 0,
      data: 0,
      contact: 0,
      zoneFilesys: 0,
      distFilesys: 0,
      areaFilesys: 0
    }

  //END Static properties and parameters


  let allSheetData = {};
  allSheetData.data = new SheetData(tabNames.data, initialColumnOrders.data, headerRows.data);
  allSheetData.form = new SheetData(tabNames.form, initialColumnOrders.form, headerRows.form);
  allSheetData.contact = new SheetData(tabNames.contact, initialColumnOrders.contact, headerRows.contact);
  allSheetData.zoneFilesys = new SheetData(tabNames.zoneFilesys, initialColumnOrders.zoneFilesys, headerRows.zoneFilesys);
  allSheetData.distFilesys = new SheetData(tabNames.distFilesys, initialColumnOrders.distFilesys, headerRows.distFilesys);
  allSheetData.areaFilesys = new SheetData(tabNames.areaFilesys, initialColumnOrders.areaFilesys, headerRows.areaFilesys);


  populateExtraColumnData_(allSheetData);
  buildIndexToKey_(allSheetData);
  //setSheetsUp_(allSheetData);

  //Object.freeze(allSheetData);

  let log = "Constructed SheetData objects: ";
  for (sheet in tabNames)
    log += " '" + tabNames[sheet] + "'";
  Logger.log(log);

  if (CACHE_SHEET_DATA) {
    let allSheetData_JSON = JSON.stringify(allSheetData);
    cache.put('allSheetData', allSheetData_JSON, 1800); //cache expiration time set to half an hour
  }

  return allSheetData;
}








function testSheetData() {
  let allSheetData = constructSheetData();

  Logger.log("Data SheetData:")
  Logger.log(allSheetData.data);

  Logger.log("Headers:")
  Logger.log(allSheetData.data.getHeaders());
  // Logger.log(allSheetData.data.getHeaders());
  // Logger.log(allSheetData.data.getHeaders());
  // Logger.log(allSheetData.data.getHeaders());


  let data = allSheetData.contact.getData();
  allSheetData.data.insertData(data);








  /*

  getIndex
  getKey
  hasIndex
  hasKey
  getHeaders
  getValues
  getData
  insertData
  insertValues
  getKeys
  getAllOfKey
  getAllOfIndex

  */
}

function clearAllSheetDataCache() {
  let cache = CacheService.getDocumentCache();
  cache.remove('allSheetData');
}









