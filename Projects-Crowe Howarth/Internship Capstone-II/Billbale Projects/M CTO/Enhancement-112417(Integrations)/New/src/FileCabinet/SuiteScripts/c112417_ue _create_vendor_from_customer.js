/**
 * Customer -> Vendor Relationship (afterSubmit)
 * Triggered after Customer is saved from RESTlet.
 *
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * NOTE:
 * - ENH/100414 logic (set all subsidiaries + currencies on vendor creation) has been inlined here
 *   because UE scripts do not reliably trigger other UE scripts when one record is created from another.
 */
define(['N/record', 'N/log', 'N/runtime', 'N/query'], (record, log, runtime, query) => {

  function isEmpty(v) {
    return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
  }

  function looksLikeId(v) {
    return /^\d+$/.test(String(v));
  }

  /**
   * Adds ALL active subsidiaries (non-inactive + non-elimination, excluding primary) and ALL active
   * currencies to a vendor record *before* it is saved.
   *
   * This is the inlined logic from: _c100414_set_sub_currency_on_vendor.js (ENH/100414)
   *
   * @param {record.Record} vendorRec
   */


  function addAllSubsidiariesAndCurrenciesToVendor(vendorRec) {
    if (!vendorRec) return;

    const primarySubsidiaryId = parseInt(vendorRec.getValue({ fieldId: 'subsidiary' }), 10);

    const existingSubsidiaryIds = new Set();
    const existingCurrencyIds = new Set();

    // Read existing subsidiaries (submachine)
    let canEditSubsidiaries = true;
    try {
      const subCount = vendorRec.getLineCount({ sublistId: 'submachine' });
      for (let i = 0; i < subCount; i++) {
        const subId = parseInt(vendorRec.getSublistValue({
          sublistId: 'submachine',
          fieldId: 'subsidiary',
          line: i
        }), 10);
        if (!isNaN(subId)) existingSubsidiaryIds.add(subId);
      }
    } 
    catch (e) {
      // If sublist isn't available/editable (e.g., feature disabled), skip cleanly
      canEditSubsidiaries = false;
      log.debug('Customer->Vendor UE', 'Unable to read submachine sublist. Skipping subsidiary expansion. ' + (e && e.message ? e.message : e));
    }

    // Read existing currencies
    let canEditCurrencies = true;
    try {
      const currencyCount = vendorRec.getLineCount({ sublistId: 'currency' });
      for (let i = 0; i < currencyCount; i++) {
        const currencyId = parseInt(vendorRec.getSublistValue({
          sublistId: 'currency',
          fieldId: 'currency',
          line: i
        }), 10);
        if (!isNaN(currencyId)) existingCurrencyIds.add(currencyId);
      }
    } catch (e) {
      canEditCurrencies = false;
      log.debug('Customer->Vendor UE', 'Unable to read currency sublist. Skipping currency expansion. ' + (e && e.message ? e.message : e));
    }

    // 1) Fetch valid subsidiaries
    const subSql = `
      SELECT id, name
      FROM subsidiary
      WHERE isinactive = 'F' AND iselimination = 'F'
    `;

    let subsidiaries = [];
    try {
      subsidiaries = query.runSuiteQL({ query: subSql }).asMappedResults() || [];
    } catch (e) {
      log.error('Subsidiary query failed', e && e.message ? e.message : e);
      subsidiaries = [];
    }

    // 2) Fetch all active currencies
    const currencySql = `SELECT id FROM currency WHERE isinactive = 'F'`;

    let currencies = [];
    try {
      currencies = query.runSuiteQL({ query: currencySql }).asMappedResults() || [];
    } catch (e) {
      log.error('Currency query failed', e && e.message ? e.message : e);
      currencies = [];
    }

    // Helper: append a line in either dynamic or standard record mode
    function appendSublistValue(sublistId, fieldId, value) {
      if (vendorRec.isDynamic) {
        vendorRec.selectNewLine({ sublistId });
        vendorRec.setCurrentSublistValue({ sublistId, fieldId, value });
        vendorRec.commitLine({ sublistId });
      } else {
        const line = vendorRec.getLineCount({ sublistId });
        vendorRec.insertLine({ sublistId, line });
        vendorRec.setSublistValue({ sublistId, fieldId, line, value });
      }
    }

    // Add subsidiaries (exclude primary + already present)
    if (canEditSubsidiaries && subsidiaries && subsidiaries.length) {
      for (const row of subsidiaries) {
        const subId = parseInt(row && row.id, 10);
        if (isNaN(subId)) continue;

        if (!isNaN(primarySubsidiaryId) && subId === primarySubsidiaryId) continue;
        if (existingSubsidiaryIds.has(subId)) continue;

        try {
          appendSublistValue('submachine', 'subsidiary', subId);
          existingSubsidiaryIds.add(subId);
        } catch (e) {
          log.error(`Skipping subsidiary ${subId}`, e && e.message ? e.message : e);
          // best-effort cleanup (dynamic mode)
          try { vendorRec.cancelLine({ sublistId: 'submachine' }); } catch (_) {}
        }
      }
    }

    // Add currencies (skip already present)
    if (canEditCurrencies && currencies && currencies.length) {
      for (const row of currencies) {
        const currencyId = parseInt(row && row.id, 10);
        if (isNaN(currencyId)) continue;

        if (existingCurrencyIds.has(currencyId)) continue;

        try {
          appendSublistValue('currency', 'currency', currencyId);
          existingCurrencyIds.add(currencyId);
        } catch (e) {
          log.error(`Skipping currency ${currencyId}`, e && e.message ? e.message : e);
          try { vendorRec.cancelLine({ sublistId: 'currency' }); } catch (_) {}
        }
      }
    }
  }

  function ensureVendorForCustomer(customerId, vendorPayableAccountID) {
    if (isEmpty(customerId) || !looksLikeId(customerId)) return null;

    const idNum = Number(customerId);

    // 1) If vendor already exists for this entity id, do nothing
    try {
      record.load({ type: record.Type.VENDOR, id: idNum, isDynamic: false });
      log.debug('Customer->Vendor UE', 'Vendor already exists for entity id=' + idNum);
      return idNum;
    }
    catch (eLoad) {
      // Expected when vendor relationship doesn't exist yet
      log.debug('Customer->Vendor UE', 'Vendor not found. Will transform. entity id=' + idNum);
    }

    // 2) Transform Customer -> Vendor (same internal id entity)
    const v = record.transform({
      fromType: record.Type.CUSTOMER,
      fromId: idNum,
      toType: record.Type.VENDOR,
      isDynamic: true
    });

    v.setValue({
      fieldId: 'payablesaccount',
      value: vendorPayableAccountID
    });

    // 2.1) ENH/100414: Inline vendor UE logic to add all subsidiaries + currencies BEFORE save
    try {
      addAllSubsidiariesAndCurrenciesToVendor(v);
      log.debug('Customer->Vendor UE', 'Applied subsidiaries/currencies expansion on vendor before save. entity id=' + idNum);
    } catch (e) {
      // Do not block vendor creation if expansion fails
      log.error('Customer->Vendor UE', 'Failed to apply subsidiaries/currencies expansion. Will continue saving vendor. ' + (e && e.message ? e.message : e));
    }

    try {
      log.debug('Vendor fields before save', {
        entitystatus_id: v.getValue({ fieldId: 'entitystatus' }),
        entitystatus_text: (function(){ try { return v.getText({ fieldId: 'entitystatus' }); } catch(e){ return ''; } })(),
        category_id: v.getValue({ fieldId: 'category' }),
        category_text: (function(){ try { return v.getText({ fieldId: 'category' }); } catch(e){ return ''; } })()
      });
    }
    catch (eDbg) {}

    // 3) Save vendor
    const vendorId = v.save({ enableSourcing: true, ignoreMandatoryFields: false });
    log.debug('Customer->Vendor UE', 'Vendor created. entity id=' + idNum + ', vendorId=' + vendorId);

    return vendorId;
  }

  function afterSubmit(context) {
    try {
      // Run only on create/edit
      if (context.type !== context.UserEventType.CREATE &&
          context.type !== context.UserEventType.EDIT &&
          context.type !== context.UserEventType.XEDIT) {
        return;
      }

      // Run only when triggered from RESTlet (and sometimes SuiteScript is reported)
      const execCtx = runtime.executionContext;
      if (execCtx !== runtime.ContextType.RESTLET && execCtx !== runtime.ContextType.SUITESCRIPT) {
        log.debug('Customer->Vendor UE', 'Skipping. executionContext=' + execCtx);
        return;
      }

      const customerId = context.newRecord && context.newRecord.id;
      if (isEmpty(customerId)) return;

      const customerRecord = record.load({ type: record.Type.CUSTOMER, id: customerId, isDynamic: false });

      const vendorPayableAccountID = customerRecord.getValue({
        fieldId: 'custentity_c112417_custom_pay_acc'
      });
      log.debug('vendorPayableAccountID', vendorPayableAccountID);

      const createVendorFromCustomer = customerRecord.getValue({
        fieldId: 'custentity_c112417_create_ven_cust'
      });

      log.debug('Customer->Vendor UE', 'Triggered for customerId=' + customerId + ', executionContext=' + execCtx);

      if (createVendorFromCustomer || createVendorFromCustomer === true || createVendorFromCustomer === 'T') {
        ensureVendorForCustomer(customerId, vendorPayableAccountID);
      } else {
        log.debug('Customer->Vendor UE', 'We are not allowed to create Vendor from Customer.');
      }

    }
    catch (e) {
      log.error('Customer->Vendor UE Failed', e);
    }
  }

  return { 
    afterSubmit 
  };
});
