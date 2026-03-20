/**
 * Refund Payment (Customer Refund) – NetSuite -> Aspect (afterSubmit UE)
 *
 * Runs on CREATE and EDIT only.
 * Builds payload as per updated JSON and sends ONLY applied=true lines from Apply sublist.
 *
 * Updated JSON structure:
 * {
 *   "internalId": "3586",
 *   "tranId": "RFND123",
 *   "customerId": "63",
 *   "accountId": "366",
 *   "arAccountId": "123",
 *   "date": "2026-01-10",
 *   "postingPeriod": "Jan 2026",
 *   "memo": "Refund memo text",
 *   "subsidiaryId": "24",
 *   "currency": "USD",
 *   "exchangeRate": "3.6725",
 *   "refundAmount": "200.00",
 *   "apply": [
 *     {
 *       "applied": true,
 *       "docDate": "2026-01-07",
 *       "type": "Final Customer Bill",
 *       "refNo": "000223",
 *       "refundApplied": "200.00"
 *     }
 *   ]
 * }
 *
 * Script Parameters (recommended):
 * - custscript_c112417_token_url
 * - custscript_c112417_aspect_refund_url
 * - custscript_c112417_aspect_username
 * - custscript_c112417_aspect_password
 *
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */

define(['N/record', 'N/https', 'N/log', 'N/runtime'], function (record, https, log, runtime) {

    function afterSubmit(context) {

        //Run only on Create and Edit:
        if (context.type !== context.UserEventType.CREATE &&
            context.type !== context.UserEventType.EDIT) {
            log.debug({
                title: 'RefundPaymentSync',
                details: 'Exit early. Event type: ' + context.type
            });
            return;
        }

        try {
            var newRec = context.newRecord;

            //Step-1 Read Body-Level Fields (Refund Payment / Customer Refund):
            var internalId = newRec.id;
            var tranId = newRec.getValue({ fieldId: 'tranid' }) || '';

            //Customer:
            var customerId = '';
            try {
                customerId = newRec.getValue({ fieldId: 'customer' }) || '';
            }
            catch (eCustomer1) {
                try {
                    customerId = newRec.getValue({ fieldId: 'entity' }) || '';
                }
                catch (eCustomer2) {
                    customerId = '';
                }
            }

            //Account (Bank/Cash account used for refund):
            var accountId = '';
            try {
                accountId = newRec.getValue({ fieldId: 'account' }) || '';
            }
            catch (eAcct) {
                accountId = '';
            }

            //A/R Account:
            var arAccountId = '';
            try {
                arAccountId = newRec.getValue({ fieldId: 'aracct' }) || '';
            }
            catch (eAr) {
                arAccountId = '';
            }

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

            //Posting Period (TEXT)
            var postingPeriod = '';
            try {
                postingPeriod = newRec.getText({ fieldId: 'postingperiod' }) || '';
            }
            catch (ePP) {
                postingPeriod = '';
            }

            var memo = newRec.getValue({ fieldId: 'memo' }) || '';

            //Subsidiary (ID)
            var subsidiaryId = '';
            try {
                subsidiaryId = newRec.getValue({ fieldId: 'subsidiary' }) || '';
            }
            catch (eSub) {
                subsidiaryId = '';
            }

            //Currency (TEXT like USD)
            var currency = '';
            try {
                currency = newRec.getText({ fieldId: 'currency' }) || '';
            }
            catch (eCur) {
                currency = '';
            }

            var exchangeRate = newRec.getValue({ fieldId: 'exchangerate' }) || '';
            // var exchangeRate = (exchangeRateVal !== null && exchangeRateVal !== '' && typeof exchangeRateVal !== 'undefined')
            //     ? String(exchangeRateVal)
            //     : '';

            //Refund Amount (use 'payment' fallback to 'total'):
            var refundAmountNum = parseFloat(
                newRec.getValue({ fieldId: 'payment' }) ||
                newRec.getValue({ fieldId: 'total' }) ||
                0
            ) || 0;

            //Keep as string (as per updated JSON)
            var refundAmount = refundAmountNum;

            log.debug({
                title: 'RefundPaymentSync - Step-1 (Body Fields)',
                details: 'Internal ID: ' + internalId + ', TranID: ' + tranId + ', Customer: ' + customerId
            });


            //Step-2 Build JS Object for Body-Level Fields:
            var payload = {
                internalId: internalId ? String(internalId) : '',
                tranId: tranId,
                customerId: customerId ? String(customerId) : '',
                accountId: accountId ? String(accountId) : '',
                arAccountId: arAccountId ? String(arAccountId) : '',
                date: tranDate,
                postingPeriod: postingPeriod,
                memo: memo,
                subsidiaryId: subsidiaryId ? String(subsidiaryId) : '',
                currency: currency,
                exchangeRate: exchangeRate,
                paymentAmount: refundAmount,
                invoices: []
            };


            //Step-3 Push Line-Level Fields (Apply Sublist) - ONLY applied=true lines:

            var applyLineCount = 0;
            try {
                applyLineCount = newRec.getLineCount({ sublistId: 'apply' }) || 0;
            }
            catch (eApplyCount) {
                log.debug({
                    title: 'RefundPaymentSync - Apply sublist',
                    details: 'Apply Sublist Not Found: ' + eApplyCount.name + ' ' + eApplyCount.message
                });
            }

            log.debug({
                title: 'RefundPaymentSync - Step-3',
                details: 'Apply Line Count: ' + applyLineCount
            });

            for (var i = 0; i < applyLineCount; i++) {

                //Step-3.1 Only sending applied lines:
                var applyFlag = newRec.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'apply',
                    line: i
                });

                var applied = (applyFlag === true || applyFlag === 'T');
                if (!applied) {
                    continue;
                }

                //Doc Date:
                var docDate = '';
                var docDateValue = '';
                try {
                    docDateValue = newRec.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'applydate',
                        line: i
                    });
                }
                catch (eApplyDate1) {
                    docDateValue = '';
                }

                if (!docDateValue) {
                    try {
                        docDateValue = newRec.getSublistValue({
                            sublistId: 'apply',
                            fieldId: 'date',
                            line: i
                        });
                    }
                    catch (eApplyDate2) {
                        docDateValue = '';
                    }
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

                //Type:
                var type = '';
                try {
                    type = newRec.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'type',
                        line: i
                    }) || '';
                }
                catch (eType) {
                    type = '';
                }

                //Ref No:
                var refNo = '';
                try {
                    refNo = newRec.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'refnum',
                        line: i
                    }) || '';
                }
                catch (eRef) {
                    refNo = '';
                }

                //Refund Applied amount:
                var refundAppliedNum = 0;
                try {
                    refundAppliedNum = parseFloat(newRec.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'amount',
                        line: i
                    }) || 0) || 0;
                }
                catch (eAmt1) {
                    refundAppliedNum = 0;
                }

                if (!refundAppliedNum) {
                    try {
                        refundAppliedNum = parseFloat(newRec.getSublistValue({
                            sublistId: 'apply',
                            fieldId: 'payment',
                            line: i
                        }) || 0) || 0;
                    }
                    catch (eAmt2) {
                        refundAppliedNum = 0;
                    }
                }

                //Keep as string (as per updated JSON)
                var refundApplied = refundAppliedNum;

                payload.invoices.push({
                    applied: true,
                    docDate: docDate,
                    documentType: type,
                    refNo: refNo,
                    paymentApplied: refundApplied
                });
            }

            log.debug({
                title: 'RefundPaymentSync - Step-3 Complete',
                details: 'Applied lines pushed: ' + payload.invoices.length
            });

            var payloadPreview = JSON.stringify(payload);
            log.debug({
                title: 'RefundPaymentSync - Final Payload Preview',
                details: payloadPreview.length > 4000
                    ? payloadPreview.substring(0, 3900) + '...[truncated]'
                    : payloadPreview
            });


            //Step-4 Get Token and POST to Aspect (Refund Payment):

            //Step-4.1 Endpoints from Script Parameters:
            var TOKEN_URL = runtime.getCurrentScript().getParameter({ name: 'custscript_c112417_token_url' });
            var ASPECT_REFUND_URL = runtime.getCurrentScript().getParameter({ name: 'custscriptc112417_aspect_cp_url' });

            //Step-4.2 Credentials from Script Parameters:
            var ASPECT_USERNAME = runtime.getCurrentScript().getParameter({ name: 'custscript_c112417_aspect_username' });
            var ASPECT_PASSWORD = runtime.getCurrentScript().getParameter({ name: 'custscript_c112417_aspect_password' });

            log.debug({
                title: 'RefundPaymentSync - Step-4 Params',
                details: 'TOKEN_URL=' + TOKEN_URL + ' | ASPECT_REFUND_URL=' + ASPECT_REFUND_URL
            });

            if (!TOKEN_URL || !ASPECT_REFUND_URL || !ASPECT_USERNAME || !ASPECT_PASSWORD) {
                log.error({
                    title: 'RefundPaymentSync - Missing Parameters',
                    details: 'One or more script parameters are missing (token url, refund url, username, password).'
                });
                return;
            }

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
                title: 'RefundPaymentSync - Token response',
                details: 'HTTP ' + tokenResponse.code + ' - ' +
                    (tokenResponse.body && tokenResponse.body.length > 4000
                        ? tokenResponse.body.substring(0, 3900) + '...[truncated]'
                        : tokenResponse.body)
            });

            //Step-4.4 Read token from response:
            var token = '';
            if (tokenResponse.code === 200 || tokenResponse.code === '200') {
                var tokenBody = tokenResponse.body || '';

                try {
                    var tokenObj = JSON.parse(tokenBody);
                    token = tokenObj.token || tokenObj.access_token || tokenObj.Token || '';
                }
                catch (eTokenParse) {
                    token = tokenBody.replace(/"/g, '').trim();
                }
            }

            if (!token) {
                log.error({
                    title: 'RefundPaymentSync - Token Error',
                    details: 'Token not found in Aspect token response. Aborting sync.'
                });
                return;
            }

            log.debug({
                title: 'RefundPaymentSync - Token Acquired',
                details: 'Token length: ' + token.length
            });

            //Step-4.5 Send Refund Payment Payload:
            var payloadString = JSON.stringify(payload);

            log.debug({
                title: 'RefundPaymentSync - Step-4 (Payload Preview)',
                details: payloadString.length > 4000
                    ? payloadString.substring(0, 3900) + '...[truncated]'
                    : payloadString
            });

            var response = https.post({
                url: ASPECT_REFUND_URL,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: payloadString
            });

            log.debug({
                title: 'RefundPaymentSync - Aspect Response',
                details: 'HTTP ' + response.code + ' - ' +
                    (response.body && response.body.length > 4000
                        ? response.body.substring(0, 3900) + '...[truncated]'
                        : response.body)
            });

        }
        catch (e) {
            log.error({
                title: 'RefundPaymentSync - Error',
                details: e.name + ': ' + e.message + (e.stack ? '\n' + e.stack : '')
            });
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});
