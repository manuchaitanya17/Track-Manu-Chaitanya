/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/runtime', 'N/query', 'N/error', 'N/log'],

    (runtime, query, error, log) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */

        function getAccountRules() {

            let sql = `
        SELECT
            id,
            custrecord_81164_dep_mandatory AS isdept,
            custrecord_81164_location_mandatory AS islocate,
            custrecord_81164_ms_mandatory AS ismarket
        FROM
            account
    `;

            let results = query.runSuiteQL({
                query: sql
            }).asMappedResults();

            let map = {};

            results.forEach(function (row) {
                map[row.id] = {
                    dept: row.isdept === 'T',
                    location: row.islocate === 'T',
                    market: row.ismarket === 'T'
                };
            });


            return map;
        }


        const validateLineSublist = (rec, sublistId, ACCOUNT_RULES) => {

            let lineCount = rec.getLineCount({ sublistId: sublistId });

            for (let i = 0; i < lineCount; i++) {

                let accountId = rec.getSublistValue({
                    sublistId: sublistId,
                    fieldId: 'account',
                    line: i
                });




                if (!accountId || !ACCOUNT_RULES[accountId]) {
                    continue;
                }

                let rules = ACCOUNT_RULES[accountId];
                log.debug("rules", rules)
                if (rules.dept) {
                    let dept = rec.getSublistValue({
                        sublistId: sublistId,
                        fieldId: 'department',
                        line: i
                    });
                    log.debug("dept", dept)
                    if (!dept) {
                        throw error.create({
                            name: 'SEGMENT_REQUIRED',
                            message: 'You are entering a transaction for an account which requires department. Please ensure the segment is populated before continuing.'

                        });
                    }
                }

                if (rules.location) {
                    let location = rec.getSublistValue({
                        sublistId: sublistId,
                        fieldId: 'location',
                        line: i
                    });

                    if (!location) {
                        throw error.create({
                            name: 'SEGMENT_REQUIRED',
                            message: 'You are entering a transaction for an account which requires location. Please ensure the segment is populated before continuing.'
                        });
                    }
                }

                if (rules.market) {
                    let market = rec.getSublistValue({
                        sublistId: sublistId,
                        fieldId: 'class',
                        line: i
                    });

                    if (!market) {
                        throw error.create({
                            name: 'SEGMENT_REQUIRED',
                            message: 'You are entering a transaction for an account which requires market sector. Please ensure the segment is populated before continuing.'
                        });

                    }
                }
            }
        }

        const validateitemLinecreditmemo = (rec, sublistId, ACCOUNT_RULES, expense) => {

            let itemIds = {};

            let lineCount = rec.getLineCount({ sublistId: sublistId });

            for (let i = 0; i < lineCount; i++) {
                let itemId = rec.getSublistValue({
                    sublistId: sublistId,
                    fieldId: 'item',
                    line: i
                });

                if (itemId) {
                    itemIds[itemId] = true;
                }
            }


            let ids = Object.keys(itemIds);

            if (!ids.length) return;

            let sql = `
    SELECT
        i.id AS itemid,
        i.incomeaccount,
        i.expenseaccount
    FROM item i
    WHERE i.id IN (${ids.join(',')})
`;

            let results = query.runSuiteQL({ query: sql }).asMappedResults();

            let ITEM_ACCOUNT_MAP = {};

            results.forEach(function (r) {
                ITEM_ACCOUNT_MAP[r.itemid] = {
                    income: r.incomeaccount,
                    expense: r.expenseaccount

                };
            });



            for (let i = 0; i < lineCount; i++) {

                let itemId = rec.getSublistValue({
                    sublistId: sublistId,
                    fieldId: 'item',
                    line: i
                });

                if (!itemId || !ITEM_ACCOUNT_MAP[itemId]) {
                    continue;
                }


                let accountId
                if (expense) {
                    accountId = ITEM_ACCOUNT_MAP[itemId].expense;
                } else {
                    accountId = ITEM_ACCOUNT_MAP[itemId].income;
                }

                if (!accountId || !ACCOUNT_RULES[accountId]) {
                    continue;
                }

                let rules = ACCOUNT_RULES[accountId];

                if (rules.dept) {
                    let dept = rec.getValue({

                        fieldId: 'department',

                    });
                    if (!dept) {
                        throw error.create({
                            name: 'SEGMENT_REQUIRED',
                            message:
                                'Line ' + (i + 1) +
                                ': Department is mandatory for the selected account.'
                        });
                    }
                }

                if (rules.location) {
                    let location = rec.getValue({
                        fieldId: 'location',
                    });
                    if (!location) {
                        throw error.create({
                            name: 'SEGMENT_REQUIRED',
                            message:
                                'Line ' + (i + 1) +
                                ': Location is mandatory for the selected account.'
                        });
                    }
                }

                if (rules.market) {
                    let market = rec.getValue({
                        fieldId: 'class',
                    });
                    if (!market) {
                        throw error.create({
                            name: 'SEGMENT_REQUIRED',
                            message:
                                'Line ' + (i + 1) +
                                ': Market Sector is mandatory for the selected account.'
                        });
                    }
                }
            }





        }


        const validateBodyFieldsUE = (rec, ACCOUNT_RULES, accountId, accountLabel) => {
            if (!accountId || !ACCOUNT_RULES[accountId]) return;

            const rules = ACCOUNT_RULES[accountId];

            if (rules.dept) {
                const dept = rec.getValue({ fieldId: 'department' });
                if (!dept) {
                    throw error.create({
                        name: 'SEGMENT_REQUIRED',
                        message:
                            `You are entering a transaction for ${accountLabel} which requires Department. ` +
                            `Please ensure the segment is populated before continuing.`
                    });
                }
            }

            if (rules.location) {
                const loc = rec.getValue({ fieldId: 'location' });
                if (!loc) {
                    throw error.create({
                        name: 'SEGMENT_REQUIRED',
                        message:
                            `You are entering a transaction for ${accountLabel} which requires Location. ` +
                            `Please ensure the segment is populated before continuing.`
                    });
                }
            }

            if (rules.market) {
                const market = rec.getValue({ fieldId: 'class' });
                if (!market) {
                    throw error.create({
                        name: 'SEGMENT_REQUIRED',
                        message:
                            `You are entering a transaction for ${accountLabel} which requires Market Sector. ` +
                            `Please ensure the segment is populated before continuing.`
                    });
                }
            }
        };



        const validateitemLineSublist = (rec, sublistId, ACCOUNT_RULES, expense) => {

            let itemIds = {};

            let lineCount = rec.getLineCount({ sublistId: sublistId });

            for (let i = 0; i < lineCount; i++) {
                let itemId = rec.getSublistValue({
                    sublistId: sublistId,
                    fieldId: 'item',
                    line: i
                });

                if (itemId) {
                    itemIds[itemId] = true;
                }
            }


            let ids = Object.keys(itemIds);

            if (!ids.length) return;

            let sql = `
    SELECT
        i.id AS itemid,
        i.incomeaccount,
        i.expenseaccount
    FROM item i
    WHERE i.id IN (${ids.join(',')})
`;

            let results = query.runSuiteQL({ query: sql }).asMappedResults();

            let ITEM_ACCOUNT_MAP = {};

            results.forEach(function (r) {
                ITEM_ACCOUNT_MAP[r.itemid] = {
                    income: r.incomeaccount,
                    expense: r.expenseaccount

                };
            });



            for (let i = 0; i < lineCount; i++) {

                let itemId = rec.getSublistValue({
                    sublistId: sublistId,
                    fieldId: 'item',
                    line: i
                });

                if (!itemId || !ITEM_ACCOUNT_MAP[itemId]) {
                    continue;
                }


                let accountId
                if (expense) {
                    accountId = ITEM_ACCOUNT_MAP[itemId].expense;
                } else {
                    accountId = ITEM_ACCOUNT_MAP[itemId].income;
                }

                if (!accountId || !ACCOUNT_RULES[accountId]) {
                    continue;
                }

                let rules = ACCOUNT_RULES[accountId];

                if (rules.dept) {
                    let dept = rec.getSublistValue({
                        sublistId: sublistId,
                        fieldId: 'department',
                        line: i
                    });
                    if (!dept) {
                        throw error.create({
                            name: 'SEGMENT_REQUIRED',
                            message:
                                'Line ' + (i + 1) +
                                ': Department is mandatory for the selected account.'
                        });
                    }
                }

                if (rules.location) {
                    let location = rec.getSublistValue({
                        sublistId: sublistId,
                        fieldId: 'location',
                        line: i
                    });
                    if (!location) {
                        throw error.create({
                            name: 'SEGMENT_REQUIRED',
                            message:
                                'Line ' + (i + 1) +
                                ': Location is mandatory for the selected account.'
                        });
                    }
                }

                if (rules.market) {
                    let market = rec.getSublistValue({
                        sublistId: sublistId,
                        fieldId: 'class',
                        line: i
                    });
                    if (!market) {
                        throw error.create({
                            name: 'SEGMENT_REQUIRED',
                            message:
                                'Line ' + (i + 1) +
                                ': Market Sector is mandatory for the selected account.'
                        });
                    }
                }
            }





        }

        const validateBodyFields = (rec, ACCOUNT_RULES) => {
            let accountId = rec.getValue({
                fieldId: 'account'
            });


            if (!accountId || !ACCOUNT_RULES[accountId]) {
                return;
            }

            let rules = ACCOUNT_RULES[accountId];

            if (rules.dept) {
                let dept = rec.getValue({ fieldId: 'department' });

                if (!dept) {
                    throw error.create({
                        name: 'SEGMENT_REQUIRED',
                        message: 'You are entering a transaction for an account which requires department. Please ensure the segment is populated before continuing.'

                    });
                }
            }

            if (rules.location) {
                let location = rec.getValue({ fieldId: 'location' });

                if (!location) {
                    throw error.create({
                        name: 'SEGMENT_REQUIRED',
                        message: 'You are entering a transaction for an account which requires location. Please ensure the segment is populated before continuing.'
                    });
                }
            }

            if (rules.market) {
                let market = rec.getValue({ fieldId: 'class' });

                if (!market) {
                    throw error.create({
                        name: 'SEGMENT_REQUIRED',
                        message: 'You are entering a transaction for an account which requires market sector. Please ensure the segment is populated before continuing.'
                    });
                }
            }
        }

        const beforeSubmit = (scriptContext) => {
            log.debug(runtime.executionContext)
            if (runtime.executionContext !== runtime.ContextType.CSV_IMPORT) {
                return;
            }

            let rec = scriptContext.newRecord;
            let ACCOUNT_RULES = getAccountRules();
            log.debug("rules", ACCOUNT_RULES)
            if (rec.type == 'journalentry') {

                const decidingVal = rec.getValue({
                    fieldId: 'custbody_81164_exclude_seg_val'
                });


                if (decidingVal) {
                    return;
                }

                validateLineSublist(rec, 'line', ACCOUNT_RULES);

            } else if (rec.type === 'advintercompanyjournalentry') {

                validateLineSublist(rec, 'line', ACCOUNT_RULES);

            } else if (rec.type === 'vendorbill') {
                validateBodyFields(rec, ACCOUNT_RULES);
                validateLineSublist(rec, 'expense', ACCOUNT_RULES);
                validateitemLineSublist(rec, 'item', ACCOUNT_RULES, true)

            } else if (rec.type === 'vendorcredit') {
                validateBodyFields(rec, ACCOUNT_RULES);
                validateLineSublist(rec, 'expense', ACCOUNT_RULES);
                validateitemLineSublist(rec, 'item', ACCOUNT_RULES, true)
            } else if (rec.type === 'vendorpayment') {

                validateBodyFields(rec, ACCOUNT_RULES);
            } else if (rec.type === 'invoice') {

                validateBodyFields(rec, ACCOUNT_RULES);
                validateitemLineSublist(rec, 'item', ACCOUNT_RULES, false)
            } else if (rec.type === 'creditmemo') {
                validateBodyFields(rec, ACCOUNT_RULES);
                validateitemLineSublist(rec, 'item', ACCOUNT_RULES, false)
            } else if (rec.type === 'customerpayment') {

                let accountId = rec.getValue({ fieldId: 'undepfunds' });
                if (accountId == true || accountId == 'T') {
                    accountId = 122;
                } else {
                    accountId = rec.getValue({ fieldId: 'account' });
                }

                validateBodyFieldsUE(rec, ACCOUNT_RULES, accountId, 'an account');

                const araccountId = rec.getValue({ fieldId: 'aracct' });
                validateBodyFieldsUE(rec, ACCOUNT_RULES, araccountId, 'an AR account');
            }

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {

        }

        return { beforeLoad, beforeSubmit }

    });
