/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 *
 */

define(['N/search'],

	function (search) {

		// Step-0: Constants / Log Prefix
		// Step-0.1: Use a consistent prefix so logs can be filtered easily in Script Execution Log.
		var LOG_PREFIX = '[PPR TEST][SS Create PPRs Pending Review Search]';

		// Step-1: execute() Entry Point (Scheduled Script)
		// Step-1.1: Try to load the saved search by Script ID
		// Step-1.2: If not found / not accessible, create the saved search definition
		// Step-1.3: Save the search and log the created internal id
		function execute(context) {
			var SEARCH_ID = 'customsearch_c53174_pprs_pending_review';

			// Step-1.0: Start log (context is limited for Scheduled Scripts but still useful)
			log.audit(LOG_PREFIX + ' Step-1 execute() - START', {
				contextType: (context && context.type) || '',
				searchScriptId: SEARCH_ID
			});

			// Phase-1: Saved search already exists (expected: load succeeds, script exits)
			try {
				log.debug(LOG_PREFIX + ' Step-1.1 Attempting search.load()', {
					searchScriptId: SEARCH_ID
				});

				search.load({ id: SEARCH_ID });

				log.audit('PPR saved search already exists', SEARCH_ID);

				log.audit(LOG_PREFIX + ' Phase-1 EXIT (no action needed)', {
					searchScriptId: SEARCH_ID
				});

				log.audit(LOG_PREFIX + ' Step-1 execute() - END', {
					result: 'EXISTS'
				});
				return;
			} 
            catch (e) {
				// Phase-2: Saved search not found OR not accessible (expected: proceed to create)
				log.debug('Saved search not found, creating', SEARCH_ID + ': ' + e.toString());

				log.debug(LOG_PREFIX + ' Phase-2 Will attempt to create search', {
					searchScriptId: SEARCH_ID,
					errorName: e.name,
					errorMessage: e.message
				});
			}

			// Step-1.2: Create the saved search definition (PPRLs where status = To Be Reviewed)
			var s;
			try {
				log.debug(LOG_PREFIX + ' Step-1.2 Building search.create() payload', {
					type: 'customrecord_c53174_ppvreviewline',
					title: 'PPRs Pending Review',
					searchScriptId: SEARCH_ID,
					filter: 'custrecord_c53174_ppvrl_status anyof 1 (To Be Reviewed)'
				});

				s = search.create({
					type: 'customrecord_c53174_ppvreviewline',
					title: 'PPRs Pending Review',
					id: SEARCH_ID,
					filters: [
						['custrecord_c53174_ppvrl_status', 'anyof', '1'] // To Be Reviewed
					],
					columns: [
						search.createColumn({ name: 'internalid', sort: search.Sort.DESC }),
						search.createColumn({ name: 'custrecord_c53174_bill' }),
						search.createColumn({ name: 'custrecord_c53174_ppvrl_vendor' }),
						search.createColumn({ name: 'custrecord_c53174_ppvrl_po' }),
						search.createColumn({ name: 'custrecord_c53174_ppvrl_poitem' }),
						search.createColumn({ name: 'custrecord_c53174_billrate' }),
						search.createColumn({ name: 'custrecord_c53174_ppvrl_porate' }),
						search.createColumn({ name: 'custrecord_c53174_ppvrl_payrate' }),
						search.createColumn({ name: 'custrecord_c53174_ppvrl_error_msg' })
					]
				});

				log.debug(LOG_PREFIX + ' Step-1.2 search.create() completed (not saved yet)', {
					searchScriptId: SEARCH_ID
				});

			} 
            catch (eCreate) {
				// Phase-3: Failure building the saved search definition (unexpected)
				log.error(LOG_PREFIX + ' Phase-3 ERROR building saved search definition', eCreate.toString());
				log.error(LOG_PREFIX + ' Phase-3 ERROR DETAILS', {
					searchScriptId: SEARCH_ID,
					errorName: eCreate.name,
					errorMessage: eCreate.message,
					errorStack: (eCreate.stack || '')
				});
				throw eCreate;
			}

			// Step-1.3: Save the saved search
			try {
				log.debug(LOG_PREFIX + ' Step-1.3 Saving the saved search', {
					searchScriptId: SEARCH_ID
				});

				var createdId = s.save();

				// (Existing log - kept as-is)
				log.audit('Created saved search', createdId);

				log.audit(LOG_PREFIX + ' Phase-2 SUCCESS saved search created', {
					searchScriptId: SEARCH_ID,
					createdId: createdId
				});

				log.audit(LOG_PREFIX + ' Step-1 execute() - END', {
					result: 'CREATED',
					createdId: createdId
				});

			} 
            catch (eSave) {
				// Phase-4: Failure saving the search (permissions / duplicate ID / invalid ID)
				log.error(LOG_PREFIX + ' Phase-4 ERROR saving saved search', eSave.toString());
				log.error(LOG_PREFIX + ' Phase-4 ERROR DETAILS', {
					searchScriptId: SEARCH_ID,
					errorName: eSave.name,
					errorMessage: eSave.message,
					errorStack: (eSave.stack || '')
				});
				throw eSave;
			}
		}

		return {
			execute: execute
		};
	});