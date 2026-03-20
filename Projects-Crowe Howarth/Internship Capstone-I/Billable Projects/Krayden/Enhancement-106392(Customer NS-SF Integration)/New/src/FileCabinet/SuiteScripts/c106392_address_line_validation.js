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
* FILE NAME: c106392_address_line_validation.js
* DEVOPS TASK: ENH 106392, DT 106393
* AUTHOR: Manu Chaitanya
* DATE CREATED: 15/July/2025
* DESCRIPTION: This Script restricts adding line if the Address Subrecord is Inactive and it also restrict line to delete if it has SF ID in it.
*****************************************************************************/

define(['N/ui/message', 'N/currentRecord'], function (message, currentRecord) {

    function validateDelete(context) {
        try {
            var sublistName = context.sublistId;

            if (sublistName === 'addressbook') {
                var currentRecord = context.currentRecord;

                var subrecord = currentRecord.getCurrentSublistSubrecord({
                    sublistId: 'addressbook',
                    fieldId: 'addressbookaddress'
                });

                var sfId = subrecord.getValue({
                    fieldId: 'custrecord_crw_salesforce_id'
                });

                if (sfId) {
                    alert("Cannot delete address as this address is linked to a Salesforce Account. Must Inactivate Address instead.");
                    return false;
                }
            }

            return true;

        }

        catch (e) {
            console.error("Error in validateDelete", e.message);
            return false;
        }
    }

    function validateLine(context) {
        if (context.sublistId === 'addressbook') {
            var rec = currentRecord.get();
            console.log("currentRecord Object: ", currentRecord);
            console.log("currentRecord Object's get() Function: ", rec);

            var isDefaultShipping = rec.getCurrentSublistValue({
                sublistId: 'addressbook',
                fieldId: 'defaultshipping'
            });

            if (isDefaultShipping) {
                var addressSub = rec.getCurrentSublistSubrecord({
                    sublistId: 'addressbook',
                    fieldId: 'addressbookaddress'
                });

                var isInactive = addressSub.getValue({
                    fieldId: 'custrecord_crw_102944_inactive'
                });

                if (isInactive) {
                    alert("Cannot mark an Inactive Address as Default Shipping. Please correct the address before saving.");
                    return false;
                }
            }
        }

        return true;
    }

    return {
        validateDelete: validateDelete,
        validateLine: validateLine

    };
});
