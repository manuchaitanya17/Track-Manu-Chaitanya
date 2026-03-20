/**
*@NApiVersion 2.0
*@NScriptType UserEventScript
*/
/*****************************************************************************
 *  * Copyright (c) 2021 - Present Crowe LLP - All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Crowe LLP. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered with Crowe LLP.
*
* FILE NAME: c106397_lastSaleDate_lastPaymentDate_update.js
* DEVOPS TASK: ENH 106397, DT 106398
* AUTHOR: Manu Chaitanya
* DATE CREATED: 15/July/2025
* DESCRIPTION: This Script updates the Last Sale Date and Last Payment Date on Customer Record when the Invoice Record is saved.
*****************************************************************************/


define(['N/record', 'N/search', 'N/format', './Crowe_library_sf_ns.js'],
    function (record, search, format, library) {


        /* Custom Functions: 
           1. mergeObjects()
           2. getFormattedDate()
           3. getCurrencyCode()
           4. getTerritoryIdFromMaster()
           5. getCustomerFields() */

        function mergeObjects(obj1, obj2) {
            var result = {};
            for (var key in obj1) {
                if (obj1.hasOwnProperty(key)) result[key] = obj1[key];
            }
            for (var key in obj2) {
                if (obj2.hasOwnProperty(key)) result[key] = obj2[key];
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

                // log.debug("customerException", customrecord_crw_99017_territory_masterSearchObj1);
               
                

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
                            // ["custrecord_crw_99017_t_countryiso2", "is", countryIso2],
                            // "AND",
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
                            // ["custrecord_crw_99017_t_countryiso2", "is", countryIso2],
                            // "AND",
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


        function afterSubmit(context) {
            try {
                var newrec = context.newRecord;
                log.debug("After Submit Execited!");
                log.debug("type", context.type);


                // Run only on create
                if (context.type !== 'create' && context.type !== 'edit') return;
                var token = library.geturl();

                var recId = newrec.id;
                var recType = newrec.type;

                var rec = record.load({
                    type: recType,
                    id: recId,
                    isDynamic: true
                });

                var tranDate = new Date(rec.getValue('trandate'));
                var customerId = recType === 'customerpayment' ? rec.getValue('customer') : rec.getValue('entity');

                var customerRecord = record.load({
                    type: 'customer',
                    id: customerId,
                    isDynamic: true
                });

                var updateFields = {};

                if (recType === 'invoice') {
                    var currentLastSaleDate = customerRecord.getValue('custentity_crw_99895_lastsaledate');
                    currentLastSaleDate = (currentLastSaleDate) ? new Date(currentLastSaleDate) : null;
                    log.debug("tranDate", tranDate)
                    var invoiceSearch = search.create({
                        type: search.Type.INVOICE,
                        filters: [
                            ['customer.internalid', 'anyof', customerId],
                            "AND",
                            ["mainline", "is", "T"]
                        ],
                        columns: [
                            'tranid'
                        ]
                    }).run().getRange(0, 999);
                    log.debug("invoiceSearch", invoiceSearch.length);

                    if (invoiceSearch.length > 1) {
                        if (!currentLastSaleDate || currentLastSaleDate < tranDate) {
                            updateFields.custentity_crw_99895_lastsaledate = tranDate;
                        }
                    }
                    else {

                        log.debug("Here");
                        updateFields.custentity_crw_99895_lastsaledate = tranDate;
                    }

                    log.debug("Invoice Date Set");
                }

                else if (recType === 'customerpayment') {
                    var currentLastPaymentDate = customerRecord.getValue('custentity_crw_99895_lastpaymentdate');
                    currentLastPaymentDate = currentLastPaymentDate ? new Date(currentLastPaymentDate) : null;

                    var paymentSearch = search.create({
                        type: search.Type.CUSTOMER_PAYMENT,
                        filters: [
                            ['customer.internalid', 'anyof', customerId],
                            "AND",
                            ["mainline", "is", "T"]
                        ],
                        columns: [
                            'tranid'
                        ]
                    }).run().getRange(0, 999);
                    log.debug("paymentSearch", paymentSearch.length);

                    if (paymentSearch.length > 1) {
                        if (!currentLastPaymentDate || currentLastPaymentDate < tranDate) {
                            updateFields.custentity_crw_99895_lastpaymentdate = tranDate;
                        }
                    }
                    else {
                        updateFields.custentity_crw_99895_lastpaymentdate = tranDate;
                    }

                    log.debug("Payment Date Set");
                }

                // else if (recType == 'creditmemo') {
                //     record.submitFields({
                //         type: 'customer',
                //         id: customerId,
                //         values: {
                //             email: ''
                //         },
                //         options: {
                //             enableSourcing: false,
                //             ignoreMandatoryFields: true
                //         }
                //     });
                // }

                if (Object.keys(updateFields).length > 0) {
                    record.submitFields({
                        type: 'customer',
                        id: customerId,
                        values: updateFields,
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });
                }

                getCustomerFields(custId, token, runtime.executionContext);
            }

            catch (e) {
                log.error('Error in afterSubmit', e.message);
            }
        }



       function getCustomerFields(custId, token, runtimeexecutionContext) {
            try {

                var custRec = record.load({ type: record.Type.CUSTOMER, id: custId });
                var customerTypeField = custRec.getValue('custentity_crw_customeracctype');
                var customerTypeText = custRec.getText('custentity_crw_customeracctype');
                var now = new Date();
                var queuedObj = [];
                var hasError = false;
                var errorMessage = "Error Occured on Address Line: ";
                var billToSFID = "";
                var isInactive = custRec.getValue('isinactive');
                log.debug("isInactive", isInactive);
                var hasErrorForCategory = custRec.getValue('custentity_c106392_haserror');



                //Validation on Customer Type(Parent):
                if (customerTypeField == 2) {

                    //Getting Body Field Values:
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


                    //Creating JSON for Salesforce:
                    var reqJson = {
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
                    log.debug("Parent Customer JSON: ", reqJson);


                    // if (runtimeexecutionContext != 'RESTLET' && runtimeexecutionContext != 'SCHEDULED' && !isInactive) {
                    if (!hasErrorForCategory && runtimeexecutionContext != 'SCHEDULED' && !isInactive) {
                        var response = library.CallToSFDCAccount(JSON.stringify(reqJson), token);
                        if (response && typeof response === 'string') {
                            var sfResp = response.split("-");
                            if (sfResp[1] == 200) {
                                record.submitFields({
                                    type: record.Type.CUSTOMER,
                                    id: custId,
                                    values: {
                                        custentity_crw_99680_sfcustomer_id: sfResp[2].substring(0, sfResp[2].length),
                                        custentity_crw_100062_sfint_errormessage: ""
                                    }
                                });
                            }
                            else {
                                record.submitFields({
                                    type: record.Type.CUSTOMER,
                                    id: custId,
                                    values: {
                                        custentity_crw_100062_sfint_errormessage: sfResp[2]
                                    }
                                });
                            }
                        }
                    }
                    return;
                }

                //Validation on Customer Type(Bill To):
                // Main Fields:
                var billToCompanyName = custRec.getValue('companyname');
                var phoneNo = custRec.getValue('phone');
                var creditManagerID = custRec.getValue('custentity_100017_credit_manager');
                var creditManagerName = custRec.getText('custentity_100017_credit_manager');
                var primaryCurrency = getCurrencyCode(custRec.getValue('currency'));
                var terms = custRec.getText('terms');
                var emailId = custRec.getValue('email');
                var parentId = custRec.getValue('parent') || "";
                var dateCreated = custRec.getValue('datecreated');
                var sfIntegrationErrorMessageBody = custRec.getValue('custentity_crw_100062_sfint_errormessage');
                var categoryBodyField = custRec.getValue('category');
                var categoryNameBodyField = custRec.getText('category');
                var channelBodyField = custRec.getValue('custentity_95539_channel');
                var customerID = custRec.getText('entityid').split(" ")[0];
                var customerName = custRec.getText('companyname');
                var parentButNotSynced = false;


                //Parent ID Field:
                if (parentId) {
                    var sfIDParent = search.lookupFields({
                        type: search.Type.CUSTOMER,
                        id: parentId,
                        columns: ['custentity_crw_99680_sfcustomer_id']
                    }).custentity_crw_99680_sfcustomer_id;
                    log.debug("SF ID of Parent: ", sfIDParent);
                }
                if (parentId && !sfIDParent) {
                    parentButNotSynced = true;  
                }
                log.debug("customerID", customerID);
                log.debug("categoryBodyField", categoryBodyField);
                log.debug("channelBodyField", channelBodyField);
                log.debug("parentButNotSynced", parentButNotSynced);


                //Address Subsidiary Field:
                var subsidiaryID = custRec.getValue('subsidiary');
                var subsidiaryName = "";

                if (subsidiaryID) {
                    var subsidiary = record.load({ type: record.Type.SUBSIDIARY, id: subsidiaryID });
                    subsidiaryName = subsidiary.getText('custrecord_crw_99623_sub_short');
                }


                //Bill To Main Fields:
                var mainFieldJsonBillTo = {
                    customerTypeText: customerTypeText,
                    subsidiaryName: subsidiaryName,
                    emailId: emailId,
                    terms: terms,
                    billToCompanyName: billToCompanyName,
                    primaryCurrency: primaryCurrency,
                    dateCreated: getFormattedDate(dateCreated),
                    phone: phoneNo,
                    creditManagerName: creditManagerName,
                    parentId: sfIDParent,
                    internalId: custId,
                    lastSaleDate: getFormattedDate(custRec.getValue({ fieldId: 'custentity_crw_99895_lastsaledate' })),
                    lastPaymentDate: getFormattedDate(custRec.getValue({ fieldId: 'custentity_crw_99895_lastpaymentdate' })),
                    sfIntegrationErrorMessageBody: sfIntegrationErrorMessageBody
                };
                log.debug("Main Fields: ", mainFieldJsonBillTo);


                //Ship To Main Fields:
                var mainFieldJsonShipTo = {
                    customerTypeText: customerTypeText,
                    subsidiaryName: subsidiaryName,
                    terms: terms,
                    parentId: billToCompanyName,
                    primaryCurrency: primaryCurrency,
                    sfIntegrationErrorMessageBody: sfIntegrationErrorMessageBody,
                    dateCreated: getFormattedDate(dateCreated)
                };
                log.debug("Main Fields: ", mainFieldJsonShipTo);


                var isBilled = false;
                var addressCount = custRec.getLineCount({ sublistId: 'addressbook' });

                for (var i = 0; i < addressCount; i++) {
                    var isDefaultBilling = custRec.getSublistValue({ sublistId: 'addressbook', fieldId: 'defaultbilling', line: i });
                    var isDefaultShipping = custRec.getSublistValue({ sublistId: 'addressbook', fieldId: 'defaultshipping', line: i });
                    var addressSubrecord = custRec.getSublistSubrecord({ sublistId: 'addressbook', fieldId: 'addressbookaddress', line: i });
                    var lineID = custRec.getSublistValue({ sublistId: 'addressbook', fieldId: 'id', line: i });


                    //Setting Category and Channel Field on Address Subrecord(Updated 17/06)
                    addressSubrecord.setValue({
                        fieldId: 'custrecord_crw_category',
                        value: categoryNameBodyField
                    });

                    addressSubrecord.setValue({
                        fieldId: 'custrecord_crw_channel',
                        value: channelBodyField
                    });

                    addressSubrecord.setValue({
                        fieldId: 'custrecord_crw_sfintmessage',
                        value: sfIntegrationErrorMessageBody
                    });


                    //Customer-Address ID Field:
                    var customerAddressID = custId + '_' + lineID;
                    addressSubrecord.setValue({
                        fieldId: 'custrecord_crw_custadd_id',
                        value: customerAddressID
                    });
                    log.debug("customerAddressID", customerAddressID);


                    if (isDefaultBilling && addressSubrecord) {

                        //Other Address Fields:
                        var addressJson = {
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


                        //Address First Line(Cannada Special Case):
                        // if (addressJson.country == "Canada") {
                        //     var firstLineCanada = "";
                        //     var streetNumber = addressSubrecord.getValue('custrecord_streetnum') || "";
                        //     var streetName = addressSubrecord.getValue('custrecord_streetname') || "";
                        //     var streetType = addressSubrecord.getText('custrecord_streettype') || "";
                        //     var streetDirection = addressSubrecord.getText('custrecord_streetdirection') || "";
                        //     firstLineCanada = streetNumber + " " + streetName + " " + streetType + " " + streetDirection;

                        //     addressJson.addr1 = firstLineCanada;
                        // }


                        //Merging all the fields(Main + Address):
                        var reqJson = mergeObjects(mainFieldJsonBillTo, addressJson);


                        //Territory Field:
                        var territoryObj = getTerritoryIdFromMaster(custRec, addressJson.zip, addressJson.country, addressJson.categoryId, addressJson.channelId, addressJson.industry, custId, customerAddressID);
                        reqJson['territoryId'] = territoryObj.territoryId;
                        if(isCustomerTerritory){
                            reqJson['exceptionTerritory'] = territoryObj.territoryId;
                        }
                        else{
                            reqJson['exceptionTerritory'] = '';
                        }


                        if (territoryObj.territoryId) {
                            addressSubrecord.setValue({
                                fieldId: 'custrecord_crw_territory',
                                value: territoryObj.territoryId
                            });

                            addressSubrecord.setValue({
                                fieldId: 'custrecord_crw_territory_master',
                                value: territoryObj.masterRecordId
                            });
                        }


                        //Legacy ERP Formula Creation:
                        reqJson['customerType'] = 'Bill To';
                        reqJson['legacyERPFormula'] = 'CU_' + subsidiaryName + '_' + customerID;
                        reqJson['isBilled'] = true;
                        isBilled = true;
                        reqJson['addressLine'] = i;
                        reqJson['uniqueAddressLineId'] = lineID;

                        log.debug("Bill To Customer JSON: ", reqJson);


                        //Call Function:
                        if (!hasErrorForCategory && runtimeexecutionContext != 'SCHEDULED' && !isInactive && !parentButNotSynced) {
                        // if (runtimeexecutionContext != 'SCHEDULED' && !isInactive && !parentButNotSynced) {
                            var response = library.CallToSFDCAccount(JSON.stringify(reqJson), token);

                            if (response && typeof response === 'string') {
                                var sfResp = response.split("-");
                                if (sfResp[1] == 200) {
                                    addressSubrecord.setValue({
                                        fieldId: 'custrecord_crw_salesforce_id',
                                        value: sfResp[2]
                                    });
                                    addressSubrecord.setValue({
                                        fieldId: 'custrecord_crw_sfintmessage',
                                        value: ""
                                    });
                                    addressSubrecord.setValue({
                                        fieldId: 'custrecord_crw_salesrep',
                                        value: sfResp[3].substring(0, sfResp[3].length - 1)
                                    });

                                    billToSFID = sfResp[2];
                                    log.debug("billToSFID", billToSFID);

                                    hasError = hasError || false;
                                }
                                else {
                                    addressSubrecord.setValue({
                                        fieldId: 'custrecord_crw_sfintmessage',
                                        value: sfResp[2]
                                    });

                                    billToSFID = "";
                                    log.debug("billToSFID", billToSFID);

                                    errorMessage = errorMessage + lineID + ", ";
                                    hasError = true;
                                }
                                addressSubrecord.setValue({
                                    fieldId: 'custrecord_crw_sfsync_lrd',
                                    value: new Date()
                                });

                            }
                        }
                    }

                    else if (isBilled && addressSubrecord) {

                        //Other Address Fields:
                        var addressJson = {
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
                            email: custRec.getValue('email'),
                        };



                        //Address First Line(Cannada Special Case):
                        // if (addressJson.country == "Canada") {
                        //     var firstLineCanada = "";
                        //     var streetNumber = addressSubrecord.getValue('custrecord_streetnum') || "";
                        //     var streetName = addressSubrecord.getValue('custrecord_streetname') || "";
                        //     var streetType = addressSubrecord.getText('custrecord_streettype') || "";
                        //     var streetDirection = addressSubrecord.getText('custrecord_streetdirection') || "";
                        //     firstLineCanada = streetNumber + " " + streetName + " " + streetType + " " + streetDirection;

                        //     addressJson.addr1 = firstLineCanada;
                        // }


                        //Merging all the fields(Main + Address):
                        var reqJson = mergeObjects(mainFieldJsonShipTo, addressJson);


                        //Territory Field:
                        var territoryObj = getTerritoryIdFromMaster(custRec, addressJson.zip, addressJson.country, addressJson.categoryId, addressJson.channelId, addressJson.industry, custId, customerAddressID);
                        reqJson['territoryId'] = territoryObj.territoryId;
                        if(isCustomerTerritory){
                            reqJson['exceptionTerritory'] = territoryObj.territoryId;
                        }
                        else{
                            reqJson['exceptionTerritory'] = '';
                        }

                        if (territoryObj.territoryId) {
                            addressSubrecord.setValue({
                                fieldId: 'custrecord_crw_territory',
                                value: territoryObj.territoryId
                            });

                            addressSubrecord.setValue({
                                fieldId: 'custrecord_crw_territory_master',
                                value: territoryObj.masterRecordId
                            });
                        }


                        //Legacy ERP Formula Creation:
                        reqJson['customerType'] = 'Ship To';
                        reqJson['legacyERPFormula'] = 'CU_S_' + subsidiaryName + '_' + customerID + '_' + lineID;
                        reqJson['isBilled'] = true;
                        reqJson['addressLine'] = i;
                        reqJson['uniqueAddressLineId'] = lineID;

                        log.debug("billToSFID Ship To", billToSFID);
                        reqJson['parentId'] = billToSFID;

                        log.debug("Ship To Customer JSON: ", reqJson);


                        //Call Function:
                        // if (runtimeexecutionContext != 'RESTLET' && runtimeexecutionContext != 'SCHEDULED' && !isInactive && !parentButNotSynced) {
                        if (!hasErrorForCategory && runtimeexecutionContext != 'SCHEDULED' && !isInactive && !parentButNotSynced) {
                            var response = library.CallToSFDCAccount(JSON.stringify(reqJson), token);

                            if (response && typeof response === 'string') {
                                var sfResp = response.split("-");
                                if (sfResp[1] == 200) {
                                    addressSubrecord.setValue({
                                        fieldId: 'custrecord_crw_salesforce_id',
                                        value: sfResp[2]
                                    });
                                    addressSubrecord.setValue({
                                        fieldId: 'custrecord_crw_sfintmessage',
                                        value: ""
                                    });
                                    addressSubrecord.setValue({
                                        fieldId: 'custrecord_crw_salesrep',
                                        value: sfResp[3].substring(0, sfResp[3].length - 1)
                                    });
                                    hasError = hasError || false;
                                }
                                else {
                                    addressSubrecord.setValue({
                                        fieldId: 'custrecord_crw_sfintmessage',
                                        value: sfResp[2]
                                    });

                                    errorMessage = errorMessage + lineID + ", ";
                                    hasError = true;
                                }
                                addressSubrecord.setValue({
                                    fieldId: 'custrecord_crw_sfsync_lrd',
                                    value: new Date()
                                });

                            }
                        }
                    }

                    else {

                        //Other Address Fields:
                        var addressJson = {
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
                            email: custRec.getValue('email'),
                        };


                        //Address First Line(Cannada Special Case):
                        // if (addressJson.country == "Canada") {
                        //     var firstLineCanada = "";
                        //     var streetNumber = addressSubrecord.getValue('custrecord_streetnum') || "";
                        //     var streetName = addressSubrecord.getValue('custrecord_streetname') || "";
                        //     var streetType = addressSubrecord.getText('custrecord_streettype') || "";
                        //     var streetDirection = addressSubrecord.getText('custrecord_streetdirection') || "";
                        //     firstLineCanada = streetNumber + " " + streetName + " " + streetType + " " + streetDirection;

                        //     addressJson.addr1 = firstLineCanada;
                        // }


                        //Merging all the fields(Main + Address):
                        var reqJson = mergeObjects(mainFieldJsonShipTo, addressJson);


                        //Territory Field:
                        var territoryObj = getTerritoryIdFromMaster(custRec, addressJson.zip, addressJson.country, addressJson.categoryId, addressJson.channelId, addressJson.industry, custId, customerAddressID);
                        reqJson['territoryId'] = territoryObj.territoryId;
                        if(isCustomerTerritory){
                            reqJson['exceptionTerritory'] = territoryObj.territoryId;
                        }
                        else{
                            reqJson['exceptionTerritory'] = '';
                        }

                        if (territoryObj.territoryId) {
                            addressSubrecord.setValue({
                                fieldId: 'custrecord_crw_territory',
                                value: territoryObj.territoryId
                            });

                            addressSubrecord.setValue({
                                fieldId: 'custrecord_crw_territory_master',
                                value: territoryObj.masterRecordId
                            });
                        }


                        //Legacy ERP Formula Creation:
                        reqJson['customerType'] = 'Ship To';
                        reqJson['legacyERPFormula'] = 'CU_S_' + subsidiaryName + '_' + customerID + '_' + lineID;
                        reqJson['isBilled'] = false;
                        reqJson['addressLine'] = i;
                        reqJson['uniqueAddressLineId'] = lineID;

                        queuedObj.push(reqJson);
                    }
                }
                log.debug("Ship To Customer Before Bill To Customer JSON: ", queuedObj);


                //Creating Ship To Customers Before Default Billing Customers:
                if (isBilled && queuedObj.length > 0) {
                    for (var j = 0; j < queuedObj.length; j++) {
                        var req = queuedObj[j];

                        log.debug("billTosfID, Ship To Before Bill To: ", billToSFID);
                        req.parentId = billToSFID;


                        //Call Function:
                        // if (runtimeexecutionContext != 'RESTLET' && runtimeexecutionContext != 'SCHEDULED' && !isInactive && !parentButNotSynced) {
                        if (!hasErrorForCategory && runtimeexecutionContext != 'SCHEDULED' && !isInactive && !parentButNotSynced) {
                            var response = library.CallToSFDCAccount(JSON.stringify(req), token);

                            var addressSubrecord = custRec.getSublistSubrecord({
                                sublistId: 'addressbook',
                                fieldId: 'addressbookaddress',
                                line: req.addressLine
                            });

                            if (response && typeof response === 'string') {
                                var sfResp = response.split("-");
                                if (sfResp[1] == 200) {
                                    addressSubrecord.setValue({
                                        fieldId: 'custrecord_crw_salesforce_id',
                                        value: sfResp[2]

                                    });
                                    addressSubrecord.setValue({
                                        fieldId: 'custrecord_crw_sfintmessage',
                                        value: ""
                                    });
                                    addressSubrecord.setValue({
                                        fieldId: 'custrecord_crw_salesrep',
                                        value: sfResp[3].substring(0, sfResp[3].length - 1)
                                    });

                                    hasError = hasError || false;
                                }
                                else {
                                    addressSubrecord.setValue({
                                        fieldId: 'custrecord_crw_sfintmessage',
                                        value: sfResp[2]
                                    });

                                    errorMessage = errorMessage + req.uniqueAddressLineId + ", ";
                                    hasError = true;
                                }
                                addressSubrecord.setValue({
                                    fieldId: 'custrecord_crw_sfsync_lrd',
                                    value: new Date()
                                });

                            }
                        }
                    }
                }


                //Setting Error Message:
                log.debug('hasError', hasError);
                log.debug('errorMessage', errorMessage);

                if (hasError) {
                    custRec.setValue({
                        fieldId: 'custentity_crw_100062_sfint_errormessage',
                        value: errorMessage.substring(0, errorMessage.length - 2)
                    });
                }
                // else if (runtimeexecutionContext != 'RESTLET' && runtimeexecutionContext != 'SCHEDULED' && !parentButNotSynced) {
                else if (!hasErrorForCategory && runtimeexecutionContext != 'SCHEDULED' && !parentButNotSynced) {
                    custRec.setValue({
                        fieldId: 'custentity_crw_100062_sfint_errormessage',
                        value: ''
                    });
                }
                else if (parentButNotSynced){
                    custRec.setValue({
                        fieldId: 'custentity_crw_100062_sfint_errormessage',
                        value: 'The Parent Customer assoiciated with this Bill To Customer is not availale in Salesforce.'
                    });
                }


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
                    })
                }
                custRec.save();
            }
            catch (ex) {
                log.debug({ title: 'Error', details: ex.message });
            }
        }

        return {
            afterSubmit: afterSubmit
        };
    });