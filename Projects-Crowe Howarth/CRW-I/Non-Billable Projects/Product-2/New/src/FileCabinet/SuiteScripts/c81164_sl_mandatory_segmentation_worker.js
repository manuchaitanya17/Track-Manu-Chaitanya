/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/query'],
    (query) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */

        const PAGE_SIZE = 1000;
        const onRequest = (scriptContext) => {

            if (scriptContext.request.method !== 'GET') {
                return;
            }


            let accountMap = {};

            let accountSql = `
            SELECT
                id,
                custrecord_81164_dep_mandatory     AS isdept,
                custrecord_81164_location_mandatory AS islocate,
                custrecord_81164_ms_mandatory      AS ismarket
            FROM account
            ORDER BY id
        `;

            let accountPaged = query.runSuiteQLPaged({
                query: accountSql,
                pageSize: PAGE_SIZE
            });

            accountPaged.pageRanges.forEach(function (pageRange) {
                let page = accountPaged.fetch({ index: pageRange.index });

                page.data.asMappedResults().forEach(function (row) {
                    accountMap[row.id] = {
                        dept: row.isdept === 'T',
                        location: row.islocate === 'T',
                        market: row.ismarket === 'T'
                    };
                });
            });

            let itemAccountMap = {};

            let itemSql = `
            SELECT
                i.id             AS itemid,
                i.incomeaccount  AS incomeaccount,
                i.expenseaccount AS expenseaccount,
               
            FROM item i
            WHERE i.isinactive = 'F'
            ORDER BY i.id
        `;

            let itemPaged = query.runSuiteQLPaged({
                query: itemSql,
                pageSize: PAGE_SIZE
            });

            log.debug(itemPaged)

            itemPaged.pageRanges.forEach(function (pageRange) {
                let page = itemPaged.fetch({ index: pageRange.index });
                log.debug(page)

                page.data.asMappedResults().forEach(function (row) {
                    itemAccountMap[row.itemid] = {
                        income: row.incomeaccount || null,
                        expense: row.expenseaccount || null,
                      
                    };
                });
            });


            let responseObj = {
                ACCOUNT_RULES: accountMap,
                ITEM_RULES: itemAccountMap
            };

            scriptContext.response.setHeader({
                name: 'Content-Type',
                value: 'application/json'
            });

            scriptContext.response.write(JSON.stringify(responseObj));
        };


        return { onRequest }

    });
