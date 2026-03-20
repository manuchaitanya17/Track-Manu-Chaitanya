/**
 * Vendor – Create via RESTlet (+ Address subrecords)
 * Uses mapping doc field IDs; Company/Individual handled via `isperson`.
 *
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/log', 'N/runtime', 'N/query'], (record, log, runtime, query) => {
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


  const SELECT_BODY = new Set(['category','subsidiary','currency','payablesaccount','terms']);


  function isEmpty(v){ return v === undefined || v === null || (typeof v === 'string' && v.trim() === ''); }


  function looksLikeId(v){ return /^\d+$/.test(String(v)); }


  function setBody(rec, fieldId, value, kind){
    if (isEmpty(value)) return;
    try{
      if (kind === 'checkbox'){ rec.setValue({ fieldId, value: !!value }); return; }
      if (kind === 'select' || SELECT_BODY.has(fieldId)){
        looksLikeId(value) ? rec.setValue({ fieldId, value: Number(value) })
                           : rec.setText({ fieldId, text: String(value) });
        return;
      }
      rec.setValue({ fieldId, value });
    }
    catch(e){
      log.debug({ title:'Body field set skipped', details:`${fieldId}: ${e && e.name || e}` });
    }
  }


  function setAddrSub(sub, fieldId, value, asText=false){
    if (isEmpty(value)) return;
    try{
      if (asText) sub.setText({ fieldId, text: String(value) });
      else sub.setValue({ fieldId, value });
    }catch(e){
      log.debug({ title:'Address subrecord field skipped', details:`${fieldId}: ${e && e.name || e}` });
    }
  }


  function createRequestObject(payload){
    const r = record.create({ type: REQOBJ.type, isDynamic: true });
    r.setValue({ fieldId: REQOBJ.f.scriptId, value: runtime.getCurrentScript().id || '' });
    r.setValue({ fieldId: REQOBJ.f.request,  value: (typeof payload === 'string') ? payload : JSON.stringify(payload) });
    r.setValue({ fieldId: REQOBJ.f.response, value: '' });
    r.setValue({ fieldId: REQOBJ.f.recType,  value: 'Vendor' });
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


   function clearSublist(rec, sublistId){
    try{
      const n = rec.getLineCount({ sublistId }) || 0;
      for (let i = n - 1; i >= 0; i--){
        rec.removeLine({ sublistId, line: i, ignoreRecalc: true });
      }
    }catch(e){
      log.debug({ title:'clearSublist skipped', details:`${sublistId}: ${e && e.name || e}` });
    }
  }


  const BODY_MAP = [
    ['nsCategoryId',        'category',        'select'],
    ['nsEmail',             'email',           'value'],
    ['nsMobilePhone',       'mobilephone',     'value'],
    ['nsPhone',             'phone',           'value'],
    ['nsComments',          'comments',        'value'],
    ['nsCurrencyId',        'currency',        'select'],
    ['nsPayableAccountId', 'payablesaccount', 'select'],
    ['nsTermsId',           'terms',           'select'],
    ['nsAspectId',         'custentity_aspect_id',        'value'],
    ['nsTaxRegNumber',         'vatregnumber',        'value'],
  ];

  function post(requestBody){
    let reqObjId = null;
    try{
       const p = (typeof requestBody === 'string') ? JSON.parse(requestBody) : (requestBody || {});
      reqObjId = createRequestObject(p);

      //Step-1 General Validations:
      if (isEmpty(p.nsPrimarySubsidiaryId)){
        const out = { StatusCode: 300, Type: 'Error', NSRecordID: '', message: 'nsPrimarySubsidiaryId is required.' };
        finalizeRequestObject(reqObjId, out); return out;
      }


      //Step-2 Create/Update Vendor Master Record:
      const isUpdate = !isEmpty(p.nsRecordId);
      const ven = isUpdate
        ? record.load({ type: record.Type.VENDOR, id: Number(p.nsRecordId), isDynamic: true })
        : record.create({ type: record.Type.VENDOR, isDynamic: true });


      //Step-3 Vendor Type (Company / Individual):
      var isPerson;
      const type = String(p.nsType || '');
      if(type === "Company"){
           isPerson = false;
           ven.setValue({ fieldId: 'isperson', value: 'F'});
      }
      else{
        isPerson = true;
        ven.setValue({ fieldId: 'isperson', value: 'T'});
      }
      
      if (isPerson){
        setBody(ven, 'salutation', p.nsSalutation, 'value');
        setBody(ven, 'firstname',  p.nsFirstName,  'value');
        setBody(ven, 'lastname',   p.nsLastName,   'value');
        setBody(ven, 'title',      p.nsJobTitle,   'value');
        setBody(ven, 'companyname', p.nsCompanyName, 'value');
      }
      else{
        setBody(ven, 'companyname', p.nsCompanyName, 'value');
      }


      //Step-4 Setting Body Fields:
      setBody(ven, 'subsidiary', p.nsPrimarySubsidiaryId, 'select');
      BODY_MAP.forEach(([key, fieldId, kind]) => setBody(ven, fieldId, p[key], kind));


      //Step-5 Setting Subsidiaries:
      if (Array.isArray(p.nsSubsidiaries) && p.nsSubsidiaries.length){
        try{
          p.nsSubsidiaries.forEach(subId => {
            if (isEmpty(subId)) return;
            ven.selectNewLine({ sublistId: 'subsubsidiary' });
            ven.setCurrentSublistValue({ sublistId: 'subsubsidiary', fieldId: 'subsidiary', value: Number(subId) });
            ven.commitLine({ sublistId: 'subsubsidiary' });
          });
        }
        catch(e){
           log.debug('Additional subsidiaries skipped', e); 
        }
      }


      //Step-6 Setting Address Subrecord:
      const addresses = Array.isArray(p.nsAddresses) ? p.nsAddresses : [];
      if (isUpdate && addresses.length){
        clearSublist(ven, 'addressbook');
      }
      
      addresses.forEach(a => {
        ven.selectNewLine({ sublistId: 'addressbook' });
        let sub = null;
        try{
          sub = ven.getCurrentSublistSubrecord({ sublistId: 'addressbook', fieldId: 'addressbookaddress' });
        }
        catch(e){
             log.debug('addressbookaddress subrecord not available', e); 
        }

        if (sub){
          setAddrSub(sub, 'country',   a.nsCountry,   true);
          setAddrSub(sub, 'addressee', a.nsAddressee);
          setAddrSub(sub, 'addrphone', a.nsAddrPhone);
          setAddrSub(sub, 'addr1',     a.nsAddress1);
          setAddrSub(sub, 'addr2',     a.nsAddress2);
          setAddrSub(sub, 'city',      a.nsCity);
          setAddrSub(sub, 'state',     a.nsState);
          setAddrSub(sub, 'zip',       a.nsZip);
        }

        ven.commitLine({ sublistId: 'addressbook' });
      });


      //Step-7 Save the Vendor Record:
      const id = ven.save({ enableSourcing: true, ignoreMandatoryFields: false });

      const out = { StatusCode: 200, Type: 'Success', NSRecordID: id };
      finalizeRequestObject(reqObjId, out);
      return out;

    }
    catch(e){
      log.error('Create Vendor failed', e);
      const out = { StatusCode: 300, Type: 'Error', NSRecordID: '', message: e.message || String(e) };
      finalizeRequestObject(reqObjId, out);
      return out;
    }
  }

  function get(){ return { message: 'Vendor RESTlet up', when: new Date() }; }

  return { get, post };
});
