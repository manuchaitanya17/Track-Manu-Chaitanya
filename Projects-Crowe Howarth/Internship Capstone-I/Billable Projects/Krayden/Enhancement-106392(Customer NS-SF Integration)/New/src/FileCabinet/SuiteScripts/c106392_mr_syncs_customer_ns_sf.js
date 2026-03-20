/**
 *@NApiVersion 2.0
 *@NScriptType MapReduceScript
 */
/*****************************************************************************
 * MR Split Version:
 * - getInputData: build main fields JSON + emit one record per address line
 * - map: compute territory for each address line (heavy searches moved here)
 * - reduce: runs original getCustomerFields flow but uses territory results (NO territory searches here)
 *
 * Logic preserved from original UE script getCustomerFields(). :contentReference[oaicite:2]{index=2}
 *****************************************************************************/

define(['N/record', 'N/search', 'N/format', './Crowe_library_sf_ns.js', 'N/runtime'],
function (record, search, format, library, runtime) {

    var isCustomerTerritory = false;

    /***********************
     * Helpers (UNCHANGED)
     ***********************/
    function mergeObjects(obj1, obj2) {
        var result = {};
        for (var key in obj1) {
            if (obj1.hasOwnProperty(key)) result[key] = obj1[key];
        }
        for (var key2 in obj2) {
            if (obj2.hasOwnProperty(key2)) result[key2] = obj2[key2];
        }
        return result;
    }

    function getFormattedDate(date) {
        if (!date) return "";

        var jsDate = new Date(date);

        var month = (jsDate.getMonth() + 1);
        var day = jsDate.getDate();
        var year = jsDate.getFullYear();

        month = (month < 10 ? '0' : '') + month;
        day = (day < 10 ? '0' : '') + day;

        return month + '-' + day + '-' + year;
    }

    function getCurrencyCode(currencyId) {
        if (!currencyId) return null;

        var result = search.create({
            type: 'currency',
            filters: [['internalid', 'is', currencyId]],
            columns: ['symbol']
        }).run().getRange({ start: 0, end: 1 });

        if (result && result.length > 0) {
            return result[0].getValue('symbol');
        }
        return null;
    }

    /**********************************************************************
     * getTerritoryIdFromMaster (UNCHANGED)
     **********************************************************************/
    function getTerritoryIdFromMaster(custRec, zip, countryIso2, categoryId, channel, industry, custId, customerAddressID) {
        var customerId = custId;

        var countryIso2Map = {
            "United States": "US",
            "Canada": "CA",
            "Malaysia": "MY",
            "Philippines": "PH",
            "Thailand": "TH",
            "Singapore": "SG",
            "Vietnam": "VN",
            "India": "IN",
            "Mexico": "MX",
            "Australia": "AU",
            "China": "CN"
        };

        countryIso2 = countryIso2Map[countryIso2] || '';
        log.debug("countryIso2: ", countryIso2);

        // 1. Customer Specific Exception (Object Type = Customer)
        if (customerAddressID != "" && customerAddressID != null) {
            customerAddressID = customerAddressID.toString();
            var customrecord_crw_99017_territory_masterSearchObj1 = search.create({
                type: "customrecord_crw_99017_territory_master",
                filters:
                    [
                        ["custrecord_crw_99017_t_object_type", "anyof", "2"],
                        "AND",
                        ["custrecord_crw_99017_t_object_id", "is", customerAddressID],
                        "AND",
                        ["isinactive", "is", "F"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "custrecord_crw_99017_t_territory", label: "Territory" }),
                        search.createColumn({
                            name: "internalid",
                            sort: search.Sort.DESC,
                            label: "Internal ID"
                        })
                    ]
            }).run().getRange({ start: 0, end: 1 });

            if (customrecord_crw_99017_territory_masterSearchObj1.length > 0) {
                isCustomerTerritory = true;
                return {
                    territoryId: customrecord_crw_99017_territory_masterSearchObj1[0].getValue('custrecord_crw_99017_t_territory'),
                    masterRecordId: customrecord_crw_99017_territory_masterSearchObj1[0].id
                };
            }
        }

        // 2. Category Rule (Object Type = Category)
        if (categoryId != "" && categoryId != null) {
            var customrecord_crw_99017_territory_masterSearchObj2 = search.create({
                type: "customrecord_crw_99017_territory_master",
                filters:
                    [
                        ["custrecord_crw_99017_t_object_type", "anyof", "3"],
                        "AND",
                        ["custrecord_crw_99017_t_golocat", "is", categoryId],
                        "AND",
                        ["isinactive", "is", "F"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "custrecord_crw_99017_t_territory", label: "Territory" }),
                        search.createColumn({
                            name: "internalid",
                            sort: search.Sort.DESC,
                            label: "Internal ID"
                        })
                    ]
            }).run().getRange({ start: 0, end: 1 });

            if (customrecord_crw_99017_territory_masterSearchObj2.length > 0) {
                isCustomerTerritory = false;
                return {
                    territoryId: customrecord_crw_99017_territory_masterSearchObj2[0].getValue('custrecord_crw_99017_t_territory'),
                    masterRecordId: customrecord_crw_99017_territory_masterSearchObj2[0].id
                };
            }
        }

        // 3. Channel Rule (Object Type = Channel)
        if (countryIso2 != "" && channel != "") {
            var customrecord_crw_99017_territory_masterSearchObj3 = search.create({
                type: "customrecord_crw_99017_territory_master",
                filters:
                    [
                        ["custrecord_crw_99017_t_golocat", "is", channel],
                        "AND",
                        ["custrecord_crw_99017_t_object_type", "anyof", "4"],
                        "AND",
                        ["custrecord_crw_99017_t_object_id", "is", countryIso2],
                        "AND",
                        ["isinactive", "is", "F"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "custrecord_crw_99017_t_territory", label: "Territory" }),
                        search.createColumn({
                            name: "internalid",
                            sort: search.Sort.DESC,
                            label: "Internal ID"
                        })
                    ]
            }).run().getRange({ start: 0, end: 1 });

            log.debug("channelMatch: ", customrecord_crw_99017_territory_masterSearchObj3);

            if (customrecord_crw_99017_territory_masterSearchObj3.length > 0) {
                isCustomerTerritory = false;
                return {
                    territoryId: customrecord_crw_99017_territory_masterSearchObj3[0].getValue('custrecord_crw_99017_t_territory'),
                    masterRecordId: customrecord_crw_99017_territory_masterSearchObj3[0].id
                };
            }
        }

        // 4. Industry Rule (Object Type = Industry)
        if (countryIso2 != "" && industry != "") {
            log.debug("channel: ", industry);
            var customrecord_crw_99017_territory_masterSearchObj4 = search.create({
                type: "customrecord_crw_99017_territory_master",
                filters:
                    [
                        ["custrecord_crw_99017_t_object_type", "anyof", "5"],
                        "AND",
                        ["custrecord_crw_99017_t_golocat", "is", industry],
                        "AND",
                        ["custrecord_crw_99017_t_object_id", "is", countryIso2],
                        "AND",
                        ["isinactive", "is", "F"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "custrecord_crw_99017_t_territory", label: "Territory" }),
                        search.createColumn({
                            name: "internalid",
                            sort: search.Sort.DESC,
                            label: "Internal ID"
                        })
                    ]
            }).run().getRange({ start: 0, end: 1 });

            log.debug("channelMatch: ", customrecord_crw_99017_territory_masterSearchObj4);

            if (customrecord_crw_99017_territory_masterSearchObj4.length > 0) {
                isCustomerTerritory = false;
                return {
                    territoryId: customrecord_crw_99017_territory_masterSearchObj4[0].getValue('custrecord_crw_99017_t_territory'),
                    masterRecordId: customrecord_crw_99017_territory_masterSearchObj4[0].id
                };
            }
        }

        // 5. ZipCode Rule (Object Type = ZipCode)
        if (zip != "" && zip && zip != null && countryIso2 != "" && countryIso2 != null) {
            log.debug("countryIso2", countryIso2);

            var zipFilter;
            if (countryIso2 === 'PH') {
                var lastFour = zip.slice(-4);

                if (lastFour && lastFour.charAt(0) === '0') {
                    lastFour = lastFour.slice(1);
                }

                zipFilter = lastFour;
            }
            else if (countryIso2 === 'CA') {
                zipFilter = zip.substring(0, 3);
            }
            else {
                zipFilter = zip;
            }

            log.debug("zip: ", zipFilter);

            var customrecord_crw_99017_territory_masterSearchObj6 = search.create({
                type: "customrecord_crw_99017_territory_master",
                filters:
                    [
                        ["custrecord_crw_99017_t_countryiso2", "is", countryIso2],
                        "AND",
                        ["custrecord_crw_99017_t_object_type", "anyof", "1"],
                        "AND",
                        ["custrecord_crw_99017_t_object_id", "is", zipFilter],
                        "AND",
                        ["isinactive", "is", "F"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "custrecord_crw_99017_t_territory", label: "Territory" }),
                        search.createColumn({
                            name: "internalid",
                            sort: search.Sort.DESC,
                            label: "Internal ID"
                        })
                    ]
            }).run().getRange({ start: 0, end: 1 });

            log.debug("customrecord_crw_99017_territory_masterSearchObj6: ", customrecord_crw_99017_territory_masterSearchObj6);

            if (customrecord_crw_99017_territory_masterSearchObj6.length > 0) {
                isCustomerTerritory = false;

                return {
                    territoryId: customrecord_crw_99017_territory_masterSearchObj6[0].getValue('custrecord_crw_99017_t_territory'),
                    masterRecordId: customrecord_crw_99017_territory_masterSearchObj6[0].id
                };
            }
        }

        // 6. Country Exception Rule (Object Type = COUNTRY)
        if (countryIso2 != "") {
            const excludedCountries = ['US', 'CA', 'MY', 'PH', 'MX'];

            if (excludedCountries.indexOf(countryIso2) === -1) {
                var customrecord_crw_99017_territory_masterSearchObj5 = search.create({
                    type: "customrecord_crw_99017_territory_master",
                    filters:
                        [
                            ["custrecord_crw_99017_t_object_type", "anyof", "6"],
                            "AND",
                            ["custrecord_crw_99017_t_object_id", "is", countryIso2],
                            "AND",
                            ["isinactive", "is", "F"]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "custrecord_crw_99017_t_territory", label: "Territory" }),
                            search.createColumn({
                                name: "internalid",
                                sort: search.Sort.DESC,
                                label: "Internal ID"
                            })
                        ]
                }).run().getRange({ start: 0, end: 1 });

                if (customrecord_crw_99017_territory_masterSearchObj5.length > 0) {
                    isCustomerTerritory = false;

                    return {
                        territoryId: customrecord_crw_99017_territory_masterSearchObj5[0].getValue('custrecord_crw_99017_t_territory'),
                        masterRecordId: customrecord_crw_99017_territory_masterSearchObj5[0].id
                    };
                }
            }
        }

        isCustomerTerritory = false;
        // 7. Default fallback territory
        return {
            territoryId: "1234",
            masterRecordId: ""
        };
    }

    /**********************************************************************
     * getInputData
     * - Build main fields JSON once
     * - Emit: HEADER + one ADDR record per address line
     **********************************************************************/
    function getInputData() {
        var script = runtime.getCurrentScript();
        var custId = script.getParameter({ name: 'custscript_c106392_mr_customer_id' });
        var triggerContext = script.getParameter({ name: 'custscript_c106392_mr_trigger_context' }) || '';

        if (!custId) {
            log.error('Missing parameter', 'custscript_c106392_mr_customer_id');
            return [];
        }

        var custRec = record.load({ type: record.Type.CUSTOMER, id: custId });

        var customerTypeField = custRec.getValue('custentity_crw_customeracctype');
        var customerTypeText = custRec.getText('custentity_crw_customeracctype');
        var isInactive = custRec.getValue('isinactive');
        var hasErrorForCategory = custRec.getValue('custentity_c106392_haserror');

        // If Parent: we don’t need address inputs. Pass one record only.
        if (customerTypeField == 2) {
            // Build the Parent JSON exactly like original :contentReference[oaicite:3]{index=3}
            var companyName = custRec.getValue('companyname') || "";
            var phone = custRec.getValue('phone') || "";
            var primaryCurrency = getCurrencyCode(custRec.getValue('currency')) || "";
            var dateCreated = custRec.getValue('datecreated') || "";
            var sfId = custRec.getValue('custentity_crw_99680_sfcustomer_id') || "";
            var categoryId = custRec.getText('category') || "";
            var channelId = custRec.getText('custentity_95539_channel') || "";
            var customerID1 = custRec.getText('entityid').split(" ")[0];

            var subsidiaryID = custRec.getValue('subsidiary');
            var subsidiaryName = "";
            if (subsidiaryID) {
                var subsidiary = record.load({ type: record.Type.SUBSIDIARY, id: subsidiaryID });
                subsidiaryName = subsidiary.getText('custrecord_crw_99623_sub_short');
            }

            var parentReqJson = {
                customerTypeText: "Parent",
                subsidiaryName: subsidiaryName,
                companyName: companyName,
                primaryCurrency: primaryCurrency,
                dateCreated: getFormattedDate(dateCreated),
                phone: phone,
                internalId: custId,
                sfId: sfId,
                channelId: channelId,
                categoryId: categoryId,
                customerType: 'Parent',
                legacyERPFormula: 'CU_P_' + customerID1
            };

            return [{
                recType: 'PARENT',
                custId: custId,
                triggerContext: triggerContext,
                isInactive: isInactive,
                hasErrorForCategory: hasErrorForCategory,
                parentReqJson: parentReqJson
            }];
        }


        // Bill To / Ship To main fields (same as original) :contentReference[oaicite:4]{index=4}
        var billToCompanyName = custRec.getValue('companyname');
        var phoneNo = custRec.getValue('phone');
        var creditManagerName = custRec.getText('custentity_100017_credit_manager');
        var primaryCurrencyBillTo = getCurrencyCode(custRec.getValue('currency'));
        var terms = custRec.getText('terms');
        var emailId = custRec.getValue('email');
        var parentId = custRec.getValue('parent') || "";
        var dateCreatedBT = custRec.getValue('datecreated');
        var sfIntegrationErrorMessageBody = custRec.getValue('custentity_crw_100062_sfint_errormessage');
        var categoryNameBodyField = custRec.getText('category');
        var channelBodyField = custRec.getValue('custentity_95539_channel');
        var customerID = custRec.getText('entityid').split(" ")[0];
        var parentButNotSynced = false;
        var sfIDParent = "";

        if (parentId) {
            sfIDParent = search.lookupFields({
                type: search.Type.CUSTOMER,
                id: parentId,
                columns: ['custentity_crw_99680_sfcustomer_id']
            }).custentity_crw_99680_sfcustomer_id;
        }
        if (parentId && !sfIDParent) {
            parentButNotSynced = true;
        }

        var subsidiaryID2 = custRec.getValue('subsidiary');
        var subsidiaryName2 = "";
        if (subsidiaryID2) {
            var subsidiary2 = record.load({ type: record.Type.SUBSIDIARY, id: subsidiaryID2 });
            subsidiaryName2 = subsidiary2.getText('custrecord_crw_99623_sub_short');
        }

        var mainFieldJsonBillTo = {
            customerTypeText: customerTypeText,
            subsidiaryName: subsidiaryName2,
            emailId: emailId,
            terms: terms,
            billToCompanyName: billToCompanyName,
            primaryCurrency: primaryCurrencyBillTo,
            dateCreated: getFormattedDate(dateCreatedBT),
            phone: phoneNo,
            creditManagerName: creditManagerName,
            parentId: sfIDParent,
            internalId: custId,
            lastSaleDate: getFormattedDate(custRec.getValue({ fieldId: 'custentity_crw_99895_lastsaledate' })),
            lastPaymentDate: getFormattedDate(custRec.getValue({ fieldId: 'custentity_crw_99895_lastpaymentdate' })),
            sfIntegrationErrorMessageBody: sfIntegrationErrorMessageBody
        };

        var mainFieldJsonShipTo = {
            customerTypeText: customerTypeText,
            subsidiaryName: subsidiaryName2,
            terms: terms,
            parentId: billToCompanyName,
            primaryCurrency: primaryCurrencyBillTo,
            sfIntegrationErrorMessageBody: sfIntegrationErrorMessageBody,
            dateCreated: getFormattedDate(dateCreatedBT)
        };

        var addressCount = custRec.getLineCount({ sublistId: 'addressbook' });

        var input = [];

        // HEADER record for reduce()
        input.push({
            recType: 'HEADER',
            custId: custId,
            triggerContext: triggerContext,
            customerTypeText: customerTypeText,
            subsidiaryName: subsidiaryName2,
            customerID: customerID,
            categoryNameBodyField: categoryNameBodyField,
            channelBodyField: channelBodyField,
            sfIntegrationErrorMessageBody: sfIntegrationErrorMessageBody,
            hasErrorForCategory: hasErrorForCategory,
            isInactive: isInactive,
            parentButNotSynced: parentButNotSynced,
            sfIDParent: sfIDParent,
            mainFieldJsonBillTo: mainFieldJsonBillTo,
            mainFieldJsonShipTo: mainFieldJsonShipTo
        });

        
        // One ADDR record per address line for map()
        for (var i = 0; i < addressCount; i++) {
            input.push({
                recType: 'ADDR',
                custId: custId,
                addressLine: i
            });
        }

        return input;
    }

    /**********************************************************************
     * map
     * - HEADER: forward to reduce
     * - ADDR: compute territory for this address line and forward to reduce
     * - PARENT: do parent sync right here (no reduce needed)
     **********************************************************************/
    function map(context) {
        var data = context.value;
        if (typeof data === 'string') {
            data = JSON.parse(data);
        }

        if (data.recType === 'PARENT') {
            var tokenP = library.geturl();
            var reqJsonP = data.parentReqJson;
            var hasErrorForCategoryP = data.hasErrorForCategory;
            var isInactiveP = data.isInactive;
            var triggerContextP = data.triggerContext;

            log.debug("Parent Customer JSON: ", reqJsonP);

            if (!hasErrorForCategoryP && triggerContextP != 'SCHEDULED' && !isInactiveP) {
                var responseP = library.CallToSFDCAccount(JSON.stringify(reqJsonP), tokenP);
                if (responseP && typeof responseP === 'string') {
                    var sfRespP = responseP.split("-");
                    if (sfRespP[1] == 200) {
                        record.submitFields({
                            type: record.Type.CUSTOMER,
                            id: data.custId,
                            values: {
                                custentity_crw_99680_sfcustomer_id: sfRespP[2].substring(0, sfRespP[2].length),
                                custentity_crw_100062_sfint_errormessage: ""
                            }
                        });
                    } else {
                        record.submitFields({
                            type: record.Type.CUSTOMER,
                            id: data.custId,
                            values: {
                                custentity_crw_100062_sfint_errormessage: sfRespP[2]
                            }
                        });
                    }
                }
            }
            return;
        }

        if (data.recType === 'HEADER') {
            context.write({
                key: data.custId,
                value: JSON.stringify(data)
            });
            return;
        }

        if (data.recType === 'ADDR') {
            var custId = data.custId;
            var line = data.addressLine;

            // Load record for read only (per-map execution)
            var custRec = record.load({ type: record.Type.CUSTOMER, id: custId });

            var categoryNameBodyField = custRec.getText('category') || "";
            var channelBodyField = custRec.getValue('custentity_95539_channel') || "";

            var lineID = custRec.getSublistValue({ sublistId: 'addressbook', fieldId: 'id', line: line });
            var addressSubrecord = custRec.getSublistSubrecord({ sublistId: 'addressbook', fieldId: 'addressbookaddress', line: line });

            var zip = addressSubrecord ? (addressSubrecord.getValue('zip') || "") : "";
            var country = addressSubrecord ? (addressSubrecord.getText('country') || "") : "";
            var industry = addressSubrecord ? (addressSubrecord.getText('custrecord_crw_industry') || "") : "";

            var customerAddressID = custId + '_' + lineID;

            // Heavy part moved here:
            var territoryObj = getTerritoryIdFromMaster(
                custRec,
                zip,
                country,
                categoryNameBodyField,
                channelBodyField,
                industry,
                custId,
                customerAddressID
            );

            var isCustomerTerritoryLocal = isCustomerTerritory; // capture flag for this address

            context.write({
                key: custId,
                value: JSON.stringify({
                    recType: 'TERRITORY',
                    addressLine: line,
                    territoryId: territoryObj.territoryId,
                    masterRecordId: territoryObj.masterRecordId,
                    isCustomerTerritory: isCustomerTerritoryLocal
                })
            });

            return;
        }
    }

    /**********************************************************************
     * reduce
     * - Runs original getCustomerFields BillTo/ShipTo logic
     * - Uses territory results from map (NO getTerritoryIdFromMaster calls here)
     **********************************************************************/
    function reduce(context) {
        var custId = context.key;

        var header = null;
        var territoryByLine = {}; // addressLine -> territory data

        for (var i = 0; i < context.values.length; i++) {
            var obj = context.values[i];
            if (typeof obj === 'string') obj = JSON.parse(obj);

            if (obj.recType === 'HEADER') {
                header = obj;
            } 
            else if (obj.recType === 'TERRITORY') {
                territoryByLine[obj.addressLine] = obj;
            }
        }

        if (!header) {
            // Safety fallback: should not happen unless map(header) failed
            log.error('Missing HEADER in reduce', 'custId=' + custId);
            return;
        }

        var runtimeexecutionContext = header.triggerContext || '';

        // Token once per customer
        var token = library.geturl();

        // Load customer once for updates
        var custRec = record.load({ type: record.Type.CUSTOMER, id: custId });

        var customerTypeText = header.customerTypeText;
        var subsidiaryName = header.subsidiaryName;
        var customerID = header.customerID;
        var categoryNameBodyField = header.categoryNameBodyField;
        var channelBodyField = header.channelBodyField;
        var sfIntegrationErrorMessageBody = header.sfIntegrationErrorMessageBody;

        var hasErrorForCategory = header.hasErrorForCategory;
        var isInactive = header.isInactive;
        var parentButNotSynced = header.parentButNotSynced;

        var mainFieldJsonBillTo = header.mainFieldJsonBillTo;
        var mainFieldJsonShipTo = header.mainFieldJsonShipTo;

        var queuedObj = [];
        var hasError = false;
        var errorMessage = "Error Occured on Address Line: ";
        var billToSFID = "";

        var isBilled = false;
        var addressCount = custRec.getLineCount({ sublistId: 'addressbook' });

        for (var line = 0; line < addressCount; line++) {
            var isDefaultBilling = custRec.getSublistValue({ sublistId: 'addressbook', fieldId: 'defaultbilling', line: line });
            var isDefaultShipping = custRec.getSublistValue({ sublistId: 'addressbook', fieldId: 'defaultshipping', line: line });
            var addressSubrecord = custRec.getSublistSubrecord({ sublistId: 'addressbook', fieldId: 'addressbookaddress', line: line });
            var lineID = custRec.getSublistValue({ sublistId: 'addressbook', fieldId: 'id', line: line });

            // Setting Category and Channel Field on Address Subrecord (same)
            addressSubrecord.setValue({ fieldId: 'custrecord_crw_category', value: categoryNameBodyField });
            addressSubrecord.setValue({ fieldId: 'custrecord_crw_channel', value: channelBodyField });
            addressSubrecord.setValue({ fieldId: 'custrecord_crw_sfintmessage', value: sfIntegrationErrorMessageBody });

            // Customer-Address ID Field (same)
            var customerAddressID = custId + '_' + lineID;
            addressSubrecord.setValue({ fieldId: 'custrecord_crw_custadd_id', value: customerAddressID });

            // Territory from map result
            var terr = territoryByLine[line];
            var territoryObj = {
                territoryId: terr ? terr.territoryId : "1234",
                masterRecordId: terr ? terr.masterRecordId : ""
            };
            var isCustomerTerritoryForThisLine = terr ? terr.isCustomerTerritory : false;

            if (territoryObj.territoryId) {
                addressSubrecord.setValue({ fieldId: 'custrecord_crw_territory', value: territoryObj.territoryId });
                addressSubrecord.setValue({ fieldId: 'custrecord_crw_territory_master', value: territoryObj.masterRecordId });
            }

            if (isDefaultBilling && addressSubrecord) {

                var addressJsonBill = {
                    addr1: addressSubrecord.getValue('addr1') || "",
                    city: addressSubrecord.getValue('city') || "",
                    state: addressSubrecord.getValue('state') || "",
                    zip: addressSubrecord.getValue('zip') || "",
                    country: addressSubrecord.getText('country') || "",
                    categoryId: categoryNameBodyField || "",
                    channelId: channelBodyField || "",
                    submarket: addressSubrecord.getText('custrecord_crw_submarket') || "",
                    industry: addressSubrecord.getText('custrecord_crw_industry') || "",
                    endMarket: addressSubrecord.getText('custrecord_crw_endmarket') || "",
                    salesRep: addressSubrecord.getText('custrecord_crw_salesrep') || "",
                    sfId: addressSubrecord.getValue('custrecord_crw_salesforce_id') || "",
                    sfIntegrationErrorMessageAddress: addressSubrecord.getValue('custrecord_crw_sfintmessage') || "",
                    sfLastRunDate: addressSubrecord.getValue('custrecord_crw_sfsync_lrd') || ""
                };

                var reqJsonBill = mergeObjects(mainFieldJsonBillTo, addressJsonBill);

                reqJsonBill['territoryId'] = territoryObj.territoryId;
                if (isCustomerTerritoryForThisLine) {
                    reqJsonBill['exceptionTerritory'] = territoryObj.territoryId;
                } else {
                    reqJsonBill['exceptionTerritory'] = '';
                }

                reqJsonBill['customerType'] = 'Bill To';
                reqJsonBill['legacyERPFormula'] = 'CU_' + subsidiaryName + '_' + customerID;
                reqJsonBill['isBilled'] = true;
                isBilled = true;
                reqJsonBill['addressLine'] = line;
                reqJsonBill['uniqueAddressLineId'] = lineID;

                log.debug("Bill To Customer JSON: ", reqJsonBill);

                if (!hasErrorForCategory && runtimeexecutionContext != 'SCHEDULED' && !isInactive && !parentButNotSynced) {
                    var responseBill = library.CallToSFDCAccount(JSON.stringify(reqJsonBill), token);

                    if (responseBill && typeof responseBill === 'string') {
                        var sfRespBill = responseBill.split("-");
                        if (sfRespBill[1] == 200) {
                            addressSubrecord.setValue({ fieldId: 'custrecord_crw_salesforce_id', value: sfRespBill[2] });
                            addressSubrecord.setValue({ fieldId: 'custrecord_crw_sfintmessage', value: "" });
                            addressSubrecord.setValue({ fieldId: 'custrecord_crw_salesrep', value: sfRespBill[3].substring(0, sfRespBill[3].length - 1) });

                            billToSFID = sfRespBill[2];
                            hasError = hasError || false;
                        } 
                        else {
                            addressSubrecord.setValue({ fieldId: 'custrecord_crw_sfintmessage', value: sfRespBill[2] });

                            billToSFID = "";
                            errorMessage = errorMessage + lineID + ", ";
                            hasError = true;
                        }

                        addressSubrecord.setValue({ fieldId: 'custrecord_crw_sfsync_lrd', value: new Date() });
                    }
                }

            } 
            else if (isBilled && addressSubrecord) {

                var addressJsonShip = {
                    addr1: addressSubrecord.getValue('addr1') || "",
                    city: addressSubrecord.getValue('city') || "",
                    state: addressSubrecord.getValue('state') || "",
                    zip: addressSubrecord.getValue('zip') || "",
                    country: addressSubrecord.getText('country') || "",
                    categoryId: categoryNameBodyField || "",
                    channelId: channelBodyField || "",
                    submarket: addressSubrecord.getText('custrecord_crw_submarket') || "",
                    industry: addressSubrecord.getText('custrecord_crw_industry') || "",
                    endMarket: addressSubrecord.getText('custrecord_crw_endmarket') || "",
                    salesRep: addressSubrecord.getText('custrecord_crw_salesrep') || "",
                    sfId: addressSubrecord.getValue('custrecord_crw_salesforce_id') || "",
                    sfIntegrationErrorMessageAddress: addressSubrecord.getValue('custrecord_crw_sfintmessage') || "",
                    sfLastRunDate: addressSubrecord.getValue('custrecord_crw_sfsync_lrd') || "",
                    companyName: addressSubrecord.getValue('custrecord_crw_company_name'),
                    internalId: custId,
                    phone: addressSubrecord.getValue('addrphone'),
                    email: custRec.getValue('email')
                };

                var reqJsonShip = mergeObjects(mainFieldJsonShipTo, addressJsonShip);

                reqJsonShip['territoryId'] = territoryObj.territoryId;
                if (isCustomerTerritoryForThisLine) {
                    reqJsonShip['exceptionTerritory'] = territoryObj.territoryId;
                } else {
                    reqJsonShip['exceptionTerritory'] = '';
                }

                reqJsonShip['customerType'] = 'Ship To';
                reqJsonShip['legacyERPFormula'] = 'CU_S_' + subsidiaryName + '_' + customerID + '_' + lineID;
                reqJsonShip['isBilled'] = true;
                reqJsonShip['addressLine'] = line;
                reqJsonShip['uniqueAddressLineId'] = lineID;

                reqJsonShip['parentId'] = billToSFID;

                log.debug("Ship To Customer JSON: ", reqJsonShip);

                if (!hasErrorForCategory && runtimeexecutionContext != 'SCHEDULED' && !isInactive && !parentButNotSynced) {
                    var responseShip = library.CallToSFDCAccount(JSON.stringify(reqJsonShip), token);

                    if (responseShip && typeof responseShip === 'string') {
                        var sfRespShip = responseShip.split("-");
                        if (sfRespShip[1] == 200) {
                            addressSubrecord.setValue({ fieldId: 'custrecord_crw_salesforce_id', value: sfRespShip[2] });
                            addressSubrecord.setValue({ fieldId: 'custrecord_crw_sfintmessage', value: "" });
                            addressSubrecord.setValue({ fieldId: 'custrecord_crw_salesrep', value: sfRespShip[3].substring(0, sfRespShip[3].length - 1) });

                            hasError = hasError || false;
                        } else {
                            addressSubrecord.setValue({ fieldId: 'custrecord_crw_sfintmessage', value: sfRespShip[2] });

                            errorMessage = errorMessage + lineID + ", ";
                            hasError = true;
                        }

                        addressSubrecord.setValue({ fieldId: 'custrecord_crw_sfsync_lrd', value: new Date() });
                    }
                }

            } 
            else {
                var addressJsonQueue = {
                    addr1: addressSubrecord.getValue('addr1') || "",
                    city: addressSubrecord.getValue('city') || "",
                    state: addressSubrecord.getValue('state') || "",
                    zip: addressSubrecord.getValue('zip') || "",
                    country: addressSubrecord.getText('country') || "",
                    categoryId: categoryNameBodyField || "",
                    channelId: channelBodyField || "",
                    submarket: addressSubrecord.getText('custrecord_crw_submarket') || "",
                    industry: addressSubrecord.getText('custrecord_crw_industry') || "",
                    endMarket: addressSubrecord.getText('custrecord_crw_endmarket') || "",
                    salesRep: addressSubrecord.getText('custrecord_crw_salesrep') || "",
                    sfId: addressSubrecord.getValue('custrecord_crw_salesforce_id') || "",
                    sfIntegrationErrorMessageAddress: addressSubrecord.getValue('custrecord_crw_sfintmessage') || "",
                    sfLastRunDate: addressSubrecord.getValue('custrecord_crw_sfsync_lrd') || "",
                    companyName: addressSubrecord.getValue('custrecord_crw_company_name'),
                    internalId: custId,
                    phone: addressSubrecord.getValue('addrphone'),
                    email: custRec.getValue('email')
                };

                var reqJsonQueue = mergeObjects(mainFieldJsonShipTo, addressJsonQueue);

                reqJsonQueue['territoryId'] = territoryObj.territoryId;
                if (isCustomerTerritoryForThisLine) {
                    reqJsonQueue['exceptionTerritory'] = territoryObj.territoryId;
                } else {
                    reqJsonQueue['exceptionTerritory'] = '';
                }

                reqJsonQueue['customerType'] = 'Ship To';
                reqJsonQueue['legacyERPFormula'] = 'CU_S_' + subsidiaryName + '_' + customerID + '_' + lineID;
                reqJsonQueue['isBilled'] = false;
                reqJsonQueue['addressLine'] = line;
                reqJsonQueue['uniqueAddressLineId'] = lineID;

                queuedObj.push(reqJsonQueue);
            }
        }

        log.debug("Ship To Customer Before Bill To Customer JSON: ", queuedObj);

        // Creating Ship To Customers Before Default Billing Customers (same)
        if (isBilled && queuedObj.length > 0) {
            for (var j = 0; j < queuedObj.length; j++) {
                var req = queuedObj[j];

                req.parentId = billToSFID;

                if (!hasErrorForCategory && runtimeexecutionContext != 'SCHEDULED' && !isInactive && !parentButNotSynced) {
                    var responseQ = library.CallToSFDCAccount(JSON.stringify(req), token);

                    var addressSubrecordQ = custRec.getSublistSubrecord({
                        sublistId: 'addressbook',
                        fieldId: 'addressbookaddress',
                        line: req.addressLine
                    });

                    if (responseQ && typeof responseQ === 'string') {
                        var sfRespQ = responseQ.split("-");  
                        if (sfRespQ[1] == 200) {
                            addressSubrecordQ.setValue({ fieldId: 'custrecord_crw_salesforce_id', value: sfRespQ[2] });
                            addressSubrecordQ.setValue({ fieldId: 'custrecord_crw_sfintmessage', value: "" });
                            addressSubrecordQ.setValue({ fieldId: 'custrecord_crw_salesrep', value: sfRespQ[3].substring(0, sfRespQ[3].length - 1) });

                            hasError = hasError || false;
                        } 
                        else {
                            addressSubrecordQ.setValue({ fieldId: 'custrecord_crw_sfintmessage', value: sfRespQ[2] });

                            errorMessage = errorMessage + req.uniqueAddressLineId + ", ";
                            hasError = true;
                        }

                        addressSubrecordQ.setValue({ fieldId: 'custrecord_crw_sfsync_lrd', value: new Date() });
                    }
                }
            }
        }

        // Setting Error Message (same)
        log.debug('hasError', hasError);
        log.debug('errorMessage', errorMessage);

        if (hasError) {
            custRec.setValue({
                fieldId: 'custentity_crw_100062_sfint_errormessage',
                value: errorMessage.substring(0, errorMessage.length - 2)
            });
        }
        else if (!hasErrorForCategory && runtimeexecutionContext != 'SCHEDULED' && !parentButNotSynced) {
            custRec.setValue({
                fieldId: 'custentity_crw_100062_sfint_errormessage',
                value: ''
            });
        }
        else if (parentButNotSynced) {
            custRec.setValue({
                fieldId: 'custentity_crw_100062_sfint_errormessage',
                value: 'The Parent Customer assoiciated with this Bill To Customer is not availale in Salesforce.'
            });
        }

        // Transaction Search (same as original) :contentReference[oaicite:5]{index=5}
        var customerSearchObj = search.create({
            type: "customer",
            filters: [
                ["transaction.type", "anyof", "CustInvc", "CustCred", "SalesOrd", "Estimate"],
                "AND",
                ["transaction.mainline", "is", "T"],
                "AND",
                ["internalid", "anyof", custId]
            ],
            columns: [
                search.createColumn({ name: "internalid", join: "transaction" })
            ]
        }).run().getRange(0, 999);

        if (customerSearchObj.length > 0) {
            custRec.setValue({
                fieldId: 'custentitycrw_need_to_update_transaction',
                value: true
            });
        }

        custRec.save();
    }

    function summarize(summary) {
        try {
            if (summary.inputSummary && summary.inputSummary.error) {
                log.error('Input Error', summary.inputSummary.error);
            }

            summary.mapSummary.errors.iterator().each(function (key, error) {
                log.error('Map Error for key: ' + key, error);
                return true;
            });

            summary.reduceSummary.errors.iterator().each(function (key, error) {
                log.error('Reduce Error for key: ' + key, error);
                return true;
            });

            log.audit('MR Summary',
                'Total seconds: ' + summary.seconds +
                ', Total usage: ' + summary.usage +
                ', Yields: ' + summary.yields);
        } catch (e) {
            log.error('Summarize Error', e);
        }
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});
