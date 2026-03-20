/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
/*****************************************************************************
 *  * Copyright (c) 2021 - Present Crowe LLP - All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Crowe LLP. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered with Crowe LLP.
*
* FILE NAME: c106392_Sync_Customer_SF_to_NS.js
* DEVOPS TASK: ENH 106392, DT 106393
* AUTHOR: Manu Chaitanya
* DATE CREATED: 15/July/2025
* DESCRIPTION: This Script pulls data from Salesforce to NetSuite. It makes updates to 5 fields in NS.
*****************************************************************************/

define(['N/record', 'N/log', 'N/query'], function (record, log, query) {

    function getCategoryIdByName(categoryName) {
        const categoryMap = {
            "Core Account": 2,
            "Development": 3,
            "Development Account": 9,
            "Krayden": 8,
            "Lead Source": 4,
            "Strategic Account": 1,
            "Tier 1 Reseller": 5,
            "Tier 2 Reseller": 6,
            "Tier 3 Reseller": 7,
            "Fail test": 10
        };

        return categoryMap[categoryName] || null;
    }

    function getCategoryID(categoryName) {
        var categoryID = null;
        var sql = "select id, name from customerCategory where name = '" + categoryName + "' and isInactive = 'F' '";
        var result = query.runSuiteQL({
            query: sql
        }).asMappedResults();

        log.debug('Categoty Result', result);
        log.debug('Customer Result.length', result.length);

        if (result && result != null && result != '' && result.length > 0) {
            categoryID = result[0].id;
            log.debug("Category ID : ", categoryID);
        }
        else {
            log.debug("Category Not Found of : ", categoryName);
        }
        return categoryID;
    }


    function doPost(requestBody) {
        try {
            log.debug('Received Payload', requestBody);

            var customerId = requestBody.internalId;
            var sfId = requestBody.salesforceId;
            var categoryId = getCategoryID(requestBody.categoryName);

            if (!customerId || !sfId) {
                throw new Error('Both internalId and sfId are required');
            }

            var customerRec = record.load({
                type: record.Type.CUSTOMER,
                id: customerId
            });

            var parentCustomer = (customerRec.getValue('custentity_crw_customeracctype') == 2);

            if (parentCustomer) {

                customerRec.setValue({ fieldId: 'custentity_95539_channel', value: requestBody.channelName });

                if (categoryId != null || categoryId || categoryId == "") {
                    customerRec.setValue({ fieldId: 'category', value: categoryId });
                    customerRec.setValue({ fieldId: 'custentity_crw_100062_sfint_errormessage', value: "" });
                    customerRec.setValue({ fieldId: 'custentity_c106392_haserror', value: false });
                    log.debug("Category Changed!");
                }
                else {
                    customerRec.setValue({ fieldId: 'custentity_crw_100062_sfint_errormessage', value: "Category ID not present on NetSuite!" });
                    customerRec.setValue({ fieldId: 'custentity_c106392_haserror', value: true });
                    log.debug("Category Not Changed!");
                }

                customerRec.save();
                return;
            }


            var addressCount = customerRec.getLineCount({ sublistId: 'addressbook' });
            log.debug("Lines", addressCount);
            var matchFound = false;

            for (var i = 0; i < addressCount; i++) {
                var addressSubrecord = customerRec.getSublistSubrecord({
                    sublistId: 'addressbook',
                    fieldId: 'addressbookaddress',
                    line: i
                });

                var currentSfId = addressSubrecord.getValue({
                    fieldId: 'custrecord_crw_salesforce_id'
                });
                log.debug("currentSfId", currentSfId);

                if (currentSfId === sfId) {
                    log.debug("Found the Address Record.")


                    addressSubrecord.setValue({ fieldId: 'custrecord_crw_submarket', value: requestBody.subMarketName });


                    addressSubrecord.setValue({ fieldId: 'custrecord_crw_endmarket', value: requestBody.endMarket });


                    addressSubrecord.setValue({ fieldId: 'custrecord_crw_industry', value: requestBody.industryName });


                    var isDefaultBilling = customerRec.getSublistValue({
                        sublistId: 'addressbook',
                        fieldId: 'defaultbilling',
                        line: i
                    });

                    if (isDefaultBilling) {
                        log.debug("Is Defaulting!");

                        customerRec.setValue({ fieldId: 'custentity_95539_channel', value: requestBody.channelName });

                        if (categoryId != null || categoryId || categoryId == "") {
                            customerRec.setValue({ fieldId: 'category', value: categoryId });
                            customerRec.setValue({ fieldId: 'custentity_crw_100062_sfint_errormessage', value: "" });
                            customerRec.setValue({ fieldId: 'custentity_c106392_haserror', value: false });
                            log.debug("Category Changed!");
                        }
                        else {
                            customerRec.setValue({ fieldId: 'custentity_crw_100062_sfint_errormessage', value: "Category ID not present on NetSuite!" });
                            customerRec.setValue({ fieldId: 'custentity_c106392_haserror', value: true });
                            log.debug("Category Not Changed!");
                        }
                    }

                    matchFound = true;
                    break;
                }
            }

            if (!matchFound) {
                throw new Error('No matching address subrecord found with the provided Salesforce ID');
            }

            customerRec.save();

            return { success: true, message: 'Customer address subrecord updated successfully' };

        }
        catch (e) {
            log.error('RESTlet Error', e.message);
            return { success: false, error: e.message };
        }
    }

    return {
        post: doPost
    };
});
