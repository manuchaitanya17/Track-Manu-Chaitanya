/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */

define(['N/record', 'N/query', 'N/log', 'N/ui/serverWidget'], function (record, query, log, ui) {
    const CUSTOMER_FIELD = 'custrecord_97467_customer';
    const CREATED_FIELD = 'custpage_addr_select';
    const ADDRESS_FIELD = 'custrecord_address';

    function beforeLoad(context) {
        if (context.type == context.UserEventType.CREATE || context.type == context.UserEventType.EDIT) {


            //Step-1 Parameters if be there, get the Customer ID from there:
            if (!context.request || !context.request.parameters) return;

            var customerID = Number(context.request.parameters.custparam_customerID || 0);
            log.debug('UE beforeLoad', 'customerID param: ' + customerID);
            if (!customerID) return;


            //Step-2 Get the deployed record:
            var restrictedItemApproval = context.newRecord;
            restrictedItemApproval.setValue({ fieldId: CUSTOMER_FIELD, value: customerID });


            //Step-3 Load the Customer:
            var cust = record.load({ type: record.Type.CUSTOMER, id: customerID });


            //Step-4 Create the Custom Field:
            var sel = context.form.addField({ id: CREATED_FIELD, type: ui.FieldType.SELECT, label: 'Select Address' });
            sel.addSelectOption({ value: '', text: ' ' });


            //Step-5 Traverse through the Customer's Address and set the Address on Custom Field:
            var count = cust.getLineCount({ sublistId: 'addressbook' });
            for (var i = 0; i < count; i++) {
                var addrId = cust.getSublistValue({ sublistId: 'addressbook', fieldId: 'addressid', line: i });
                var addrSub = cust.getSublistSubrecord({ sublistId: 'addressbook', fieldId: 'addressbookaddress', line: i });
                var addrTxt = addrSub.getValue({ fieldId: 'addrtext' });
                sel.addSelectOption({ value: String(addrId), text: addrTxt });
            }
            log.debug('UE', 'Added ' + count + ' address options.');
        }
    }


    function beforeSubmit(context) {

        //Step-1 Ressuring that we set the Address:
        var rec = context.newRecord;
        var add = rec.getValue({ fieldId: CREATED_FIELD }) || '';
        rec.setValue({
            fieldId: ADDRESS_FIELD,
            value: add || ''
        });
        log.debug('Address field updated!');
        log.debug('BEFORE SUBMIT -', add);

    }


    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit
    };
});