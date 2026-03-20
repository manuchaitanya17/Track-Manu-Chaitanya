/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */

define(['N/record', 'N/query', 'N/log'], function (record, query, log) {

    function beforeSubmit(context) {
        try {
            if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) {
                return;
            }

            var fulfillment = context.newRecord;
            var salesOrderId = fulfillment.getValue('createdfrom');
            log.debug("fulfillment", fulfillment);
            log.debug("salesOrderId", salesOrderId);


            if (!salesOrderId) {
                log.debug('Skipping', 'No source Sales Order');
                return;
            }

            var customerQuery = query.runSuiteQL({
                query: "SELECT entity FROM transaction WHERE id = ?",
                params: [salesOrderId]
            });
            var customerId = customerQuery.results[0].asMap().entity;
            /* Manu's Note: We need Customer ID from Item Fulfilment Record, but it is not present there,
              so we have options to either of them: search, load, query. The most optimised is using query Module. */

            var lineCount = fulfillment.getLineCount({ sublistId: 'item' });
            log.debug("customerId", customerId);
            log.debug("lineCount", lineCount);



            for (var i = 0; i < lineCount; i++) {
                var itemId = fulfillment.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });

                log.debug("itemId", itemId);
                if (!itemId) continue;


                var itemQuery = query.runSuiteQL({
                    query:
                        "SELECT i.custitem_94405 AS is_export_controlled, " +
                        "       i.custitem_94406_ear99 AS is_ear99 " +
                        "FROM item i " +
                        "WHERE i.id = ?",
                    params: [itemId]
                });
                log.debug("itemQuery", itemQuery);


                var itemRow = itemQuery.results[0].asMap();
                var isExportControlled = itemRow.is_export_controlled === 'T' || itemRow.is_export_controlled === true;
                var isEar99 = itemRow.is_ear99 === 'T' || itemRow.is_ear99 === true;
                log.debug("itemRow: " + itemRow);
                log.debug("isExportControlled: " + isExportControlled);
                log.debug("isEar99: " + isEar99);

                if (isExportControlled && !isEar99) {
                    log.debug('Restricted item found', 'Checking approval for Item: ' + itemId + ', Customer ID: ' + customerId);


                    var approvalQuery = query.runSuiteQL({
                        query:
                            "SELECT id " +
                            "FROM customrecord_c97467 " +
                            "WHERE custrecord_97467_item = ? " +
                            "  AND custrecord_97467_customer = ? " +
                            "  AND custrecord_97467_expiration >= CURRENT_DATE " +
                            "  AND isinactive = 'F'",
                        params: [itemId, customerId]
                    });
                    log.debug("approvalQuery", approvalQuery);


                    if (!approvalQuery || approvalQuery.results.length === 0) {
                        throw Error('Item Fulfillment blocked: Customer is no longer approved to receive restricted item: ' + itemId);
                    }
                }
            }
        }
        catch (error) {
            log.error("Error", e.message);
        }
    }

    return {
        beforeSubmit: beforeSubmit
    };
});
