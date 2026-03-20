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
* FILE NAME: c106399_Sync_CreditMemo_NS_to_SF.js
* DEVOPS TASK: ENH 106399, DT 106400
* AUTHOR: Manu Chaitanya
* DATE CREATED: 15/July/2025
* DESCRIPTION: This Script syncs data from Credit Memo Record to SF.
*****************************************************************************/

define(['N/record', 'N/search', 'N/format', './Crowe_library_sf_ns.js'],
    function (record, search, format, library) {
        /* Custom Functions: 
            1. getFormattedDate()
            2. getCurrencyCode() */

        function getFormattedDate(date) {
            if (!date) return "";
            var jsDate = new Date(date);
            var month = (jsDate.getMonth() + 1);
            var day = jsDate.getDate();
            var year = jsDate.getFullYear();
            return (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day + '-' + year;
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


         function norm(s) {
            return (s || '').toString().replace(/\s+/g, ' ').trim().toUpperCase();
        }


        function extractAddrFromSubrecord(addrSubrec) {
            if (!addrSubrec) return null;
            return {
                addr1: norm(addrSubrec.getValue({ fieldId: 'addr1' })),
                addr2: norm(addrSubrec.getValue({ fieldId: 'addr2' })),
                city: norm(addrSubrec.getValue({ fieldId: 'city' })),
                state: norm(addrSubrec.getValue({ fieldId: 'state' })),
                zip: norm(addrSubrec.getValue({ fieldId: 'zip' })),
                country: norm(addrSubrec.getValue({ fieldId: 'country' }))
            };
        }


        function sameAddress(a, b) {
            if (!a || !b) return false;

            // Strict but practical match: addr1, city, country must match, others tolerant
            var coreMatch = a.addr1 === b.addr1 && a.city === b.city && a.country === b.country;
            var stateMatch = (a.state === b.state) || (!a.state && !b.state);
            var zipMatch = (a.zip === b.zip) || (!a.zip && !b.zip);
            var addr2Match = (a.addr2 === b.addr2) || (!a.addr2 && !b.addr2);

            return coreMatch && stateMatch && zipMatch && addr2Match;
        }

        
        function safeGetSubrecord(rec, fieldId) {
            try { return rec.getSubrecord({ fieldId: fieldId }); }
            catch (e) { return null; }
        }


        function beforeLoad(context) {
            try {

                //SF ID was automatically being set on Invoice, so making it blank at Body Level and Line Level:
                if (context.type == context.UserEventType.CREATE || context.type == context.UserEventType.COPY) {
                    var rec = context.newRecord;
                    rec.setValue({
                        fieldId: 'custbody_crw_100042_sf_id',
                        value: ''
                    });

                    var lineCount = rec.getLineCount({ sublistId: 'item' });
                    if (lineCount > 0) {
                        for (var i = 0; i < lineCount; i++) {
                            rec.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_crw_sf_id',
                                line: i,
                                value: ''
                            });
                        }
                    }
                }
            }
            catch (e) {
                log.error('Error in beforeLoad', e.message);
            }
        }



        function afterSubmit(context) {
            try {

                //Running afterSubmit() only on Create and Edit Mode:
                if (context.type !== 'create' && context.type !== 'edit') return;


                //Record ID:
                var rec = context.newRecord;
                var creditMemoId = rec.id;
                var creditMemoRecord = record.load({
                    type: record.Type.CREDIT_MEMO,
                    id: creditMemoId
                });


                //Custom Territory Field:
                var territoryId = "";
                var custId = creditMemoRecord.getValue('entity');


                //Credit Memo's Customer's ID:
                var custId = creditMemoRecord.getValue('entity');


                //Token:
                var token = library.geturl();
                log.debug('Token Code : ', token);


                //Calling getCustomerFields() to sync Customer's Added Line:
                getCustomerFields(custId, token);


                //Credit Memo's Customer ID Load:
                if (custId) {
                    var customerRec = record.load({
                        type: record.Type.CUSTOMER,
                        id: custId,
                        isDynamic: false
                    });
                }


                //Restriction-1: If there is no Customer Synced On SF, return setting an error message to Invoice Record:
                var customerHasValidSF = true;
                var addressCount = customerRec.getLineCount({ sublistId: 'addressbook' });

                for (var i = 0; i < addressCount; i++) {
                    var addressSubrecord = customerRec.getSublistSubrecord({
                        sublistId: 'addressbook',
                        fieldId: 'addressbookaddress',
                        line: i
                    });

                    var sfId = addressSubrecord.getValue({ fieldId: 'custrecord_crw_salesforce_id' });
                    log.debug("sfId", sfId)

                    if (!sfId) {
                        customerHasValidSF = false;
                        break;
                    }
                }

                if (!customerHasValidSF) {
                    var errMsg = '';
                    log.debug("The Update Field not running first!");

                    if (!customerHasValidSF) {
                        errMsg = "The Customer is not available on SF";
                    }

                    creditMemoRecord.setValue({
                        fieldId: 'custbody_crw_100042_sf_error',
                        value: errMsg
                    });

                    creditMemoRecord.save();
                    return;
                }


                //Restriction-2: If there is no SF ID in any of the Invoice's Item, then return setting an error message to Invoice Record:
                var itemIds = [];
                var lineCount = creditMemoRecord.getLineCount({ sublistId: 'item' }) || 0;
                log.debug("lineCount", lineCount);

                for (var i = 0; i < lineCount; i++) {
                    var id = creditMemoRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                    if (itemIds.indexOf(id) == -1) {
                        log.debug("id", id);
                        itemIds.push(id);
                    }

                }
                log.debug("itemIds", itemIds);


                var allItems = [];
                if (itemIds.length) {
                    allItems = search.create({
                        type: "item",
                        filters:
                            [
                                ["internalid", "anyof", itemIds]

                            ],
                        columns:
                            [
                                search.createColumn({ name: "internalid", label: "Internal ID" }),
                                search.createColumn({ name: "itemid", label: "Name" }),
                                search.createColumn({ name: "custitem_crw_99936_sf_itemid", label: "Salesforce ID" })
                            ]
                    }).run().getRange({ start: 0, end: 999 }) || [];
                }
                log.debug("allItems", allItems);
                log.debug("allItemslength", allItems.length);


                var itemSfidMap = {};
                for (var itemNo = 0; itemNo < allItems.length; itemNo++) {
                    var r = allItems[itemNo];
                    var iid = r.getValue({ name: 'internalid' });
                    var sfid = r.getValue({ name: 'custitem_crw_99936_sf_itemid' }) || '';
                    itemSfidMap[iid] = sfid;
                }
                log.debug("itemSfidMap", itemSfidMap);

                var itemMissingSFId = false;
                for (var j = 0; j < itemIds.length; j++) {
                    var key = itemIds[j];
                    if (!itemSfidMap[key]) {
                        itemMissingSFId = true;
                        break;
                    }
                }

                if (itemMissingSFId) {
                    creditMemoRecord.setValue({
                        fieldId: 'custbody_crw_100042_sf_error',
                        value: 'Item Record is not available on SF'
                    });
                    creditMemoRecord.save();
                    return;
                }


                //If all restriction passes we need to set it back to blank:
                creditMemoRecord.setValue({
                    fieldId: 'custbody_crw_100042_sf_error',
                    value: ''
                });


                //MAIN SYNC
                //Fetch Customer's Territory Field:
                // if (custId && custId != "" && custId != null) {
                //     var customerData = search.lookupFields({
                //         type: search.Type.CUSTOMER,
                //         id: custId,
                //         columns: ['custentity_crw_96305_cust_territory']
                //     });

                //     territoryId = customerData.custentity_crw_96305_cust_territory;
                // }







                //Sync Object:
                var reqJson = {};

                //Body Fields:
                reqJson['internalId'] = creditMemoId;
                reqJson['territory'] = territoryId;
                reqJson['poNumber'] = creditMemoRecord.getValue('otherrefnum') || "";


                //Tax Fields:
                var taxAmt = creditMemoRecord.getValue('taxtotal');
                var pstTax = creditMemoRecord.getValue('tax2total');
                var totalTax = 0;
                if (taxAmt && taxAmt != null && taxAmt != '') {
                    totalTax = totalTax + Number(taxAmt);
                }
                if (pstTax && pstTax != null && pstTax != '') {
                    totalTax = totalTax + Number(pstTax);
                }
                reqJson['tax'] = -Math.abs(totalTax) || 0;


                //Other Fields:
                // reqJson['customer'] = library.findCustomerInNS(creditMemoRecord.getValue('entity')) || "";
                reqJson['subtotal'] = -Math.abs(creditMemoRecord.getValue('subtotal')) || 0;
                reqJson['currencyCode'] = getCurrencyCode(creditMemoRecord.getValue('currency'));
                reqJson['trandate'] = getFormattedDate(creditMemoRecord.getValue('trandate'));
                reqJson['shippingMethod'] = creditMemoRecord.getText('shipmethod') || "";
                reqJson['location'] = creditMemoRecord.getText('location') || "";
                var subSF = library.findSubsidiaryInNS(creditMemoRecord.getValue('subsidiary'));
                reqJson['subsidiaryName'] = subSF
                reqJson['salesforceId'] = creditMemoRecord.getValue('custbody_crw_100042_sf_id');
                var cmName = creditMemoRecord.getValue('tranid');


                //ERP Name Creation:
                var ERPname = 'C_' + subSF + '_' + cmName;
                reqJson['Sfinvoicename'] = ERPname;


                //Created By Field:
                var custObj = search.lookupFields({
                    type: 'creditmemo',
                    id: creditMemoId,
                    columns: ['taxtotal', 'createdby']
                });
                log.debug('custObj', custObj);
                reqJson['createdBy'] = custObj.createdby[0].text;


                //Updated Field:
                reqJson['totalCUPSCost'] = creditMemoRecord.getValue('custbody_100322_total_cups_cost') || "";
                reqJson['createdfrom'] = creditMemoRecord.getText('createdfrom') || "";


                //Matching the Addresses from Customer to Invoice:
                var shipSub = safeGetSubrecord(creditMemoRecord, 'shippingaddress');
                var shipAddr = extractAddrFromSubrecord(shipSub);
                var matchedAddrSubrecord = null;

                if (shipAddr) {
                    for (var i = 0; i < addressCount; i++) {
                        var isDefaultBilling = customerRec.getSublistValue({
                            sublistId: 'addressbook',
                            fieldId: 'defaultbilling',
                            line: i
                        });

                        if (isDefaultBilling) continue;

                        var custAddrSub = customerRec.getSublistSubrecord({
                            sublistId: 'addressbook',
                            fieldId: 'addressbookaddress',
                            line: i
                        });

                        var custAddr = extractAddrFromSubrecord(custAddrSub);

                        if (sameAddress(shipAddr, custAddr)) {
                            matchedAddrSubrecord = custAddrSub;
                            break;
                        }
                    }
                } 
                else {
                    log.debug('Shipping subrecord not available on credit memo', { creditMemoId: creditMemoId });
                }

                if (matchedAddrSubrecord) {
                    reqJson['shipToCompanyName'] = matchedAddrSubrecord.getValue({ fieldId: 'custrecord_crw_company_name' }) || "";
                    reqJson['addr1'] = matchedAddrSubrecord.getValue({ fieldId: 'addr1' }) || "";
                    reqJson['city'] = matchedAddrSubrecord.getValue({ fieldId: 'city' }) || "";
                    reqJson['state'] = matchedAddrSubrecord.getText({ fieldId: 'state' }) || "";
                    reqJson['zip'] = matchedAddrSubrecord.getValue({ fieldId: 'zip' }) || "";
                    reqJson['country'] = matchedAddrSubrecord.getText({ fieldId: 'country' }) || "";
                    reqJson['customer'] = matchedAddrSubrecord.getValue({ fieldId: 'custrecord_crw_salesforce_id' }) || "";

                    var territoryIdOfMatchedAddress = matchedAddrSubrecord.getValue({ fieldId: 'custrecord_crw_territory' }) || "";
                    creditMemoRecord.setValue({
                        fieldId: 'custbody_96305_cust_territorytrans',
                        value: territoryIdOfMatchedAddress
                    });
                    reqJson['territory'] = territoryIdOfMatchedAddress;

                    log.debug('Territory set from matched default shipping address', territoryIdOfMatchedAddress);
                } 
                else {
                    log.debug('No match found among customer default shipping addresses', {
                        creditMemoId: creditMemoId,
                        customerId: custId,
                        shipAddr: shipAddr
                    });
                }   


                //Line Items(Item Record):
                var lineCount = creditMemoRecord.getLineCount({ sublistId: 'item' });
                reqJson['lineItems'] = [];

                for (var i = 0; i < lineCount; i++) {
                    var itemData = {
                        invoiceLinename: ERPname + '_' + (i + 1),
                        item: itemSfidMap[creditMemoRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i })] || "",
                        quantity: parseFloat(creditMemoRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i }) || 0),
                        rate: -Math.abs(parseFloat(creditMemoRecord.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i })) || 0),
                        extendedPrice: -Math.abs(parseFloat(creditMemoRecord.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i })) || 0),
                        //extendedCost: parseFloat(creditMemoRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_crw_extended_cost', line: i }) || 0),
                        cost: parseFloat(creditMemoRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_100322_cups_cost', line: i }) || 0),
                        lineNo: parseFloat(creditMemoRecord.getSublistValue({ sublistId: 'item', fieldId: 'line', line: i }) || 0),
                        sflineid: (creditMemoRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_crw_sf_id', line: i }) || "")
                    };
                    reqJson['lineItems'].push(itemData);
                }


                //Salesforce Sync:

                //JS Object to JSON:
                var jsonString = JSON.stringify(reqJson);
                log.debug('Credit Memo JSON to SFDC', jsonString);


                //Getting Response from SF:
                var response = library.CallToSFDCInvoice(jsonString, token);
                log.debug('SFDC Response', response);

                var intermediate = JSON.parse(response);
                var parsedResponse = JSON.parse(intermediate);
                var stsCode = parsedResponse.Status;
                var sfId = parsedResponse.RecordId;
                var itmDetails = parsedResponse.ItemDetail;
                log.debug('response details : ', sfId + ' == ' + stsCode);
                log.debug('response itmDetails : ', (itmDetails));
                log.debug('response itmDetails length : ', (itmDetails.length));

                if (stsCode && stsCode == 200) {
                    for (var j = 0; j < lineCount; j++) {
                        var line_no = creditMemoRecord.getSublistValue({ sublistId: 'item', fieldId: 'line', line: j });

                        log.debug('line_no : ', line_no);
                        for (var k = 0; k < itmDetails.length; k++) {
                            var sfLineno = itmDetails[k].LineNo;
                            var sfLineid = itmDetails[k].Id;

                            log.debug('sfLineno : ', sfLineno);
                            log.debug('sfLineid : ', sfLineid);


                            if (line_no == sfLineno) {
                                creditMemoRecord.setSublistValue({ sublistId: 'item', fieldId: 'custcol_crw_sf_id', line: j, value: sfLineid });
                                break;
                            }

                        }
                    }
                    creditMemoRecord.setValue({
                        fieldId: 'custbody_crw_100042_sf_id',
                        value: sfId
                    });
                    creditMemoRecord.setValue({
                        fieldId: 'custbody_crw_100042_sf_error',
                        value: ""
                    });

                    // if (territoryId) {
                    //     creditMemoRecord.setValue({
                    //         fieldId: 'custbody_96305_cust_territorytrans',
                    //         value: territoryId
                    //     });
                    // }

                }
                else {

                    creditMemoRecord.setValue({
                        fieldId: 'custbody_crw_100042_sf_error',
                        value: sfId
                    });
                }

                //Finally Saving Credit Memo Record:
                var recId = creditMemoRecord.save();
                log.debug('recId : ', recId);

            }
            catch (e) {
                log.error('Error syncing credit memo', e.message);
            }
        }

        function getCustomerFields(custId, token) {
            try {

                var custRec = record.load({ type: record.Type.CUSTOMER, id: custId });
                var customerTypeField = custRec.getValue('custentity_crw_customeracctype');
                var customerTypeText = custRec.getText('custentity_crw_customeracctype');
                var now = new Date();
                var queuedObj = [];
                var hasError = false;
                var errorMessage = "Error Occured on Address Line: ";
                var billToSFID = "";

                //Validation on Customer Type(Parent):
                if (customerTypeField == 2) {
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
                        subsidiaryName = subsidiary.getText('custrecord_crw_99623_sub_shortform');
                    }

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
                    return;
                }


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


                //Parent ID Field:
                if (parentId) {
                    var sfIDParent = search.lookupFields({
                        type: search.Type.CUSTOMER,
                        id: parentId,
                        columns: ['custentity_crw_99680_sfcustomer_id']
                    }).custentity_crw_99680_sfcustomer_id;
                    log.debug("SF ID of Parent: ", sfIDParent);
                }


                log.debug("customerID", customerID);
                log.debug("categoryBodyField", categoryBodyField);
                log.debug("channelBodyField", channelBodyField);



                //Address Subsidiary Field:
                var subsidiaryID = custRec.getValue('subsidiary');
                var subsidiaryName = "";

                if (subsidiaryID) {
                    var subsidiary = record.load({ type: record.Type.SUBSIDIARY, id: subsidiaryID });
                    subsidiaryName = subsidiary.getText('custrecord_crw_99623_sub_shortform');
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
                    sfIntegrationErrorMessageBody: sfIntegrationErrorMessageBody
                };
                log.debug("Main Fields: ", mainFieldJsonShipTo);


                var isBilled = false;
                var addressCount = custRec.getLineCount({ sublistId: 'addressbook' });

                for (var i = 0; i < addressCount; i++) 
				{
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


                    //Customer-Address ID Field:
                    var customerAddressID = custId + '_' + lineID;
                    addressSubrecord.setValue({
                        fieldId: 'custrecord_crw_custadd_id',
                        value: customerAddressID
                    });


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

                        log.audit("addressJson.sfId", addressJson.sfId);
                        log.audit("addressJson.sfIntegrationErrorMessageAddress", addressJson.sfIntegrationErrorMessageAddress);

						if(addressJson.sfId != '' || addressJson.sfIntegrationErrorMessageAddress != '')
						{
							continue;
						}
                        //Territory Field:
                        var territoryObj = getTerritoryIdFromMaster(custRec, addressJson.zip, addressJson.country, addressJson.categoryId, addressJson.channelId, addressJson.industry, custId, customerAddressID);
                        reqJson['territoryId'] = territoryObj.territoryId;

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

                                hasError = false;
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

						log.audit("addressJson.sfId2", addressJson.sfId);
                        log.audit("addressJson.sfIntegrationErrorMessageAddress2", addressJson.sfIntegrationErrorMessageAddress);

						if(addressJson.sfId != '' || addressJson.sfIntegrationErrorMessageAddress != '')
						{
							continue;
						}

                        //Territory Field:
                        var territoryObj = getTerritoryIdFromMaster(custRec, addressJson.zip, addressJson.country, addressJson.categoryId, addressJson.channelId, addressJson.industry, custId, customerAddressID);
                        reqJson['territoryId'] = territoryObj.territoryId;

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
                                hasError = false;
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

						log.audit("addressJson.sfId3", addressJson.sfId);
                        log.audit("addressJson.sfIntegrationErrorMessageAddress3", addressJson.sfIntegrationErrorMessageAddress);

						if(addressJson.sfId != '' || addressJson.sfIntegrationErrorMessageAddress != '')
						{
							continue;
						}
                        //Territory Field:
                        var territoryObj = getTerritoryIdFromMaster(custRec, addressJson.zip, addressJson.country, addressJson.categoryId, addressJson.channelId, addressJson.industry, custId, customerAddressID);
                        reqJson['territoryId'] = territoryObj.territoryId;

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

                                hasError = false;
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


                //Setting Error Message:
                if (hasError) {
                    custRec.setValue({
                        fieldId: 'custentity_crw_100062_sfint_errormessage',
                        value: errorMessage.substring(0, errorMessage.length - 1)
                    });
                }
                else {
                    custRec.setValue({
                        fieldId: 'custentity_crw_100062_sfint_errormessage',
                        value: ''
                    });
                }


                var customerSearchObj = search.create({
                    type: "customer",
                    filters: [
                        ["transaction.type", "anyof", "CustInvc", "CustCred"],
                        "AND",
                        ["transaction.mainline", "is", "T"],
                        "AND",
                        ["internalid", "anyof", custId]
                    ],
                    columns: [search.createColumn({ name: "internalid", join: "transaction" })]
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
                        return {
                            territoryId: customrecord_crw_99017_territory_masterSearchObj5[0].getValue('custrecord_crw_99017_t_territory'),
                            masterRecordId: customrecord_crw_99017_territory_masterSearchObj5[0].id
                        };
                    }
                }
            }


            // 7. Default fallback territory
            return {
                territoryId: "1234",
                masterRecordId: ""
            };
        }


        return {
            beforeLoad: beforeLoad,
            afterSubmit: afterSubmit
        };
    });

