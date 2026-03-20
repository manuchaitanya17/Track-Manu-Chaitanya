/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 *
 * NOTE:
 * Updated to use the common JSON structure shared across Invoice/Credit Note flows:
 * - nsCounterpartyid, nsSubsidiaryid, nsCurrency, nsExchangerate, nsPostingdate, nsDocumentdate, nsRefNumber, etc.
 * - If a field/column does not exist on Vendor Credit, it will be skipped (as requested).
 */
define(['N/record','N/log','N/runtime'], (record, log, runtime) => {

  //Request Object Configuration:
  const REQOBJ = {
    type: 'customrecord_c112417_req_object',
    f: {
      scriptId:  'custrecord_c112417_script_id',
      request:   'custrecord_c112417_request_object',
      response:  'custrecord_c112417_request_response',
      status:    'custrecord_c112417_status',
      recType:   'custrecord_c112417_record_type'
    },
    statusId:   { PENDING: '1', COMPLETE: '2', ERROR: '3' },
    statusText: { PENDING: 'Pending', COMPLETE: 'Complete', ERROR: 'Error' }
  };


  //Helpers:
  const SELECT_BODY = new Set(['entity','subsidiary','currency','department','class','location','account','postingperiod']);
  const SELECT_LINE = new Set(['item','taxcode','pricelevel', 'custcol_c112417_aspect_product']);


  function isEmpty(v){ return v === undefined || v === null || (typeof v === 'string' && v.trim() === ''); }


  function looksLikeId(v){ return /^\d+$/.test(String(v)); }


  function parseDate(val){
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'number') return new Date(val);
    const s = String(val).trim();
    let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (m) return new Date(+m[1], +m[2]-1, +m[3]);
    m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(s);
    if (m){ const a=+m[1], b=+m[2], y=+m[3]; return new Date(y, (a>12?b:b)-1, (a>12?a:a)); }
    const d = new Date(s);
    return isFinite(d) ? d : null;
  }

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

  function setBody(rec, fieldId, value, kind){
    if (isEmpty(value)) return;

    try {

      if (kind === 'date'){
        const d = parseDate(value);
        if (d) rec.setValue({ fieldId, value: d });
        return;
      }

      if (kind === 'selectText'){
        rec.setText({ fieldId, text: String(value) });
        return;
      }

      if (kind === 'select' || SELECT_BODY.has(fieldId)){
        looksLikeId(value) ? rec.setValue({ fieldId, value: Number(value) })
                           : rec.setText({ fieldId, text: String(value) });
        return;
      }

      rec.setValue({ fieldId, value });

    } 
    catch (e) {
      //Skip if field doesn't exist / not editable on Vendor Credit:
      log.debug('VendorCredit - Body field skipped', { fieldId: fieldId, value: value, error: (e && e.name ? (e.name + ': ' + e.message) : String(e)) });
    }
  }


  function setLine(rec, sublistId, fieldId, value, kind){
    if (isEmpty(value)) return;

    try {

      if (kind === 'date'){
        const d = parseDate(value);
        if (d) rec.setCurrentSublistValue({ sublistId, fieldId, value: d });
        return;
      }

      if (kind === 'selectText'){
        rec.setCurrentSublistText({ sublistId, fieldId, text: String(value) });
        return;
      }

      if (kind === 'select' || SELECT_LINE.has(fieldId)){
        looksLikeId(value) ? rec.setCurrentSublistValue({ sublistId, fieldId, value: Number(value) })
                           : rec.setCurrentSublistText({ sublistId, fieldId, text: String(value) });
        return;
      }

      rec.setCurrentSublistValue({ sublistId, fieldId, value });

    } catch (e) {
      //Skip if column doesn't exist / not editable on Vendor Credit lines:
      log.debug('VendorCredit - Line field skipped', { fieldId: fieldId, value: value, error: (e && e.name ? (e.name + ': ' + e.message) : String(e)) });
    }
  }

function applyToSourceInvoice(vc, sourceInvoiceId, amountToApply){
    if (!sourceInvoiceId || amountToApply <= 0) return false;

    try {
      const sublistId = 'apply';
      const n = vc.getLineCount({ sublistId }) || 0;
      log.debug('Vendor Credit - Apply sublist line count', n);

      let found = false;

      for (let i = 0; i < n; i++) {
        let docId = vc.getSublistValue({ sublistId, fieldId: 'doc', line: i }) || '';

        log.debug("Invoice ID: ", sourceInvoiceId);
        log.debug("Traversed Line Apply: ", docId);


        if (!docId) {
         docId = vc.getSublistValue({ sublistId, fieldId: 'internalid', line: i }) || '';
         log.debug("Traversed Line Apply: ", docId); 
        } 
        vc.selectLine({ sublistId, line: i });

        if (String(docId) === String(sourceInvoiceId)) {
          vc.setCurrentSublistValue({ sublistId, fieldId: 'apply', value: true });
          vc.setCurrentSublistValue({ sublistId, fieldId: 'amount', value: amountToApply });
          // vc.setCurrentSublistValue({ sublistId, fieldId: 'payment', value: amountToApply });
          found = true;
        }
        vc.commitLine({ sublistId });
      }  
      
      log.debug('Vendor Credit - Apply updated', { sourceInvoiceId, amountToApply, found });
      return found; 
    } 
    
    catch (e) {
      log.error('Vendor Credit - Apply update failed/skipped', e);
      return false;
    }
  }


  function createRequestObject(payload){
    const r = record.create({ type: REQOBJ.type, isDynamic: true });
    r.setValue({ fieldId: REQOBJ.f.scriptId, value: runtime.getCurrentScript().id || '' });
    r.setValue({ fieldId: REQOBJ.f.request,  value: (typeof payload === 'string') ? payload : JSON.stringify(payload) });
    r.setValue({ fieldId: REQOBJ.f.response, value: '' });
    r.setValue({ fieldId: REQOBJ.f.recType,  value: 'Vendor Credit' });
    try { r.setValue({ fieldId: REQOBJ.f.status, value: Number(REQOBJ.statusId.PENDING) }); }
    catch(_){ r.setText({ fieldId: REQOBJ.f.status, text: REQOBJ.statusText.PENDING }); }
    return r.save({ enableSourcing: false, ignoreMandatoryFields: true });
  }


  function finalizeRequestObject(reqId, resp){
    if (!reqId) return;
    try{
      const r = record.load({ type: REQOBJ.type, id: reqId, isDynamic: true });
      r.setValue({ fieldId: REQOBJ.f.response, value: JSON.stringify(resp) });

      const ok = resp && String(resp.Type) === 'Success' && Number(resp.StatusCode) >= 200 && Number(resp.StatusCode) < 300;
      try { r.setValue({ fieldId: REQOBJ.f.status, value: Number(ok ? REQOBJ.statusId.COMPLETE : REQOBJ.statusId.ERROR) }); }
      catch(_){ r.setText({ fieldId: REQOBJ.f.status, text: ok ? REQOBJ.statusText.COMPLETE : REQOBJ.statusText.ERROR }); }

      r.save({ enableSourcing: false, ignoreMandatoryFields: true });
    }
    catch(e){ log.error('Request Object update failed', e); }
  }


  //Configuration-1 Body Mapping: [payloadKey, fieldId, kind]
  //NOTE: subsidiary & currency are set explicitly before BODY_MAP for refresh-safe ordering.
  const BODY_MAP = [
    ['nsExchangerate',       'exchangerate',                  'value'],
    ['nsPostingdate',        'trandate',                       'date'],
    ['nsDuedate',            'duedate',                        'date'],
    ['nsDocumentdate',       'custbody_mcto_document_date',     'date'],
    ['nsRefNumber',          'tranid',                    'value'],
    ['nsUpstreamdocnumber',  'custbody__c94559_upstreamdoc_no', 'value'],
    ['aspectInvoiceno',      'custbody_aspect_invoice_no_',     'value'],
    ['nsAccountid',          'account',                        'select']
  ];


  //Configuration-2 Line Mapping (Item sublist): [payloadKey, fieldId, kind]
  const LINE_MAP = [
    ['nsItemid',             'item',                  'select'],
    ['nsQuantity',           'quantity',              'value'],
    ['nsRate',               'rate',                  'value'],
    ['nsAmount',             'amount',                'value'],
    ['nsLinedescription',    'description',           'value'],
    ['nsTaxcode',            'taxcode',               'select'],
    ['nsTaxamount',          'tax1amt',               'value'],
    ['nsDepartmentid',       'department',            'select'],
    ['nsLocationid',         'location',              'select'],
    ['nsVesselname',         'custcol_c94563_vslname', 'value'],
    ['nsBilloflandingdate',  'custcol_c94565_boldt',   'date'],
    ['nsTitleevent',         'custcol_c94566_titlevnt','value'],
    ['nsTitledate',          'custcol_c94567_titledt', 'date'],
    ['aspectId',             'custcol_c_aspek_id',     'value'],
    ['nsStrategynumber',     'custcol_c94932_strategyno', 'select'],
    ['nsProduct',             'custcol_c112417_aspect_product',     'select']
  ];


  function post(requestBody){
    let reqObjId = null;

    try{
      //Step-1 Receive Payload:
      const p = (typeof requestBody === 'string') ? JSON.parse(requestBody) : (requestBody || {});
      log.debug('VendorCredit - Payload', p);

      //NEW: If nsRecordid is present, transform Vendor Bill -> Vendor Credit
      const isTransform = !isEmpty(p.nsRecordid);


      //Step-2 Create Request Object:
      reqObjId = createRequestObject(p);
      log.debug('VendorCredit - Request Object', reqObjId);


      //Step-3 Validations:
      if (isTransform && !looksLikeId(p.nsRecordid)){
        const out = { StatusCode: 300, Type: 'Error', NSRecordID: '', message: 'nsRecordid must be numeric when provided.' };
        finalizeRequestObject(reqObjId, out); return out;
      }

      if (!isTransform && isEmpty(p.nsCounterpartyid)){
        const out = { StatusCode: 300, Type: 'Error', NSRecordID: '', message: 'nsCounterpartyid is required.' };
        finalizeRequestObject(reqObjId, out); return out;
      }
      if (!isTransform && isEmpty(p.nsSubsidiaryid)){
        const out = { StatusCode: 300, Type: 'Error', NSRecordID: '', message: 'nsSubsidiaryid is required.' };
        finalizeRequestObject(reqObjId, out); return out;
      }
      if (!isTransform && isEmpty(p.nsCurrency)){
        const out = { StatusCode: 300, Type: 'Error', NSRecordID: '', message: 'nsCurrency is required.' };
        finalizeRequestObject(reqObjId, out); return out;
      }
      if (isEmpty(p.nsPostingdate)){
        const out = { StatusCode: 300, Type: 'Error', NSRecordID: '', message: 'nsPostingdate is required.' };
        finalizeRequestObject(reqObjId, out); return out;
      }
      if (isEmpty(p.nsExchangerate)){
        const out = { StatusCode: 300, Type: 'Error', NSRecordID: '', message: 'nsExchangerate is required.' };
        finalizeRequestObject(reqObjId, out); return out;
      }

      const items = Array.isArray(p.nsItems) ? p.nsItems : [];
      if (!items.length){
        const out = { StatusCode: 300, Type: 'Error', NSRecordID: '', message: 'nsItems must have at least 1 line.' };
        finalizeRequestObject(reqObjId, out); return out;
      }


      //Step-4 Create/Transform Vendor Credit:
      let vc;
      if (isTransform){
        log.debug('VendorCredit - Transform', 'Transforming Vendor Bill ' + p.nsRecordid + ' to Vendor Credit');
        vc = record.transform({
          fromType: record.Type.VENDOR_BILL,
          fromId: Number(p.nsRecordid),
          toType: 'vendorcredit',
          isDynamic: true
        });
      } else {
        vc = record.create({ type: 'vendorcredit', isDynamic: true });
      }


      //Step-5 Vendor:
      if(!isTransform){
        setBody(vc, 'entity', p.nsCounterpartyid, 'select');


        //Step-6 Subsidiary & Currency (before other body fields):
        setBody(vc, 'subsidiary', p.nsSubsidiaryid, 'select');
        setBody(vc, 'currency',   p.nsCurrency,     'select');
      }


      //Step-7 Body Fields:
      BODY_MAP.forEach(([key, fieldId, kind]) => setBody(vc, fieldId, p[key], kind));
      
      if(!isTransform){
        setBody(vc, 'entity', p.nsCounterpartyid, 'select');


        //Step-6 Subsidiary & Currency (before other body fields):
        setBody(vc, 'subsidiary', p.nsSubsidiaryid, 'select');
        setBody(vc, 'currency',   p.nsCurrency,     'select');
      }



      //Step-7.1 Override Exchange Rate using first line item:
      //Exchange Rate = nsUsdAmount / nsAmount
      try {
        var itemsForRate = Array.isArray(p.nsItems) ? p.nsItems : [];
        var firstItem = itemsForRate.length ? itemsForRate[0] : null;

        if (firstItem && !isEmpty(firstItem.nsUsdAmount) && !isEmpty(firstItem.nsAmount)) {

          var usdAmt = parseFloat(String(firstItem.nsUsdAmount).replace(/,/g, '').trim()) || 0;
          var baseAmt = parseFloat(String(firstItem.nsAmount).replace(/,/g, '').trim()) || 0;
          log.debug("usdAmt", usdAmt);
          log.debug("baseAmt", baseAmt);


          if (baseAmt > 0) {
            var calcExRate = usdAmt / baseAmt;
            log.debug("calcExRate", calcExRate);

            vc.setValue({
              fieldId: 'exchangerate',
              value: calcExRate
            });

            log.debug('Vendor Credit - Exchange Rate Overridden', {
              nsUsdAmount: usdAmt,
              nsAmount: baseAmt,
              exchangerate: calcExRate
            });
          } 
          else {
            log.debug('Vendor Credit - Exchange Rate Override Skipped', 'nsAmount is 0 on first line.');
          }
        } 
        else {
          log.debug('Vendor Credit - Exchange Rate Override Skipped', 'First line nsUsdAmount/nsAmount missing.');
        }
      }
      catch (eEx) {
        log.debug('Vendor Credit - Exchange Rate Override Failed', eEx.name + ' ' + eEx.message);
      }


      //Step-8 Memo LAST:
      if (!isEmpty(p.nsMemo)) vc.setValue({ fieldId: 'memo', value: p.nsMemo });


      //Step-8.1 If transformed, remove all existing lines so we can rebuild from JSON:
      if (isTransform){
        //Remove Item lines
        try{
          const existingItemLines = vc.getLineCount({ sublistId: 'item' }) || 0;
          for (let i = existingItemLines - 1; i >= 0; i--){
            vc.removeLine({ sublistId: 'item', line: i, ignoreRecalc: true });
          }
          log.debug('VendorCredit - Existing item lines removed', existingItemLines);
        }catch(eClrItem){
          log.debug('VendorCredit - Remove item lines skipped', (eClrItem && (eClrItem.name + ' ' + eClrItem.message)) || eClrItem);
        }

        //Remove Expense lines (if any)
        try{
          const existingExpLines = vc.getLineCount({ sublistId: 'expense' }) || 0;
          for (let j = existingExpLines - 1; j >= 0; j--){
            vc.removeLine({ sublistId: 'expense', line: j, ignoreRecalc: true });
          }
          log.debug('VendorCredit - Existing expense lines removed', existingExpLines);
        }catch(eClrExp){
          log.debug('VendorCredit - Remove expense lines skipped', (eClrExp && (eClrExp.name + ' ' + eClrExp.message)) || eClrExp);
        }
      }

      //Step-9 Lines:
      items.forEach((line, idx) => {
        vc.selectNewLine({ sublistId: 'item' });
         LINE_MAP.forEach(([key, fieldId, kind]) => {
          if (!isEmpty(line[key])){

            if (key === 'nsProduct' && fieldId === 'custcol_c112417_aspect_product') {
                var rawId = String(line[key]).trim();
                var mappedText = PRODUCT_BY_ITEMID[rawId];
                if (!isEmpty(mappedText)) {
                  setLine(vc, 'item', fieldId, mappedText, 'select');
                  return;
                }
                setLine(vc, 'item', fieldId, line[key], kind);
                return;
            }

            setLine(vc, 'item', fieldId, line[key], kind);
          }
        });
        vc.commitLine({ sublistId: 'item' });

        log.debug('VendorCredit - Line committed', { line: idx + 1, item: line.nsItemid, amount: line.nsAmount });
      });

       //Step-9.1 Apply Vendor Credit back to the source invoice when transforming:
      if (isTransform){
        const amountToApply = p.nsItems[0].nsAmount;
        const appliedOk = applyToSourceInvoice(vc, p.nsRecordid, amountToApply);
        log.debug('CreditMemo - Apply sublist update', { amountToApply, appliedOk });
      }

      //Step-10 Save:
      const id = vc.save({ enableSourcing: true, ignoreMandatoryFields: false });
      log.debug('Vendor Credit created', id);

      const out = { StatusCode: 200, Type: 'Success', NSRecordID: id };
      finalizeRequestObject(reqObjId, out);
      return out;
    }
    catch(e){
      log.error('Create Vendor Credit failed', e);
      const out = { StatusCode: 300, Type: 'Error', NSRecordID: '', message: e.message || String(e) };
      finalizeRequestObject(reqObjId, out);
      return out;
    }
  }


  function get(){
    return { message: 'Vendor Credit RESTlet up', when: new Date() };
  }

  return { get, post };

});
