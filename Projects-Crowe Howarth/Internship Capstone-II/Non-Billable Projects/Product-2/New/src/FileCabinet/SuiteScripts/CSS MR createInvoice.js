/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @author Demo-3.0
 */

define(['N/search', 'N/record', 'N/log', 'N/format', 'N/runtime'], (
    search,
    record,
    log,
    format,
    runtime
) => {

    //Configurations:
    var CUSTOM_INVOICE_RECORD_TYPE = 'customrecord_invoice_custom';


    // CIR Field IDS
    var FIELD_CIR_INTERNALID = 'internalid';
    var FIELD_CIR_SO = 'custrecord_sales_order';
    var FIELD_CIR_ITEM = 'custrecord_invoice_item';
    var FIELD_CIR_QTY = 'custrecord_inv_qty';
    var FIELD_CIR_INVOICEABLE = 'custrecord_is_invoiceable';
    var FIELD_CIR_INVOICE_LINK = 'custrecord_cust_inv_number';
    var FIELD_CIR_INVOICE_DATE = 'custrecord_inv_date';
    var FIELD_CIR_INVOICE_CUSTOMER = 'custrecord_cust_inv_customer';


    // Helper-1: Grouping Key
    var keyFor = (customerId, soId, invDate) => [String(customerId || ''), String(soId || ''), String(invDate || '')].join('||');


    // Helper-2: Calls the search:
    function getAllResults(searchObj) {
        var out = [];
        var paged = searchObj.runPaged({ pageSize: 1000 });
        paged.pageRanges.forEach((pr) => {
            var page = paged.fetch({ index: pr.index });
            out.push(...page.data);
        });
        return out;
    }


    // getInput():
    var getInputData = () => {
        var cirSearch = search.create({
            type: CUSTOM_INVOICE_RECORD_TYPE,
            filters: [
                [FIELD_CIR_INVOICEABLE, 'is', 'T'],
                'AND',
                [FIELD_CIR_INVOICE_LINK, 'anyof', '@NONE@']
            ],
            columns: [
                search.createColumn({ name: FIELD_CIR_INTERNALID }),
                search.createColumn({ name: FIELD_CIR_SO }),
                search.createColumn({ name: FIELD_CIR_ITEM }),
                search.createColumn({ name: FIELD_CIR_QTY }),
                search.createColumn({ name: FIELD_CIR_INVOICE_DATE }),
                search.createColumn({ name: FIELD_CIR_INVOICE_CUSTOMER })
            ]
        });

        var rows = getAllResults(cirSearch);
        log.debug("rows", rows);

        var simplified = rows.map((r) => ({
            cirId: r.getValue({ name: FIELD_CIR_INTERNALID }),
            soId: r.getValue({ name: FIELD_CIR_SO }),
            itemId: r.getValue({ name: FIELD_CIR_ITEM }),
            qty: Number(r.getValue({ name: FIELD_CIR_QTY })) || 0,
            invDate: r.getValue({ name: FIELD_CIR_INVOICE_DATE }) || '',
            customerId: r.getValue({ name: FIELD_CIR_INVOICE_CUSTOMER })
        }));

        log.debug('getInputData', simplified);
        return simplified;
    };


    // map():
    var map = (context) => {
        var row = JSON.parse(context.value);
        log.debug('context', context);
        log.debug('row', row);

        var groupKey = keyFor(row.customerId, row.soId, row.invDate);
        context.write({
            key: groupKey,
            value: row
        });
    };


    // reduce():
    var reduce = (context) => {
        try {
            log.debug('ReduceContext', context);
            // Step-1: Split the Grouped Key to get data:
            var [customerId, soId, invDateRaw] = String(context.key).split('||');
            var itemsWanted = {};

            var cirIds = [];  // Creating this array to store CIR ID's

            log.debug("Iterated Group Key:", context.key);
            log.debug("Iterated Group Value:", context.values);


            //Step-2: Iteration on Grouped CIR: Aggregate requested quantities per itemId, collect CIR ids
            context.values.forEach((valStr) => {
                var v = JSON.parse(valStr);  //JS Object - Iterated CIR in Group
                cirIds.push(v.cirId);

                var itemId = String(v.itemId || '');
                itemsWanted[itemId] = (itemsWanted[itemId] || 0) + (Number(v.qty) || 0); // {6: 11, 7: 12, 8: 13, 9: 0}
            });
            log.debug('Group', { key: context.key, soId, customerId, invDateRaw, itemsWanted, cirCount: cirIds.length });


            //Step-3: Nothing to Invoice? Skip.
            var totalWanted = Object.values(itemsWanted).reduce((a, b) => a + b, 0);
            log.debug("totalWanted", totalWanted);

            if (!totalWanted) {
                log.debug('Skip Group: Zero Quantity', context.key);
                return;
            }


            // Step-4: Transform SO -> Invoice
            let invRec = record.transform({
                fromType: record.Type.SALES_ORDER,
                fromId: Number(soId),
                toType: record.Type.INVOICE,
                isDynamic: false
            });


            // Step-5: Keep only lines that match requested items; set quantities to requested (partial supported):
            let lineCount = invRec.getLineCount({ sublistId: 'item' });
            let keptCount = 0;

            for (let i = lineCount - 1; i >= 0; i--) {
                var lineItemId = String(invRec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i }) || '');
                log.debug("lineItemId", lineItemId);
                var wantQty = Number(itemsWanted[lineItemId] || 0);
                log.debug("wantQty", wantQty);

                if (!wantQty) {
                    log.debug("Removing Item!")
                    invRec.removeLine({ sublistId: 'item', line: i });
                    continue;
                }


                var avail = Number(invRec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i }) || 0);
                var rate = Number(invRec.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i }) || 0);
                var amount = Number(invRec.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i }) || 0);

                if(!rate){
                    rate = amount/avail;
                }

                if(!amount){
                    amount = rate * wantQty;
                }
                
                invRec.setSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i, value: wantQty });
                invRec.setSublistValue({ sublistId: 'item', fieldId: 'rate', line: i, value: rate });
                invRec.setSublistValue({ sublistId: 'item', fieldId: 'amount', line: i, value: amount });
                itemsWanted[lineItemId] = avail - wantQty;
                keptCount++;
            }

            // Step-6: If we removed everything, don't save a Blank Invoice
            var remainingLines = invRec.getLineCount({ sublistId: 'item' });
            if (!remainingLines || !keptCount) {
                log.audit('Group produced empty invoice after filtering — skipping save', context.key);
                return;
            }

            // Step-7: Save Invoice
            var invoiceId = invRec.save({ ignoreMandatoryFields: true });
            log.debug('Created Invoice', { key: context.key, invoiceId, remainingLines });


            // Step-8: Link CIR Rows to the created invoice & mark Not Invoiceable and set Invoice ID:
            cirIds.forEach((id) => {
                try {
                    record.submitFields({
                        type: CUSTOM_INVOICE_RECORD_TYPE,
                        id,
                        values: {
                            [FIELD_CIR_INVOICE_LINK]: invoiceId,
                            [FIELD_CIR_INVOICEABLE]: false
                        },
                        options: { enablesourcing: false, ignoreMandatoryFields: true }
                    });
                }
                catch (e) {
                    log.error('Failed to update CIR with invoice link', { cirId: id, invoiceId, error: e });
                }
            });
        }

        catch (e) {
            log.error('reduce error', { key: context.key, error: e.message });
            throw e;
        }
    };



    return { getInputData, map, reduce };
});
