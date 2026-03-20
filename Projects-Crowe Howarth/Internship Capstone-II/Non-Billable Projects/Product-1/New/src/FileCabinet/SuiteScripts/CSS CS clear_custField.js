/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/currentRecord', 'N/log'], (currentRecord, log) => {
    function pageInit(ctx) {
        log.debug('pageInit Triggerd');
        log.debug('Mode', ctx.mode);
        if (ctx.mode === 'copy') {
            const rec = currentRecord.get();
            rec.setValue({ fieldId: 'custbody_renewal_order_subs', value: [] });
 
        }
    }
    return { pageInit };
});
