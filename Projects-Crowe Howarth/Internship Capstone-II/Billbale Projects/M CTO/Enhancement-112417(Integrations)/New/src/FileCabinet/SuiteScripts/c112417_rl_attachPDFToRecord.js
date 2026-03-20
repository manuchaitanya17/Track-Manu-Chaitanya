/**
 * Attach PDF to a NetSuite record (Aspect -> NetSuite)
 * Payload:
 * {
 *   "nsId": "12345",
 *   "nsRecordtype": "Invoice",
 *   "nsPdfbase64": "JVBERi0xLjQKJc..."
 * }
 *
 * Folder ID: -10
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

define(['N/record', 'N/file', 'N/log', 'N/runtime', 'N/search'], (record, file, log, runtime, search) => {

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


  //Helpers:
  function isEmpty(v){
    return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
  }


  function looksLikeId(v){
    return /^\d+$/.test(String(v));
  }


  function getSafePayloadForReqObj(payload){
    try {
      var obj = (typeof payload === 'string') ? JSON.parse(payload) : (payload || {});
      var safe = {};
      Object.keys(obj).forEach(function(k){ safe[k] = obj[k]; });

      if (typeof safe.nsPdfbase64 === 'string' && safe.nsPdfbase64.length > 100){
        safe.nsPdfbase64 = safe.nsPdfbase64.substring(0, 100) + "...";
      }
      return JSON.stringify(safe);
    } 
    catch (e) {
      var s = (typeof payload === 'string') ? payload : JSON.stringify(payload || {});
      return (s.length > 1000) ? s.substring(0, 1000) : s;
    }
  }


  function createRequestObject(payload, recordTypeForLog){
    const r = record.create({ type: REQOBJ.type, isDynamic: true });

    r.setValue({ fieldId: REQOBJ.f.scriptId, value: runtime.getCurrentScript().id || '' });
    r.setValue({
      fieldId: REQOBJ.f.request,
      value: getSafePayloadForReqObj(payload)
    });

    r.setValue({ fieldId: REQOBJ.f.response, value: '' });
    r.setValue({ fieldId: REQOBJ.f.recType, value: recordTypeForLog || 'PDF Attachment' });

    try {
      r.setValue({ fieldId: REQOBJ.f.status, value: Number(REQOBJ.statusId.PENDING) });
    } 
    catch (_) {
      r.setText({ fieldId: REQOBJ.f.status, text: REQOBJ.statusText.PENDING });
    }

    const reqId = r.save({ enableSourcing: false, ignoreMandatoryFields: true });

    log.debug({
      title: 'AttachPDF - Request Object Created',
      details: 'reqObjId=' + reqId
    });

    return reqId;
  }

  function finalizeRequestObject(reqId, resp){
    if (!reqId) return;

    try {
      const r = record.load({ type: REQOBJ.type, id: reqId, isDynamic: true });

      r.setValue({ fieldId: REQOBJ.f.response, value: JSON.stringify(resp || {}) });

      const ok =
        resp &&
        String(resp.Type) === 'Success' &&
        Number(resp.StatusCode) >= 200 &&
        Number(resp.StatusCode) < 300;

      try {
        r.setValue({
          fieldId: REQOBJ.f.status,
          value: Number(ok ? REQOBJ.statusId.COMPLETE : REQOBJ.statusId.ERROR)
        });
      } catch (_) {
        r.setText({
          fieldId: REQOBJ.f.status,
          text: ok ? REQOBJ.statusText.COMPLETE : REQOBJ.statusText.ERROR
        });
      }

      r.save({ enableSourcing: false, ignoreMandatoryFields: true });

      log.debug({
        title: 'AttachPDF - Request Object Updated',
        details: 'reqObjId=' + reqId + ' | status=' + (ok ? 'COMPLETE' : 'ERROR')
      });
    } 
    catch (e) {
      log.error({ title: 'AttachPDF - Request Object update failed', details: e });
    }
  }

  function resolveRecordType(nsRecordtypeRaw){
    // Supports "Invoice", "Vendor Bill", "Credit Memo", etc.
    // Prefer record.Type constants where possible.
    var normalizedKey = String(nsRecordtypeRaw).trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
    var t = record.Type[normalizedKey];

    //Fallback: internal id format like "invoice", "vendorbill", "customrecord_xxx"
    if (!t) {
      t = String(nsRecordtypeRaw).trim().toLowerCase().replace(/\s+/g, '');
    }
    return t;
  }

  function post(requestBody) {
    let reqObjId = null;

    try {

      //Step-1 Parse Payload:
      var payload = (typeof requestBody === 'string')
        ? JSON.parse(requestBody)
        : (requestBody || {});
      log.debug({ title: 'AttachPDF - Step-1 Payload', details: payload });


      //Step-1.1 Create Request Object:
      reqObjId = createRequestObject(
        requestBody,
        'PDF Attachment - ' + (payload.nsRecordtype || '')
      );

      var nsId = payload.nsId;
      var nsRecordtypeRaw = payload.nsRecordtype;
      var nsPdfbase64 = payload.nsPdfbase64;


      //Step-2 Validations:
      if (isEmpty(nsId) || !looksLikeId(nsId)) {
        const out = { StatusCode: 300, Type: 'Error', message: 'nsId is required and must be numeric.' };
        finalizeRequestObject(reqObjId, out);
        return out;
      }

      if (isEmpty(nsRecordtypeRaw)) {
        const out = { StatusCode: 300, Type: 'Error', message: 'nsRecordtype is required.' };
        finalizeRequestObject(reqObjId, out);
        return out;
      }

      if (isEmpty(nsPdfbase64)) {
        const out = { StatusCode: 300, Type: 'Error', message: 'nsPdfbase64 is required.' };
        finalizeRequestObject(reqObjId, out);
        return out;
      }

      var recordId = Number(nsId);


      //Step-3 Resolve Record Type:
      var nsRecordType = resolveRecordType(nsRecordtypeRaw);

      log.debug({
        title: 'AttachPDF - Step-3 Record Type Resolved',
        details: 'Input=' + nsRecordtypeRaw + ' | resolved=' + nsRecordType
      });


      //Step-4 Clean Base64:
      var base64 = String(nsPdfbase64).trim();

      //Handle: data:application/pdf;base64,JVBERi0x...
      if (base64.indexOf('base64,') !== -1) {
        base64 = base64.split('base64,')[1];
      }

      base64 = base64.replace(/\s+/g, '');
      log.debug({ title: 'AttachPDF - Step-4 Base64 Length', details: base64.length });


        //Step-5 Save PDF in a sub-folder under Main Folder (-10):
        var MAIN_FOLDER_ID = -10;


        //Step-5.1 Sub-folder name = Internal ID of the record:
        var subFolderName = String(recordId);  // Example: "12345"
        var targetFolderId = null;


        //Step-5.2 Search if sub-folder already exists in MAIN_FOLDER_ID:
        try {
            var folderSearch = search.create({
                type: 'folder',
                filters: [
                ['parent', 'anyof', String(MAIN_FOLDER_ID)],
                'AND',
                ['name', 'is', subFolderName]
                ],
                columns: [
                search.createColumn({ name: 'internalid' })
                ]
            });

            var folderResults = folderSearch.run().getRange({ start: 0, end: 1 }) || [];
            if (folderResults.length > 0) {
                targetFolderId = folderResults[0].getValue({ name: 'internalid' });
                log.debug({
                title: 'AttachPDF - Step-5.2 Folder Found',
                details: 'Existing folderId=' + targetFolderId + ' | name=' + subFolderName + ' | parent=' + MAIN_FOLDER_ID
                });
            }
        } 
        catch (eFolderSearch) {
            log.debug({
                title: 'AttachPDF - Step-5.2 Folder Search Failed',
                details: eFolderSearch.name + ' ' + eFolderSearch.message
            });
        }


        //Step-5.3 If not found, create sub-folder under MAIN_FOLDER_ID:
        if (!targetFolderId) {
            var folderRec = record.create({ type: 'folder', isDynamic: true });
            folderRec.setValue({ fieldId: 'name', value: subFolderName });
            folderRec.setValue({ fieldId: 'parent', value: Number(MAIN_FOLDER_ID) });

            targetFolderId = folderRec.save();

            log.debug({
                title: 'AttachPDF - Step-5.3 Folder Created',
                details: 'New folderId=' + targetFolderId + ' | name=' + subFolderName + ' | parent=' + MAIN_FOLDER_ID
            });
        }

        targetFolderId = Number(targetFolderId);


        //Step-5.4 Create PDF file in that folder:
        var fileName = '';
        if (!isEmpty(payload.nsFileName)) {
            fileName = String(payload.nsFileName).trim();
        }

        if (isEmpty(fileName)) {
            var safeRecTypeName = String(nsRecordtypeRaw).trim().replace(/[^A-Za-z0-9_-]/g, '_');
            fileName = safeRecTypeName + '_' + recordId + '_' +
                new Date().toISOString().replace(/[:.]/g, '-') + '.pdf';
        }

        if (!/\.pdf$/i.test(fileName)) {
            fileName = fileName + '.pdf';
        }

        fileName = fileName.replace(/[\\\/:*?"<>|]/g, '_');

        log.debug({
            title: 'AttachPDF - FileName Final',
            details: fileName
        });


        var pdfFile = file.create({
            name: fileName,
            fileType: file.Type.PDF,
            contents: base64,
            encoding: file.Encoding.BASE_64,
            folder: targetFolderId
        });

        var fileId = pdfFile.save();

        log.debug({
            title: 'AttachPDF - Step-5.4 File Saved',
            details: 'fileId=' + fileId + ' | folderId=' + targetFolderId + ' | fileName=' + fileName
        });


      //Step-6 Attach file to the target record:
      record.attach({
        record: { type: 'file', id: Number(fileId) },
        to: { type: nsRecordType, id: recordId }
      });

      log.debug({
        title: 'AttachPDF - Step-6 File Attached',
        details: 'Attached fileId=' + fileId + ' to ' + nsRecordType + ' #' + recordId
      });


      //Step-7 Success response:
      const out = {
        StatusCode: 200,
        Type: 'Success',
        NSRecordID: String(recordId),
        NSRecordType: String(nsRecordtypeRaw),
        FileId: String(fileId),
        FileName: fileName,
        FolderId: String(targetFolderId),
        MainFolderId: String(MAIN_FOLDER_ID),
        message: 'PDF saved to File Cabinet and attached to record successfully.'
      };

      finalizeRequestObject(reqObjId, out);
      return out;

    }
    catch (e) {
      log.error({ title: 'AttachPDF - Error', details: e });

      const out = {
        StatusCode: 300,
        Type: 'Error',
        message: e.message || String(e)
      };

      finalizeRequestObject(reqObjId, out);
      return out;
    }
  }

  function get() {
    return { message: 'Attach PDF RESTlet Up', when: new Date() };
  }

  return { get, post };
});
