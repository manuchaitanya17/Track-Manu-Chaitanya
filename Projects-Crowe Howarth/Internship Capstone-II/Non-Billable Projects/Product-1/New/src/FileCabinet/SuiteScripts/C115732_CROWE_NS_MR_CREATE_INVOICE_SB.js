/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/log', 'N/record', 'N/config', 'N/runtime', 'N/format'], (search, log, record, config, runtime, format) => {
    var PARAM_CREATED_FROM = 'custscript_subscription_billing_so';
    var PARAM_CUSTOMER     = 'custscriptsubscription_billing_cust';
    var PARAM_NEXT_DATE    = 'custscript_subscription_billing_nd';

    var getInputData = () => {
        log.debug("getInputData Started!");
        var script = runtime.getCurrentScript();
        var createdFromParam = script.getParameter({ name: PARAM_CREATED_FROM });
        var customerParam    = script.getParameter({ name: PARAM_CUSTOMER });   
        var nextDateRaw      = script.getParameter({ name: PARAM_NEXT_DATE }); 
        log.debug("script", script); 
        log.debug("createdFromParam", createdFromParam);
        log.debug("customerParam", customerParam);
        log.debug("nextDateRaw", nextDateRaw);


    
      const nextDateObj   = nextDateRaw ? new Date(nextDateRaw) : null;
      const nextDateText  = nextDateObj ? format.format({ value: nextDateObj, type: format.Type.DATE }) : null;
      log.debug('nextDateText', nextDateText);


        var filters = [
            ["custrecord_sub_end_dt", "onorafter", "today"],
            "AND", 
            ["custrecord_sub_status", "anyof", "1"],
            "AND", 
            ["isinactive", "is", "F"],
            "AND", 
            ["custrecord_sub_error", "isempty", ""]
        ];

        if (!nextDateText) {
            filters.push("AND", ["custrecord_sub_next_dt", "onorbefore", "today"]);
        }

        if (createdFromParam) {
            filters.push("AND", ["custrecord_sub_created_from", "anyof", createdFromParam]);
        }

        if (customerParam) {
            filters.push("AND", ["custrecord_sub_cust", "anyof", customerParam]);
        }
        if (nextDateText) {
            filters.push("AND", ["custrecord_sub_next_dt", "on", nextDateText]);
        }
        log.debug("filters", filters);


        var grouped = {};
        var customrecord_crowe_subscriptionSearchObj = search.create({
            type: "customrecord_crowe_subscription",
            filters: filters,
            columns:
                [
                    search.createColumn({ name: "name", label: "ID" }),
                    search.createColumn({ name: "custrecord_sub_cust", label: "Customer" }),
                    search.createColumn({ name: "custrecord_sub_next_dt", label: "Next Date" }),
                    search.createColumn({ name: "custrecord_sub_end_dt", label: "END Date" }),
                    search.createColumn({ name: "custrecord_sub_start_dt", label: "Start Date" }),
                    search.createColumn({ name: "custrecord_sub_frequency", label: "Frequency" }),
                    search.createColumn({ name: "custrecord_sub_qty", label: "Quantity" }),
                    search.createColumn({ name: "custrecord_sub_amt", label: "Amount" }),
                    search.createColumn({ name: "custrecord_sub_created_from", label: "Created From" }),
                    search.createColumn({ name: "custrecordsub_item", label: "Item" }),
                    search.createColumn({ name: 'custrecord_sub_rate', lable: "Rate" })
                ]
        });


        var resultArray = customrecord_crowe_subscriptionSearchObj.run().getRange(0, 999);
        log.debug("resultArray", resultArray);

        customrecord_crowe_subscriptionSearchObj.run().each(result => {
            var customer = result.getValue('custrecord_sub_cust');
            var so = result.getValue('custrecord_sub_created_from');
            var nextDate = result.getValue('custrecord_sub_next_dt');

            var key = customer + '_' + so + '_' + nextDate;

            if (!grouped[key]) grouped[key] = [];

            grouped[key].push({
                subscriptionId: result.id,
                customerId: customer,
                salesOrderId: so,
                nextDate: nextDate,
                itemId: result.getValue('custrecordsub_item'),
                amount: result.getValue('custrecord_sub_amt'),
                quantity: result.getValue('custrecord_sub_qty'),
                frequencyId: result.getValue('custrecord_sub_frequency'),
                endDate: result.getValue('custrecord_sub_end_dt'),
                rate: result.getValue('custrecord_sub_rate')
            });

            return true;
        });

        log.debug("Grouped Object: ", grouped);

        //We converted Object into Array of Object:
        return Object.keys(grouped).map(key => ({
            key: key,
            values: grouped[key]
        }));
    };

    var map = context => {

        log.debug("map Started!");

        try {
            //Context Object:
            log.debug("context Object: ", context);


            //Data Object:
            var data = JSON.parse(context.value);
            log.debug("data Object: ", data);


            //Key of Each Group:
            var groupKey = context.key;
            log.debug("groupKey:", groupKey);


            //Object: Array returned from getInputData(): 
            var subscriptions = data.values;
            log.debug("subscriptions", subscriptions);


            var first = subscriptions[0];
            log.debug("first", first);

            var customerId = Number(first.customerId);
            var soId = first.salesOrderId;
            var nextDate = first.nextDate;


            var lines = fetchSubscriptionsForGroup(customerId, soId, nextDate);

            if (!lines.length) {
                log.debug('No matching lines for group; skipping', { groupKey });
                return;
            }


            //Functionality-1 Step-1 Creating a Sales Order:
            var currentlyCreatedSO = record.transform({
                fromType: record.Type.CUSTOMER,
                fromId: customerId,
                toType: record.Type.SALES_ORDER,
                isDynamic: true
            });
            log.debug("Transformed!");

            //Note: For now we are hardcoding the Location:
            // currentlyCreatedSO.setValue({ fieldId: 'location', value: 4 });
            currentlyCreatedSO.setValue({
                fieldId: 'orderstatus',
                value: 'B'
            })
            log.debug("Order Status changed to Pending Fulfillment.")


            //Functionality-4 Setting the Original SO on Renewal SO:
            currentlyCreatedSO.setValue({
                fieldId: 'custbody_original_so',
                value: soId
            })
            log.debug("Original SO Set!");


            //Functionality-5: Setting the Subscription Record ID's on Renewal SO:
            var subscriptionIdArray = [];
            for (var lineX = 0; lineX < lines.length; lineX++) {
                subscriptionIdArray.push(lines[lineX].subscriptionId);
            }
            log.debug("subscriptionIdArray", subscriptionIdArray);

            currentlyCreatedSO.setValue({
                fieldId: 'custbody_renewal_order_subs',
                value: subscriptionIdArray
            });
            log.debug("Renewal Order Subscriptions Set!");


            //Step-2 Setting the SO Item Sublist Lines:
            for (var line of lines) {
                try {
                    currentlyCreatedSO.selectNewLine({ sublistId: 'item' });
                    currentlyCreatedSO.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: Number(line.itemId) });
                    currentlyCreatedSO.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: Number(line.quantity) });
                    currentlyCreatedSO.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: line.rate });
                    currentlyCreatedSO.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_sub_freq', value: line.frequencyId });

                    currentlyCreatedSO.commitLine({ sublistId: 'item' });
                }
                catch (e) {
                    record.submitFields({
                        type: 'customrecord_crowe_subscription',
                        id: line.subscriptionId,
                        values: {
                            custrecord_sub_error: e.name + " " + e.message + " " + String(e)
                        }
                    });
                }
            }


            //Step-3 Saving the SO:
            var currentlyCreatedSOID = currentlyCreatedSO.save();
            log.debug('Sales Order Created', { currentlyCreatedSOID, groupKey });


            //Step-4 Creating Item Fulfillment:
            // var itemFulfillment = fulfillAndShip(currentlyCreatedSOID);
            // log.debug('itemFulfillment', itemFulfillment);
            // log.debug('orderstatus', currentlyCreatedSO.getValue('orderstatus'));


            //Functionaliy-3 Updating the Next Date on Subscription Record:
            for (var line of lines) {
                var nextDate = getNewDatesFromFrequency(line.frequencyId, line.nextDate);
                record.submitFields({
                    type: 'customrecord_crowe_subscription',
                    id: line.subscriptionId,
                    values: {
                        custrecord_sub_next_dt: nextDate
                    }
                });
            }



            //Functionality-4 Setting the Renewal Order Subscriptions Field on SO:
            // record.submitFields({
            //     type: record.Type.SALES_ORDER,
            //     id: currentlyCreatedSO,
            //     values: {
            //         custbody_renewal_order_subs: subscriptionIdArray
            //     }
            // });


            //Functionality-5 Transforming SO to Invoice if Checkbox is checked:
            if (getRenewalOrderInvoicePreference()) {
                var invoice = record.transform({
                    fromType: record.Type.SALES_ORDER,
                    fromId: currentlyCreatedSOID,
                    toType: record.Type.INVOICE,
                    isDynamic: true
                });


                var invoiceId = invoice.save();
                log.debug('Invoice Created from existing SO', { currentlyCreatedSOID: currentlyCreatedSOID, invoiceId: invoiceId });
            }
        }
        catch (e) {
            log.error('Error in map', { name: e.name, message: e.message, stack: e.stack });
        }
    };


    function fetchSubscriptionsForGroup(customerId, salesOrderId, nextDate) {
        var rows = [];
        var s = search.create({
            type: "customrecord_crowe_subscription",
            filters:
                [
                    ["custrecord_sub_end_dt", "onorafter", "today"],
                    "AND",
                    ["custrecord_sub_status", "anyof", "1"],
                    "AND",
                    ["isinactive", "is", "F"],
                    "AND",
                    ["custrecord_sub_error", "isempty", ""],
                    "AND",
                    ['custrecord_sub_created_from', 'is', salesOrderId],
                    "AND",
                    ['custrecord_sub_cust', 'is', customerId],
                    "AND",
                    ['custrecord_sub_next_dt', 'on', nextDate]
                ],
            columns:
                [
                    search.createColumn({ name: "internalid", label: "Internal ID" }),
                    search.createColumn({ name: "custrecord_sub_cust", label: "Customer" }),
                    search.createColumn({ name: "custrecord_sub_next_dt", label: "Next Date" }),
                    search.createColumn({ name: "custrecord_sub_end_dt", label: "END Date" }),
                    search.createColumn({ name: "custrecord_sub_start_dt", label: "Start Date" }),
                    search.createColumn({ name: "custrecord_sub_frequency", label: "Frequency" }),
                    search.createColumn({ name: "custrecord_sub_qty", label: "Quantity" }),
                    search.createColumn({ name: "custrecord_sub_amt", label: "Amount" }),
                    search.createColumn({ name: "custrecord_sub_created_from", label: "Created From" }),
                    search.createColumn({ name: "custrecordsub_item", label: "Item" }),
                    search.createColumn({ name: 'custrecord_sub_rate', lable: "Rate" })
                ]
        });

        s.run().each((r) => {
            rows.push({
                subscriptionId: r.getValue('internalid'),
                itemId: r.getValue('custrecordsub_item'),
                quantity: r.getValue('custrecord_sub_qty'),
                rate: r.getValue('custrecord_sub_rate'),
                amount: r.getValue('custrecord_sub_amt'),
                frequencyId: r.getValue('custrecord_sub_frequency'),
                endDate: r.getValue('custrecord_sub_end_dt'),
                nextDate: r.getValue('custrecord_sub_next_dt')
            });
            return true;
        });
        log.debug("Rows Data: ", rows);
        return rows;
    }


    function getNewDatesFromFrequency(frequencyId, nextDate) {
        var numMonths = 0, numDays = 0;

        var freqSearch = search.create({
            type: "customrecord_crowe_sub_freq",
            filters:
                [
                    ["internalid", "is", frequencyId]
                ],
            columns:
                [
                    search.createColumn({ name: "name", label: "Name" }),
                    search.createColumn({ name: "scriptid", label: "Script ID" }),
                    search.createColumn({ name: "custrecord_num_days", label: "Num Of Days" }),
                    search.createColumn({ name: "custrecord_num_months", label: "Num Of Months" })
                ]
        });

        var result = freqSearch.run().getRange({ start: 0, end: 1 })[0];
        if (result) {
            numMonths = parseInt(result.getValue('custrecord_num_months'), 10) || 0;
            numDays = parseInt(result.getValue('custrecord_num_days'), 10) || 0;
        }

        log.debug("numMonths", numMonths);
        log.debug("numDays", numDays);

        var newNextDate = new Date(nextDate);
        log.debug("newNextDate", newNextDate);

        newNextDate.setMonth(newNextDate.getMonth() + numMonths);
        newNextDate.setDate(newNextDate.getDate() + numDays);

        var newnextDate = new Date(newNextDate);
        log.debug("newnextDate", newnextDate);

        return newnextDate
    }

    function getRenewalOrderInvoicePreference() {
        var prefs = config.load({ type: config.Type.COMPANY_PREFERENCES });
        var val = prefs.getValue({ fieldId: 'custscript_renewal_order_inv' });
        log.debug('prefs', prefs);
        log.debug('val', val);

        return val === true || val === 'T' || val === 'true';
    }

    function fulfillAndShip(soId) {
        var ifRec = record.transform({
            fromType: record.Type.SALES_ORDER,
            fromId: soId,
            toType: record.Type.ITEM_FULFILLMENT,
            isDynamic: true
        });

        ifRec.setValue({ fieldId: 'shipstatus', value: 'C' }); // C = Shipped

        var lc = ifRec.getLineCount({ sublistId: 'item' });
        for (var i = 0; i < lc; i++) {
            ifRec.selectLine({ sublistId: 'item', line: i });
            ifRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: true });
            ifRec.commitLine({ sublistId: 'item' });
        }
        return ifRec.save();
    }


    return {
        getInputData,
        map
    };
});