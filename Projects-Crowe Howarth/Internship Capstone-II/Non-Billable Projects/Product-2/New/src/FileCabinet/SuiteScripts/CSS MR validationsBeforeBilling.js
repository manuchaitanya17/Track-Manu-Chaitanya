/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

define(['N/search', 'N/record', 'N/log'], (search, record, log) => {

    //Configurations:
    //CBR Record ID
    const CUSTOM_BILL_RECORD_TYPE = 'customrecord_bill_custom';

    //Fields on the Custom Bill Record (CBR)
    const FIELD_CBR_INTERNALID = 'internalid';
    const FIELD_CBR_PO = 'custrecord_purchase_order';
    const FIELD_CBR_ITEM = 'custrecord_bill_item';
    const FIELD_CBR_QTY = 'custrecord_bill_qty';
    const FIELD_CBR_BILLABLE = 'custrecord_is_billable';
    const FIELD_CBR_VENDOR = 'custrecord_cust_bill_vendor';
    const FIELD_CBR_BILL_LINK = 'custrecord_cust_bill_number';


    //Helper Array-1: Adds any filters we always want on the CIR search
    const CBR_BASE_FILTERS = [
        ['isinactive', 'is', 'F'],
        'AND',
        [FIELD_CBR_BILLABLE, 'is', 'F'],
        'AND',
        [FIELD_CBR_BILL_LINK, 'anyof', '@NONE@']
    ];


    //Helper Function-1: Keys for Grouping
    const keyFor = (poId, itemId) => poId ||itemId;


    //Helper Function-2: Running Saved Searches
    function getAllResults(sr) {
        const results = [];
        const paged = sr.runPaged({ pageSize: 1000 });
        paged.pageRanges.forEach(range => {
            const page = paged.fetch({ index: range.index });
            results.push(...page.data);
        });
        return results;
    }


   //Helper Function-3: Safe Number
    function safeNumber(v) {
        const n = parseFloat(v);
        return isNaN(n) ? 0 : n;
    }


    //getInput() Function:
    function getInputData() {

        //Step-1 Search Custom Bill Records (CBR):
        const cbrSearch = search.create({
            type: CUSTOM_BILL_RECORD_TYPE,
            filters: CBR_BASE_FILTERS,
            columns: [
                search.createColumn({ name: FIELD_CBR_INTERNALID }),
                search.createColumn({ name: FIELD_CBR_PO }),
                search.createColumn({ name: FIELD_CBR_ITEM }),
                search.createColumn({ name: FIELD_CBR_QTY }),
                search.createColumn({ name: FIELD_CBR_VENDOR })
            ]
        });

        const cbrResults = getAllResults(cbrSearch);
        log.debug('cbrResults', cbrResults);


        // Step-2 Group by (SO + Item) and Sum CIR Quantity:
        /**
         * grouped[key] = [{ cbrId, poId, itemId, cbrQty, cbrVendorId }, ...]
         * groupSums[key] = totalQty
         */
        const grouped = {};
        const groupSums = {};
        const poIdsSet = new Set();

        cbrResults.forEach(r => {
            const cbrId = String(r.getValue({ name: FIELD_CBR_INTERNALID }));
            const poId = String(r.getValue({ name: FIELD_CBR_PO }) || '');
            const itemId = String(r.getValue({ name: FIELD_CBR_ITEM }) || '');
            const cbrQty = safeNumber(r.getValue({ name: FIELD_CBR_QTY }));
            const cbrVendorId = String(r.getValue({ name: FIELD_CBR_VENDOR }) || '');

            if (!poId || !itemId) {
                const k = keyFor(poId || 'NULL', itemId || 'NULL');
                log.debug("k", k);

                grouped[k] = grouped[k] || [];
                grouped[k].push({ cbrId, poId, itemId, cbrQty, cbrVendorId });
                groupSums[k] = (groupSums[k] || 0) + cbrQty;
                return;
            }

            const key = keyFor(poId, itemId);
            grouped[key] = grouped[key] || [];
            grouped[key].push({ cbrId, poId, itemId, cbrQty, cbrVendorId }); 
            groupSums[key] = (groupSums[key] || 0) + cbrQty;
            poIdsSet.add(poId); //Note: No Duplicate PO
        });
        log.debug("grouped", grouped);
        log.debug("groupSums", groupSums);
        log.debug("soIdsSet", poIdsSet);


        //Step-3 Purchase Order IDs Array:
        const poIds = Array.from(poIdsSet);
        log.debug('Collected PO IDs', poIds);


        //Step-4 Search Purchase Orders (line-level) to get (PO, Item, Qty) and PO Vendor
        const poItemQtyMap = {}; // keyFor(poId,itemId) -> totalQtyOnPO
        const poVendorMap = {};  // poId -> vendorId

        if (poIds.length > 0) {
            const poSearch = search.create({
                type: search.Type.PURCHASE_ORDER,
                filters: [
                    ['internalid', 'anyof', poIds],
                    'AND', ['mainline', 'is', 'F'],
                    'AND', ['taxline', 'is', 'F'],
                    'AND', ['shipping', 'is', 'F']
                ],
                columns: [
                    search.createColumn({ name: 'internalid' }),
                    search.createColumn({ name: 'item' }),
                    search.createColumn({ name: 'quantity' }),
                    search.createColumn({
                        name: "internalid",
                        join: "vendor",
                        label: "Internal ID"
                    })
                ]
            });

            const poResults = getAllResults(poSearch);
            log.debug('poResults', poResults);

            poResults.forEach(r => {
                const poId = String(r.getValue({ name: 'internalid' }) || '');
                const itemId = String(r.getValue({ name: 'item' }) || '');
                const vendorId = String(r.getValue({ name: 'internalid', join: 'vendor' }) || '');
                const qty = safeNumber(r.getValue({ name: 'quantity' }));

                if (!poId || !itemId) return;

                const k = keyFor(poId, itemId);
                poItemQtyMap[k] = (poItemQtyMap[k] || 0) + qty;

                if (vendorId) {
                    if (poVendorMap[poId] && poVendorMap[poId] !== vendorId) {
                        log.debug('PO Vendor mismatch across lines', { poId, prev: poVendorMap[poId], current: vendorId });
                    }
                    if (!poVendorMap[poId]) poVendorMap[poId] = vendorId;
                }
            });

            log.debug('poItemQtyMapSample', Object.keys(poItemQtyMap).slice(0, 10));
            log.debug('poVendorMap', poVendorMap);
        }

        //Step-5 Validate each (PO, Item) group vs PO lines
        const finalArray = [];

        Object.keys(grouped).forEach(key => {
            const cbrList = grouped[key];
            const sumCbrQty = groupSums[key] || 0;
            const poQty = safeNumber(poItemQtyMap[key]);
            const existsOnPO = Object.prototype.hasOwnProperty.call(poItemQtyMap, key);
            const poIdForGroup = cbrList[0] && cbrList[0].poId;
            const expectedVendorId = poVendorMap[poIdForGroup] || '';
            const allHaveVendor = cbrList.every(i => !!i.cbrVendorId);
            const allMatchVendor = expectedVendorId && cbrList.every(i => i.cbrVendorId === expectedVendorId);
            const vendorOK = allHaveVendor && allMatchVendor;
            const isValidGroup = existsOnPO && (poQty >= sumCbrQty) && vendorOK;
            
            log.debug("cbrList", cbrList);
            log.debug("sumCbrQty", sumCbrQty);
            log.debug("poQty", poQty);
            log.debug("existsOnPO", existsOnPO);
            log.debug("poIdForGroup", poIdForGroup);
            log.debug("allHaveVendor", allHaveVendor);
            log.debug("allMatchVendor", allMatchVendor);
            log.debug("vendorOK", vendorOK);
            log.debug("isValidGroup", isValidGroup);

            cbrList.forEach(({ cbrId }) => {
                finalArray.push({
                    cbrId,
                    isValid: isValidGroup
                });
            });
        });

        log.debug('Prepared finalArray', { count: finalArray.length });
        return finalArray;
    }


    function map(context) {
        try {
            const payload = JSON.parse(context.value);
            const { cbrId, isValid } = payload;

            record.submitFields({
                type: CUSTOM_BILL_RECORD_TYPE,
                id: cbrId,
                values: {
                    [FIELD_CBR_BILLABLE]: !!isValid
                },
                options: { enablesourcing: false, ignoreMandatoryFields: true }
            });

            log.debug('CBR updated', { cbrId, billable: !!isValid });
        }
        catch (e) {
            log.error('Map error', { key: context.key, value: context.value, error: e });
        }
    }

    return { getInputData, map };
});
