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
* FILE NAME: c106397_Sync_Invoice_NS_to_SF.js
* DEVOPS TASK: ENH 106397, DT 106398
* AUTHOR: Manu Chaitanya
* DATE CREATED: 15/July/2025
* DESCRIPTION: This script syncs Invoice Record data from NS to SF.
*****************************************************************************/


define(['N/record', 'N/search', 'N/format', './Crowe_library_sf_ns.js', 'N/ui/serverWidget'],
    function (record, search, format, library, serverWidget) {

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

                log.debug("Mode", context.type);

                //Running afterSubmit() only on Create and Edit Mode:
                if (context.type !== 'create' && context.type !== 'edit') return;


                //Record ID:
                var rec = context.newRecord;
                var invoiceId = rec.id;

                var invoiceRec = record.load({
                    type: record.Type.INVOICE,
                    id: invoiceId
                });


                //Custom Territory Field:
                var territoryId = "";


                //Invoice's Customer ID:
                var custId = invoiceRec.getValue('entity');
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

                log.debug("addressCount", addressCount);
                for (var i = 0; i < addressCount; i++) {
                    var addressSubrecord = customerRec.getSublistSubrecord({
                        sublistId: 'addressbook',
                        fieldId: 'addressbookaddress',
                        line: i
                    });

                    var sfId = addressSubrecord.getValue({ fieldId: 'custrecord_crw_salesforce_id' });
                    log.debug("sfId", sfId);


                    if (!sfId) {
                        customerHasValidSF = false;
                        break;
                    }
                }

                if (!customerHasValidSF) {
                    var errMsg = '';

                    if (!customerHasValidSF) {
                        errMsg = "The Customer is not available on SF";
                    }

                    invoiceRec.setValue({
                        fieldId: 'custbody_crw_100042_sf_error',
                        value: errMsg
                    });

                    invoiceRec.save();
                    return;
                }


                //Restriction-2: If there is no SF ID in any of the Invoice's Item, then return setting an error message to Invoice Record:
                var itemIds = [];
                var lineCount = invoiceRec.getLineCount({ sublistId: 'item' }) || 0;
                log.debug("lineCount", lineCount);

                for (var i = 0; i < lineCount; i++) {
                    var id = invoiceRec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
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
                    invoiceRec.setValue({
                        fieldId: 'custbody_crw_100042_sf_error',
                        value: 'Item Record is not available on SF'
                    });
                    invoiceRec.save();
                    return;
                }


                //If all restriction passes we need to set it back to blank:
                invoiceRec.setValue({
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
                // log.debug('territoryId', territoryId);


                //Token:
                var token = library.geturl();
                log.debug('Token Code : ', token);


                //Sync Object:
                var reqJson = {};

                //Body Fields:
                reqJson['internalId'] = invoiceId;
                reqJson['territory'] = territoryId;
                reqJson['poNumber'] = invoiceRec.getValue('otherrefnum') || "";


                //Tax Fields:
                var taxAmt = invoiceRec.getValue('taxtotal');
                var pstTax = invoiceRec.getValue('tax2total');
                var totalTax = 0;
                if (taxAmt && taxAmt != null && taxAmt != '') {
                    totalTax = totalTax + Number(taxAmt);
                }
                if (pstTax && pstTax != null && pstTax != '') {
                    totalTax = totalTax + Number(pstTax);
                }
                reqJson['tax'] = totalTax || 0;


                //Other Body Fields:
                reqJson['subtotal'] = invoiceRec.getValue('subtotal') || 0;
                reqJson['currencyCode'] = getCurrencyCode(invoiceRec.getValue('currency'));
                reqJson['trandate'] = getFormattedDate(invoiceRec.getValue('trandate'));
                reqJson['createdBy'] = invoiceRec.getText('createdby') || "";
                reqJson['shippingMethod'] = invoiceRec.getText('shipmethod') || "";
                reqJson['location'] = invoiceRec.getText('location') || "";


                //Subsidiary Field(Customer Record):
                var subSF = library.findSubsidiaryInNS(invoiceRec.getValue('subsidiary'));
                reqJson['subsidiaryName'] = subSF;
                reqJson['salesforceId'] = invoiceRec.getValue('custbody_crw_100042_sf_id');


                //Invoice Name Field:
                var invName = invoiceRec.getValue('tranid');


                //ERP Name Creation:
                var ERPname = 'I_' + subSF + '_' + invName;
                reqJson['Sfinvoicename'] = ERPname;


                //Created By Field:
                var custObj = search.lookupFields({
                    type: 'invoice',
                    id: invoiceId,
                    columns: ['taxtotal', 'createdby']
                });
                log.debug('custObj', custObj);
                reqJson['createdBy'] = custObj.createdby[0].text;


                //Updated Field:
                reqJson['totalCUPSCost'] = invoiceRec.getValue('custbody_100322_total_cups_cost') || 0;
                reqJson['createdfrom'] = invoiceRec.getText('createdfrom') || "";


                //Matching the Addresses from Customer to Invoice:
                var shipSub = safeGetSubrecord(invoiceRec, 'shippingaddress');
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
                    log.debug('Shipping subrecord not available on invoice', { invoiceId: invoiceId });
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
                    invoiceRec.setValue({
                        fieldId: 'custbody_96305_cust_territorytrans',
                        value: territoryIdOfMatchedAddress
                    });
                    reqJson['territory'] = territoryIdOfMatchedAddress;

                    log.debug('Territory set from matched default shipping address', territoryIdOfMatchedAddress);
                } 
                else {
                    log.debug('No match found among customer default shipping addresses', {
                        invoiceId: invoiceId,
                        customerId: custId,
                        shipAddr: shipAddr
                    });
                }


                // Line Items(Item Records):
                var lineCount = invoiceRec.getLineCount({ sublistId: 'item' });
                reqJson['lineItems'] = [];
                log.debug("lineCount", lineCount);

                for (var i = 0; i < lineCount; i++) {
                    var itemData =
                    {
                        invoiceLinename: ERPname + '_' + (i + 1),
                        item: itemSfidMap[invoiceRec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i })] || "",
                        quantity: parseFloat(invoiceRec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i }) || 0),
                        rate: parseFloat(invoiceRec.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i }) || 0),
                        extendedPrice: parseFloat(invoiceRec.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i }) || 0),
                        //extendedCost: parseFloat(invoiceRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_crw_extended_cost', line: i }) || 0),
                        cost: parseFloat(invoiceRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_100322_cups_cost', line: i }) || 0),
                        lineNo: parseFloat(invoiceRec.getSublistValue({ sublistId: 'item', fieldId: 'line', line: i }) || 0),
                        sflineid: (invoiceRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_crw_sf_id', line: i }) || "")
                    };
                    reqJson['lineItems'].push(itemData);
                }

                log.debug("reqJson", reqJson);


                //Salesforce Sync:

                //JS Object to JSON:
                var jsonString = JSON.stringify(reqJson);
                log.debug('Invoice JSON to SFDC', jsonString);


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
                        var line_no = invoiceRec.getSublistValue({ sublistId: 'item', fieldId: 'line', line: j });
                        log.debug('line_no : ', line_no);

                        for (var k = 0; k < itmDetails.length; k++) {
                            var sfLineno = itmDetails[k].LineNo;
                            var sfLineid = itmDetails[k].Id;

                            log.debug('sfLineno : ', sfLineno);
                            log.debug('sfLineid : ', sfLineid);


                            if (line_no == sfLineno) {
                                invoiceRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_crw_sf_id', line: j, value: sfLineid });
                                break;
                            }

                        }
                    }

                    //Setting SF ID for the Invoice:
                    invoiceRec.setValue({
                        fieldId: 'custbody_crw_100042_sf_id',
                        value: sfId
                    });
                    invoiceRec.setValue({
                        fieldId: 'custbody_crw_100042_sf_error',
                        value: ""
                    });

                    // if (territoryId) {
                    //     invoiceRec.setValue({
                    //         fieldId: 'custbody_96305_cust_territorytrans',
                    //         value: territoryId
                    //     });
                    // }

                }
                else {

                    invoiceRec.setValue({
                        fieldId: 'custbody_crw_100042_sf_error',
                        value: sfId
                    });
                }



                var recId = invoiceRec.save();
                log.debug('recId : ', recId);


            }

            catch (e) {
                log.error('Error syncing invoice', e.message);
            }

        }

        return {
            beforeLoad: beforeLoad,
            afterSubmit: afterSubmit
        };
    });