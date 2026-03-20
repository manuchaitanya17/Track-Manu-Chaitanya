/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/log'], (search, record, log) => {

    //Configurations:
    //CIR Record ID
    const CUSTOM_INVOICE_RECORD_TYPE = 'customrecord_invoice_custom';

    //Fields on the Custom Invoice Record (CIR)
    const FIELD_CIR_INTERNALID = 'internalid';
    const FIELD_CIR_SO = 'custrecord_sales_order';
    const FIELD_CIR_ITEM = 'custrecord_invoice_item';
    const FIELD_CIR_QTY = 'custrecord_inv_qty'; 
    const FIELD_CIR_INVOICEABLE = 'custrecord_is_invoiceable'; 
    const FIELD_CIR_CUSTOMER = 'custrecord_cust_inv_customer'; 
    const FIELD_CIR_INVOICE_LINK = 'custrecord_cust_inv_number';


    //Helper Array-1: Adds any filters we always want on the CIR search
    const CIR_BASE_FILTERS = [
        ['isinactive', 'is', 'F'],
        'AND',
        [FIELD_CIR_INVOICEABLE, 'is', 'F'],  
        'AND',
        [FIELD_CIR_INVOICE_LINK, 'anyof', '@NONE@']
    ];


    //Helper Function-1: Keys for Grouping
    const keyFor = (soId, itemId) => soId + '||' + itemId;


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

        // Step-1 Search Custom Invoice Record (CIR):
        const cirSearch = search.create({
            type: CUSTOM_INVOICE_RECORD_TYPE,
            filters: CIR_BASE_FILTERS,
            columns: [
                search.createColumn({ name: FIELD_CIR_INTERNALID }),
                search.createColumn({ name: FIELD_CIR_SO }),
                search.createColumn({ name: FIELD_CIR_ITEM }),
                search.createColumn({ name: FIELD_CIR_QTY }),
                search.createColumn({ name: FIELD_CIR_CUSTOMER })
            ]
        });

        const cirResults = getAllResults(cirSearch);
        log.debug("cirResults", cirResults);


        // Step-2 Group by (SO + Item) and Sum CIR Quantity:
        /** @type {Record<string, Array<{cirId:string, soId:string, itemId:string, cirQty:number, cirCustomerId:string}>>} */
        const grouped = {};
        /** @type {Record<string, number>} */
        const groupSums = {};
        /** @type {Set<string>} */
        const soIdsSet = new Set();

        cirResults.forEach(r => {
            const cirId = String(r.getValue({ name: FIELD_CIR_INTERNALID }));
            const soId = String(r.getValue({ name: FIELD_CIR_SO }) || '');
            const itemId = String(r.getValue({ name: FIELD_CIR_ITEM }) || '');
            const cirQty = safeNumber(r.getValue({ name: FIELD_CIR_QTY }));
            const cirCustomerId = String(r.getValue({ name: FIELD_CIR_CUSTOMER }) || ''); 

            if (!soId || !itemId) {
                const k = keyFor(soId || 'NULL', itemId || 'NULL');
                log.debug("k", k);

                grouped[k] = grouped[k] || [];
                grouped[k].push({ cirId, soId, itemId, cirQty, cirCustomerId });
                groupSums[k] = (groupSums[k] || 0) + cirQty;
                return;
            }

            const key = keyFor(soId, itemId);
            grouped[key] = grouped[key] || [];
            grouped[key].push({ cirId, soId, itemId, cirQty, cirCustomerId }); 
            groupSums[key] = (groupSums[key] || 0) + cirQty;
            soIdsSet.add(soId); //Note: No Duplicate SO
        });
        log.debug("grouped", grouped);
        log.debug("groupSums", groupSums);
        log.debug("soIdsSet", soIdsSet);


        //Step-3 Sales Order IDs Array
        const soIds = Array.from(soIdsSet);
        log.debug('Collected SO IDs', soIds);


        //Step-4 Search Sales Orders for those IDs, Get Line-Level (SO, Item, Quantity)
        /** @type {Record<string, number>} */
        const soItemQtyMap = {}; 

        /** @type {Record<string, string>} */
        const soCustomerMap = {}; 

        if (soIds.length > 0) {
            const soSearch = search.create({
                type: search.Type.SALES_ORDER,
                filters: [
                    ['internalid', 'anyof', soIds],
                    'AND', ['mainline', 'is', 'F'],
                    'AND', ['taxline', 'is', 'F'],
                    'AND', ['shipping', 'is', 'F']
                ],
                columns: [
                    search.createColumn({ name: 'internalid' }),
                    search.createColumn({ name: 'item' }),
                    search.createColumn({ name: 'quantity' }),
                    search.createColumn({ name: 'entity' })
                ]
            });

            const soResults = getAllResults(soSearch);
            log.debug("soResults", soResults);

            soResults.forEach(r => {
                const soId = String(r.getValue({ name: 'internalid' }) || '');
                const itemId = String(r.getValue({ name: 'item' }) || '');
                const customerId = String(r.getValue({ name: 'entity' }) || '');
                const qty = safeNumber(r.getValue({ name: 'quantity' }));

                if (!soId || !itemId || !customerId) return;

                const k = keyFor(soId, itemId);
                soItemQtyMap[k] = (soItemQtyMap[k] || 0) + qty;

                if (customerId) {
                    if (soCustomerMap[soId] && soCustomerMap[soId] !== customerId) {
                        log.debug('SO Customer mismatch across lines', { soId, prev: soCustomerMap[soId], current: customerId });
                    }
                    if (!soCustomerMap[soId]) soCustomerMap[soId] = customerId;
                }
            });
            log.debug("soItemQtyMap", soItemQtyMap);
            log.debug("soCustomerMap", soCustomerMap); 
        }


        //Step-5 Validate each (SO, Item) group against the SO lines
        const finalArray = [];
        Object.keys(grouped).forEach(key => {
            const cirList = grouped[key]; 
            const sumCirQty = groupSums[key] || 0;
            const soQty = safeNumber(soItemQtyMap[key]);
            const existsOnSO = Object.prototype.hasOwnProperty.call(soItemQtyMap, key);

            const soIdForGroup = cirList[0] && cirList[0].soId;
            const expectedCustId = soCustomerMap[soIdForGroup] || '';
            const allHaveCust = cirList.every(i => !!i.cirCustomerId);
            const allMatchCust = expectedCustId && cirList.every(i => i.cirCustomerId === expectedCustId);
            const customerOK = allHaveCust && allMatchCust;

            const isValidGroup = existsOnSO && (soQty >= sumCirQty) && customerOK; 


            // Step-6 For each CIR in the Group, Push { cirId, isValid }
            cirList.forEach(({ cirId }) => {
                finalArray.push({
                    cirId,
                    isValid: isValidGroup
                });
            });
        });

        log.debug('Prepared finalArray', finalArray);
        return finalArray; 
    }

    
    function map(context) {
        try {
            const payload = JSON.parse(context.value);
            const { cirId, isValid } = payload;

            record.submitFields({
                type: CUSTOM_INVOICE_RECORD_TYPE,
                id: cirId,
                values: {
                    [FIELD_CIR_INVOICEABLE]: !!isValid
                },
                options: { enablesourcing: false, ignoreMandatoryFields: true }
            });

            log.debug('CIR updated', { cirId, invoiceable: !!isValid });
        }
        catch (e) {
            log.error('Map error', { key: context.key, value: context.value, error: e });
        }
    }


    return {
        getInputData,
       map
    };
});
