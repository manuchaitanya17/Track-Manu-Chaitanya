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

    // Configurations
    const CUSTOM_BILL_RECORD_TYPE = 'customrecord_bill_custom';

    // CBR Field IDs
    const FIELD_CBR_INTERNALID = 'internalid';
    const FIELD_CBR_PO = 'custrecord_purchase_order';
    const FIELD_CBR_ITEM = 'custrecord_bill_item';
    const FIELD_CBR_QTY = 'custrecord_bill_qty';
    const FIELD_CBR_BILLABLE = 'custrecord_is_billable';
    const FIELD_CBR_BILL_LINK = 'custrecord_cust_bill_number';
    const FIELD_CBR_BILL_DATE = 'custrecord_bill_date';
    const FIELD_CBR_VENDOR = 'custrecord_cust_bill_vendor';

    // Helper: Grouping Key (vendorId||poId||billDate) — mirrors sales-side grouping style
    const keyFor = (vendorId, poId, billDate) =>
        [String(vendorId || ''), String(poId || ''), String(billDate || '')].join('||');

    // Helper: Calls the search and returns all results
    function getAllResults(searchObj) {
        const out = [];
        const paged = searchObj.runPaged({ pageSize: 1000 });
        paged.pageRanges.forEach((pr) => {
            const page = paged.fetch({ index: pr.index });
            out.push(...page.data);
        });
        return out;
    }

    // getInputData()
    const getInputData = () => {

        // Step-1: Fetch CBR rows ready to be billed
        const cbrSearch = search.create({
            type: CUSTOM_BILL_RECORD_TYPE,
            filters: [
                [FIELD_CBR_BILLABLE, 'is', 'T'],
                'AND',
                [FIELD_CBR_BILL_LINK, 'anyof', '@NONE@']
            ],
            columns: [
                search.createColumn({ name: FIELD_CBR_INTERNALID }),
                search.createColumn({ name: FIELD_CBR_PO }),
                search.createColumn({ name: FIELD_CBR_ITEM }),
                search.createColumn({ name: FIELD_CBR_QTY }),
                search.createColumn({ name: FIELD_CBR_BILL_DATE }),
                search.createColumn({ name: FIELD_CBR_VENDOR })
            ]
        });

        const rows = getAllResults(cbrSearch);
        log.debug('rows', rows);

        // Step-2: Simplify search results
        const simplified = rows.map((r) => ({
            cbrId: r.getValue({ name: FIELD_CBR_INTERNALID }),
            poId: r.getValue({ name: FIELD_CBR_PO }),
            itemId: r.getValue({ name: FIELD_CBR_ITEM }),
            qty: Number(r.getValue({ name: FIELD_CBR_QTY })) || 0,
            billDate: r.getValue({ name: FIELD_CBR_BILL_DATE }) || '',
            vendorId: r.getValue({ name: FIELD_CBR_VENDOR })
        }));

        log.debug('getInputData', simplified);
        return simplified;
    };

    // map()
    const map = (context) => {
        const row = JSON.parse(context.value);
        log.debug('context', context);
        log.debug('row', row);

        const groupKey = keyFor(row.vendorId, row.poId, row.billDate);
        context.write({
            key: groupKey,
            value: row
        });
    };

    // reduce()
    const reduce = (context) => {
        try {
            log.debug('ReduceContext', context);

            // Step-1: Split the grouped key to get data
            const [vendorId, poId, billDateRaw] = String(context.key).split('||');

            /** @type {Record<string, number>} */
            const itemsWanted = {};
            /** @type {string[]} */
            const cbrIds = [];

            log.debug('Iterated Group Key', context.key);
            log.debug('Iterated Group Value', context.values);

            // Step-2: Aggregate requested quantities per itemId; collect CBR ids
            context.values.forEach((valStr) => {
                const v = JSON.parse(valStr);
                cbrIds.push(v.cbrId);

                const itemId = String(v.itemId || '');
                itemsWanted[itemId] = (itemsWanted[itemId] || 0) + (Number(v.qty) || 0);
            });

            log.debug('Group', {
                key: context.key,
                poId,
                vendorId,
                billDateRaw,
                itemsWanted,
                cbrCount: cbrIds.length
            });

            // Step-3: Nothing to Bill? Skip.
            const totalWanted = Object.values(itemsWanted).reduce((a, b) => a + b, 0);
            log.debug('totalWanted', totalWanted);
            if (!totalWanted) {
                log.debug('Skip Group: Zero Quantity', context.key);
                return;
            }

            // Step-4: Transform PO -> Vendor Bill
            const billRec = record.transform({
                fromType: record.Type.PURCHASE_ORDER,
                fromId: poId,
                toType: record.Type.VENDOR_BILL,
                isDynamic: false
            });


            // Step-4A: Set Vendor Bill Date from Custom Bill Record (Bill Date)
            const billDateStr = String(billDateRaw || '').trim();
            if (billDateStr) {
                try {
                    const billDateObj = format.parse({
                        value: billDateStr,
                        type: format.Type.DATE
                    });

                    billRec.setValue({
                        fieldId: 'trandate',
                        value: billDateObj
                    });
                } 
                catch (e) {
                    log.error('Failed to set Vendor Bill Date', { key: context.key, billDateRaw, error: e });
                }
            }

            // Step-5: Keep only lines that match requested items; set quantities to requested
            let lineCount = billRec.getLineCount({ sublistId: 'item' });
            let keptCount = 0;

            for (let i = lineCount - 1; i >= 0; i--) {
                const lineItemId = String(
                    billRec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i }) || ''
                );

                const wantQty = Number(itemsWanted[lineItemId] || 0);
                if (!wantQty) {
                    billRec.removeLine({ sublistId: 'item', line: i });
                    continue;
                }

                const avail = Number(
                    billRec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i }) || 0
                );
                const rate = Number(
                    billRec.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i }) || 0
                );
                var amount = Number(
                    billRec.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i }) || 0
                );

                 if(!rate){
                    rate = amount/avail;
                }

                if(!amount){
                    amount = rate * wantQty;
                }


                billRec.setSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i, value: wantQty });
                // billRec.setSublistValue({ sublistId: 'item', fieldId: 'rate', line: i, value: rate });
                // billRec.setSublistValue({ sublistId: 'item', fieldId: 'amount', line: i, value: amount });
                itemsWanted[lineItemId] = avail - wantQty;
                keptCount++;
            }

            // Step-6: If we removed everything, don't save a blank Vendor Bill
            const remainingLines = billRec.getLineCount({ sublistId: 'item' });
            if (!remainingLines || !keptCount) {
                log.audit('Group produced empty vendor bill after filtering — skipping save', context.key);
                return;
            }

            // Step-7: Save Vendor Bill
            const vendorBillId = billRec.save({ ignoreMandatoryFields: true });
            log.debug('Created Vendor Bill', { key: context.key, vendorBillId, remainingLines });

            // Step-8: Link CBR Rows to the created Vendor Bill & mark Not Billable
            cbrIds.forEach((id) => {
                try {
                    record.submitFields({
                        type: CUSTOM_BILL_RECORD_TYPE,
                        id,
                        values: {
                            [FIELD_CBR_BILL_LINK]: vendorBillId,
                            [FIELD_CBR_BILLABLE]: false
                        },
                        options: { enablesourcing: false, ignoreMandatoryFields: true }
                    });
                } catch (e) {
                    log.error('Failed to update CBR with bill link', { cbrId: id, vendorBillId, error: e });
                }
            });

        } catch (e) {
            log.error('reduce error', { key: context.key, error: e });
            throw e;
        }
    };

    return { getInputData, map, reduce };
});
