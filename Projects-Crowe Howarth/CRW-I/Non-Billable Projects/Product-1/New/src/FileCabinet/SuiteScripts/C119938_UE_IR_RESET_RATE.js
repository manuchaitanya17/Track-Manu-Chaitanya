/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */

define(['N/search', './lodash.min'],

function (search, lodash) {


    // Step-0.1: Location checkbox field used to gate PPR logic
    var PPR_ENABLE_FIELD_ID = 'custrecord_c53174_enable_ppr';

    // Step-0.2: Log Prefix (helps filter logs in Execution Log)
    var LOG_PREFIX = '[PPR TEST][E1P2S3 css_ue_3wm_item_rate] ';

    // Step-0.3: Testing Phases (What we can validate in this script)
    // Phase-1: Context Gating
    //   - Script runs ONLY when context.type == CREATE

    // Phase-2: Location Gating (PPR Enable)
    //   - If PO Location has Enable Purchase Price Review unchecked -> EXIT (no rate updates)

    // Phase-3: Data Availability
    //   - If no lines or PO/item arrays empty -> EXIT

    // Phase-4: PPRL Search Result = NONE
    //   - If PPRL search returns no rows -> no updates applied

    // Phase-5: Partial Matches (Multi-line / mixed)
    //   - Only matching lines updated; non-matching lines remain unchanged

    // Phase-6: Rate Update Applied
    //   - For matching PO+Item+PO Line, Item Receipt line rate is overwritten with PPRL Rate to Pay


    // Step-1: Helper Functions

    // Step-1.1: isPprEnabledForPo(poId)
    function isPprEnabledForPo(poId) {
        try {
            log.debug(LOG_PREFIX + 'Step-1.1 isPprEnabledForPo() - START', { poId: poId });

            if (!poId) {
                log.debug(LOG_PREFIX + 'Step-1.1 isPprEnabledForPo() - EXIT', 'No PO ID provided.');
                return false;
            }

            var locId = null;

            // Step-1.1.1: Get PO Location (mainline)
            search.create({
                type: 'purchaseorder',
                filters: [
                    ['type', 'anyof', 'PurchOrd'],
                    'AND',
                    ['mainline', 'is', 'T'],
                    'AND',
                    ['internalid', 'anyof', poId]
                ],
                columns: [
                    search.createColumn({ name: 'location' })
                ]
            }).run().each(function (res) {
                locId = res.getValue({ name: 'location' });
                return false; // stop after first (mainline)
            });

            log.debug(LOG_PREFIX + 'Step-1.1.1 PO -> Location', { poId: poId, locId: locId });

            if (!locId) {
                log.debug(LOG_PREFIX + 'Step-1.1 isPprEnabledForPo() - EXIT', 'PO has no location.');
                return false;
            }

            // Step-1.1.2: Lookup Location checkbox
            var fields = search.lookupFields({
                type: 'location',
                id: locId,
                columns: [PPR_ENABLE_FIELD_ID]
            });

            var enabled = !!fields[PPR_ENABLE_FIELD_ID];

            log.debug(LOG_PREFIX + 'Step-1.1.2 Location PPR Enabled?', {
                locId: locId,
                fieldId: PPR_ENABLE_FIELD_ID,
                enabled: enabled,
                raw: fields[PPR_ENABLE_FIELD_ID]
            });

            return enabled;

        } catch (e) {
            log.error(LOG_PREFIX + 'Step-1.1 isPprEnabledForPo() - ERROR', {
                poId: poId,
                errorName: e.name,
                errorMessage: e.message,
                errorStack: e.stack || ''
            });
            throw e;
        }
    }


    // Step-2: User Event Entry Point
    /**
     * beforeSubmit()
     * Applies to: Item Receipt
     * Goal:
     *   If PPR is enabled for the PO Location,
     *   then overwrite Item Receipt item line rate with PPRL Rate to Pay (for PO+Item+Line matches)
     */
    function beforeSubmit(context) {
        try {

            log.debug(LOG_PREFIX + 'Step-2 beforeSubmit() - START', {
                contextType: context.type,
                recType: (context.newRecord && context.newRecord.type),
                recId: (context.newRecord && context.newRecord.id)
            });

            // Phase-1: Context Gating (ONLY CREATE)
            if (context.type != context.UserEventType.CREATE) {
                log.debug(LOG_PREFIX + 'Phase-1 EXIT - Not CREATE', { contextType: context.type });
                return;
            }

            var recObj = context.newRecord;

            // Phase-2: Location Gating (PPR Enable)
            var poId = recObj.getValue({ fieldId: 'createdfrom' });
            log.debug(LOG_PREFIX + 'Phase-2 Location Gating - createdfrom', { createdfrom: poId });

            if (!isPprEnabledForPo(poId)) {
                log.debug(LOG_PREFIX + 'Phase-2 EXIT - PPR Disabled on PO Location', { createdfrom: poId });
                return;
            }


            // Step-2.1: Read Item Receipt Item Lines
            var lineCnt = recObj.getLineCount({ sublistId: 'item' });
            log.debug(LOG_PREFIX + 'Step-2.1 lineCnt', { lineCnt: lineCnt });


            // Phase-3: Data Availability
            if (!lineCnt || lineCnt <= 0) {
                log.debug(LOG_PREFIX + 'Phase-3 EXIT - No item lines on receipt', { lineCnt: lineCnt });
                return;
            }

            var poArray = [];
            var itemArray = [];

            // Step-2.2: Collect PO & Item from each line
            for (var x = 0; x < lineCnt; x++) {
                var linePoId = recObj.getSublistValue({ sublistId: 'item', fieldId: 'orderdoc', line: x });
                var lineItemId = recObj.getSublistValue({ sublistId: 'item', fieldId: 'item', line: x });

                poArray.push(linePoId);
                itemArray.push(lineItemId);
            }

            log.debug(LOG_PREFIX + 'Step-2.2 Arrays collected', {
                poArray: poArray,
                itemArray: itemArray
            });

            if (!(poArray.length > 0 && itemArray.length > 0)) {
                log.debug(LOG_PREFIX + 'Phase-3 EXIT - PO/Item arrays empty', {
                    poArrayLen: poArray.length,
                    itemArrayLen: itemArray.length
                });
                return;
            }


            // Step-2.3: Search matching PPRLs (where Bill Rate != PO Rate)
            log.debug(LOG_PREFIX + 'Step-2.3 Running PPRL Search', {
                pprlType: 'customrecord_c53174_ppvreviewline',
                note: 'Filter includes formula: billrate != porate'
            });

            var customrecord_c53174_ppvreviewlineSearchObj = search.create({
                type: "customrecord_c53174_ppvreviewline",
                filters:
                    [
                        ["custrecord_c53174_ppvrl_poitem", "anyof", itemArray],
                        "AND",
                        ["custrecord_c53174_ppvrl_po", "anyof", poArray],
                        "AND",
                        ["formulanumeric: CASE WHEN {custrecord_c53174_billrate} != {custrecord_c53174_ppvrl_porate} THEN 1 ELSE 0 END", "equalto", "1"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "custrecord_c53174_ppvrl_po", label: "Purchase Order" }),
                        search.createColumn({ name: "custrecord_c53174_ppvrl_poitem", label: "PO Line Item" }),
                        search.createColumn({ name: "custrecord_c53174_ppvrl_poline", label: "PO Line Number" }),
                        search.createColumn({ name: "custrecord_c53174_ppvrl_payrate", label: "Rate to Pay" })
                    ]
            });

            var pprlArray = [];
            customrecord_c53174_ppvreviewlineSearchObj.run().each(function (result) {
                var json = {};
                json['pprlPO'] = result.getValue({ name: "custrecord_c53174_ppvrl_po", label: "Purchase Order" });
                json['pprlItem'] = result.getValue({ name: "custrecord_c53174_ppvrl_poitem", label: "PO Line Item" });
                json['pprlPOLine'] = result.getValue({ name: "custrecord_c53174_ppvrl_poline", label: "PO Line Number" });
                json['pprlRate'] = result.getValue({ name: "custrecord_c53174_ppvrl_payrate", label: "Rate to Pay" });
                pprlArray.push(json);
                return true;
            });

            log.debug(LOG_PREFIX + 'Step-2.3 PPRL Results', {
                pprlCount: pprlArray.length,
                sampleFirst3: pprlArray.slice(0, 3)
            });

            // Phase-4: No PPRLs found
            if (!pprlArray || pprlArray.length === 0) {
                log.debug(LOG_PREFIX + 'Phase-4 - No PPRL rows found, no rate updates applied', {
                    poArrayLen: poArray.length,
                    itemArrayLen: itemArray.length
                });
                return;
            }


            // Step-2.4: Apply Rate Updates (match by PO + Item + PO Line)
            var updatedCount = 0;

            for (var z = 0; z < lineCnt; z++) {
                var linePo = recObj.getSublistValue({ sublistId: 'item', fieldId: 'orderdoc', line: z });
                var lineItem = recObj.getSublistValue({ sublistId: 'item', fieldId: 'item', line: z });
                var lineId = recObj.getSublistValue({ sublistId: 'item', fieldId: 'orderline', line: z });
                var oldRate = recObj.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: z });

                // Phase-5: Partial Matches expected on multi-line receipts
                var index = _.findIndex(pprlArray, function (o) {
                    return o.pprlPO == linePo && o.pprlItem == lineItem && o.pprlPOLine == lineId;
                });

                log.debug(LOG_PREFIX + 'Step-2.4 Match check', {
                    line: z,
                    linePo: linePo,
                    lineItem: lineItem,
                    lineOrderLine: lineId,
                    oldRate: oldRate,
                    matchIndex: index
                });

                if (index > -1) {

                    // Phase-6: Rate Update Applied
                    recObj.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        value: pprlArray[index].pprlRate,
                        line: z
                    });

                    updatedCount++;

                    log.debug(LOG_PREFIX + 'Phase-6 Updated line rate', {
                        line: z,
                        oldRate: oldRate,
                        newRate: pprlArray[index].pprlRate,
                        matchedKey: {
                            po: linePo,
                            item: lineItem,
                            poLine: lineId
                        }
                    });

                } else {
                    log.debug(LOG_PREFIX + 'Phase-5 No match for line (no update)', {
                        line: z,
                        po: linePo,
                        item: lineItem,
                        poLine: lineId
                    });
                }
            }

            log.debug(LOG_PREFIX + 'Step-2 beforeSubmit() - END', {
                lineCnt: lineCnt,
                pprlCount: pprlArray.length,
                updatedCount: updatedCount
            });

        } 
        catch (e) {
            log.error(LOG_PREFIX + 'beforeSubmit() - ERROR', {
                errorName: e.name,
                errorMessage: e.message,
                errorStack: e.stack || ''
            });
            throw e;
        }
    }

    return {
        beforeSubmit: beforeSubmit
    };
});
