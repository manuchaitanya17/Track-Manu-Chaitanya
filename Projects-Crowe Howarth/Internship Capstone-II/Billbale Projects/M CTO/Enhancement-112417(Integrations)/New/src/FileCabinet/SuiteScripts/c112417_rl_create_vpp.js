/**
 * Vendor Bill – Create/Transform via RESTlet
 *
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/log', 'N/runtime'], (record, log, runtime) => {

    const SELECT_BODY = new Set(['entity', 'subsidiary', 'currency', 'department', 'class', 'location', 'account', 'approvalstatus']);
    const SELECT_LINE = new Set(['item', 'department', 'class', 'location', 'taxcode', 'account', 'custcol_c112417_aspect_product']);

    const HARDCODE_ITEM_ID = 433;
    const HARDCODE_QTY = 1;

    //Request Object Configurations:
    const REQOBJ = {
        type: 'customrecord_c112417_req_object',
        f: {
            scriptId: 'custrecord_c112417_script_id',
            request: 'custrecord_c112417_request_object',
            response: 'custrecord_c112417_request_response',
            status: 'custrecord_c112417_status',
            recType: 'custrecord_c112417_record_type'
        },

        statusId:{ PENDING: '1', COMPLETE: '2', ERROR: '3' },
        statusText: { PENDING: 'Pending', COMPLETE: 'Complete', ERROR: 'Error' }
    };


    //Body Mapping: [payloadKey, fieldId, kind]
    const BODY_MAP = [
        ['nsSubsidiaryid', 'subsidiary', 'select'],
        ['nsCurrency', 'currency', 'select'],
        ['nsMemo', 'memo', 'value'],
        ['nsRefNumber', 'tranid', 'value'], 
        ['nsPostingdate', 'trandate', 'date'],
        ['nsDocumentdate', 'custbody_mcto_document_date', 'date'],
        ['nsDuedate', 'duedate', 'date'],
        ['nsAccountid', 'account', 'select'],  
        ['nsUpstreamdocnumber', 'custbody__c94559_upstreamdoc_no', 'value'],
        ['aspectInvoiceno', 'custbody_aspect_invoice_no_', 'value'],
        ['nsExchangerate', 'exchangerate', 'value']    
    ];


    //Line mapping: [payloadKey, fieldId, kind]
    const LINE_MAP = [
        // ['nsItemid', 'item', 'select'],
        ['nsAmount', 'rate', 'value'],
        // ['nsAmount', 'quantity', 'value'],
        ['nsLinedescription', 'description', 'value'],
        ['nsTaxcode', 'taxcode', 'select'],
        ['nsAmount', 'amount', 'value'],
        ['nsTaxamount', 'tax1amt', 'value'],
        ['nsDepartmentid', 'department', 'select'],
        ['nsLocationid', 'location', 'select'],
        ['nsVesselname', 'custcol_c94563_vslname', 'value'],
        ['nsBilloflandingdate', 'custcol_c94565_boldt', 'date'],   
        ['nsTitleevent', 'custcol_c94566_titlevnt', 'value'],
        ['nsTitledate', 'custcol_c94567_titledt', 'date'],
        ['aspectId', 'custcol_c_aspek_id', 'value'],
        ['nsStrategynumber', 'custcol_c94932_strategyno', 'select'],
        ['nsProduct', 'custcol_c112417_aspect_product', 'select']
    ];

    const PRODUCT_BY_ITEMID = {
        '137': 'CRUDE OIL',
        '139': 'FUEL OIL',
        '140': 'NAPHTHA',
        '427': 'GASOIL',
        '138': 'DIESEL',
        '428': 'GASOLINE',
        '429': 'JET FUEL',
        '430': 'PETROCHEMICALS',
        '431': 'BITUMEN'
    };


    function isEmpty(v) { return v === undefined || v === null || (typeof v === 'string' && v.trim() === ''); }


    function looksLikeId(v) { return /^\d+$/.test(String(v)); }


    function parseDate(val) {
        if (!val) return null;
        if (val instanceof Date) return val;
        if (typeof val === 'number') return new Date(val);
        const s = String(val).trim();

        let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
        if (m) return new Date(+m[1], +m[2] - 1, +m[3]);

        m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(s);
        if (m) {
            const a = +m[1], b = +m[2], y = +m[3];
            return new Date(y, (a > 12 ? b : b) - 1, (a > 12 ? a : a));
        }

        const d = new Date(s);
        return isFinite(d) ? d : null;
    }


    function setBody(rec, fieldId, value, kind, opts = { silent: true }) {
        if (isEmpty(value)) return;
        try {
            if (kind === 'date') {
                const d = parseDate(value);
                if (d) rec.setValue({ fieldId, value: d });
                return;
            }
            if (kind === 'select' || SELECT_BODY.has(fieldId)) {
                looksLikeId(value)
                    ? rec.setValue({ fieldId, value: Number(value) })
                    : rec.setText({ fieldId, text: String(value) });
                return;
            }
            rec.setValue({ fieldId, value });
        }
        catch (e) {
            if (!opts.silent) throw e;
            log.debug({ title: `Body field set skipped`, details: `${fieldId}: ${e && e.name || e}` });
        }
    }


    function setLine(rec, sublistId, fieldId, value, kind, opts = { silent: true }) {
        if (isEmpty(value)) return;
        try {
            if (kind === 'date') {
                const d = parseDate(value);
                if (d) rec.setCurrentSublistValue({ sublistId, fieldId, value: d });
                return;
            }
            if (kind === 'select' || SELECT_LINE.has(fieldId)) {
                looksLikeId(value)
                    ? rec.setCurrentSublistValue({ sublistId, fieldId, value: Number(value) })
                    : rec.setCurrentSublistText({ sublistId, fieldId, text: String(value) });
                return;
            }
            rec.setCurrentSublistValue({ sublistId, fieldId, value });
        }
        catch (e) {
            if (!opts.silent) throw e;
            log.debug({ title: `Line field set skipped`, details: `${fieldId}: ${e && e.name || e}` });
        }
    }


    function setSelect(rec, fieldId, val) {
        if (isEmpty(val)) return;
        looksLikeId(val) ? rec.setValue({ fieldId, value: Number(val) })
            : rec.setText({ fieldId, text: String(val) });
    }


    function createRequestObject(payload) {
        const rec = record.create({ type: REQOBJ.type, isDynamic: true });
        const scriptId = runtime.getCurrentScript().id || '';
        rec.setValue({ fieldId: REQOBJ.f.scriptId, value: scriptId });
        rec.setValue({ fieldId: REQOBJ.f.request, value: (typeof payload === 'string') ? payload : JSON.stringify(payload) });
        rec.setValue({ fieldId: REQOBJ.f.response, value: '' });
        rec.setValue({ fieldId: REQOBJ.f.recType, value: 'Vendor Bill' });

        // Prefer the configured id, fallback to text if needed
        try { rec.setValue({ fieldId: REQOBJ.f.status, value: Number(REQOBJ.statusId.PENDING) }); }
        catch (_) { setSelect(rec, REQOBJ.f.status, REQOBJ.statusText.PENDING); }

        const id = rec.save({ enableSourcing: false, ignoreMandatoryFields: true });
        log.debug('Request Object created', id);
        return id;
    }


    function finalizeRequestObject(reqId, responseObj) {
        if (!reqId) return;
        try {
            const rec = record.load({ type: REQOBJ.type, id: reqId, isDynamic: true });
            rec.setValue({ fieldId: REQOBJ.f.response, value: JSON.stringify(responseObj) });

            const ok = responseObj && Number(responseObj.StatusCode) >= 200 && Number(responseObj.StatusCode) < 300 && responseObj.Type === 'Success';
            const toId = ok ? REQOBJ.statusId.COMPLETE : REQOBJ.statusId.ERROR;
            const toText = ok ? REQOBJ.statusText.COMPLETE : REQOBJ.statusText.ERROR;

            try { rec.setValue({ fieldId: REQOBJ.f.status, value: Number(toId) }); }
            catch (_) { setSelect(rec, REQOBJ.f.status, toText); }

            const saved = rec.save({ enableSourcing: false, ignoreMandatoryFields: true });
            log.debug('Request Object updated', saved);
        } catch (e) {
            log.error('Failed updating Request Object', e);
        }
    }


  
    function post(requestBody) {
        try {
            //Step-1.1 Recieving the Payload:
            const payload = (typeof requestBody === 'string') ? JSON.parse(requestBody) : (requestBody || {});
            log.debug("Payload: ", payload);


            // 1.2 Create Request Object first
            var reqObjId = createRequestObject(payload);


            //Step-2 Checking whether PO ID is there or not? If available then transform:
            const isTransform = !isEmpty(payload.nsPOid);
            log.debug("isTransform: ", isTransform);


            
            //Step-3 Validation over Transform/Create:
            let vb;
            if (isTransform) {
                log.debug("isTransform");
                vb = record.transform({
                    fromType: record.Type.PURCHASE_ORDER,
                    fromId: Number(payload.nsPOid),
                    toType: record.Type.VENDOR_BILL,
                    isDynamic: true
                });
            }
            else {
                log.debug("isCreate");
                if (isEmpty(payload.nsCounterpartyid)) {
                    var out = { StatusCode: 300, Type: 'Error', NSRecordID: '', message: 'nsCounterpartyid is required for Standalone Bills.' };
                    finalizeRequestObject(reqObjId, out);
                    return out;
                }
                vb = record.create({ type: record.Type.VENDOR_BILL, isDynamic: true });
            }


            //Step-4 Determinig Vendor:
            const existingVendor = vb.getValue({ fieldId: 'entity' });
            const vendorToUse = !isEmpty(payload.nsCounterpartyid) ? payload.nsCounterpartyid : existingVendor;
            if (isEmpty(vendorToUse)) {
                return { StatusCode: 300, Type: 'Error', NSRecordID: '', message: 'Vendor could not be determined. Provide nsCounterpartyid or transform from a PO with a vendor.' };
            }
            if (!isTransform) {
                setBody(vb, 'entity', vendorToUse, 'select');
            }

      
            //Step-5.1 Setting Body Fields:
            BODY_MAP.forEach(([key, fieldId, kind]) => {
                log.debug("Setting: ", fieldId);

                //Step-6 Resisting Subsidiary and Currency to be set if transform:
                if (isTransform && (fieldId === 'subsidiary' || fieldId === 'currency')) {
                    return;
                }
                setBody(vb, fieldId, payload[key], kind);
            });
            log.debug('From Payload', payload.nsMemo);


            //Step-5.1.1 Checking the Provisional Vendor Bill Checkbox:
            setBody(vb, 'custbody_cid_prepayment_inv', true, 'checkbox');

            
            //Step-5.2 Reseeting Memo:
            if (!isEmpty(payload.nsMemo)) {
                vb.setValue({ fieldId: 'memo', value: payload.nsMemo });
                log.debug('From Payload', payload.nsMemo);

                log.debug('memo after reapply', vb.getValue({ fieldId: 'memo' }));
            }

            //Step-5.1.2.1 Override Exchange Rate using first line item:
            //Exchange Rate = nsUsdAmount / nsAmount
            try {
                var itemsForRate = Array.isArray(payload.nsItems) ? payload.nsItems : [];
                var firstItem = itemsForRate.length ? itemsForRate[0] : null;

                if (firstItem && !isEmpty(firstItem.nsUsdAmount) && !isEmpty(firstItem.nsAmount)) {

                var usdAmt = parseFloat(String(firstItem.nsUsdAmount).replace(/,/g, '').trim()) || 0;
                var baseAmt = parseFloat(String(firstItem.nsAmount).replace(/,/g, '').trim()) || 0;
                log.debug("usdAmt", usdAmt);
                log.debug("baseAmt", baseAmt);


                if (baseAmt > 0) {
                    var calcExRate = usdAmt / baseAmt;
                    log.debug("calcExRate", calcExRate);

                    vb.setValue({
                    fieldId: 'exchangerate',
                    value: calcExRate
                    });

                    log.debug('Vendor Bill  - Exchange Rate Overridden', {
                    nsUsdAmount: usdAmt,
                    nsAmount: baseAmt,
                    exchangerate: calcExRate
                    });
                } 
                else {
                    log.debug('Vendor Bill - Exchange Rate Override Skipped', 'nsAmount is 0 on first line.');
                }
                } 
                else {
                log.debug('Vendor Bill  - Exchange Rate Override Skipped', 'First line nsUsdAmount/nsAmount missing.');
                }
            }
            catch (eEx) {
                log.debug('Vendor Bill  - Exchange Rate Override Failed', eEx.name + ' ' + eEx.message);
            }


     
            //Step-7 Setting Line Fields:
            const items = Array.isArray(payload.nsItems) ? payload.nsItems : [];
        
            if (!isTransform && items.length) {
                items.forEach(line => {
                    vb.selectNewLine({ sublistId: 'item' });

                    vb.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: HARDCODE_ITEM_ID });
                    vb.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: HARDCODE_QTY });

                    LINE_MAP.forEach(([key, fieldId, kind]) => {
                        if (!isEmpty(line[key])) {

                            if (key === 'nsProduct' && fieldId === 'custcol_c112417_aspect_product') {
                                var rawId = String(line[key]).trim();
                                var mappedText = PRODUCT_BY_ITEMID[rawId];
                                if (!isEmpty(mappedText)) {
                                setLine(vb, 'item', fieldId, mappedText, 'select');
                                return;
                                }
                                setLine(vb, 'item', fieldId, line[key], kind);
                                return;
                            }

                            setLine(vb, 'item', fieldId, line[key], kind);
                        }
                    });
                    vb.commitLine({ sublistId: 'item' });
                });
            }
            

            //Step-8 Saving the Vendor Bill Record:
            const id = vb.save({ enableSourcing: true, ignoreMandatoryFields: false });
            var out =  { StatusCode: 200, Type: 'Success', NSRecordID: id };
            finalizeRequestObject(reqObjId, out);
            return out;

        }
        catch (e) {
            log.error('Create/Transform Vendor Bill failed', e);
            const out = { StatusCode: 300, Type: 'Error', NSRecordID: '', message: e.message || String(e) };
            finalizeRequestObject(reqObjId, out);
            return out;
        }
    }

    function get() {
        return { message: 'Vendor Bill RESTlet up', when: new Date() };
    }

    return { get, post };
});
