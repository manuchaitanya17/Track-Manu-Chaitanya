/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define(['N/record', 'N/log', 'N/runtime', 'N/search', './library@manu.js'], (record, log, runtime, search, library) => {

    var beforeLoad = (context) => {
        try {
            log.debug("type: ", context.type);
            if (context.type === context.UserEventType.COPY) {
                var rec = context.newRecord;

                var renewalOrderSubscriptionBefore = rec.getValue('custbody_renewal_order_subs');
                log.debug("Before Value", renewalOrderSubscriptionBefore);

                rec.setValue({ fieldId: 'custbody_renewal_order_subs', value: [] });

                var renewalOrderSubscriptionAfter = rec.getValue('custbody_renewal_order_subs');
                log.debug("After Value", renewalOrderSubscriptionAfter);

                log.debug('beforeLoad', 'Cleared custbody_renewal_order_subs on COPY');
            }
        }
        catch (e) {
            log.error('Error in beforeLoad', e);
        }
    };


    var afterSubmit = (context) => {
        log.debug("type: ", context.type);
        if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) return;

        //Functionality-1 If Renewal Subscription were set, skip subscription creation:
        try {
            var subsVal = context.newRecord.getValue({ fieldId: 'custbody_renewal_order_subs' });
            var hasSubs = subsVal.length > 0;

            if (hasSubs) {
                log.debug('afterSubmit', 'custbody_renewal_order_subs has values; skipping UE processing.');
                return;
            }
        }
        catch (e) {
            log.error('Error checking custbody_renewal_order_subs in afterSubmit', e);
        }


        try {
            var salesOrder = record.load({
                type: record.Type.SALES_ORDER,
                id: context.newRecord.id,
                isDynamic: false
            });

            var customerId = salesOrder.getValue('entity');
            var lineCount = salesOrder.getLineCount({ sublistId: 'item' });
            var trandate = salesOrder.getValue('trandate');

            for (var i = 0; i < lineCount; i++) {
                var isSubscription = salesOrder.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_is_sub',
                    line: i
                });

                if (isSubscription) {
                    var item = salesOrder.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                    var frequency = salesOrder.getSublistValue({ sublistId: 'item', fieldId: 'custcol_sub_freq', line: i });
                    var startDate = salesOrder.getSublistValue({ sublistId: 'item', fieldId: 'custcol_sub_start_dt', line: i }) || trandate;
                    var endDate = salesOrder.getSublistValue({ sublistId: 'item', fieldId: 'custcol_sub_rnd_dt', line: i });
                    var quantity = salesOrder.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                    var amount = salesOrder.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i });
                    var rate = salesOrder.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i });
                    var line = salesOrder.getSublistValue({ sublistId: 'item', fieldId: 'line', line: i });

                    
                    var nextDate = library.getNextDateFromFrequency(frequency, startDate);
                    log.debug("Next Date: ", nextDate);



                    var subscription = record.create({
                        type: 'customrecord_crowe_subscription',
                        isDynamic: true
                    });

                    subscription.setValue({ fieldId: 'custrecord_sub_created_from', value: salesOrder.id });
                    subscription.setValue({ fieldId: 'custrecordsub_item', value: item });
                    subscription.setValue({ fieldId: 'custrecord_sub_frequency', value: frequency });
                    subscription.setValue({ fieldId: 'custrecord_sub_cust', value: customerId });
                    subscription.setValue({ fieldId: 'custrecord_sub_start_dt', value: startDate });
                    subscription.setValue({ fieldId: 'custrecord_sub_end_dt', value: endDate });

                    subscription.setValue({ fieldId: 'custrecord_sub_rate', value: rate });
                    subscription.setValue({ fieldId: 'custrecord_sub_qty', value: quantity });
                    subscription.setValue({ fieldId: 'custrecord_sub_amt', value: amount });
                    subscription.setValue({ fieldId: 'custrecord_sub_status', value: 1 });
                    subscription.setValue({ fieldId: 'custrecord_line_item_number', value: line });



                    if (nextDate) {
                        subscription.setValue({ fieldId: 'custrecord_sub_next_dt', value: nextDate });
                    }

                    var subId = subscription.save();
                    log.debug('Subscription Created, ID: ', subId);
                }
            }
        }
        catch (error) {
            log.error('Error in afterSubmit - Pan06', error);
        }
    };

    return { beforeLoad, afterSubmit };
});
