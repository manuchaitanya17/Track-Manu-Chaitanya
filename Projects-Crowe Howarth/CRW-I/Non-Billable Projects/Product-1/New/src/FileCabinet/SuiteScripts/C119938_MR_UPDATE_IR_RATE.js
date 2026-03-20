/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */

define(['N/record', 'N/search'], function (record, search) {

    // Step-0: Constants / Log Prefix
    var LOG_PREFIX = '[PPR MR]'; // used for easy filtering in Script Execution Log

    // Step-1: getInputData()  Fetch all PPRL records with certain filter:
    function getInputData() {
        log.debug(LOG_PREFIX + ' Step-1 getInputData() - START', {
            recordType: 'customrecord_c53174_ppvreviewline',
            purpose: 'Pick PPRL records pending update with Rate to Pay populated.'
        });

        var inputSearch = search.create({
            type: "customrecord_c53174_ppvreviewline",
            filters: [
                ["custrecord_c53174_update_pending", "is", "T"],
                "AND",
                ["custrecord_c53174_ppvrl_payrate", "isnotempty", ""]
            ],
            columns: [
                search.createColumn({ name: "internalid" }),
                search.createColumn({ name: "custrecord_c53174_ppvrl_payrate" }),
                search.createColumn({ name: "custrecord_c53174_bill" }),
                search.createColumn({ name: "custrecord_c53174_ppvrl_po" }),
                search.createColumn({ name: "custrecord_c53174_ppvrl_po_lineuniquekey" }),
                search.createColumn({ name: "custrecord_c53174_ppvrl_poitem" }),
                search.createColumn({ name: "custrecord_c53174_ppvrl_poline" })
            ]
        });

        log.debug(LOG_PREFIX + ' Step-1 getInputData() - END', {
            filters: 'update_pending=T AND payrate not empty',
            columns: [
                'internalid',
                'ppvrl_payrate',
                'bill',
                'ppvrl_po',
                'ppvrl_po_lineuniquekey',
                'ppvrl_poitem',
                'ppvrl_poline'
            ]
        });

        return inputSearch;
    }


    // Step-2: map()
    // Step-2.1: Parse PPRL result JSON
    // Step-2.2: Validate required keys (PO, Item, PayRate) for IR update
    // Step-2.3: Search Item Receipt(s) created from PO and having Item
    // Step-2.4: Load Item Receipt(s) and update matching lines to PayRate
    // Step-2.5: Save IR if updated
    // Step-2.6: Reset PPRL Update Pending = false
    function map(context) {
        // Keep a short snippet only (avoid huge logs)
        log.debug(LOG_PREFIX + ' Step-2 map() - START', {
            key: context.key,
            valueSnippet: (context.value || '').substring(0, 300)
        });

        try {
            var data = JSON.parse(context.value);

            // Step-2.1: Extract values from the Map context
            var recId = data.values.internalid && data.values.internalid.value;
            var pprlPOId = data.values.custrecord_c53174_ppvrl_po && data.values.custrecord_c53174_ppvrl_po.value;
            var pprlItem = data.values.custrecord_c53174_ppvrl_poitem && data.values.custrecord_c53174_ppvrl_poitem.value;

            // NOTE: keeping existing behavior (no .value used here in original script)
            var pprlPOLine = data.values.custrecord_c53174_ppvrl_poline;
            var pprlPOLineUniqKey = data.values.custrecord_c53174_ppvrl_po_lineuniquekey;
            var pprlPayRate = data.values.custrecord_c53174_ppvrl_payrate;

            log.debug(LOG_PREFIX + ' Step-2.1 Parsed PPRL', {
                recId: recId,
                pprlPOId: pprlPOId,
                pprlItem: pprlItem,
                pprlPOLine: pprlPOLine,
                pprlPOLineUniqKey: pprlPOLineUniqKey,
                pprlPayRate: pprlPayRate
            });

            // Phase-2: Validation / skip path
            // FDD 81313: Update Item Receipt rates when Rate to Pay changes.
            if (pprlPOId && pprlItem && pprlPayRate) {

                log.debug(LOG_PREFIX + ' Step-2.2 Validation PASS', {
                    recId: recId,
                    message: 'PO + Item + PayRate present, proceeding to Item Receipt search.'
                });

                // Phase-3: Find Item Receipts for the PO + item
                var itemReceiptIds = [];
                search.create({
                    type: "transaction",
                    filters: [
                        ["type", "anyof", "ItemRcpt"],
                        "AND",
                        ["mainline", "is", "F"],
                        "AND",
                        ["cogs", "is", "F"],
                        "AND",
                        ["taxline", "is", "F"],
                        "AND",
                        ["shipping", "is", "F"],
                        "AND",
                        ["createdfrom", "anyof", pprlPOId],
                        "AND",
                        ["item", "anyof", pprlItem]
                    ],
                    columns: [
                        search.createColumn({ name: "internalid", summary: "GROUP" })
                    ]
                }).run().each(function (res) {
                    var irId = res.getValue({ name: "internalid", summary: "GROUP" });
                    if (irId && itemReceiptIds.indexOf(irId) === -1) {
                        itemReceiptIds.push(irId);
                    }
                    return true;
                });

                log.debug(LOG_PREFIX + ' Step-2.3 Item Receipt IDs found', {
                    recId: recId,
                    pprlPOId: pprlPOId,
                    pprlItem: pprlItem,
                    irCount: itemReceiptIds.length,
                    itemReceiptIds: itemReceiptIds
                });

                // Phase-4: Load each IR and update matching line(s)
                for (var r = 0; r < itemReceiptIds.length; r++) {
                    var irIdToLoad = itemReceiptIds[r];

                    log.debug(LOG_PREFIX + ' Step-2.4 Loading Item Receipt', {
                        recId: recId,
                        irId: irIdToLoad
                    });

                    var itemRcptRec = record.load({
                        type: record.Type.ITEM_RECEIPT,
                        id: irIdToLoad,
                        isDynamic: true
                    });

                    var itemRcptLineCount = itemRcptRec.getLineCount({ sublistId: 'item' });
                    var updated = false;

                    log.debug(LOG_PREFIX + ' Step-2.4 Item Receipt loaded', {
                        recId: recId,
                        irId: irIdToLoad,
                        itemLineCount: itemRcptLineCount
                    });

                    for (var iRLine = 0; iRLine < itemRcptLineCount; iRLine++) {

                        // Step-2.4.1: Confirm PO match on line
                        var iRItemPO = itemRcptRec.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'orderdoc',
                            line: iRLine
                        });
                        if (iRItemPO != pprlPOId) {
                            continue;
                        }

                        // Step-2.4.2: Confirm item match on line (try itemkey, fallback to item)
                        var iRLineItem = null;
                        try {
                            iRLineItem = itemRcptRec.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'itemkey',
                                line: iRLine
                            });
                        } 
                        catch (e) {
                            // keep as-is (silent), but add debug for diagnostics
                            log.debug(LOG_PREFIX + ' Step-2.4.2 itemkey not available, fallback to item', {
                                irId: irIdToLoad,
                                line: iRLine,
                                error: e.toString()
                            });
                        }
                        if (!iRLineItem) {
                            iRLineItem = itemRcptRec.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                line: iRLine
                            });
                        }
                        if (iRLineItem != pprlItem) {
                            continue;
                        }

                        // Step-2.4.3: Match by PO line number OR line unique key
                        var iRItemPOLine = itemRcptRec.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'orderline',
                            line: iRLine
                        });

                        var matches = (pprlPOLine && iRItemPOLine == pprlPOLine);

                        if (!matches && pprlPOLineUniqKey) {
                            try {
                                var iRLineUniqKey = itemRcptRec.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'lineuniquekey',
                                    line: iRLine
                                });
                                matches = (iRLineUniqKey == pprlPOLineUniqKey);
                            } 
                            catch (e) {
                                log.debug(LOG_PREFIX + ' Step-2.4.3 lineuniquekey read error (ignored per current logic)', {
                                    irId: irIdToLoad,
                                    line: iRLine,
                                    error: e.toString()
                                });
                            }
                        }

                        if (matches) {
                            // Step-2.4.4: Update rate to PayRate
                            itemRcptRec.selectLine({
                                sublistId: 'item',
                                line: iRLine
                            });

                            var oldRate = null;
                            try {
                                oldRate = itemRcptRec.getCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'rate'
                                });
                            } 
                            catch (e) { }

                            itemRcptRec.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'rate',
                                value: pprlPayRate
                            });

                            itemRcptRec.commitLine({
                                sublistId: 'item'
                            });

                            updated = true;

                            log.debug(LOG_PREFIX + ' Step-2.4.4 IR line rate updated', {
                                recId: recId,
                                irId: irIdToLoad,
                                line: iRLine,
                                poId: pprlPOId,
                                item: pprlItem,
                                poLine: iRItemPOLine,
                                oldRate: oldRate,
                                newRate: pprlPayRate
                            });
                        }
                    }

                    // Phase-5: Save IR if updated
                    if (updated) {
                        var irRecId = itemRcptRec.save();
                        log.debug(LOG_PREFIX + ' Step-2.5 Updated Item Receipt saved', {
                            recId: recId,
                            irId: irRecId
                        });
                    } 
                    else {
                        log.debug(LOG_PREFIX + ' Step-2.5 No matching lines updated on Item Receipt', {
                            recId: recId,
                            irId: irIdToLoad
                        });
                    }
                }

            } 
            else {
                // Phase-2 (skip): Missing required values
                log.debug(LOG_PREFIX + ' Step-2.2 Validation SKIP (no IR update)', {
                    recId: recId,
                    reason: 'Missing PO / Item / PayRate. IR update will be skipped.'
                });
            }

            // Phase-6: Reset update_pending = false (existing logic)
            record.submitFields({
                type: 'customrecord_c53174_ppvreviewline',
                id: recId,
                values: {
                    custrecord_c53174_update_pending: false
                },
                options: {
                    ignoreMandatoryFields: true
                }
            });

            log.debug(LOG_PREFIX + ' Step-2.6 PPRL update_pending reset', {
                recId: recId,
                updatePendingSetTo: false
            });

            log.debug(LOG_PREFIX + ' Step-2 map() - END', { key: context.key, recId: recId });

        } 
        catch (e) {
            log.error(LOG_PREFIX + ' map error', e.toString());
            log.error(LOG_PREFIX + ' map error details', {
                key: context.key,
                errorName: e.name,
                errorMessage: e.message,
                errorStack: (e.stack || '')
            });
        }
    }


    return {
        getInputData: getInputData,
        map: map
    };
});
