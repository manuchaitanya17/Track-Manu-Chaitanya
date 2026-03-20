/**
 * Customer – Create via RESTlet (+ Address subrecords)
 * Uses mapping doc field IDs; Company/Individual handled via `isperson`.
 *
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
define(['N/record','N/log','N/runtime'], (record, log, runtime) => {

  //Request Object Configurations:
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
  const SELECT_BODY = new Set([
    'entitystatus','salesrep','partner','category','subsidiary',
    'currency','receivablesaccount','terms','parent'
  ]);


  function isEmpty(v){ return v === undefined || v === null || (typeof v === 'string' && v.trim() === ''); }


  function looksLikeId(v){ return /^\d+$/.test(String(v)); }


  function setBody(rec, fieldId, value, kind){
    if (isEmpty(value)) return;
    try{
      if (kind === 'checkbox'){ rec.setValue({ fieldId, value: !!value }); return; }
      if (kind === 'select' || SELECT_BODY.has(fieldId)){
        looksLikeId(value)
          ? rec.setValue({ fieldId, value: Number(value) })
          : rec.setText({ fieldId, text: String(value) });
        return;
      }
      rec.setValue({ fieldId, value });
    }catch(e){
      // Non-breaking: some fields may not exist on the active form
      log.debug({ title:'Body field set skipped', details:`${fieldId}: ${e && e.name || e}` });
    }
  }


  function setAddr(rec, fieldId, value){
    if (isEmpty(value)) return;
    try{
      rec.setCurrentSublistValue({ sublistId: 'addressbook', fieldId, value });
    }catch(e){
      log.debug({ title:'Address header field skipped', details:`${fieldId}: ${e && e.name || e}` });
    }
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


  function setAddrSub(sub, fieldId, value, asText=false){
    if (isEmpty(value)) return;
    try{
      if (asText) sub.setText({ fieldId, text: String(value) });
      else sub.setValue({ fieldId, value });
    }catch(e){
      log.debug({ title:'Address subrecord field skipped', details:`${fieldId}: ${e && e.name || e}` });
    }
  }


  function ensureVendorForCustomer(customerId){
    if (isEmpty(customerId) || !looksLikeId(customerId)) return null;

    const idNum = Number(customerId);

    try {
      record.load({ type: record.Type.VENDOR, id: idNum, isDynamic: false });
      log.debug({ title: 'ensureVendorForCustomer', details: 'Vendor already exists for entity id=' + idNum });
      return idNum;
    }
    catch (eLoad) {
      log.debug({
        title: 'ensureVendorForCustomer - vendor load failed (will transform)',
        details: (eLoad && eLoad.name ? eLoad.name : '') + ' ' + (eLoad && eLoad.message ? eLoad.message : String(eLoad))
      });
    }

    try {
      const v = record.transform({
        fromType: record.Type.CUSTOMER,
        fromId: idNum,
        toType: record.Type.VENDOR,
        isDynamic: true
      });
      log.debug("Vendor Transformed, lets set some fields now.")
      setBody(v, 'payablesaccount', '325', 'select');

      const vendorId = v.save({ enableSourcing: true, ignoreMandatoryFields: false });
      log.debug({ title: 'ensureVendorForCustomer', details: 'Vendor created from Customer. customerId=' + idNum + ' vendorId=' + vendorId });
      return vendorId;
    }
    catch (eXform) {
      log.error({ title: 'ensureVendorForCustomer - customer->vendor transform failed', details: eXform });
      return null;
    }
  }

  
  //Body Configurations [payloadKey, fieldId, kind]:
  const BODY_MAP = [
    ['nsCategoryId',           'category',            'select'],
    ['nsComments',             'comments',            'value'],
    ['nsEmail',                'email',               'value'],
    ['nsMobilePhone',          'mobilephone',         'value'],
    ['nsPhone',                'phone',               'value'],
    ['nsPrimarySubsidiaryId',  'subsidiary',          'select'],
    ['nsCurrencyId',           'currency',            'select'], 
    ['nsAccountId', 'receivablesaccount',  'select'],
    ['nsTaxRegNumber',         'vatregnumber',        'value'],
    ['nsTermsId',              'terms',               'select'],
    ['nsAspectId',         'custentity_aspect_id',        'value']
  ];


  function createRequestObject(payload){
    const r = record.create({ type: REQOBJ.type, isDynamic: true });
    r.setValue({ fieldId: REQOBJ.f.scriptId, value: runtime.getCurrentScript().id || '' });
    r.setValue({ fieldId: REQOBJ.f.request,  value: (typeof payload === 'string') ? payload : JSON.stringify(payload) });
    r.setValue({ fieldId: REQOBJ.f.response, value: '' });
    r.setValue({ fieldId: REQOBJ.f.recType,  value: 'Customer' });
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


  function post(requestBody){
    let reqObjId = null;
    try{
      const p = (typeof requestBody === 'string') ? JSON.parse(requestBody) : (requestBody || {});
      reqObjId = createRequestObject(p);

      //Step-1 Create Customer:
      const isUpdate = !isEmpty(p.nsRecordId);
      const cust = isUpdate
        ? record.load({ type: record.Type.CUSTOMER, id: Number(p.nsRecordId), isDynamic: true })
        : record.create({ type: record.Type.CUSTOMER, isDynamic: true });


      //Step-2 Customer Type (Company / Individual):
      var isPerson;
      const type = String(p.nsType || '');
      if(type === "Company"){
           isPerson = false;
           cust.setValue({ fieldId: 'isperson', value: 'F'});
      }
      else{
        isPerson = true;
        cust.setValue({ fieldId: 'isperson', value: 'T'});
      }
      
      if (isPerson){
        setBody(cust, 'salutation', p.nsSalutation, 'value');
        setBody(cust, 'firstname',  p.nsFirstName,  'value');
        setBody(cust, 'lastname',   p.nsLastName,   'value');
        setBody(cust, 'title',      p.nsJobTitle,   'value');
        setBody(cust, 'companyname', p.nsCompanyName, 'value');
      }
      else{
        setBody(cust, 'companyname', p.nsCompanyName, 'value');
      }

      
      //Step-3 Setting Body Fields:
      setBody(cust, 'subsidiary', p.nsPrimarySubsidiaryId, 'select');
      setBody(cust, 'currency',   p.nsCurrencyId,          'select');
      BODY_MAP.forEach(([key, fieldId, kind]) => setBody(cust, fieldId, p[key], kind));


      //Step-4 Setting Subsidiaries:
      if (Array.isArray(p.nsSubsidiaries) && p.nsSubsidiaries.length){
        try{
          p.nsSubsidiaries.forEach(subId => {
            if (isEmpty(subId)) return;
            cust.selectNewLine({ sublistId: 'subsubsidiary' });
            cust.setCurrentSublistValue({ sublistId: 'subsubsidiary', fieldId: 'subsidiary', value: Number(subId) });
            cust.commitLine({ sublistId: 'subsubsidiary' });
          });
        }
        catch(e){
           log.debug('Additional subsidiaries skipped', e); 
        }
      }

      //Step-5 Setting Address Subrecord:
      const addresses = Array.isArray(p.nsAddresses) ? p.nsAddresses : [];
      if (isUpdate && addresses.length){
        clearSublist(cust, 'addressbook');
      }
      addresses.forEach(a => {
        cust.selectNewLine({ sublistId: 'addressbook' });
        let sub = null;
        try{
          sub = cust.getCurrentSublistSubrecord({ sublistId: 'addressbook', fieldId: 'addressbookaddress' });
        }
        catch(e){ log.debug('addressbookaddress subrecord not available', e); }
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
        cust.commitLine({ sublistId: 'addressbook' });
      });


      //Step-6 Save Customer:
      const id = cust.save({ enableSourcing: true, ignoreMandatoryFields: false });
      log.debug("Customer Created", id);



      //Step-7 Create Vendor relationship (same Entity/internal id) if not already present
      let vendorId = null;
      try {
        vendorId = ensureVendorForCustomer(id);
      }
      catch (eVendor) {
        log.error('Ensure Vendor relationship failed', eVendor);
      }

      const out = { StatusCode: 200, Type: 'Success', NSRecordID: id, NSVendorID: vendorId };
      finalizeRequestObject(reqObjId, out);
      return out;

    }
    catch(e){
      log.error('Create Customer failed', e);
      const out = { StatusCode: 300, Type: 'Error', NSRecordID: '', message: e.message || String(e) };
      finalizeRequestObject(reqObjId, out);
      return out;
    }
  }

  function get(){ return { message: 'Customer RESTlet up', when: new Date() }; }

  return { get, post };
});
