/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 */

define(['N/query', 'N/record', 'N/log'], function (query, record, log) {

    function execute(context) {
        try {
            log.debug("execute() Function Triggered!");

            var suiteQL = query.runSuiteQL({
                query:
                    "SELECT id FROM customrecord_c97467 " +
                    "WHERE custrecord_97467_expiration < CURRENT_DATE " +
                    "AND isinactive = 'F'"
            });

            var results = suiteQL.results;
            log.debug("Number of expired records", results.length);


            for (var i = 0; i < results.length; i++) {
                var recId = results[i].asMap().id;
                log.debug("recId", recId);


                var rec = record.load({
                    type: 'customrecord_c97467',
                    id: recId
                });

                rec.setValue({
                    fieldId: 'isinactive',
                    value: true
                });

                rec.save();

                log.debug('Deactivated Approval', 'Approval ID ' + recId + ' marked as inactive.');
            }

        }
        
        catch (e) {
            log.debug('Error in Scheduled Script', e.message);
        }
    }

    return {
        execute: execute
    };
});
