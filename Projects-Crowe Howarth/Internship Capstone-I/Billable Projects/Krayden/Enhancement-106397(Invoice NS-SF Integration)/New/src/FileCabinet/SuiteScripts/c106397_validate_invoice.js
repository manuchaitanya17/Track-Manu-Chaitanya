/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
/*****************************************************************************
 *  * Copyright (c) 2021 - Present Crowe LLP - All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Crowe LLP. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered with Crowe LLP.
*
* FILE NAME: c106397_validate_invoice.js
* DEVOPS TASK: ENH 106397, DT 106398
* AUTHOR: Manu Chaitanya
* DATE CREATED: 15/July/2025
* DESCRIPTION: This Script validates the shipaddressfield. It also restricts to save the Invoice Record if the Address Subrecord is inactivated.
*****************************************************************************/

define(['N/currentRecord', 'N/record'], function (currentRecord, record) {

    var addressIDGlobal;

    function pageInit(context) {
        console.log("pageInit() Triggered");
    }


    function fieldChanged(context) {
        var rec = currentRecord.get();
        if (context.fieldId == 'shipaddresslist') {

            var addressId = rec.getValue({ fieldId: 'shipaddresslist' });
            addressIDGlobal = addressId;
            var customerId = rec.getValue({ fieldId: 'entity' });
            console.log("addressId", addressId);

            if (!addressId || !customerId) return;

            try {

                var shippingSubrecord = rec.getSubrecord({ fieldId: 'shippingaddress' });
                if (addressId == -2) {

                    shippingSubrecord.setValue('custrecord_c101805_address_active', true);
                }

                else {
                    shippingSubrecord.setValue('custrecord_c101805_address_active', false);
                }
            }

            catch (e) {
                console.error('Error in Custom Button Change:', e.message);
            }


            try {
                var customerRec = record.load({
                    type: record.Type.CUSTOMER,
                    id: customerId,
                    isDynamic: false
                });

                var addressCount = customerRec.getLineCount({ sublistId: 'addressbook' });
                log.debug("addressCount", addressCount);

                for (var i = 0; i < addressCount; i++) {
                    var lineId = customerRec.getSublistValue({
                        sublistId: 'addressbook',
                        fieldId: 'id',
                        line: i
                    });

                    log.debug("lineId", lineId);

                    if (parseInt(lineId) === parseInt(addressId)) {
                        var addressSub = customerRec.getSublistSubrecord({
                            sublistId: 'addressbook',
                            fieldId: 'addressbookaddress',
                            line: i
                        });

                        var isInactive = addressSub.getValue({
                            fieldId: 'custrecord_crw_102944_inactive'
                        });

                        log.debug("isInactive", isInactive);

                        if (isInactive) {
                            alert("This address is marked as INACTIVE and cannot be selected.");
                        }

                        break;
                    }
                }


            }

            catch (e) {
                console.error('Error in fieldChanged:', e);
            }


        }
    }

    function saveRecord(context) {
        var rec = currentRecord.get();
        var addressId = addressIDGlobal;
        var customerId = rec.getValue({ fieldId: 'entity' });

        console.log('saveRecord() Triggered');
        console.log('addressId:', addressId);
        console.log('customerId:', customerId);

        if (!addressId || !customerId) {
            console.log('Missing address or customer ID, allowing save.');
            return true;
        }

        try {
            var customerRec = record.load({
                type: record.Type.CUSTOMER,
                id: customerId,
                isDynamic: false
            });

            var addressCount = customerRec.getLineCount({ sublistId: 'addressbook' });
            console.log('Customer address count:', addressCount);

            for (var i = 0; i < addressCount; i++) {
                var lineId = customerRec.getSublistValue({
                    sublistId: 'addressbook',
                    fieldId: 'id',
                    line: i
                });

                console.log('Comparing addressId:', addressId, 'with lineId:', lineId);

                if (parseInt(lineId) === parseInt(addressId)) {
                    var addressSub = customerRec.getSublistSubrecord({
                        sublistId: 'addressbook',
                        fieldId: 'addressbookaddress',
                        line: i
                    });

                    var isInactive = addressSub.getValue({
                        fieldId: 'custrecord_crw_102944_inactive'
                    });

                    console.log('isInactive:', isInactive);

                    if (isInactive) {
                        alert("This address is marked as INACTIVE and cannot be used. Please select a different address.");
                        return false;
                    }
                }
            }

            return true;
        }

        catch (e) {
            console.error('Error in saveRecord:', e.message);
            return true;
        }
    }
    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        saveRecord: saveRecord
    };
});
