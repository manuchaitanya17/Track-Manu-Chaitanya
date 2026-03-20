/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/log', 'N/cache', 'N/runtime'], function (search, record, log, cache, runtime) {

    //Script Constants:
    var BODY_TERRITORY_FIELD = 'custbody_96305_cust_territorytrans';
    var CUSTOMER_NEEDS_UPDATE_FIELD = 'custentitycrw_need_to_update_transaction';
    var ADDRESS_TERRITORY_FIELD = 'custrecord_crw_territory';


    //Helpers:
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

        //Strict but practical match: addr1, city, country must match, others tolerant
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

            var addr = extractAddrFromSubrecord(addrSubrec);
            var territory = addrSubrec ? addrSubrec.getValue({ fieldId: ADDRESS_TERRITORY_FIELD }) : null;

            idx.push({
                addr: addr,
                territory: territory
            });
        }
        return idx;
    }


    function findTerritoryFromTransactionAddress(txRec, custAddrIndex) {
        var shipSub = safeGetSubrecord(txRec, 'shippingaddress');
        var billSub = safeGetSubrecord(txRec, 'billingaddress');

        var shipAddr = extractAddrFromSubrecord(shipSub);
        var billAddr = extractAddrFromSubrecord(billSub);

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

        var territory = searchIndex(shipAddr);
        if (territory) return territory;
        return searchIndex(billAddr);
    }


    function normalizeSearchValue(v) {
        if (Array.isArray(v)) v = v[0];
        if (v && typeof v === 'object') {
            if (Object.prototype.hasOwnProperty.call(v, 'value')) return v.value;
        }
        return v;
    }


    function getResultValue(resultObj, key, fallbackRegex) {
        if (!resultObj || !resultObj.values) return null;

        if (Object.prototype.hasOwnProperty.call(resultObj.values, key)) {
            return normalizeSearchValue(resultObj.values[key]);
        }

        if (fallbackRegex) {
            for (var k in resultObj.values) {
                if (Object.prototype.hasOwnProperty.call(resultObj.values, k) && fallbackRegex.test(k)) {
                    return normalizeSearchValue(resultObj.values[k]);
                }
            }
        }
        return null;
    }


    function getNsRecordType(transactionType) {
        if (transactionType === 'CustInvc') return record.Type.INVOICE;
        if (transactionType === 'CustCred') return record.Type.CREDIT_MEMO;
        if (transactionType === 'SalesOrd') return record.Type.SALES_ORDER;
        if (transactionType === 'Estimate') return record.Type.ESTIMATE;
        return null;
    }


    function getCustomerAddressIndexCached(customerId) {
        var custRec = record.load({ type: record.Type.CUSTOMER, id: customerId });
        var addrIndex = buildCustomerAddressIndex(custRec);
        return addrIndex;
    }


    //getInputData():
    function getInputData() {
        return search.create({
            type: "customer",
            filters: [
                ["internalid", "is", "82539"],
                "AND",
                ["transaction.type", "anyof", "CustInvc", "CustCred", "SalesOrd", "Estimate"],
                "AND",
                ["transaction.mainline", "is", "T"],
                "AND",
                [CUSTOMER_NEEDS_UPDATE_FIELD, "is", "T"]
            ],
            columns: [
                search.createColumn({ name: "internalid", join: "transaction" }),
                search.createColumn({ name: "type", join: "transaction" }),
                search.createColumn({ name: "internalid" })
            ]
        }); 
    }


    //map():
    function map(context) {
        var customerId = null;
        var transactionId = null;
        var transactionType = null;

        var success = false;
        var errMsg = null;

        try {
            var resultObj = JSON.parse(context.value);

            //Step-1 Customer Internal ID:
            customerId = resultObj && resultObj.id ? String(resultObj.id) : (context.key ? String(context.key) : null);


            //Step-2 Joined Transaction Fields:
            transactionId = getResultValue(resultObj, 'internalid.transaction', /internalid.*transaction/i);
            transactionType = getResultValue(resultObj, 'type.transaction', /type.*transaction/i);


            //Step-3 If not any throw error:
            if (!customerId || !transactionId || !transactionType) {
                throw new Error('Missing data from search result. customerId=' + customerId +
                    ', transactionId=' + transactionId + ', transactionType=' + transactionType);
            }


            //Step-4 Load Customer Address Index: Saving Governance - New for Me/Removed!
            var addrIndex = getCustomerAddressIndexCached(customerId); //[{addr: "", territory: 61}, {addr: "", territory: 63}, {addr: "", territory: 62}]
            log.debug("Customer Details", addrIndex);



            //Step-5 Load Transaction:
            var nsType = getNsRecordType(transactionType);
            if (!nsType) throw new Error('Unsupported transaction type: ' + transactionType);
            var txRec = record.load({ type: nsType, id: transactionId });


            //Step-6 Find Matching Territory:
            var territory = findTerritoryFromTransactionAddress(txRec, addrIndex);
            if (!territory) {
                log.debug('No territory match', 'Type ' + transactionType + ' ID ' + transactionId + ' (customer ' + customerId + ')');
                success = false;
                errMsg = 'No Territory Match';
            } 
            else {

                //Step-7 Set Body Territory
                log.debug("Setting Value to Transaction: ", transactionId + " " + transactionType + " " + territory);
                txRec.setValue({ fieldId: BODY_TERRITORY_FIELD, value: territory });


                //Step-8 For SO/Estimate, set shipping address subrecord territory:
                if (transactionType === 'SalesOrd' || transactionType === 'Estimate') {
                    var shippingAddressRecord = txRec.getSubrecord({ fieldId: 'shippingaddress' });
                    shippingAddressRecord.setValue({
                        fieldId: ADDRESS_TERRITORY_FIELD,
                        value: territory
                    });
                }


                //Step-9 Save the record:
                txRec.save({
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                });


                //Step-10 Verify Saved Value:
                if (txRec.getValue({ fieldId: BODY_TERRITORY_FIELD }) !== territory) {
                    success = false;
                    errMsg = 'Territory did not persist after save';
                }
                else {
                    success = true;
                }
            }

        }
        catch (e) {
            success = false;
            errMsg = (e && e.message) ? e.message : String(e);

            log.error('Map Error', {
                customerId: customerId,
                transactionId: transactionId,
                transactionType: transactionType,
                error: errMsg
            });
        } 
        finally {
            // Always write a result so reduce can safely decide whether to uncheck the customer flag
            var outKey = customerId || 'UNKNOWN';
            context.write({
                key: outKey,
                value: JSON.stringify({
                    success: success,
                    transactionId: transactionId,
                    transactionType: transactionType,
                    error: errMsg
                })
            });
        }
    }


    // reduce:(): {C1: [{T1, S}, {T2, S}], C2: [T3, F]}
    function reduce(context) {
        var custId = context.key;
        var allMatch = true;
        var processed = 0;
        var failed = 0;

        for (var i = 0; i < context.values.length; i++) {
            processed++;
            var v = {};
            try {
                v = JSON.parse(context.values[i]); //{T1, S}
            } 
            catch (e) {
                allMatch = false;
                failed++;
                continue;
            }

            if (!v.success) {
                allMatch = false;
                failed++;
            }
        }

        log.debug('Customer Reduce', {
            customerId: custId,
            processed: processed,
            failed: failed,
            allMatch: allMatch
        });

        if (allMatch && custId !== 'UNKNOWN') {
            try {
                var valuesObj = {};
                valuesObj[CUSTOMER_NEEDS_UPDATE_FIELD] = false;

                record.submitFields({
                    type: record.Type.CUSTOMER,
                    id: custId,
                    values: valuesObj
                });

                log.debug('Checkbox Unchecked for Customer', custId);
            } 
            catch (e2) {
                log.error('Uncheck Flag Error - Customer: ' + custId, (e2 && e2.message) ? e2.message : String(e2));
                allMatch = false;
            }
        }

        context.write({
            key: custId,
            value: JSON.stringify({
                allMatch: allMatch,
                processed: processed,
                failed: failed
            })
        });
    }


    //summarize():
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

            var totalCustomers = 0;
            var customersUnflagged = 0;
            var customersWithFailures = 0;
            var totalTx = 0;

            summary.output.iterator().each(function (key, value) {
                totalCustomers++;
                try {
                    var v = JSON.parse(value);
                    totalTx += (v.processed || 0);
                    if (v.allMatch) customersUnflagged++;
                    else customersWithFailures++;
                } 
                catch (e) {
                    // ignore parse errors in summary output
                }
                return true;
            });

            log.audit('MR Summary', {
                totalCustomers: totalCustomers,
                customersUnflagged: customersUnflagged,
                customersWithFailures: customersWithFailures,
                totalTransactionsProcessed: totalTx,
                usage: summary.usage,
                concurrency: summary.concurrency,
                yields: summary.yields
            });
        } catch (e) {
            log.error('Summarize Error', (e && e.message) ? e.message : String(e));
        }
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});