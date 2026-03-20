/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 *
 * NOTE:
 * Updated to use the common JSON structure shared across Invoice/Credit Note flows:
 * - nsCounterpartyid, nsSubsidiaryid, nsCurrency, nsExchangerate, nsPostingdate, nsDocumentdate, nsRefNumber, etc.
 * - If a field/column does not exist on Credit Memo, it will be skipped (as requested).
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
  const SELECT_LINE = new Set(['item','taxcode','pricelevel']);


  function isEmpty(v){ return v === undefined || v === null || (typeof v === 'string' && v.trim() === ''); }


  function looksLikeId(v){ return /^\d+$/.test(String(v)); }


  const ASPECT_PRODUCT_MAP = {
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

  function toNumber(val){
    if (isEmpty(val)) return 0;
    return parseFloat(String(val).replace(/,/g,'').trim()) || 0;
  }

  function mapAspectProduct(val){
    if (isEmpty(val)) return '';
    const key = String(val).trim();
    return ASPECT_PRODUCT_MAP[key] || val;
  }


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

    } catch (e) {
      //Skip if field doesn't exist / not editable on Credit Memo:
      log.debug('CreditMemo - Body field skipped', { fieldId: fieldId, value: value, error: (e && e.name ? (e.name + ': ' + e.message) : String(e)) });
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
      //Skip if column doesn't exist / not editable on Credit Memo lines:
      log.debug('CreditMemo - Line field skipped', { fieldId: fieldId, value: value, error: (e && e.name ? (e.name + ': ' + e.message) : String(e)) });
    }
  }


  function applyToSourceInvoice(cm, sourceInvoiceId, amountToApply){
    if (!sourceInvoiceId || amountToApply <= 0) return false;

    try {
      const sublistId = 'apply';
      const n = cm.getLineCount({ sublistId }) || 0;
      log.debug('CreditMemo - Apply sublist line count', n);

      let found = false;

      for (let i = 0; i < n; i++) {
        let docId = cm.getSublistValue({ sublistId, fieldId: 'doc', line: i }) || '';

        log.debug("Invoice ID: ", sourceInvoiceId);
        log.debug("Traversed Line Apply: ", docId);


        if (!docId) {
         docId = cm.getSublistValue({ sublistId, fieldId: 'internalid', line: i }) || '';
         log.debug("Traversed Line Apply: ", docId); 
        } 
        cm.selectLine({ sublistId, line: i });

        if (String(docId) === String(sourceInvoiceId)) {
          cm.setCurrentSublistValue({ sublistId, fieldId: 'apply', value: true });
          cm.setCurrentSublistValue({ sublistId, fieldId: 'amount', value: amountToApply });
          // cm.setCurrentSublistValue({ sublistId, fieldId: 'payment', value: amountToApply });
          found = true;
        }
        cm.commitLine({ sublistId });
      }  
      
      log.debug('CreditMemo - Apply updated', { sourceInvoiceId, amountToApply, found });
      return found; 
    } 
    
    catch (e) {
      log.error('CreditMemo - Apply update failed/skipped', e);
      return false;
    }
  }


  function createRequestObject(payload){
    const r = record.create({ type: REQOBJ.type, isDynamic: true });
    r.setValue({ fieldId: REQOBJ.f.scriptId, value: runtime.getCurrentScript().id || '' });
    r.setValue({ fieldId: REQOBJ.f.request,  value: (typeof payload === 'string') ? payload : JSON.stringify(payload) });
    r.setValue({ fieldId: REQOBJ.f.response, value: '' });
    r.setValue({ fieldId: REQOBJ.f.recType,  value: 'Credit Memo' });
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
    ['nsProduct',            'custcol_c112417_aspect_product', 'value']
  ];


  function post(requestBody){
    let reqObjId = null;

    try{
      //Step-1 Receive Payload:
      const p = (typeof requestBody === 'string') ? JSON.parse(requestBody) : (requestBody || {});
      log.debug('CreditMemo - Payload', p);

      const isTransform = !isEmpty(p.nsRecordid);

      //Step-2 Create Request Object:
      reqObjId = createRequestObject(p);
      log.debug('CreditMemo - Request Object', reqObjId);


      //Step-3 Basic Validations:
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


      //Step-4 Create/Transform Credit Memo:
      let cm;
      if (isTransform){
        log.debug('CreditMemo - Transform Start', 'InvoiceId=' + p.nsRecordid);
        cm = record.transform({
          fromType: record.Type.INVOICE,
          fromId: Number(p.nsRecordid),
          toType: 'creditmemo',
          isDynamic: true
        });
      }
      else {
        cm = record.create({ type: 'creditmemo', isDynamic: true });
      }


      //Step-5 Set Customer:
      if(!isTransform){
        setBody(cm, 'entity', p.nsCounterpartyid, 'select');


        //Step-6 Subsidiary & Currency (before other body fields):
        setBody(cm, 'subsidiary', p.nsSubsidiaryid, 'select');
        setBody(cm, 'currency',   p.nsCurrency,     'select');
      }


      //Step-7 Body Fields:
      BODY_MAP.forEach(([key, fieldId, kind]) => setBody(cm, fieldId, p[key], kind));
      if(!isTransform){
        setBody(cm, 'entity', p.nsCounterpartyid, 'select');


        //Step-6 Subsidiary & Currency (before other body fields):
        setBody(cm, 'subsidiary', p.nsSubsidiaryid, 'select');
        setBody(cm, 'currency',   p.nsCurrency,     'select');
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

            cm.setValue({
              fieldId: 'exchangerate',
              value: calcExRate
            });

            log.debug('Credit Memo - Exchange Rate Overridden', {
              nsUsdAmount: usdAmt,
              nsAmount: baseAmt,
              exchangerate: calcExRate
            });
          } 
          else {
            log.debug('Credit Memo - Exchange Rate Override Skipped', 'nsAmount is 0 on first line.');
          }
        } 
        else {
          log.debug('Credit Memo - Exchange Rate Override Skipped', 'First line nsUsdAmount/nsAmount missing.');
        }
      }
      catch (eEx) {
        log.debug('Credit Memo - Exchange Rate Override Failed', eEx.name + ' ' + eEx.message);
      }


      //Step-8 Memo LAST:
      if (!isEmpty(p.nsMemo)) cm.setValue({ fieldId: 'memo', value: p.nsMemo });


      //Step-8.1 If transformed, remove all existing lines so we can rebuild from JSON:
      if (isTransform){
        try{
          const existing = cm.getLineCount({ sublistId: 'item' }) || 0;
          for (let i = existing - 1; i >= 0; i--){
            cm.removeLine({ sublistId: 'item', line: i, ignoreRecalc: true });
          }
          log.debug('CreditMemo - Existing lines removed', existing);
        }
        catch(eClr){
          log.debug('CreditMemo - Remove lines skipped/failed', (eClr && eClr.name ? (eClr.name + ' ' + eClr.message) : eClr));
        }
      }


      //Step-9 Sublists:
      items.forEach((line, idx) => {
        cm.selectNewLine({ sublistId: 'item' });

        LINE_MAP.forEach(([key, fieldId, kind]) => {
          var v = line[key];

          //Aspect Product mapping: Aspect sends internal id (eg: 137) -> store product text (eg: CRUDE OIL)
          if (key === 'nsProduct' && fieldId === 'custcol_c112417_aspect_product') {
            v = mapAspectProduct(v);
          }

          setLine(cm, 'item', fieldId, v, kind);
        });

        cm.commitLine({ sublistId: 'item' });

        log.debug('CreditMemo - Line committed', { line: idx + 1, item: line.nsItemid, amount: line.nsAmount });
      });


      //Step-9.1 Apply Credit Memo back to the source invoice when transforming:
      if (isTransform){
        const amountToApply = p.nsItems[0].nsAmount;
        const appliedOk = applyToSourceInvoice(cm, p.nsRecordid, amountToApply);
        log.debug('CreditMemo - Apply sublist update', { amountToApply, appliedOk });
      }


      //Step-10 Save:
      const id = cm.save({ enableSourcing: true, ignoreMandatoryFields: false });
      log.debug('CreditMemo created', id);

      const out = { StatusCode: 200, Type: 'Success', NSRecordID: id };
      finalizeRequestObject(reqObjId, out);
      return out;
    }

    catch(e){
      log.error('Create Credit Memo failed', e);
      const out = { StatusCode: 300, Type: 'Error', NSRecordID: '', message: e.message || String(e) };
      finalizeRequestObject(reqObjId, out);
      return out;
    }
  }


  function get(){
    return { message: 'Credit Memo RESTlet up', when: new Date() };
  }


  return { get, post };

});
