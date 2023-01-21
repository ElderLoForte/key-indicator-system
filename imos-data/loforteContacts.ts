// Compiled using undefined undefined (TypeScript 4.9.4)
// Compiled using undefined undefined (TypeScript 4.9.4)
// Compiled using undefined undefined (TypeScript 4.9.4)
// Compiled using undefined undefined (TypeScript 4.9.4)
// Compiled using undefined undefined (TypeScript 4.9.4)
// @ts-nocheck
// Compiled using undefined undefined (TypeScript 4.9.4)
// Compiled using undefined undefined (TypeScript 4.9.4)
let group = ContactsApp.getContactGroup('IMOS Roster'); // Fetches group by groupname 
let contacts = group.getContacts(); // Fetches contact list of group 
let name3 = "";
function wrapper_boi() {
    let configData = {
        tabName: "Contact Data LoFoort",
        headerRow: 0,
        includeSoftcodedColumns: true,
        initialColumnOrder: {
            dateContactGenerated: 0,
            areaEmail: 1,
            areaName: 2,
            name1: 3,
            position1: 4,
            isTrainer1: 5,
            name2: 6,
            position2: 7,
            isTrainer2: 8,
            name3: 9,
            position3: 10,
            isTrainer3: 11,
            district: 12,
            zone: 13,
            unitString: 14,
            hasMultipleUnits: 15,
            languageString: 16,
            isSeniorCouple: 17,
            isSisterArea: 18,
            hasVehicle: 19,
            vehicleMiles: 20,
            vinLast8: 21,
            aptAddress: 22,
        },
    };
    let loForteContacts = new SheetData(new RawSheetData(configData));
    //let data = getContact();
    loForteContacts.setData(writeArray());
}

function writeArray() {
    let array1 = [];
    for (let contact of contacts) {
        array1.push(writeObject(contact));
    }
    return array1;
} // end wirteArray

function writeObject(contact) {
    let dateContactGenerated = contact.getLastUpdated();
    let areaEmail = contact.getEmails()[0].getAddress();
    let areaName = contact.getFamilyName();
    let name1 = getName(contact,1);
    //let name2 = getName(contact,2);
    let position1 = getPosition(contact, 1);
    let isTrainer1 = isTrainer(position1);
    let zone = getWhere(contact, 2);
    let district = getWhere(contact, 1);
    let isSisterArea = isSisterAreaFunc(contact);
    let isSeniorCouple = isSeniorCoupleFunc(contact);
    let hasVehicle = hasVehicleFunc(contact);
    let vehicleMiles = getMiles(hasVehicle, contact);
    let vinLast8 = getVin(hasVehicle, contact);
    //let aptAddress = contact.getAddresses()[0].getAddress(); // this isnt working!!!!
    //console.log(aptAddress);
    return {
        dateContactGenerated: dateContactGenerated,
        areaEmail: areaEmail,
        areaName: areaName,
        name1: name1,
        position1: position1,
        //name2: name2,
        zone: zone,
        district: district,
        isSisterArea: isSisterArea,
        isSeniorCouple: isSeniorCouple,
        vehicleMiles: vehicleMiles,
        hasVehicle: hasVehicle,
        vinLast8: vinLast8,
        //aptAddress: aptAddress,
        isTrainer1: isTrainer1
    };
}

function isTrainer(position) { // another way is to add all to an array and then call the array
  switch (position) {
    case "TR":
    case "DT":
    case "ZLT":
      return true
    default:
    return false
  } // end switch
} // end isTrainer

function getPosition(c, i) {
  return c.getEmails()[i].getLabel().toString().split(" ").slice(-1).join(" ").split("(")[1].split(")")[0]; // i = 1 for first person
}

function getWhere(c, i) {
    return c.getNotes().split("\n")[i];
}

// this is what i need to fix
function getContact() {
    for (let contact of contacts) {
        let unitString = contact.getNotes();
        let hasMultipleUnits = "IDK";
        let languageString = "IDk";
    } // end forLoop
} // end getContacts
function hasVehicleFunc(c) {
    if (c.getNotes().includes("Car")) {
        return true;
    }
} // end hasVehicleFunc
function getName(c, i) {
        return c.getEmails()[i].getLabel().toString().split(" ").slice(0, -1).join(" "); // i = 1 for first person
} // end getName
function getName3(c) {
    if (isTreo(c)) {
        return getName(c, 3);
    } // end if
} // end getName 3
function isAreaContact(c) {
    if (c.getEmails().length == 2) return true;
}
function isTreo(c) {
    if (c.getEmails().length >= 3) return true;
} // end isTreo
function isSisterAreaFunc(c) {
    if (c.getNotes().includes("Junior Sister")) return true;
} // end isSisterArea
function isSeniorCoupleFunc(c) {
    if (c.getNotes().includes("Senior Couple"))  return true;     
} // end isSeniorCoupleFunc
function getMiles(hasCar, c) {
    if (hasCar) {
        for (i = 1; i < 15; i++) {
            if (c.getNotes().split("\n")[i].includes("Vehicle Allowance/Mo:")) {
                return (c.getNotes().split("\n")[i].toString().split(" ")[2]) * 1;
            } // end if
        } // end for
    } // end if
} //  end function
function getVin(hasCar, c) {
    if (hasCar) {
        for (i = 1; i < 15; i++) {
            if (c.getNotes().split("\n")[i].includes("Vehicle VIN Last 8: ")) {
                return (c.getNotes().split("\n")[i].toString().split(" ")[4]);
            } // end if
        } // end for
    } // end if
} //  end function
