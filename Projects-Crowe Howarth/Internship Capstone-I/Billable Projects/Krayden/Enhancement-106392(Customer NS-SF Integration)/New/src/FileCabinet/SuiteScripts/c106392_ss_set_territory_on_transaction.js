/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/log'], function (search, record, log) {

    // ---------- Helpers ----------
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
            country: norm(addrSubrec.getValue({ fieldId: 'country' })) // country code (e.g., US, IN)
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

    function buildCustomerAddressIndex(custRec) {
        var idx = [];
        var lineCount = custRec.getLineCount({ sublistId: 'addressbook' }) || 0;

        for (var i = 0; i < lineCount; i++) {
            var addrSubrec = custRec.getSublistSubrecord({
                sublistId: 'addressbook',
                fieldId: 'addressbookaddress',
                line: i
            });

            // Pull normalized address fields
            var addr = extractAddrFromSubrecord(addrSubrec);

            // Territory stored on the address *subrecord*
            var territory = addrSubrec ? addrSubrec.getValue({ fieldId: 'custrecord_crw_territory' }) : null;

            idx.push({
                addr: addr,
                territory: territory
            }); // [{addr: "", territory: 61}, {addr: "", territory: 63}, {addr: "", territory: 62}]
        }

        return idx;
    }

    function findTerritoryFromTransactionAddress(txRec, custAddrIndex) {
        // Try shipping first, then billing
        var shipSub = safeGetSubrecord(txRec, 'shippingaddress');
        var billSub = safeGetSubrecord(txRec, 'billingaddress');

        var shipAddr = extractAddrFromSubrecord(shipSub);
        var billAddr = extractAddrFromSubrecord(billSub);

        // Helper to search the index
        function searchIndex(targetAddr) {
            if (!targetAddr) return null;
            for (var j = 0; j < custAddrIndex.length; j++) {
                var entry = custAddrIndex[j];
                if (sameAddress(targetAddr, entry.addr)) {
                    return entry.territory || null;
                }
            }
            return null;
        }

        // Prefer shipping match
        var territory = searchIndex(shipAddr);
        if (territory) return territory;

        // Fallback to billing match
        return searchIndex(billAddr);
    }

    function execute(context) {
        try {
            var customerSearchObj = search.create({
                type: "customer",
                filters: [
                    ["transaction.type", "anyof", "CustInvc", "CustCred", "SalesOrd", "Estimate"],
                    "AND",
                    ["transaction.mainline", "is", "T"],
                    "AND",
                    ["custentitycrw_need_to_update_transaction", "is", "T"]
                ],
                columns: [
                    search.createColumn({ name: "internalid", join: "transaction", label: "Internal ID" }),
                    search.createColumn({ name: "type", join: "transaction", label: "Type" }),
                    search.createColumn({ name: "internalid", label: "Internal ID" })
                ]
            });

            var customerArray = customerSearchObj.run().getRange({ start: 0, end: 999 }) || []; //{{C1, T1}, {C1, T2}, {C2, T3}}
            log.debug("customerSearchObj count", customerArray.length);

            var customerMap = {};
            for (var i = 0; i < customerArray.length; i++) {
                var result = customerArray[i];
                var customerId = result.getValue({ name: 'internalid' });
                var transactionId = result.getValue({ name: 'internalid', join: 'transaction' });
                var transactionType = result.getValue({ name: 'type', join: 'transaction' });

              if (!customerMap[customerId]) {
                customerMap[customerId] = { invoices: [], creditMemos: [], salesOrders: [], quotes: [] }; //{C1: {invoices: [], creditMemos: [], salesOrders: [], quotes: []}}
              }

                if (transactionType === 'CustInvc') {
                    customerMap[customerId].invoices.push(transactionId); //{C1: {invoices: [T1], creditMemos: [T2], salesOrders: [], quotes: []}, C2: {invoices: [], creditMemos: [], salesOrders: [T3], quotes: []}}
                } 
                else if (transactionType === 'CustCred') {
                    customerMap[customerId].creditMemos.push(transactionId);
                } 
                else if (transactionType === 'SalesOrd') {
                    customerMap[customerId].salesOrders.push(transactionId);
                } 
                else if (transactionType === 'Estimate') {
                    customerMap[customerId].quotes.push(transactionId);
                }
            }

            log.debug("customerMap keys", Object.keys(customerMap));

            // ---- Process per customer ----
            for (var custId in customerMap) {
                if (!customerMap.hasOwnProperty(custId)) continue;

                var data = customerMap[custId];
                var allMatch = true;

                // Load customer once and index addresses
                var custRec = null;
                var addrIndex = [];  // [{addr: "", territory: 61}, {addr: "", territory: 63}, {addr: "", territory: 62}]
                try {
                    custRec = record.load({ type: record.Type.CUSTOMER, id: custId });
                    addrIndex = buildCustomerAddressIndex(custRec); 
                } 
                catch (e) {
                    log.error('Customer Load Error - ID: ' + custId, e.message);
                    allMatch = false;
                }

                // ---------- Invoices ----------
                for (var ii = 0; ii < data.invoices.length; ii++) {
                    var invId = data.invoices[ii];
                    try {
                        var invRec = record.load({ type: record.Type.INVOICE, id: invId });
                   

                        // === Inserted Logic: match transaction address -> customer address -> territory ===
                        var custTerritory = findTerritoryFromTransactionAddress(invRec, addrIndex);
                        log.debug("custTerritory", custTerritory);

                        if (!custTerritory) {
                            log.debug('No territory match for Invoice', 'Invoice ID ' + invId + ' (customer ' + custId + ')');
                            allMatch = false;
                        } 
                        else {
                            invRec.setValue({ fieldId: 'custbody_96305_cust_territorytrans', value: custTerritory });
                            log.debug("Territory Set Invoice");

                            invRec.save();

                            if (invRec.getValue('custbody_96305_cust_territorytrans') !== custTerritory) {
                                allMatch = false;
                            }
                        }
                    } 
                    catch (e) {
                        log.error('Invoice Error - ID: ' + invId, e.message);
                        allMatch = false;
                    }
                }

                // ---------- Credit Memos ----------
                for (var ic = 0; ic < data.creditMemos.length; ic++) {
                    var cmId = data.creditMemos[ic];
                    try {
                        var cmRec = record.load({ type: record.Type.CREDIT_MEMO, id: cmId });

                        // === Inserted Logic: match transaction address -> customer address -> territory ===
                        var cmTerritory = findTerritoryFromTransactionAddress(cmRec, addrIndex);
                        log.debug("cmTerritory", cmTerritory);


                        if (!cmTerritory) {
                            log.debug('No territory match for Credit Memo', 'CM ID ' + cmId + ' (customer ' + custId + ')');
                            allMatch = false;
                        }
                        else {
                            cmRec.setValue({ fieldId: 'custbody_96305_cust_territorytrans', value: cmTerritory });
                            cmRec.save();

                            if (cmRec.getValue('custbody_96305_cust_territorytrans') !== cmTerritory) {
                                allMatch = false;
                            }
                        }
                    }
                    catch (e) {
                        log.error('Credit Memo Error - ID: ' + cmId, e.message);
                        allMatch = false;
                    }
                }
             

               // ---------- Sales Orders ----------
                for (var is = 0; is < data.salesOrders.length; is++) {
                    var soId = data.salesOrders[is];
                    try {
                        var soRec = record.load({ type: record.Type.SALES_ORDER, id: soId });

                        // Match transaction address -> customer address -> territory
                        var soTerritory = findTerritoryFromTransactionAddress(soRec, addrIndex);
                        log.debug("soTerritory", soTerritory);

                        if (!soTerritory) {
                            log.debug('No territory match for Sales Order', 'SO ID ' + soId + ' (customer ' + custId + ')');
                            allMatch = false;
                        } 
                        else {
                            soRec.setValue({ fieldId: 'custbody_96305_cust_territorytrans', value: soTerritory });
                             const shippingAddressRecord = soRec.getSubrecord({
                                fieldId: 'shippingaddress'
                            });
                            shippingAddressRecord.setValue({
                                fieldId: 'custrecord_crw_territory',
                                value: soTerritory
                            });

                            log.debug("Territory Set SO");

                            soRec.save();
                              log.debug("So Saved");

                            if (soRec.getValue('custbody_96305_cust_territorytrans') !== soTerritory) {
                                allMatch = false;
                            }
                        }
                        // soRec.save();
                    } 
                    catch (e) {
                        log.error('Sales Order Error - ID: ' + soId, e.message);
                        allMatch = false;
                    }
                }

             


                // ---------- Quotes (Estimates) ----------
                for (var iq = 0; iq < data.quotes.length; iq++) {
                    var quoteId = data.quotes[iq];
                    try {
                        var quoteRec = record.load({ type: record.Type.ESTIMATE, id: quoteId });

                        // Match transaction address -> customer address -> territory
                        var qTerritory = findTerritoryFromTransactionAddress(quoteRec, addrIndex);
                        log.debug("qTerritory", qTerritory);


                        if (!qTerritory) {
                            log.debug('No territory match for Quote', 'Estimate ID ' + quoteId + ' (customer ' + custId + ')');
                            allMatch = false;
                        } 
                        else {
                            quoteRec.setValue({ fieldId: 'custbody_96305_cust_territorytrans', value: qTerritory });
                            const shippingAddressRecord = quoteRec.getSubrecord({
                                fieldId: 'shippingaddress'
                            });
                            shippingAddressRecord.setValue({
                                fieldId: 'custrecord_crw_territory',
                                value: qTerritory
                            });
                            log.debug("Territory Set Quotes");

                            quoteRec.save();

                            if (quoteRec.getValue('custbody_96305_cust_territorytrans') !== qTerritory) {
                                allMatch = false;
                            }
                        }
                    } catch (e) {
                        log.error('Quote (Estimate) Error - ID: ' + quoteId, e.message);
                        allMatch = false;
                    }
                }

                log.debug("allMatch for customer " + custId, allMatch);

                if (allMatch) {
                    try {
                        record.submitFields({
                            type: record.Type.CUSTOMER,
                            id: custId,
                            values: { custentitycrw_need_to_update_transaction: false }
                        });
                        log.debug('Checkbox Unchecked for Customer', custId);
                    } catch (e) {
                        log.debug('Uncheck Flag Error - Customer: ' + custId, e.message);
                    }
                }

            }
        }
        catch (e) {
            log.debug('Execution Error', e.message);
        }
    }

    return { execute: execute };
});
