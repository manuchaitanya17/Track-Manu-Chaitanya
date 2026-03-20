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
* FILE NAME: c106397_AddressFields_Inline_US.js
* DEVOPS TASK: ENH 106397, DT 106398
* AUTHOR: Manu Chaitanya
* DATE CREATED: 15/July/2025
* DESCRIPTION: This script makes the Address Subrecord's Field 'Disabled' when Custom is selected in shipingaddresslist field for US.
*****************************************************************************/

define(['N/currentRecord'], function (currentRecord) {

    function pageInit(context) {
        // console.log('pageInitTriggered');

        var rec = currentRecord.get();
    
        var isCustom = rec.getValue('custrecord_c101805_address_active');
        // console.log("isCustom: ", isCustom);

        if (isCustom == true) {

            var fieldsToDisable = [
                'isresidential',
                'country', 'zip', 'state', 'city', 'addr1', 'addr2', 'addr3',
                'addressee',  'addrphone', 'custrecord_crw_category', 'custrecord_crw_industry',
                'custrecord_crw_channel', 'custrecord_crw_submarket', 'custrecord_crw_endmarket',
                'custrecord_crw_territory', 'custrecord_crw_salesrep', 'customer_address_id',
                'custrecord_crw_company_name', 'custrecord_crw_salesforce_id', 'custrecord_crw_custadd_id',
                'custrecord_crw_sfintmessage', 'custrecord_crw_sfsync_lrd', 'custrecord_crw_102944_inactive',
                'custrecord_crw_territory_master', 'custrecord_ava_customergstin',
                'custrecordcrw_need_to_update_transaction', 'addrtext', 'override', 'entity'
            ];

            

            for (var i = 0; i < fieldsToDisable.length; i++) {
                try {
                    var f = rec.getField({ fieldId: fieldsToDisable[i] });
                    if (f) f.isDisabled = true;
                }
                
                catch (e) {
                    // console.log('Skip field: ' + fieldsToDisable[i]);
                }
            }

            // console.log('All fields set to inline (disabled) on address form.');
        }
    }

    return {
        pageInit: pageInit
    };
});
