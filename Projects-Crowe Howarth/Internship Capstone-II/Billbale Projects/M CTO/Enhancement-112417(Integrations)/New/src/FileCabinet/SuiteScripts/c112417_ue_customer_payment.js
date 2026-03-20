/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */

define(['N/record', 'N/https', 'N/log', 'N/runtime'], function (record, https, log, runtime) {

    function afterSubmit(context) {

        //Run only on Create and Edit:
        if (context.type !== context.UserEventType.CREATE &&
            context.type !== context.UserEventType.EDIT) {
            log.debug({
                title: 'CustomerPaymentSync',
                details: 'Exit early. Event type: ' + context.type
            });
            return;
        }

        try {
            var newRec = context.newRecord;

            //Step-1 Read Body-Level Fields (Customer Payment):
            var internalId = newRec.id;
            var tranId = newRec.getValue({ fieldId: 'tranid' }) || '';

            //Customer:
            var customerId = '';
            var customerName = '';
            customerId = newRec.getValue({ fieldId: 'customer' }) || '';
            customerName = newRec.getValue({ fieldId: 'customer' }) || '';
        
           

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

            //Currency:
            var currency = newRec.getValue({ fieldId: 'currency' }) || '';
            var exchangeRate = newRec.getValue({ fieldId: 'exchangerate' }) || 0;

            //Undeposited Funds:
            var undepositedFunds = newRec.getValue({ fieldId: 'undepfunds' }) === true;

            //Bank Account:
            var accountId = '';
            if (!undepositedFunds) {
                accountId = newRec.getValue({ fieldId: 'account' }) || '';
            }

            //A/R Account:
            var arAccountId = '';
            try {
                arAccountId = newRec.getValue({ fieldId: 'aracct' }) || '';
            }
            catch (eArAcct) {
                arAccountId = '';
            }

            //Classification:
            var subsidiaryId = newRec.getValue({ fieldId: 'subsidiary' }) || '';
            var departmentId = newRec.getValue({ fieldId: 'department' }) || '';
            var profitCenterId = newRec.getValue({ fieldId: 'class' }) || '';
            var locationId = newRec.getValue({ fieldId: 'location' }) || '';

            //Custom Fields (Adjust if needed):
            var strategyNumber = newRec.getValue({ fieldId: 'custbody_c94559_strategy_no' }) || '';
            var upstreamDocumentNo = newRec.getValue({ fieldId: 'custbody__c94559_upstreamdoc_no' }) || '';

            //Payment Amount (Customer Payment usually uses 'payment'; keep fallback to 'total'):
            var paymentAmount = parseFloat(
                newRec.getValue({ fieldId: 'payment' }) ||
                newRec.getValue({ fieldId: 'total' }) ||
                0
            );

            log.debug({
                title: 'CustomerPaymentSync - Step-1 (Body Fields)',
                details: 'Internal ID: ' + internalId + ', TranID: ' + tranId + ', Customer: ' + customerId
            });


            //Step-2 Build JS Object for Body-Level Fields:
            var payload = {
                internalId: internalId ? String(internalId) : '',
                tranId: tranId,
                customerId: customerId ? String(customerId) : '',
                customerName: customerName,
                date: tranDate,
                postingPeriod: postingPeriod,
                memo: memo,
                currency: currency,
                exchangeRate: parseFloat(exchangeRate) || 0,
                undepositedFunds: undepositedFunds,
                accountId: accountId ? String(accountId) : '',
                arAccountId: arAccountId ? String(arAccountId) : '',
                subsidiaryId: subsidiaryId ? String(subsidiaryId) : '',
                departmentId: departmentId ? String(departmentId) : '',
                profitCenterId: profitCenterId ? String(profitCenterId) : '',
                locationId: locationId ? String(locationId) : '',
                strategyNumber: strategyNumber,
                upstreamDocumentNo: upstreamDocumentNo,
                paymentAmount: paymentAmount,
                invoices: [],
                credits: [],
                deposits: []
            };


            //Step-3 Push Line-Level Fields:

            //Step-3.1 Invoice Lines (Apply Sublist):
            var applyLineCount = 0;
            try {
                applyLineCount = newRec.getLineCount({ sublistId: 'apply' }) || 0;
            } catch (eApplyCount) {
                log.debug({
                    title: 'CustomerPaymentSync - Apply sublist',
                    details: 'Apply Sublist Not Found: ' + eApplyCount.name + ' ' + eApplyCount.message
                });
            }

            log.debug({
                title: 'CustomerPaymentSync - Step-3.1',
                details: 'Apply Line Count: ' + applyLineCount
            });

            for (var i = 0; i < applyLineCount; i++) {

                //Step-3.1.1 Only sending applied lines:
                var applyFlag = newRec.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'apply',
                    line: i
                });

                var applied = (applyFlag === true || applyFlag === 'T');
                if (!applied) {
                    continue;
                }

                //Step-3.1.2 Getting Unique Line-Number:
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

                //Doc Date:
                var docDate = '';
                var docDateValue = '';
                try {
                    docDateValue = newRec.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'applydate',
                        line: i
                    });
                } catch (eApplyDate) {
                    docDateValue = '';
                }

                if (docDateValue) {
                    var ad = docDateValue;
                    var adDay = ad.getDate();
                    var adMonth = ad.getMonth() + 1;
                    var adYear = ad.getFullYear();
                    docDate = adYear + '-' +
                        (adMonth < 10 ? '0' + adMonth : adMonth) + '-' +
                        (adDay < 10 ? '0' + adDay : adDay);
                }

                //Due Date:
                var dueDate = '';
                var dueDateValue = '';
                try {
                    dueDateValue = newRec.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'duedate',
                        line: i
                    });
                } catch (eDueDate) {
                    dueDateValue = '';
                }

                if (dueDateValue) {
                    var du = dueDateValue;
                    var duDay = du.getDate();
                    var duMonth = du.getMonth() + 1;
                    var duYear = du.getFullYear();
                    dueDate = duYear + '-' +
                        (duMonth < 10 ? '0' + duMonth : duMonth) + '-' +
                        (duDay < 10 ? '0' + duDay : duDay);
                }

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

                //Discount Date:
                var discountDate = '';
                var discountDateValue = '';
                try {
                    discountDateValue = newRec.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'discdate',
                        line: i
                    });
                } catch (eDiscDate) {
                    discountDateValue = '';
                }

                if (discountDateValue) {
                    var dd = discountDateValue;
                    var ddDay = dd.getDate();
                    var ddMonth = dd.getMonth() + 1;
                    var ddYear = dd.getFullYear();
                    discountDate = ddYear + '-' +
                        (ddMonth < 10 ? '0' + ddMonth : ddMonth) + '-' +
                        (ddDay < 10 ? '0' + ddDay : ddDay);
                }

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

                //Currency:
                var lineCurrency = currency;
                try {
                    var lineCurrencyValue = newRec.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'currency',
                        line: i
                    });
                    if (lineCurrencyValue) {
                        lineCurrency = lineCurrencyValue;
                    }
                } catch (eLineCurrency) {
                    //Fallback to header currency
                }

                //Document Type:
                var documentType = '';
                try {
                    documentType = newRec.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'type',
                        line: i
                    }) || 'Invoice';
                } catch (eDocType) {
                    documentType = 'Invoice';
                }

                payload.invoices.push({
                    line: lineNumber,
                    applied: applied,
                    documentType: documentType,
                    documentId: documentId ? String(documentId) : '',
                    refNo: refNo,
                    docDate: docDate,
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


            //Step-3.2 Credit Memo Lines (Credits Sublist):
            var creditSublistId = 'credit';
            var creditLineCount = 0;

            try {
                creditLineCount = newRec.getLineCount({ sublistId: creditSublistId }) || 0;
            } 
            catch (eCredit1) {
                //Some accounts may use "credits" instead of "credit":
                try {
                    creditSublistId = 'credits';
                    creditLineCount = newRec.getLineCount({ sublistId: creditSublistId }) || 0;
                } 
                catch (eCredit2) {
                    log.debug({
                        title: 'CustomerPaymentSync - Credits sublist',
                        details: 'Credits Sublist Not Found. Skipping credits. ' +
                            eCredit1.name + '/' + eCredit1.message + ' | ' +
                            eCredit2.name + '/' + eCredit2.message
                    });
                }
            }

            log.debug({
                title: 'CustomerPaymentSync - Step-3.2',
                details: 'Credits Line Count (' + creditSublistId + '): ' + creditLineCount
            });

            for (var c = 0; c < creditLineCount; c++) {

                //Step-3.2.1 Only sending applied lines:
                var creditApplyFlag = newRec.getSublistValue({
                    sublistId: creditSublistId,
                    fieldId: 'apply',
                    line: c
                });

                var creditApplied = (creditApplyFlag === true || creditApplyFlag === 'T');
                if (!creditApplied) {
                    continue;
                }

                //Step-3.2.2 Getting Unique Line-Number:
                var creditLineNumber = newRec.getSublistValue({
                    sublistId: creditSublistId,
                    fieldId: 'line',
                    line: c
                });
                if (creditLineNumber === '' || creditLineNumber === null || typeof creditLineNumber === 'undefined') {
                    creditLineNumber = c + 1;
                }

                var creditMemoId = newRec.getSublistValue({
                    sublistId: creditSublistId,
                    fieldId: 'doc',
                    line: c
                }) || '';

                var creditRefNo = newRec.getSublistValue({
                    sublistId: creditSublistId,
                    fieldId: 'refnum',
                    line: c
                }) || '';

                //Doc Date (try 'creditdate', fallback to 'applydate'):
                var creditDocDate = '';
                var creditDateValue = '';
                try {
                    creditDateValue = newRec.getSublistValue({
                        sublistId: creditSublistId,
                        fieldId: 'creditdate',
                        line: c
                    });
                } 
                catch (eCreditDate1) {
                    creditDateValue = '';
                }

                if (!creditDateValue) {
                    try {
                        creditDateValue = newRec.getSublistValue({
                            sublistId: creditSublistId,
                            fieldId: 'applydate',
                            line: c
                        });
                    } 
                    catch (eCreditDate2) {
                        creditDateValue = '';
                    }
                }

                if (creditDateValue) {
                    var cd = creditDateValue;
                    var cdDay = cd.getDate();
                    var cdMonth = cd.getMonth() + 1;
                    var cdYear = cd.getFullYear();
                    creditDocDate = cdYear + '-' +
                        (cdMonth < 10 ? '0' + cdMonth : cdMonth) + '-' +
                        (cdDay < 10 ? '0' + cdDay : cdDay);
                }

                var originalCreditAmount = parseFloat(newRec.getSublistValue({
                    sublistId: creditSublistId,
                    fieldId: 'total',
                    line: c
                }) || 0);

                //Remaining amount:
                var amountRemaining = parseFloat(newRec.getSublistValue({
                    sublistId: creditSublistId,
                    fieldId: 'due',
                    line: c
                }) || 0);

                var amountApplied = parseFloat(newRec.getSublistValue({
                    sublistId: creditSublistId,
                    fieldId: 'amount',
                    line: c
                }) || 0);

                //Currency:
                var creditCurrency = currency;
                try {
                    var creditCurrencyValue = newRec.getSublistValue({
                        sublistId: creditSublistId,
                        fieldId: 'currency',
                        line: c
                    });
                    if (creditCurrencyValue) {
                        creditCurrency = creditCurrencyValue;
                    }
                } catch (eCreditCurrency) {
                    //Fallback to header currency
                }

                //Document Type:
                var creditDocumentType = '';
                try {
                    creditDocumentType = newRec.getSublistValue({
                        sublistId: creditSublistId,
                        fieldId: 'type',
                        line: c
                    }) || 'CreditMemo';
                } catch (eCreditDocType) {
                    creditDocumentType = 'CreditMemo';
                }

                payload.credits.push({
                    line: creditLineNumber,
                    applied: creditApplied,
                    documentType: creditDocumentType,
                    creditMemoId: creditMemoId ? String(creditMemoId) : '',
                    refNo: creditRefNo,
                    docDate: creditDocDate,
                    originalAmount: originalCreditAmount,
                    amountRemaining: amountRemaining,
                    currency: creditCurrency,
                    amountApplied: amountApplied
                });
            }


            //Step-3.3 Deposits Lines (Deposits Sublist):
            var depositSublistId = 'deposit';
            var depositLineCount = 0;

            try {
                depositLineCount = newRec.getLineCount({ sublistId: depositSublistId }) || 0;
            } 
            catch (eDep1) {
                //Some accounts may use "deposits" instead of "deposit":
                try {
                    depositSublistId = 'deposits';
                    depositLineCount = newRec.getLineCount({ sublistId: depositSublistId }) || 0;
                } 
                catch (eDep2) {
                    log.debug({
                        title: 'CustomerPaymentSync - Deposits sublist',
                        details: 'Deposits Sublist Not Found. Skipping deposits. ' +
                            eDep1.name + '/' + eDep1.message + ' | ' +
                            eDep2.name + '/' + eDep2.message
                    });
                }
            }

            log.debug({
                title: 'CustomerPaymentSync - Step-3.3',
                details: 'Deposits Line Count (' + depositSublistId + '): ' + depositLineCount
            });

            for (var dI = 0; dI < depositLineCount; dI++) {

                //Step-3.3.1 Only sending applied lines:
                var depositApplyFlag = newRec.getSublistValue({
                    sublistId: depositSublistId,
                    fieldId: 'apply',
                    line: dI
                });

                var depositApplied = (depositApplyFlag === true || depositApplyFlag === 'T');
                if (!depositApplied) {
                    continue;
                }

                //Step-3.3.2 Getting Unique Line-Number:
                var depositLineNumber = '';
                try {
                    depositLineNumber = newRec.getSublistValue({
                        sublistId: depositSublistId,
                        fieldId: 'line',
                        line: dI
                    });
                } 
                catch (eDepLine) {
                    depositLineNumber = '';
                }
                if (depositLineNumber === '' || depositLineNumber === null || typeof depositLineNumber === 'undefined') {
                    depositLineNumber = dI + 1;
                }

                var depositId = newRec.getSublistValue({
                    sublistId: depositSublistId,
                    fieldId: 'doc',
                    line: dI
                }) || '';

                var depositRefNo = newRec.getSublistValue({
                    sublistId: depositSublistId,
                    fieldId: 'refnum',
                    line: dI
                }) || '';

                //Deposit Date (try 'depositdate', fallback to 'applydate', then 'date'):
                var depositDate = '';
                var depositDateValue = '';
                try {
                    depositDateValue = newRec.getSublistValue({
                        sublistId: depositSublistId,
                        fieldId: 'depositdate',
                        line: dI
                    });
                } catch (eDepDate1) {
                    depositDateValue = '';
                }

                if (!depositDateValue) {
                    try {
                        depositDateValue = newRec.getSublistValue({
                            sublistId: depositSublistId,
                            fieldId: 'applydate',
                            line: dI
                        });
                    } catch (eDepDate2) {
                        depositDateValue = '';
                    }
                }

                if (!depositDateValue) {
                    try {
                        depositDateValue = newRec.getSublistValue({
                            sublistId: depositSublistId,
                            fieldId: 'date',
                            line: dI
                        });
                    } catch (eDepDate3) {
                        depositDateValue = '';
                    }
                }

                if (depositDateValue) {
                    var dp = depositDateValue;
                    var dpDay = dp.getDate();
                    var dpMonth = dp.getMonth() + 1;
                    var dpYear = dp.getFullYear();
                    depositDate = dpYear + '-' +
                        (dpMonth < 10 ? '0' + dpMonth : dpMonth) + '-' +
                        (dpDay < 10 ? '0' + dpDay : dpDay);
                }

                var depositOriginalAmount = parseFloat(newRec.getSublistValue({
                    sublistId: depositSublistId,
                    fieldId: 'total',
                    line: dI
                }) || 0);

                var depositAmountRemaining = parseFloat(newRec.getSublistValue({
                    sublistId: depositSublistId,
                    fieldId: 'due',
                    line: dI
                }) || 0);

                var depositAmountApplied = parseFloat(newRec.getSublistValue({
                    sublistId: depositSublistId,
                    fieldId: 'amount',
                    line: dI
                }) || 0);

                //Currency:
                var depositCurrency = currency;
                try {
                    var depositCurrencyValue = newRec.getSublistValue({
                        sublistId: depositSublistId,
                        fieldId: 'currency',
                        line: dI
                    });
                    if (depositCurrencyValue) {
                        depositCurrency = depositCurrencyValue;
                    }
                } catch (eDepCurrency) {
                    //Fallback to header currency
                }

                payload.deposits.push({
                    line: depositLineNumber,
                    applied: depositApplied,
                    depositId: depositId ? String(depositId) : '',
                    refNo: depositRefNo,
                    depositDate: depositDate,
                    originalAmount: depositOriginalAmount,
                    amountRemaining: depositAmountRemaining,
                    currency: depositCurrency,
                    amountApplied: depositAmountApplied
                });
            }

            log.debug({
                title: 'CustomerPaymentSync - Step-3 Complete',
                details: 'Invoices: ' + payload.invoices.length +
                    ', Credits: ' + payload.credits.length +
                    ', Deposits: ' + payload.deposits.length
            });

            var payloadPreview = JSON.stringify(payload);
            log.debug({
                title: 'CustomerPaymentSync - Final Payload Preview',
                details: payloadPreview.length > 4000
                    ? payloadPreview.substring(0, 3900) + '...[truncated]'
                    : payloadPreview
            });


        
            //Step-4 Get Token and POST to Aspect (Customer Payment):

            //Step-4.1 TEST Endpoints:
            var TOKEN_URL = runtime.getCurrentScript().getParameter({ name: 'custscript_c112417_token_url' });
            var ASPECT_CUSTOMER_PAYMENT_URL = runtime.getCurrentScript().getParameter({ name: 'custscriptc112417_aspect_cp_url' });


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
                    title: 'CustomerPaymentSync - Token Error',
                    details: 'Token not found in Aspect token response. Aborting sync.'
                });
                return;
            }

            log.debug({
                title: 'CustomerPaymentSync - Token Acquired',
                details: 'Token length: ' + token.length
            });


            //Step-4.5 Send Customer Payment Payload:
            var payloadString = JSON.stringify(payload);

            log.debug({
                title: 'CustomerPaymentSync - Step-4 (Payload Preview)',
                details: payloadString.length > 4000
                    ? payloadString.substring(0, 3900) + '...[truncated]'
                    : payloadString
            });

            var response = https.post({
                url: ASPECT_CUSTOMER_PAYMENT_URL,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: payloadString
            });

            log.debug({
                title: 'CustomerPaymentSync - Aspect Response',
                details: 'HTTP ' + response.code + ' - ' +
                    (response.body && response.body.length > 4000
                        ? response.body.substring(0, 3900) + '...[truncated]'
                        : response.body)
            });
        } 
        catch (e) {
            log.error({
                title: 'CustomerPaymentSync - Error',
                details: e.name + ': ' + e.message + (e.stack ? '\n' + e.stack : '')
            });
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});
