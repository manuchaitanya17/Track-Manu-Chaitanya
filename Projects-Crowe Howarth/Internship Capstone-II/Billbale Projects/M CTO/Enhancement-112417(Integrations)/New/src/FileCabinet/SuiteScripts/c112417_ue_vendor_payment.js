/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */


define(['N/record', 'N/https', 'N/log', 'N/runtime'], function (record, https, log, runtime) {

    function afterSubmit(context) {
        if (context.type !== context.UserEventType.CREATE &&
            context.type !== context.UserEventType.EDIT) {
            log.debug({
                title: 'VendorPaymentSync',
                details: 'Exit early. Event type: ' + context.type
            });
            return;
        }

        try {
            var newRec = context.newRecord;

            //Step-1 Read Body-Level Fields:
            var internalId = newRec.id;
            var tranId = newRec.getValue({ fieldId: 'tranid' }) || '';
            var payeeId = newRec.getValue({ fieldId: 'entity' }) || '';
            var payeeName = newRec.getValue({ fieldId: 'entity' }) || '';

            //Step-1.1 Transaction Date:
            var tranDateValue = newRec.getValue({ fieldId: 'trandate' });
            var tranDate = '';
            if (tranDateValue) {
                var d = tranDateValue;
                var day = d.getDate();
                var month = d.getMonth() + 1;
                var year = d.getFullYear();
                tranDate = year + '-' +
                    (month < 10 ? '0' + month : month) + '-' +
                    (day < 10 ? '0' + day : day);
            }

            var postingPeriod = newRec.getValue({ fieldId: 'postingperiod' }) || '';
            var memo = newRec.getValue({ fieldId: 'memo' }) || '';

            //Step-1.2 Using currency name; adjust if Aspect expects code (e.g. "USD"):
            var currency = newRec.getValue({ fieldId: 'currency' }) || '';

            var exchangeRate = newRec.getValue({ fieldId: 'exchangerate' }) || 0;
            var apAccountId = newRec.getValue({ fieldId: 'apacct' }) || '';
            var bankAccountId = newRec.getValue({ fieldId: 'account' }) || '';
            var subsidiaryId = newRec.getValue({ fieldId: 'subsidiary' }) || '';
            var departmentId = newRec.getValue({ fieldId: 'department' }) || '';
            var profitCenterId = newRec.getValue({ fieldId: 'class' }) || '';
            var locationId = newRec.getValue({ fieldId: 'location' }) || '';
            var strategyNumber = newRec.getValue({ fieldId: 'custbody_c94559_strategy_no' }) || '';
            var upstreamDocumentNo = newRec.getValue({ fieldId: 'custbody__c94559_upstreamdoc_no' }) || '';
            var paymentAmount = parseFloat(newRec.getValue({ fieldId: 'total' }) || 0);

            log.debug({
                title: 'VendorPaymentSync - Step-1 (Body Fields)',
                details: 'Internal ID: ' + internalId + ', TranID: ' + tranId
            });


            //Step-2 Build JS Object for Body-Level Fields:
            var payload = {
                internalId: internalId ? String(internalId) : '',
                tranId: tranId,
                payeeId: payeeId ? String(payeeId) : '',
                payeeName: payeeName,
                date: tranDate,
                postingPeriod: postingPeriod,
                memo: memo,
                currency: currency,
                exchangeRate: parseFloat(exchangeRate) || 0,
                apAccountId: apAccountId ? String(apAccountId) : '',
                bankAccountId: bankAccountId ? String(bankAccountId) : '',
                subsidiaryId: subsidiaryId ? String(subsidiaryId) : '',
                departmentId: departmentId ? String(departmentId) : '',
                profitCenterId: profitCenterId ? String(profitCenterId) : '',
                locationId: locationId ? String(locationId) : '',
                strategyNumber: strategyNumber,
                upstreamDocumentNo: upstreamDocumentNo,
                paymentAmount: paymentAmount,
                bills: [],
                credits: []
            };


            //Step-3.1.1 Adding Line-Level Fields(Bill):
            var applyLineCount = 0;
            try {
                applyLineCount = newRec.getLineCount({ sublistId: 'apply' }) || 0;
            } 
            catch (eApplyCount) {
                log.debug({
                    title: 'VendorPaymentSync - Apply sublist',
                    details: 'Apply Sublist Not Found: ' + eApplyCount.name + ' ' + eApplyCount.message
                });
            }

            log.debug({
                title: 'VendorPaymentSync - Step-3.1',
                details: 'Apply Line Count: ' + applyLineCount
            });

            for (var i = 0; i < applyLineCount; i++) {
                
                //Step-3.1.2 Only sending applied lines:
                var applyFlag = newRec.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'apply',
                    line: i
                });

                var applied = (applyFlag === true || applyFlag === 'T');
                if (!applied) {
                    continue;
                }


                //Step-3.1.3 Getting Uniquie Line-Number:
                var lineNumber = newRec.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'line',
                    line: i
                });
                if (lineNumber === '' || lineNumber === null || typeof lineNumber === 'undefined') {
                    lineNumber = i + 1;
                }

                var documentId = newRec.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'doc',
                    line: i
                }) || '';

                var refNo = newRec.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'refnum',
                    line: i
                }) || '';

                var originalAmount = parseFloat(newRec.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'total',
                    line: i
                }) || 0);

                var amountDue = parseFloat(newRec.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'due',
                    line: i
                }) || 0);

                var discountAvailable = parseFloat(newRec.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'discamt',
                    line: i
                }) || 0);

                var discountTaken = parseFloat(newRec.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'disc',
                    line: i
                }) || 0);

                var paymentApplied = parseFloat(newRec.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'amount',
                    line: i
                }) || 0);


                //Step-3.1.4 Discount Date, Bill Date and Due Date Field:
                var discountDate = '';
                var discountDateValue = newRec.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'discdate',
                    line: i
                });
                if (discountDateValue) {
                    var dd = discountDateValue;
                    var ddDay = dd.getDate();
                    var ddMonth = dd.getMonth() + 1;
                    var ddYear = dd.getFullYear();
                    discountDate = ddYear + '-' +
                        (ddMonth < 10 ? '0' + ddMonth : ddMonth) + '-' +
                        (ddDay < 10 ? '0' + ddDay : ddDay);
                }

                var billDate = '';
                var billDateValue = newRec.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'applydate',
                    line: i
                });
                if (billDateValue) {
                    var b = billDateValue;
                    var bDay = b.getDate();
                    var bMonth = b.getMonth() + 1;
                    var bYear = b.getFullYear();
                    billDate = bYear + '-' +
                        (bMonth < 10 ? '0' + bMonth : bMonth) + '-' +
                        (bDay < 10 ? '0' + bDay : bDay);
                }

                var dueDate = '';
                var dueDateValue = newRec.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'duedate',
                    line: i
                });
                if (dueDateValue) {
                    var du = dueDateValue;
                    var duDay = du.getDate();
                    var duMonth = du.getMonth() + 1;
                    var duYear = du.getFullYear();
                    dueDate = duYear + '-' +
                        (duMonth < 10 ? '0' + duMonth : duMonth) + '-' +
                        (duDay < 10 ? '0' + duDay : duDay);
                }
                     
                
                //Step-3.1.5 Currency Field:
                var lineCurrency = currency;
                var lineCurrencyValue = newRec.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'currency',
                    line: i
                });
                if (lineCurrencyValue) {
                    lineCurrency = lineCurrencyValue;
                }

                var documentType = newRec.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'type',
                    line: i
                }) || 'VendorBill';

                payload.bills.push({
                    line: lineNumber,
                    applied: applied,
                    documentType: documentType,
                    documentId: documentId ? String(documentId) : '',
                    refNo: refNo,
                    billDate: billDate,
                    dueDate: dueDate,
                    originalAmount: originalAmount,
                    amountDue: amountDue,
                    discountDate: discountDate,
                    discountAvailable: discountAvailable,
                    discountTaken: discountTaken,
                    currency: lineCurrency,
                    paymentApplied: paymentApplied
                });
            }


            //Step-3.2.1  Adding Line-Level Fields(Credit):
            var creditSublistId = 'credit';
            var creditLineCount = 0;

            try {
                creditLineCount = newRec.getLineCount({ sublistId: creditSublistId }) || 0;
            } 
            catch (eCredit1) {
                //AK: Some accounts may use "credits" instead of "credit":
                try {
                    creditSublistId = 'credits';
                    creditLineCount = newRec.getLineCount({ sublistId: creditSublistId }) || 0;
                } 
                catch (eCredit2) {
                    log.debug({
                        title: 'VendorPaymentSync - Credits sublist',
                        details: 'Credits Sublist Not Found. Skipping credits. ' +
                            eCredit1.name + '/' + eCredit1.message + ' | ' +
                            eCredit2.name + '/' + eCredit2.message
                    });
                }
            }

            log.debug({
                title: 'VendorPaymentSync - Step-3.2',
                details: 'Credits line count (' + creditSublistId + '): ' + creditLineCount
            });

            for (var c = 0; c < creditLineCount; c++) {

                //Step-3.2.2 Only sending applied lines:
                var creditApplyFlag = newRec.getSublistValue({
                    sublistId: creditSublistId,
                    fieldId: 'apply',
                    line: c
                });

                var creditApplied = (creditApplyFlag === true || creditApplyFlag === 'T');
                if (!creditApplied) {
                    continue;
                }

                //Step-3.3 Getting Unique Line ID:
                var creditLineNumber = newRec.getSublistValue({
                    sublistId: creditSublistId,
                    fieldId: 'line',
                    line: c
                });
                if (creditLineNumber === '' || creditLineNumber === null || typeof creditLineNumber === 'undefined') {
                    creditLineNumber = c + 1;
                }

                var vendorCreditId = newRec.getSublistValue({
                    sublistId: creditSublistId,
                    fieldId: 'doc',
                    line: c
                }) || '';

                var creditRefNo = newRec.getSublistValue({
                    sublistId: creditSublistId,
                    fieldId: 'refnum',
                    line: c
                }) || '';

                var originalCreditAmount = parseFloat(newRec.getSublistValue({
                    sublistId: creditSublistId,
                    fieldId: 'total',
                    line: c
                }) || 0);

                var creditAmountRemaining = parseFloat(newRec.getSublistValue({
                    sublistId: creditSublistId,
                    fieldId: 'due',
                    line: c
                }) || 0);

                var creditAmountApplied = parseFloat(newRec.getSublistValue({
                    sublistId: creditSublistId,
                    fieldId: 'amount',
                    line: c
                }) || 0);

                var creditDateValue = newRec.getSublistValue({
                    sublistId: creditSublistId,
                    fieldId: 'creditdate',
                    line: c
                });
                var creditDate = '';
                if (creditDateValue) {
                    var cd = creditDateValue;
                    var cdDay = cd.getDate();
                    var cdMonth = cd.getMonth() + 1;
                    var cdYear = cd.getFullYear();
                    creditDate = cdYear + '-' +
                        (cdMonth < 10 ? '0' + cdMonth : cdMonth) + '-' +
                        (cdDay < 10 ? '0' + cdDay : cdDay);
                }

                var creditCurrency = currency;
                var creditCurrencyValue = newRec.getSublistValue({
                    sublistId: creditSublistId,
                    fieldId: 'currency',
                    line: c
                });
                if (creditCurrencyValue) {
                    creditCurrency = creditCurrencyValue;
                }
               
                var creditDocumentType = newRec.getSublistValue({
                    sublistId: creditSublistId,
                    fieldId: 'type',
                    line: c
                }) || 'VendorCredit';

                payload.credits.push({
                    line: creditLineNumber,
                    applied: creditApplied,
                    documentType: creditDocumentType,
                    vendorCreditId: vendorCreditId ? String(vendorCreditId) : '',
                    refNo: creditRefNo,
                    docDate: creditDate,
                    originalAmount: originalCreditAmount,
                    amountRemaining: creditAmountRemaining,
                    currency: creditCurrency,
                    amountApplied: creditAmountApplied
                });
            }

            log.debug({
                title: 'VendorPaymentSync - Step 3 Complete',
                details: 'Bills: ' + payload.bills.length + ', Credits: ' + payload.credits.length
            });

            log.debug("Final Payload: ", payload);



            //Step-4 Get token (TEST) and POST to Aspect:

           //Step-4.1 TEST Endpoints:
            var TOKEN_URL = runtime.getCurrentScript().getParameter({ name: 'custscript_c112417_token_url' });
            var ASPECT_VENDOR_PAYMENT_URL = runtime.getCurrentScript().getParameter({ name: 'custscript_c112417_aspect_vp_url' });


            //Step-4.2 Credentials for real use, move these to script parameters:
            var ASPECT_USERNAME = runtime.getCurrentScript().getParameter({ name: 'custscript_c112417_aspect_username' });
            var ASPECT_PASSWORD = runtime.getCurrentScript().getParameter({ name: 'custscript_c112417_aspect_password' });


            //Step-4.3 Get Token:
            var tokenResponse = https.post({
                url: TOKEN_URL,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body:
                    'username=' + encodeURIComponent(ASPECT_USERNAME) +
                    '&password=' + encodeURIComponent(ASPECT_PASSWORD)
            });

            log.debug({
                title: 'VendorPaymentSync - Token response',
                details: 'HTTP ' + tokenResponse.code + ' - ' +
                    (tokenResponse.body && tokenResponse.body.length > 4000
                        ? tokenResponse.body.substring(0, 3900) + '...[truncated]'
                        : tokenResponse.body)
            });


            //Step-4.4 Trying to read token from response:
            var token = '';
            if (tokenResponse.code === 200 || tokenResponse.code === '200') {
                var tokenBody = tokenResponse.body || '';

                try {
                    //Step-4.5 If response is JSON: { "token": "..."} or { "access_token": "..." }:
                    var tokenObj = JSON.parse(tokenBody);
                    token = tokenObj.token || tokenObj.access_token || tokenObj.Token || '';
                } 
                catch (eTokenParse) {
                    //Step-4.6 If response is just a raw string token:
                    token = tokenBody.replace(/"/g, '').trim();
                }
            }

            if (!token) {
                log.error({
                    title: 'VendorPaymentSync - Token Error',
                    details: 'Token not found in Aspect token response. Aborting sync.'
                });
                return;
            }

            log.debug({
                title: 'VendorPaymentSync - Token Acquired',
                details: 'Token length: ' + (token ? token.length : 0)
            });


       
            //Step-4.7 Send Vendor Payment payload{}:
            var payloadString = JSON.stringify(payload);

            log.debug({
                title: 'VendorPaymentSync - Step 4 (Payload Preview)',
                details: payloadString.length > 4000
                    ? payloadString.substring(0, 3900) + '...[truncated]'
                    : payloadString
            });

            var response = https.post({
                url: ASPECT_VENDOR_PAYMENT_URL,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: payloadString
            });

            log.debug({
                title: 'VendorPaymentSync - Aspect response',
                details: 'HTTP ' + response.code + ' - ' +
                    (response.body && response.body.length > 4000
                        ? response.body.substring(0, 3900) + '...[truncated]'
                        : response.body)
            });
        }  
        catch (e) {
            log.error({
                title: 'VendorPaymentSync - Error',
                details: e.name + ': ' + e.message + (e.stack ? '\n' + e.stack : '')
            });
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});
