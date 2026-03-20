/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/currentRecord'], function (currentRecord) {
    const CUSTOMER_FIELD = 'custrecord_97467_customer';
    const CREATED_FIELD = 'custpage_addr_select';
    const ADDRESS_FIELD = 'custrecord_address';

    function fieldChanged(context) {

        //Step-1 fieldChanged triggers when we change the Customer:
        if (context.fieldId == CUSTOMER_FIELD) {
            var rec = currentRecord.get();

            var customerID = rec.getValue({ fieldId: CUSTOMER_FIELD });
            log.debug("customerID is", customerID);


            if (!customerID) return;


            //Step-2 Creates a parameter in link so that we can use it in beforeLoad() in User Event Script:
            var params = new URLSearchParams(window.location.search || '');
            if (params.get('custparam_customerID') !== String(customerID)) {
                params.set('custparam_customerID', String(customerID));
                window.location.search = params.toString(); 
            }
        }


        if (context.fieldId == CREATED_FIELD) {
            var rec = currentRecord.get();

            //Step-1 Grab the selected value from the SHIP TO list:
            var rawVal = rec.getValue({ fieldId: CREATED_FIELD });


            //Step-2 Set the Address Field:
            rec.setValue({
                fieldId: ADDRESS_FIELD,
                value: rawVal || '',
                ignoreFieldChange: true
            });
            log.debug('Address field updated!');
        }
    }

    return {
        fieldChanged: fieldChanged

    };
});