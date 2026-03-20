/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */

define(['N/record', 'N/https', 'N/log', 'N/runtime'], function (record, https, log, runtime) {

  function formatDateYYYYMMDD(d) {
    if (!d) return '';
    try {
      var day = d.getDate();
      var month = d.getMonth() + 1;
      var year = d.getFullYear();
      return year + '-' +
        (month < 10 ? '0' + month : month) + '-' +
        (day < 10 ? '0' + day : day);
    } catch (e) {
      return '';
    }
  }

  function isAppliedFlag(v) {
    return (v === true || v === 'T');
  }

  function afterSubmit(context) {

    //EDIT only
    if (context.type !== context.UserEventType.EDIT) {
      log.debug({
        title: 'VendorCreditDepositSync',
        details: 'Exit early. Event type: ' + context.type
      });
      return;
    }

    try {
      var vcRec = context.newRecord;
      var vendorCreditId = vcRec.id;

      //Step-1 Find applied Deposit line from Vendor Credit "apply" sublist:
      var applyCount = 0;
      try {
        applyCount = vcRec.getLineCount({ sublistId: 'apply' }) || 0;
      } 
      catch (eCount) {
        log.debug({
          title: 'VendorCreditDepositSync - Apply sublist',
          details: 'Apply sublist not found: ' + eCount.name + ' ' + eCount.message
        });
        return;
      }

      var depositId = null;

      for (var i = 0; i < applyCount; i++) {
        var applyFlag = vcRec.getSublistValue({ sublistId: 'apply', fieldId: 'apply', line: i });
        log.debug("applyFlag", applyFlag);

        if (!isAppliedFlag(applyFlag)) continue;

        var typeVal = vcRec.getSublistValue({ sublistId: 'apply', fieldId: 'type', line: i }) || vcRec.getSublistValue({ sublistId: 'apply', fieldId: 'trantype', line: i }) ||'';
        var typeLc = String(typeVal).toLowerCase();
        log.debug("typeLc", typeLc);


        if (typeLc.indexOf('deposit') === -1) continue;

        depositId = vcRec.getSublistValue({ sublistId: 'apply', fieldId: 'doc', line: i })
          || vcRec.getSublistValue({ sublistId: 'apply', fieldId: 'internalid', line: i })
          || '';

        log.debug("depositId", depositId);

        if (depositId) break;
      }

      if (!depositId) {
        log.debug({
          title: 'VendorCreditDepositSync',
          details: 'No applied Deposit line found on Vendor Credit apply sublist. Nothing to send.'
        });
        return;
      }

      depositId = Number(depositId);
      log.debug({
        title: 'VendorCreditDepositSync - Deposit Found',
        details: 'vendorCreditId=' + vendorCreditId + ', depositId=' + depositId
      });

      //Step-2 Load Deposit record:
      var dep = record.load({
        type: record.Type.DEPOSIT,
        id: depositId,
        isDynamic: false
      });

      //Step-3 Read required header fields from Deposit:
      var depTranId = dep.getValue({ fieldId: 'tranid' }) || '';
      var depDate = formatDateYYYYMMDD(dep.getValue({ fieldId: 'trandate' }));

      
      var postingPeriodText = '';
      try { postingPeriodText = dep.getText({ fieldId: 'postingperiod' }) || ''; } catch (ePP) { postingPeriodText = ''; }
      if (!postingPeriodText) {
        postingPeriodText = dep.getValue({ fieldId: 'postingperiod' }) || '';
      }

      var depMemo = dep.getValue({ fieldId: 'memo' }) || '';
      var subsidiaryId = dep.getValue({ fieldId: 'subsidiary' }) || '';
      var currencyId = dep.getValue({ fieldId: 'currency' }) || '';
      var exchangeRate = parseFloat(dep.getValue({ fieldId: 'exchangerate' }) || 0) || 0;
      var bankAccountId;


      //Step-4 Read line amount from Deposit (ONLY amount; skip Name and Account):
      var originalAmount = 0;
      var gotAmount = false;

      var candidateSublists = ['other', 'payment', 'cashback'];

      for (var s = 0; s < candidateSublists.length; s++) {
        var subId = candidateSublists[s];

        try {
          var lc = dep.getLineCount({ sublistId: subId }) || 0;
          log.debug("lc for: " + subId + " " + lc);

          if (lc > 0) {
            var amt = dep.getSublistValue({ sublistId: subId, fieldId: 'amount', line: 0 });
            var account = dep.getSublistValue({ sublistId: subId, fieldId: 'account', line: 0 });

            originalAmount = parseFloat(amt || 0) || 0;
            bankAccountId = account;
            gotAmount = true;

            log.debug({
              title: 'VendorCreditDepositSync - Deposit Line Amount',
              details: 'sublist=' + subId + ', amount=' + originalAmount
            });
            break;
          }
        } 
        catch (eSub) {
          
        }
      }

      // Fallback if sublist structure differs
      if (!gotAmount) {
        try {
          originalAmount = parseFloat(dep.getValue({ fieldId: 'total' }) || 0) || 0;
          log.debug({
            title: 'VendorCreditDepositSync - Amount Fallback',
            details: 'Used deposit total as fallback: ' + originalAmount
          });
        } catch (eTot) {
          originalAmount = 0;
        }
      }

      var bnkId = dep.getValue({ fieldId: 'account' });

      //Setting Payment Amount:
      var paymentAmount = parseFloat(
                dep.getValue({ fieldId: 'payment' }) ||
                dep.getValue({ fieldId: 'total' }) ||
                0
            );

      //Step-5 Build FINAL payload with ONLY required keys:
      var payload = {
        vendorCreditInternalId: vendorCreditId ? String(vendorCreditId) : '',
        internalId: depositId ? String(depositId) : '',
        tranId: depTranId ? String(depTranId) : '',
        date: depDate,
        postingPeriod: postingPeriodText ? String(postingPeriodText) : '',
        memo: depMemo,
        subsidiaryId: subsidiaryId ? String(subsidiaryId) : '',
        currency: currencyId ? String(currencyId) : '',
        exchangeRate: exchangeRate,
        bankAccountId: bnkId,
        apAccountId: bankAccountId ? String(bankAccountId) : '',
        paymentAmount: paymentAmount,
        bills: [
          {
            line: 0,
            documentId: vendorCreditId ? String(vendorCreditId) : '',
            originalAmount: originalAmount,
            paymentApplied: originalAmount
          }
        ]
      };

      log.debug('VendorCreditDepositSync - Final Payload', payload);

      //Step-6 Token + POST to Aspect (same parameters as Vendor Payment UE):
      var TOKEN_URL = runtime.getCurrentScript().getParameter({ name: 'custscript_c112417_token_url' });
      var ASPECT_URL = runtime.getCurrentScript().getParameter({ name: 'custscript_c112417_aspect_vp_url' });

      var ASPECT_USERNAME = runtime.getCurrentScript().getParameter({ name: 'custscript_c112417_aspect_username' });
      var ASPECT_PASSWORD = runtime.getCurrentScript().getParameter({ name: 'custscript_c112417_aspect_password' });

      if (!TOKEN_URL || !ASPECT_URL) {
        log.error('VendorCreditDepositSync - Missing Params', 'TOKEN_URL / ASPECT_URL not configured on script deployment.');
        return;
      }

      var tokenResponse = https.post({
        url: TOKEN_URL,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'username=' + encodeURIComponent(ASPECT_USERNAME) +
          '&password=' + encodeURIComponent(ASPECT_PASSWORD)
      });

      log.debug({
        title: 'VendorCreditDepositSync - Token response',
        details: 'HTTP ' + tokenResponse.code + ' - ' +
          (tokenResponse.body && tokenResponse.body.length > 4000
            ? tokenResponse.body.substring(0, 3900) + '...[truncated]'
            : tokenResponse.body)
      });

      var token = '';
      if (tokenResponse.code === 200 || tokenResponse.code === '200') {
        var tokenBody = tokenResponse.body || '';
        try {
          var tokenObj = JSON.parse(tokenBody);
          token = tokenObj.token || tokenObj.access_token || tokenObj.Token || '';
        } catch (eParse) {
          token = tokenBody.replace(/"/g, '').trim();
        }
      }

      if (!token) {
        log.error('VendorCreditDepositSync - Token Error', 'Token not found. Aborting.');
        return;
      }

      var resp = https.post({
        url: ASPECT_URL,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(payload)
      });

      log.debug({
        title: 'VendorCreditDepositSync - Aspect response',
        details: 'HTTP ' + resp.code + ' - ' +
          (resp.body && resp.body.length > 4000
            ? resp.body.substring(0, 3900) + '...[truncated]'
            : resp.body)
      });

    } catch (e) {
      log.error({
        title: 'VendorCreditDepositSync - Error',
        details: e.name + ': ' + e.message + (e.stack ? '\n' + e.stack : '')
      });
    }
  }

  return {
    afterSubmit: afterSubmit
  };
});
