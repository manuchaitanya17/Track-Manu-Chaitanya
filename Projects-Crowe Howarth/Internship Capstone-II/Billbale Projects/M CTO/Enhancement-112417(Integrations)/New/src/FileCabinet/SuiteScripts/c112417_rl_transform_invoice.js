/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

define(['N/record', 'N/log', 'N/runtime'], (record, log, runtime) => {

const SELECT_BODY = new Set(['entity','subsidiary','currency','department','class','location','account','postingperiod']);

  function parseDate(val){
    if (!val) return null;
    if (val instanceof Date) return val;

    const s = String(val).trim();

    //YYYY-MM-DD
    let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (m) return new Date(+m[1], +m[2]-1, +m[3]);

    //DD/MM/YYYY or MM/DD/YYYY (your input "10/10/2025" works either way)
    m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(s);
    if (m){
      const a = +m[1], b = +m[2], y = +m[3];
      return new Date(y, (a > 12 ? b : a) - 1, (a > 12 ? a : b));
    }

    const d = new Date(s);
    return isFinite(d) ? d : null;
  }
  //Custom Function-1
  function isEmpty(v) {
    return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
  }


  //Custom Function-2
  function looksLikeId(v) {
    return /^\d+$/.test(String(v));
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

  const BODY_MAP = [
  //Document Date (custom field) – NOT trandate:
  ['nsDocumentdate', 'custbody_mcto_document_date', 'date'],

  //Reference No:
  ['nsRefNumber', 'tranid', 'value'],

  //Aspect Invoice No:
  ['aspectInvoiceno', 'custbody_aspect_invoice_no_', 'value'],

  //Memo:
  ['nsMemo', 'memo', 'value']
];

  function post(requestBody) {
    try {

      //Step-1 Receive payload:
      var payload = (typeof requestBody === 'string') ? JSON.parse(requestBody) : (requestBody || {});
      log.debug('InvoiceClose - Step-1 Payload', payload);

      //Step-2 Validations:
      if (isEmpty(payload.nsRecordid) || !looksLikeId(payload.nsRecordid)) {
        var out1 = { StatusCode: 300, Type: 'Error', NSRecordID: '', message: 'nsRecordid is required and must be numeric.' };
        return out1;
      }

      if (isEmpty(payload.nsStatus)) {
        var out2 = { StatusCode: 300, Type: 'Error', NSRecordID: '', message: 'nsStatus is required.' };
        return out2;
      }

      var invoiceId = Number(payload.nsRecordid);
      var nsStatus = String(payload.nsStatus || '').trim();
      var nsStatusLc = nsStatus.toLowerCase();

      log.debug('InvoiceClose - Step-3 Validation OK', 'invoiceId=' + invoiceId + ', nsStatus=' + nsStatus);

      //Step-3 Load Invoice:
      var inv = record.load({
        type: record.Type.INVOICE,
        id: invoiceId,
        isDynamic: false
      });

      //Step-4 Get Invoice Status:
      var statusRef = '';
      var statusText = '';

      try { statusRef = inv.getValue({ fieldId: 'statusRef' }) || ''; } catch (e1) { statusRef = ''; }
      try { statusText = inv.getValue({ fieldId: 'status' }) || ''; } catch (e2) { statusText = ''; }
      if (!statusText) {
        try { statusText = inv.getText({ fieldId: 'status' }) || ''; } catch (e3) { statusText = ''; }
      }

      log.debug('InvoiceClose - Step-5 Current Status', 'statusRef=' + statusRef + ' | status=' + statusText);

      //Step-5 Decide if Invoice is OPEN:
      var sr = String(statusRef || '').toLowerCase();
      var st = String(statusText || '').toLowerCase();

      //Invoice can show "Open", "Paid In Full", "Partially Paid", etc.
      //We only act when it is truly open/unpaid.
      var isOpen = (
        sr.indexOf('open') !== -1 || st.indexOf('open') !== -1 ||
        sr.indexOf('unpaid') !== -1 || st.indexOf('unpaid') !== -1
      );

      log.debug('InvoiceClose - Step-6 isOpen?', isOpen);

      //Step-7 If Open + nsStatus=Closed => transform to Credit Memo:
      if (nsStatusLc === 'closed' && isOpen) {

        log.debug('InvoiceClose - Step-7 Transform Start', 'Transforming Invoice ' + invoiceId + ' to Credit Memo');

        var cm = record.transform({
          fromType: record.Type.INVOICE,
          fromId: invoiceId,
          toType: record.Type.CREDIT_MEMO,
          isDynamic: true
        });


        BODY_MAP.forEach(([key, fieldId, kind]) => setBody(cm, fieldId, payload[key], kind));


        //Step-7.2 Save Credit Memo:
        var cmId = cm.save({ enableSourcing: true, ignoreMandatoryFields: false });

        log.debug('InvoiceClose - Step-7.2 Credit Memo Saved', cmId);

        var out3 = {
          StatusCode: 200,
          Type: 'Success',
          NSInvoiceID: String(invoiceId),
          NSCreditMemoID: String(cmId),
          message: 'Invoice was OPEN and nsStatus=Closed. Credit Memo created.'
        };

        return out3;
      }

      //Step-8 No Action:
      var out4 = {
        StatusCode: 200,
        Type: 'Success',
        NSInvoiceID: String(invoiceId),
        message: 'No action taken. nsStatus=' + nsStatus + ', currentStatus=' + (statusText || statusRef)
      };

      return out4;

    } 
    catch (e) {

      log.error('InvoiceClose - Error', e);

      var out5 = {
        StatusCode: 300,
        Type: 'Error',
        NSRecordID: '',
        message: e.message || String(e)
      };

      return out5;
    }
  }

  function get() {
    return { message: 'Invoice Close RESTlet Up', when: new Date() };
  }

  return { get, post };
});
