/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/url', 'N/https'],

    function (url, https) {

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */


        const makeMandatoryIfAllowed = (rec, fieldId, sublist) => {
            try {
                let field = rec.getCurrentSublistField({
                    sublistId: sublist,
                    fieldId: fieldId
                });


                if (field.isDisabled) {
                    return false;
                }
                if (field.isMandatory) {
                    return false;
                }
                field.isMandatory = true;
                return true;

            } catch (e) {
                return false;
            }
        }

        function isFieldDisabled(rec, fieldId, sublist) {
            try {
                let field = rec.getCurrentSublistField({
                    sublistId: sublist,
                    fieldId: fieldId
                });
                return field.isDisabled === true;
            } catch (e) {
                return false;
            }
        }

        function isBodyFieldDisabled(rec, fieldId) {
            try {
                let field = rec.getField({ fieldId: fieldId });
                return field.isDisabled == true;
            } catch (e) {
                return false;
            }
        }

        const getAccountData = () => {

            let suiteletUrl = url.resolveScript({
                scriptId: 'customscript_c81164_sl_mandatory_segment',
                deploymentId: 'customdeploy_c81164_sl_mandatory_segmend',
                returnExternalUrl: false
            });

            let response = https.get({
                url: suiteletUrl
            });

            if (response.code !== 200) {
                return {};
            }

            return JSON.parse(response.body);
        }

        let ACCOUNT_RULES = {}
        let ITEM_RULES = {}

        function pageInit(scriptContext) {
            // alert('[paeinit running')
            // console.log("pageinit running");

            const data = getAccountData()
            ACCOUNT_RULES = data.ACCOUNT_RULES
            ITEM_RULES = data.ITEM_RULES
            console.log(JSON.stringify(ACCOUNT_RULES));
            console.log(JSON.stringify(ITEM_RULES));




        }

        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        function fieldChanged(scriptContext) {
            console.log("fieldchnaged running");

            const rec = scriptContext.currentRecord;


            if (rec.type == 'journalentry') {
                if (scriptContext.sublistId == 'line' && scriptContext.fieldId == 'account') {
                    let sublistId = scriptContext.sublistId
                    let accountId = rec.getCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'account'
                    });
                    console.log('acount', accountId);


                    if (!accountId || !ACCOUNT_RULES[accountId]) {
                        console.log("ruls not found");

                        return;
                    }

                    let rules = ACCOUNT_RULES[accountId];
                    let requiredSegments = [];

                    console.log('rukes', rules);

                    if (rules.dept) {
                        console.log('depart');

                        if (makeMandatoryIfAllowed(rec, 'department', sublistId)) {
                            requiredSegments.push('Department');
                        }
                    }

                    if (rules.location) {
                        console.log('locatio');

                        if (makeMandatoryIfAllowed(rec, 'location', sublistId)) {
                            requiredSegments.push('Location');
                        }
                    }

                    if (rules.market) {
                        console.log('marke');

                        if (makeMandatoryIfAllowed(rec, 'class', sublistId)) {
                            requiredSegments.push('Market Sector');
                        }
                    }

                    if (requiredSegments.length > 0) {
                        console.log(JSON.stringify(requiredSegments));

                    }
                }

            } else if (rec.type == 'advintercompanyjournalentry') {
                if (scriptContext.sublistId == 'line' && scriptContext.fieldId == 'account') {
                    let sublistId = scriptContext.sublistId
                    let accountId = rec.getCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'account'
                    });
                    console.log('acount', accountId);


                    if (!accountId || !ACCOUNT_RULES[accountId]) {
                        console.log("ruls not found");

                        return;
                    }

                    let rules = ACCOUNT_RULES[accountId];
                    let requiredSegments = [];

                    console.log('rukes', rules);

                    if (rules.dept) {
                        console.log('depart');

                        if (makeMandatoryIfAllowed(rec, 'department', sublistId)) {
                            requiredSegments.push('Department');
                        }
                    }

                    if (rules.location) {
                        console.log('locatio');

                        if (makeMandatoryIfAllowed(rec, 'location', sublistId)) {
                            requiredSegments.push('Location');
                        }
                    }

                    if (rules.market) {
                        console.log('marke');

                        if (makeMandatoryIfAllowed(rec, 'class', sublistId)) {
                            requiredSegments.push('Market Sector');
                        }
                    }

                    if (requiredSegments.length > 0) {
                        console.log(JSON.stringify(requiredSegments));

                    }
                }
            } else if (rec.type == 'vendorbill') {
                if (scriptContext.sublistId == 'expense' && scriptContext.fieldId == 'account') {
                    let sublistId = scriptContext.sublistId
                    let accountId = rec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'account'
                    });
                    console.log('acount', accountId);


                    if (!accountId || !ACCOUNT_RULES[accountId]) {
                        console.log("ruls not found");

                        return;
                    }

                    let rules = ACCOUNT_RULES[accountId];
                    let requiredSegments = [];

                    console.log('rukes', rules);

                    if (rules.dept) {
                        console.log('depart');

                        if (makeMandatoryIfAllowed(rec, 'department', sublistId)) {
                            requiredSegments.push('Department');
                        }
                    }

                    if (rules.location) {
                        console.log('locatio');

                        if (makeMandatoryIfAllowed(rec, 'location', sublistId)) {
                            requiredSegments.push('Location');
                        }
                    }

                    if (rules.market) {
                        console.log('marke');

                        if (makeMandatoryIfAllowed(rec, 'class', sublistId)) {
                            requiredSegments.push('Market Sector');
                        }
                    }

                    if (requiredSegments.length > 0) {
                        console.log(JSON.stringify(requiredSegments));

                    }
                }
            } else if (rec.type == 'vendorcredit') {
                if (scriptContext.sublistId == 'expense' && scriptContext.fieldId == 'account') {
                    let sublistId = scriptContext.sublistId
                    let accountId = rec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'account'
                    });
                    console.log('acount', accountId);


                    if (!accountId || !ACCOUNT_RULES[accountId]) {
                        console.log("ruls not found");

                        return;
                    }

                    let rules = ACCOUNT_RULES[accountId];
                    let requiredSegments = [];

                    console.log('rukes', rules);

                    if (rules.dept) {
                        console.log('depart');

                        if (makeMandatoryIfAllowed(rec, 'department', sublistId)) {
                            requiredSegments.push('Department');
                        }
                    }

                    if (rules.location) {
                        console.log('locatio');

                        if (makeMandatoryIfAllowed(rec, 'location', sublistId)) {
                            requiredSegments.push('Location');
                        }
                    }

                    if (rules.market) {
                        console.log('marke');

                        if (makeMandatoryIfAllowed(rec, 'class', sublistId)) {
                            requiredSegments.push('Market Sector');
                        }
                    }

                    if (requiredSegments.length > 0) {
                        console.log(JSON.stringify(requiredSegments));

                    }
                }
            } else if (rec.type == 'invoice') {
                if (scriptContext.sublistId == 'item' && scriptContext.fieldId == 'item') {
                    let sublistId = scriptContext.sublistId
                    let accountId = rec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'account'
                    });
                    console.log('acount', accountId);


                    if (!accountId || !ACCOUNT_RULES[accountId]) {
                        console.log("ruls not found");

                        return;
                    }

                    let rules = ACCOUNT_RULES[accountId];
                    let requiredSegments = [];

                    console.log('rukes', rules);

                    if (rules.dept) {
                        console.log('depart');

                        if (makeMandatoryIfAllowed(rec, 'department', sublistId)) {
                            requiredSegments.push('Department');
                        }
                    }

                    if (rules.location) {
                        console.log('locatio');

                        if (makeMandatoryIfAllowed(rec, 'location', sublistId)) {
                            requiredSegments.push('Location');
                        }
                    }

                    if (rules.market) {
                        console.log('marke');

                        if (makeMandatoryIfAllowed(rec, 'class', sublistId)) {
                            requiredSegments.push('Market Sector');
                        }
                    }

                    if (requiredSegments.length > 0) {
                        console.log(JSON.stringify(requiredSegments));

                    }
                }
            }







        }

        /**
         * Function to be executed when field is slaved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         *
         * @since 2015.2
         */
        function postSourcing(scriptContext) {

        }

        /**
         * Function to be executed after sublist is inserted, removed, or edited.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function sublistChanged(scriptContext) {

        }

        /**
         * Function to be executed after line is selected.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function lineInit(scriptContext) {

        }

        /**
         * Validation function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @returns {boolean} Return true if field is valid
         *
         * @since 2015.2
         */
        function validateField(scriptContext) {

        }
//jour, adv , bill 
        /**
         * Validation function to be executed when sublist line is committed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateLine(scriptContext) {
            let rec = scriptContext.currentRecord;

            if (rec.type === 'journalentry') {
                if (scriptContext.sublistId == 'line') {

                    let accountId = rec.getCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'account'
                    });
                    console.log('acount', accountId);

                    if (!accountId || !ACCOUNT_RULES[accountId]) {
                        return true;
                    }

                    let rules = ACCOUNT_RULES[accountId];
                    console.log('rules', rules);
                    if (rules.dept && !isFieldDisabled(rec, 'department', scriptContext.sublistId)) {
                        let dept = rec.getCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'department'
                        });
                        console.log('dept', dept);
                        if (!dept) {
                            alert('You are entering a transaction for an account which requires department. Please ensure the segment is populated before continuing.');
                            return false;
                        }
                    }

                    if (rules.location && !isFieldDisabled(rec, 'location', scriptContext.sublistId)) {
                        let location = rec.getCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'location'
                        });
                        console.log('location', location);
                        if (!location) {
                            alert('You are entering a transaction for an account which requires location. Please ensure the segment is populated before continuing.');
                            return false;
                        }
                    }

                    if (rules.market && !isFieldDisabled(rec, 'class', scriptContext.sublistId)) {
                        let market = rec.getCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'class'
                        });
                        console.log('market', market);
                        if (!market) {
                            alert('You are entering a transaction for an account which requires market sector. Please ensure the segment is populated before continuing.');
                            return false;
                        }
                    }

                }

            } else if (rec.type === 'advintercompanyjournalentry') {
                if (scriptContext.sublistId == 'line') {

                    let accountId = rec.getCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'account'
                    });
                    console.log('acount', accountId);

                    if (!accountId || !ACCOUNT_RULES[accountId]) {
                        return true;
                    }

                    let rules = ACCOUNT_RULES[accountId];
                    console.log('rules', rules);
                    if (rules.dept && !isFieldDisabled(rec, 'department', scriptContext.sublistId)) {
                        let dept = rec.getCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'department'
                        });
                        console.log('dept', dept);
                        if (!dept) {
                            alert('You are entering a transaction for an account which requires department. Please ensure the segment is populated before continuing.');
                            return false;
                        }
                    }

                    if (rules.location && !isFieldDisabled(rec, 'location', scriptContext.sublistId)) {
                        let location = rec.getCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'location'
                        });
                        console.log('location', location);
                        if (!location) {
                            alert('You are entering a transaction for an account which requires location. Please ensure the segment is populated before continuing.');
                            return false;
                        }
                    }

                    if (rules.market && !isFieldDisabled(rec, 'class', scriptContext.sublistId)) {
                        let market = rec.getCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'class'
                        });
                        console.log('market', market);
                        if (!market) {
                            alert('You are entering a transaction for an account which requires market sector. Please ensure the segment is populated before continuing.');
                            return false;
                        }
                    }

                }
            } else if (rec.type === 'vendorbill') {
                if (scriptContext.sublistId == 'expense') {

                    let accountId = rec.getCurrentSublistValue({
                        sublistId: 'expense',
                        fieldId: 'account'
                    });
                    console.log('acount', accountId);

                    if (!accountId || !ACCOUNT_RULES[accountId]) {
                        return true;
                    }

                    let rules = ACCOUNT_RULES[accountId];
                    console.log('rules', rules);
                    if (rules.dept && !isFieldDisabled(rec, 'department', scriptContext.sublistId)) {
                        let dept = rec.getCurrentSublistValue({
                            sublistId: 'expense',
                            fieldId: 'department'
                        });
                        console.log('dept', dept);
                        if (!dept) {
                            alert('You are entering a transaction for an account which requires department. Please ensure the segment is populated before continuing.');
                            return false;
                        }
                    }

                    if (rules.location && !isFieldDisabled(rec, 'location', scriptContext.sublistId)) {
                        let location = rec.getCurrentSublistValue({
                            sublistId: 'expense',
                            fieldId: 'location'
                        });
                        console.log('location', location);
                        if (!location) {
                            alert('You are entering a transaction for an account which requires location. Please ensure the segment is populated before continuing.');
                            return false;
                        }
                    }

                    if (rules.market && !isFieldDisabled(rec, 'class', scriptContext.sublistId)) {
                        let market = rec.getCurrentSublistValue({
                            sublistId: 'expense',
                            fieldId: 'class'
                        });
                        console.log('market', market);
                        if (!market) {
                            alert('You are entering a transaction for an account which requires market sector. Please ensure the segment is populated before continuing.');
                            return false;
                        }
                    }

                }
                if (scriptContext.sublistId == 'item') {

                    let itemId = rec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'item'
                    });
                    console.log('itemId', itemId);

                    console.log(ITEM_RULES[itemId]);

                    if (!itemId || !ITEM_RULES[itemId]) {
                        console.log("skippe item");

                        return true;
                    }

                    let accountId = ITEM_RULES[itemId].expense
                    console.log(accountId);


                    if (!accountId || !ACCOUNT_RULES[accountId]) {
                        console.log("skipped caccount");

                        return true;
                    }

                    let rules = ACCOUNT_RULES[accountId];
                    console.log('rules', rules);
                    if (rules.dept && !isFieldDisabled(rec, 'department', scriptContext.sublistId)) {
                        let dept = rec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'department'
                        });
                        console.log('dept', dept);
                        if (!dept) {
                            alert('You are entering a transaction for an account which requires department. Please ensure the segment is populated before continuing.');
                            return false;
                        }
                    }

                    if (rules.location && !isFieldDisabled(rec, 'location', scriptContext.sublistId)) {
                        let location = rec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'location'
                        });
                        console.log('location', location);
                        if (!location) {
                            alert('You are entering a transaction for an account which requires location. Please ensure the segment is populated before continuing.');
                            return false;
                        }
                    }

                    if (rules.market && !isFieldDisabled(rec, 'class', scriptContext.sublistId)) {
                        let market = rec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'class'
                        });
                        console.log('market', market);
                        if (!market) {
                            alert('You are entering a transaction for an account which requires market sector. Please ensure the segment is populated before continuing.');
                            return false;
                        }
                    }

                }
            } else if (rec.type === 'vendorcredit') {
                if (scriptContext.sublistId == 'expense') {

                    let accountId = rec.getCurrentSublistValue({
                        sublistId: 'expense',
                        fieldId: 'account'
                    });
                    console.log('acount', accountId);

                    if (!accountId || !ACCOUNT_RULES[accountId]) {
                        return true;
                    }

                    let rules = ACCOUNT_RULES[accountId];
                    console.log('rules', rules);
                    if (rules.dept && !isFieldDisabled(rec, 'department', scriptContext.sublistId)) {
                        let dept = rec.getCurrentSublistValue({
                            sublistId: 'expense',
                            fieldId: 'department'
                        });
                        console.log('dept', dept);
                        if (!dept) {
                            alert('You are entering a transaction for an account which requires department. Please ensure the segment is populated before continuing.');
                            return false;
                        }
                    }

                    if (rules.location && !isFieldDisabled(rec, 'location', scriptContext.sublistId)) {
                        let location = rec.getCurrentSublistValue({
                            sublistId: 'expense',
                            fieldId: 'location'
                        });
                        console.log('location', location);
                        if (!location) {
                            alert('You are entering a transaction for an account which requires location. Please ensure the segment is populated before continuing.');
                            return false;
                        }
                    }

                    if (rules.market && !isFieldDisabled(rec, 'class', scriptContext.sublistId)) {
                        let market = rec.getCurrentSublistValue({
                            sublistId: 'expense',
                            fieldId: 'class'
                        });
                        console.log('market', market);
                        if (!market) {
                            alert('You are entering a transaction for an account which requires market sector. Please ensure the segment is populated before continuing.');
                            return false;
                        }
                    }

                }
                if (scriptContext.sublistId == 'item') {

                    let itemId = rec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'item'
                    });
                    console.log('itemId', itemId);

                    console.log(ITEM_RULES[itemId]);

                    if (!itemId || !ITEM_RULES[itemId]) {
                        console.log("skippe item");

                        return true;
                    }

                    let accountId = ITEM_RULES[itemId].expense
                    console.log(accountId);


                    if (!accountId || !ACCOUNT_RULES[accountId]) {
                        console.log("skipped caccount");

                        return true;
                    }

                    let rules = ACCOUNT_RULES[accountId];
                    console.log('rules', rules);
                    if (rules.dept && !isFieldDisabled(rec, 'department', scriptContext.sublistId)) {
                        let dept = rec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'department'
                        });
                        console.log('dept', dept);
                        if (!dept) {
                            alert('You are entering a transaction for an account which requires department. Please ensure the segment is populated before continuing.');
                            return false;
                        }
                    }

                    if (rules.location && !isFieldDisabled(rec, 'location', scriptContext.sublistId)) {
                        let location = rec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'location'
                        });
                        console.log('location', location);
                        if (!location) {
                            alert('You are entering a transaction for an account which requires location. Please ensure the segment is populated before continuing.');
                            return false;
                        }
                    }

                    if (rules.market && !isFieldDisabled(rec, 'class', scriptContext.sublistId)) {
                        let market = rec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'class'
                        });
                        console.log('market', market);
                        if (!market) {
                            alert('You are entering a transaction for an account which requires market sector. Please ensure the segment is populated before continuing.');
                            return false;
                        }
                    }

                }
            } else if (rec.type === 'invoice') {
                if (scriptContext.sublistId == 'item') {

                    let itemId = rec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'item'
                    });
                    console.log('itemId', itemId);

                    console.log(ITEM_RULES[itemId]);

                    if (!itemId || !ITEM_RULES[itemId]) {
                        console.log("skippe item");

                        return true;
                    }

                    let accountId = ITEM_RULES[itemId].income
                    console.log(accountId);


                    if (!accountId || !ACCOUNT_RULES[accountId]) {
                        console.log("skipped caccount");

                        return true;
                    }

                    let rules = ACCOUNT_RULES[accountId];
                    console.log('rules', rules);
                    if (rules.dept && !isFieldDisabled(rec, 'department', scriptContext.sublistId)) {
                        let dept = rec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'department'
                        });
                        console.log('dept', dept);
                        if (!dept) {
                            alert('You are entering a transaction for an account which requires department. Please ensure the segment is populated before continuing.');
                            return false;
                        }
                    }

                    if (rules.location && !isFieldDisabled(rec, 'location', scriptContext.sublistId)) {
                        let location = rec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'location'
                        });
                        console.log('location', location);
                        if (!location) {
                            alert('You are entering a transaction for an account which requires location. Please ensure the segment is populated before continuing.');
                            return false;
                        }
                    }

                    if (rules.market && !isFieldDisabled(rec, 'class', scriptContext.sublistId)) {
                        let market = rec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'class'
                        });
                        console.log('market', market);
                        if (!market) {
                            alert('You are entering a transaction for an account which requires market sector. Please ensure the segment is populated before continuing.');
                            return false;
                        }
                    }

                }
            } else if (rec.type === 'creditmemo') {
                if (scriptContext.sublistId == 'item') {

                    let itemId = rec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'item'
                    });
                    console.log('itemId', itemId);

                    console.log(ITEM_RULES[itemId]);

                    if (!itemId || !ITEM_RULES[itemId]) {
                        console.log("skippe item");

                        return true;
                    }

                    let accountId = ITEM_RULES[itemId].income
                    console.log(accountId);


                    if (!accountId || !ACCOUNT_RULES[accountId]) {
                        console.log("skipped caccount");

                        return true;
                    }

                    let rules = ACCOUNT_RULES[accountId];
                    console.log('rules', rules);
                    if (rules.dept && !isFieldDisabled(rec, 'department', scriptContext.sublistId)) {
                        let dept = rec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'department'
                        });
                        console.log('dept', dept);
                        if (!dept) {
                            alert('You are entering a transaction for an account which requires department. Please ensure the segment is populated before continuing.');
                            return false;
                        }
                    }

                    if (rules.location && !isFieldDisabled(rec, 'location', scriptContext.sublistId)) {
                        let location = rec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'location'
                        });
                        console.log('location', location);
                        if (!location) {
                            alert('You are entering a transaction for an account which requires location. Please ensure the segment is populated before continuing.');
                            return false;
                        }
                    }

                    if (rules.market && !isFieldDisabled(rec, 'class', scriptContext.sublistId)) {
                        let market = rec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'class'
                        });
                        console.log('market', market);
                        if (!market) {
                            alert('You are entering a transaction for an account which requires market sector. Please ensure the segment is populated before continuing.');
                            return false;
                        }
                    }

                }
            }




            return true;

        }


        //tocheck if all script are imported
        // to see if cs filter tariff in cs
        /**
                 * Validation function to be executed when sublist line is inserted.
                 *
                 * @param {Object} scriptContext
                 * @param {Record} scriptContext.currentRecord - Current form record
                 * @param {string} scriptContext.sublistId - Sublist name
                 *
                 * @returns {boolean} Return true if sublist line is valid
                 *
                 * @since 2015.2
                 */
        function validateInsert(scriptContext) {

        }

        /**
         * Validation function to be executed when record is deleted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateDelete(scriptContext) {

        }

        /**
         * Validation function to be executed when record is saved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid
         *
         * @since 2015.2
         */
        function saveRecord(scriptContext) {
            let rec = scriptContext.currentRecord;

            if (rec.type == 'vendorpayment') {
                let accountId = rec.getValue({
                    fieldId: 'account'
                });

                if (!accountId || !ACCOUNT_RULES[accountId]) {
                    return true;
                }

                let rules = ACCOUNT_RULES[accountId];


                if (rules.dept && !isBodyFieldDisabled(rec, 'department')) {
                    let dept = rec.getValue({ fieldId: 'department' });
                    if (!dept) {
                        alert('You are entering a transaction for an account which requires department. Please ensure the segment is populated before continuing.');
                        return false;
                    }
                }


                if (rules.location && !isBodyFieldDisabled(rec, 'location')) {
                    let loc = rec.getValue({ fieldId: 'location' });
                    if (!loc) {
                        alert('You are entering a transaction for an account which requires location. Please ensure the segment is populated before continuing.');
                        return false;
                    }
                }


                if (rules.market && !isBodyFieldDisabled(rec, 'class')) {
                    let market = rec.getValue({ fieldId: 'class' });
                    if (!market) {
                        alert('You are entering a transaction for an account which requires market sector. Please ensure the segment is populated before continuing.');
                        return false;
                    }
                }

            } else if (rec.type == 'customerpayment') {

                var accountId = rec.getValue({ fieldId: 'undepfunds' });
                if (accountId == 'T') {
                    accountId = 122
                } else {
                    accountId = rec.getValue({ fieldId: 'account' });
                }
                console.log('account', accountId);

                if (accountId && ACCOUNT_RULES[accountId]) {

                    var rules = ACCOUNT_RULES[accountId];

                    console.log('rules', rules);
                    if (rules.dept && !isBodyFieldDisabled(rec, 'department')) {
                        var dept = rec.getValue({ fieldId: 'department' });
                        if (!dept) {
                            alert(
                                'You are entering a transaction for an account which requires department. ' +
                                'Please ensure the segment is populated before continuing.'
                            );
                            return false;
                        }
                    }

                    if (rules.location && !isBodyFieldDisabled(rec, 'location')) {
                        var loc = rec.getValue({ fieldId: 'location' });
                        if (!loc) {
                            alert(
                                'You are entering a transaction for an account which requires location. ' +
                                'Please ensure the segment is populated before continuing.'
                            );
                            return false;
                        }
                    }

                    if (rules.market && !isBodyFieldDisabled(rec, 'class')) {
                        var market = rec.getValue({ fieldId: 'class' });
                        if (!market) {
                            alert(
                                'You are entering a transaction for an account which requires market sector. ' +
                                'Please ensure the segment is populated before continuing.'
                            );
                            return false;
                        }
                    }
                }


                var araccountId = rec.getValue({ fieldId: 'aracct' });
                console.log('aracct', araccountId);

                if (araccountId && ACCOUNT_RULES[araccountId]) {

                    var arrules = ACCOUNT_RULES[araccountId];

                    console.log('rules', arrules);

                    if (arrules.dept && !isBodyFieldDisabled(rec, 'department')) {
                        var arDept = rec.getValue({ fieldId: 'department' });
                        if (!arDept) {
                            alert(
                                'You are entering a transaction for an AR account which requires department. ' +
                                'Please ensure the segment is populated before continuing.'
                            );
                            return false;
                        }
                    }

                    if (arrules.location && !isBodyFieldDisabled(rec, 'location')) {
                        var arLoc = rec.getValue({ fieldId: 'location' });
                        if (!arLoc) {
                            alert(
                                'You are entering a transaction for an AR account which requires location. ' +
                                'Please ensure the segment is populated before continuing.'
                            );
                            return false;
                        }
                    }

                    if (arrules.market && !isBodyFieldDisabled(rec, 'class')) {
                        var arMarket = rec.getValue({ fieldId: 'class' });
                        if (!arMarket) {
                            alert(
                                'You are entering a transaction for an AR account which requires market sector. ' +
                                'Please ensure the segment is populated before continuing.'
                            );
                            return false;
                        }
                    }
                }


            }  else if (rec.type == 'invoice') {
                let accountId = rec.getValue({
                    fieldId: 'account'
                });

                if (!accountId || !ACCOUNT_RULES[accountId]) {
                    return true;
                }

                let rules = ACCOUNT_RULES[accountId];


                if (rules.dept && !isBodyFieldDisabled(rec, 'department')) {
                    let dept = rec.getValue({ fieldId: 'department' });
                    if (!dept) {
                        alert('You are entering a transaction for an account which requires department. Please ensure the segment is populated before continuing.');
                        return false;
                    }
                }


                if (rules.location && !isBodyFieldDisabled(rec, 'location')) {
                    let loc = rec.getValue({ fieldId: 'location' });
                    if (!loc) {
                        alert('You are entering a transaction for an account which requires location. Please ensure the segment is populated before continuing.');
                        return false;
                    }
                }


                if (rules.market && !isBodyFieldDisabled(rec, 'class')) {
                    let market = rec.getValue({ fieldId: 'class' });
                    if (!market) {
                        alert('You are entering a transaction for an account which requires market sector. Please ensure the segment is populated before continuing.');
                        return false;
                    }
                }

            } else if (rec.type == 'creditmemo') {
                let accountId = rec.getValue({
                    fieldId: 'account'
                });

                if (!accountId || !ACCOUNT_RULES[accountId]) {
                    return true;
                }

                let rules = ACCOUNT_RULES[accountId];


                if (rules.dept && !isBodyFieldDisabled(rec, 'department')) {
                    let dept = rec.getValue({ fieldId: 'department' });
                    if (!dept) {
                        alert('You are entering a transaction for an account which requires department. Please ensure the segment is populated before continuing.');
                        return false;
                    }
                }


                if (rules.location && !isBodyFieldDisabled(rec, 'location')) {
                    let loc = rec.getValue({ fieldId: 'location' });
                    if (!loc) {
                        alert('You are entering a transaction for an account which requires location. Please ensure the segment is populated before continuing.');
                        return false;
                    }
                }


                if (rules.market && !isBodyFieldDisabled(rec, 'class')) {
                    let market = rec.getValue({ fieldId: 'class' });
                    if (!market) {
                        alert('You are entering a transaction for an account which requires market sector. Please ensure the segment is populated before continuing.');
                        return false;
                    }
                }

            } else if (rec.type == 'vendorcredit') {
                let accountId = rec.getValue({
                    fieldId: 'account'
                });

                if (!accountId || !ACCOUNT_RULES[accountId]) {
                    return true;
                }

                let rules = ACCOUNT_RULES[accountId];


                if (rules.dept && !isBodyFieldDisabled(rec, 'department')) {
                    let dept = rec.getValue({ fieldId: 'department' });
                    if (!dept) {
                        alert('You are entering a transaction for an account which requires department. Please ensure the segment is populated before continuing.');
                        return false;
                    }
                }


                if (rules.location && !isBodyFieldDisabled(rec, 'location')) {
                    let loc = rec.getValue({ fieldId: 'location' });
                    if (!loc) {
                        alert('You are entering a transaction for an account which requires location. Please ensure the segment is populated before continuing.');
                        return false;
                    }
                }


                if (rules.market && !isBodyFieldDisabled(rec, 'class')) {
                    let market = rec.getValue({ fieldId: 'class' });
                    if (!market) {
                        alert('You are entering a transaction for an account which requires market sector. Please ensure the segment is populated before continuing.');
                        return false;
                    }
                }

            } else if (rec.type == 'vendorbill') {
                let accountId = rec.getValue({
                    fieldId: 'account'
                });

                if (!accountId || !ACCOUNT_RULES[accountId]) {
                    return true;
                }

                let rules = ACCOUNT_RULES[accountId];


                if (rules.dept && !isBodyFieldDisabled(rec, 'department')) {
                    let dept = rec.getValue({ fieldId: 'department' });
                    if (!dept) {
                        alert('You are entering a transaction for an account which requires department. Please ensure the segment is populated before continuing.');
                        return false;
                    }
                }


                if (rules.location && !isBodyFieldDisabled(rec, 'location')) {
                    let loc = rec.getValue({ fieldId: 'location' });
                    if (!loc) {
                        alert('You are entering a transaction for an account which requires location. Please ensure the segment is populated before continuing.');
                        return false;
                    }
                }


                if (rules.market && !isBodyFieldDisabled(rec, 'class')) {
                    let market = rec.getValue({ fieldId: 'class' });
                    if (!market) {
                        alert('You are entering a transaction for an account which requires market sector. Please ensure the segment is populated before continuing.');
                        return false;
                    }
                }

            }





            return true;
        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            // postSourcing: postSourcing,
            // sublistChanged: sublistChanged,
            // lineInit: lineInit,
            // validateField: validateField,
            validateLine: validateLine,
            // validateInsert: validateInsert,
            // validateDelete: validateDelete,
            saveRecord: saveRecord
        };

    });
