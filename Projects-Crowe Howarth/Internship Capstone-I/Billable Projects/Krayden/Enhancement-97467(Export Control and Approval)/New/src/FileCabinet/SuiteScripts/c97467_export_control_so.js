/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */

define(['N/query'], function (query) {

    function fieldChanged(context) {
        if (context.sublistId !== 'item' || context.fieldId !== 'item') {
            return;
        }

        console.log("Field Changed Triggered!");

        var currentRecord = context.currentRecord;
        var customerId = currentRecord.getValue({ fieldId: 'entity' });
        var itemId = currentRecord.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'item'
        });

        if (!itemId || !customerId) {
            console.log("Customer or Item not selected.");
            return;
        }

        try {
            var itemQuery = query.runSuiteQL({
                query:
                    "SELECT i.custitem_94405 AS is_export_controlled, " +
                    "       i.custitem_94406_ear99 AS is_ear99 " +
                    "FROM item i " +
                    "WHERE i.id = ?",
                params: [itemId]
            });
            console.log("itemQuery", itemQuery);

            if (!itemQuery || itemQuery.results.length === 0) {
                console.log("Item not found in query.");
                return;
            }

            var itemRow = itemQuery.results[0].asMap();
            var isExportControlled = itemRow.is_export_controlled === 'T' || itemRow.is_export_controlled === true;
            var isEar99 = itemRow.is_ear99 === 'T' || itemRow.is_ear99 === true;
            console.log("itemRow: " + itemRow);
            console.log("isExportControlled: " + isExportControlled);
            console.log("isEar99: " + isEar99);

            if (isExportControlled && !isEar99) {
                console.log("Restricted item detected. Checking approval...");

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
                console.log("approvalQuery", approvalQuery);

                if (!approvalQuery || approvalQuery.results.length === 0) {
                    alert('This customer is not approved to purchase the restricted item.');
                    currentRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        value: null,
                        ignoreFieldChange: true
                    });
                }
            }
        }
        catch (e) {
            console.log("Error in fieldChanged: " + e.message);
        }
    }

    return {
        fieldChanged: fieldChanged
    };
});
