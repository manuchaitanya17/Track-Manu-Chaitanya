/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
/*****************************************************************************
 *  * Copyright (c) 2021 - Present Crowe LLP - All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Crowe LLP. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered with Crowe LLP.
*
* FILE NAME: _c100414_set_sub_currency_on_vendor.js
* DEVOPS TASK   ENH/100414
* AUTHOR: Gursheel Mkahija
* DATE CREATED: 27/05/2025
* DESCRIPTION: This script sets subsidiaries and currencies on vendor creation.
* REVISION HISTORY   
*============================================================================                  
*****************************************************************************/ 
define(['N/query', 'N/log'], (query, log) => {

    function beforeSubmit(context) {
        if (context.type !== context.UserEventType.CREATE) return;

        const vendor = context.newRecord;
        const primarySubsidiaryId = parseInt(vendor.getValue({ fieldId: 'subsidiary' }), 10);

        const existingSubsidiaryIds = new Set();
        const existingCurrencyIds = new Set();
       
        const subCount = vendor.getLineCount({ sublistId: 'submachine' });
        for (let i = 0; i < subCount; i++) {
            const subId = parseInt(vendor.getSublistValue({
                sublistId: 'submachine',
                fieldId: 'subsidiary',
                line: i
            }), 10);
            if (!isNaN(subId)) existingSubsidiaryIds.add(subId);
        }
      
        const currencyCount = vendor.getLineCount({ sublistId: 'currency' });
        for (let i = 0; i < currencyCount; i++) {
            const currencyId = parseInt(vendor.getSublistValue({
                sublistId: 'currency',
                fieldId: 'currency',
                line: i
            }), 10);
            if (!isNaN(currencyId)) existingCurrencyIds.add(currencyId);
        }

        // 1. Fetch valid subsidiaries
        const subSql = `
            SELECT id, name
            FROM subsidiary
            WHERE isinactive = 'F' AND iselimination = 'F'
        `;

        let subsidiaries;
        try {
            subsidiaries = query.runSuiteQL({ query: subSql }).asMappedResults();
        } catch (e) {
            log.error('Subsidiary query failed', e.message);
            return;
        }

        // 2. Fetch all active currencies
        const currencySql = `SELECT id FROM currency WHERE isinactive = 'F'`;

        let currencies;
        try {
            currencies = query.runSuiteQL({ query: currencySql }).asMappedResults();
        } catch (e) {
            log.error('Currency query failed', e.message);
            return;
        }

      
        let subInsertIndex = subCount;
        for (const row of subsidiaries) {
            const subId = parseInt(row.id, 10);
            const name = row.name.toLowerCase();

            if (subId === primarySubsidiaryId || existingSubsidiaryIds.has(subId)) continue;

            try {
                vendor.insertLine({ sublistId: 'submachine', line: subInsertIndex });
                vendor.setSublistValue({
                    sublistId: 'submachine',
                    fieldId: 'subsidiary',
                    line: subInsertIndex,
                    value: subId
                });
                subInsertIndex++;
            } catch (e) {
                log.error(`Skipping subsidiary ${subId}`, e.message);
            }
        }

        // Insert all  currencies
        let currencyInsertIndex = currencyCount;
        for (const row of currencies) {
            const currencyId = parseInt(row.id, 10);
            if (existingCurrencyIds.has(currencyId)) continue;

            try {
                vendor.insertLine({ sublistId: 'currency', line: currencyInsertIndex });
                vendor.setSublistValue({
                    sublistId: 'currency',
                    fieldId: 'currency',
                    line: currencyInsertIndex,
                    value: currencyId
                });
                currencyInsertIndex++;
            } catch (e) {
                log.error(`Skipping currency ${currencyId}`, e.message);
            }
        }
    }

    return { beforeSubmit };
});
