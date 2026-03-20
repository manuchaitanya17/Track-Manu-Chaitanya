/**
 * Invoice (Customer Invoice) – Create via RESTlet
 * + Request Object logging
 *
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/log', 'N/runtime'], (record, log, runtime) => {

  //Request Object Constants:
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


  //Helpers
  const SELECT_BODY = new Set(['entity','subsidiary','salesrep','partner','opportunity','class','department','location','discountitem', 'account']);


  const SELECT_LINE = new Set(['item','pricelevel','taxcode','custcol_c94562_destlocn', 'custcol_c112417_aspect_product']);


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


  function setBody(rec, fieldId, value, kind, silent=true){
    if (isEmpty(value)) return;
    try{
      if (kind === 'date'){ const d = parseDate(value); if (d) rec.setValue({ fieldId, value: d }); return; }
      if (kind === 'selectText'){ rec.setText({ fieldId, text: String(value) }); return; }
      if (kind === 'checkbox'){ rec.setValue({ fieldId, value: !!value }); return; }
      if (kind === 'select' || SELECT_BODY.has(fieldId)){
        looksLikeId(value) ? rec.setValue({ fieldId, value: Number(value) })
                           : rec.setText({ fieldId, text: String(value) });
        return;
      }
      rec.setValue({ fieldId, value });
    }
    catch(e){ if (!silent) throw e; log.debug('Body field set skipped', `${fieldId}: ${e && e.name || e}`); }
  }


  function setLine(rec, sublistId, fieldId, value, kind, silent=true){
    if (isEmpty(value)) return;
    try{
      if (kind === 'date'){ const d = parseDate(value); if (d) rec.setCurrentSublistValue({ sublistId, fieldId, value: d }); return; }
      if (kind === 'selectText'){ rec.setCurrentSublistText({ sublistId, fieldId, text: String(value) }); return; }
      if (kind === 'checkbox'){ rec.setCurrentSublistValue({ sublistId, fieldId, value: !!value }); return; }
      if (kind === 'select' || SELECT_LINE.has(fieldId)){
        looksLikeId(value) ? rec.setCurrentSublistValue({ sublistId, fieldId, value: Number(value) })
                           : rec.setCurrentSublistText({ sublistId, fieldId, text: String(value) });
        return;
      }
      rec.setCurrentSublistValue({ sublistId, fieldId, value });
    }catch(e){ if (!silent) throw e; log.debug('Line field set skipped', `${fieldId}: ${e && e.name || e}`); }
  }


  function createRequestObject(payload){
    const r = record.create({ type: REQOBJ.type, isDynamic: true });
    r.setValue({ fieldId: REQOBJ.f.scriptId, value: runtime.getCurrentScript().id || '' });
    r.setValue({ fieldId: REQOBJ.f.request,  value: (typeof payload === 'string') ? payload : JSON.stringify(payload) });
    r.setValue({ fieldId: REQOBJ.f.response, value: '' });
    r.setValue({ fieldId: REQOBJ.f.recType,  value: 'Invoice' });
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
    }catch(e){ log.error('Request Object update failed', e); }
  }

 
  //Invoice Configuration [payloadKey, fieldId, kind]:
  const BODY_MAP = [
    ['nsPostingdate',        'trandate',                        'date'],
    ['nsDuedate',            'duedate',                         'date'],
    ['nsMemo',               'memo',                            'value'],  
    ['nsUpstreamdocnumber',  'custbody__c94559_upstreamdoc_no', 'value'],
    ['nsCurrency', 'currency', 'select'],
    ['nsDocumentdate',       'custbody_mcto_document_date',     'date'],
    ['nsRefNumber', 'tranid', 'value'], 
    ['nsSubsidiaryid',       'subsidiary',                      'select'],
    ['nsExchangerate', 'exchangerate', 'value'],
    ['aspectInvoiceno', 'custbody_aspect_invoice_no_', 'value'],
    ['nsAccountid', 'account', 'select']
  ];


 const LINE_MAP = [
        ['nsItemid', 'item', 'select'],
        ['nsQuantity', 'quantity', 'value'],
        ['nsRate', 'rate', 'value'],
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
        ['nsStrategynumber', 'custcol_c94932_strategyno', 'value'],
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

  function post(body){
    let reqObjId = null;
    try{
      const p = (typeof body === 'string') ? JSON.parse(body) : (body || {});
      reqObjId = createRequestObject(p);


      //Step-1 General Validation:
      if (isEmpty(p.nsCounterpartyid)){
        const out = { StatusCode: 300, Type: 'Error', NSRecordID: '', message: 'nsCounterpartyid is required.' };
        finalizeRequestObject(reqObjId, out); 
        return out;
      }


      //Step-2 Create Invoice:
      const inv = record.create({ type: record.Type.INVOICE, isDynamic: true });


      //Step-3 Critical fields in a refresh-safe order:
      setBody(inv, 'subsidiary', p.nsSubsidiaryid, 'select');  
      setBody(inv, 'entity',     p.nsCounterpartyid,   'select'); 


      //Step-4 Body Fields:
      BODY_MAP.forEach(([key, fieldId, kind]) => setBody(inv, fieldId, p[key], kind));



      //Step-4.1 Override Exchange Rate using first line item:
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

            inv.setValue({
              fieldId: 'exchangerate',
              value: calcExRate
            });

            log.debug('Invoice - Exchange Rate Overridden', {
              nsUsdAmount: usdAmt,
              nsAmount: baseAmt,
              exchangerate: calcExRate
            });
          } 
          else {
            log.debug('Invoice - Exchange Rate Override Skipped', 'nsAmount is 0 on first line.');
          }
        } 
        else {
          log.debug('Invoice - Exchange Rate Override Skipped', 'First line nsUsdAmount/nsAmount missing.');
        }
      }
      catch (eEx) {
        log.debug('Invoice - Exchange Rate Override Failed', eEx.name + ' ' + eEx.message);
      }


      //Step-5 Memo Field:
      if (!isEmpty(p.nsMemo)) inv.setValue({ fieldId: 'memo', value: p.nsMemo });


      //Step-6 Lines Fields:
      const items = Array.isArray(p.nsItems) ? p.nsItems : [];
      items.forEach(line => {
        inv.selectNewLine({ sublistId: 'item' });
        LINE_MAP.forEach(([key, fieldId, kind]) => {
          if (!isEmpty(line[key])){

            if (key === 'nsProduct' && fieldId === 'custcol_c112417_aspect_product') {
                var rawId = String(line[key]).trim();
                var mappedText = PRODUCT_BY_ITEMID[rawId];
                if (!isEmpty(mappedText)) {
                  setLine(inv, 'item', fieldId, mappedText, 'select');
                  return;
                }
                setLine(inv, 'item', fieldId, line[key], kind);
                return;
            }

            setLine(inv, 'item', fieldId, line[key], kind);
          }
        });
        inv.commitLine({ sublistId: 'item' });
      });


      //Step-7 Save Record:
      const invoiceId = inv.save({ enableSourcing: true, ignoreMandatoryFields: false });

      const out = { StatusCode: 200, Type: 'Success', NSRecordID: invoiceId };
      finalizeRequestObject(reqObjId, out);
      return out;
    }
    catch(e){
      log.error('Create Invoice failed', e);
      const out = { StatusCode: 300, Type: 'Error', NSRecordID: '', message: e.message || String(e) };
      finalizeRequestObject(reqObjId, out);
      return out;
    }
  }

  function get(){ return { message: 'Invoice RESTlet up', when: new Date() }; }

  return { get, post };
});
