/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */


define(['N/search', 'N/record', 'N/file', 'N/runtime'],
	function (search, record, file, runtime) {

		// Step-0: Constants / Configuration
		// Step-0.1: Location checkbox used to gate PPR automation
		var PPR_ENABLE_FIELD_ID = 'custrecord_c53174_enable_ppr';


		// Step-0.2: Status values used by this Map/Reduce
		var VB_STATUS_PENDING_APPROVAL = 'VendBill:D';   // Vendor Bill Status = Pending Approval
		var VB_APPROVAL_STATUS_APPROVED = '2';           // Vendor Bill Approval Status = Approved
		var PO_STATUS_PENDING_BILL = 'pendingBilling';      // Purchase Order StatusRef = Pending Bill


		// Step-0.4: Log tag (helps filter execution logs during testing)
		var LOG_TAG = '[PPR AUTO-APPROVE MR]';


		// Step-1: Helper Functions
		// Step-1.1: uniq() - removes duplicates + falsy values from an array
		function uniq(arr) {
			var out = [];
			for (var i = 0; i < (arr || []).length; i++) {
				var v = arr[i];
				if (v && out.indexOf(v) === -1) {
					out.push(v);
				}
			}
			return out;
		}


		// Step-1.2: getBillPoIds() - collect unique PO internal IDs from VB item lines (orderdoc)
		function getBillPoIds(vbRec) {
			var poIds = [];
			var lineCount = vbRec.getLineCount({ sublistId: 'item' });
			for (var i = 0; i < lineCount; i++) {
				var poId = vbRec.getSublistValue({
					sublistId: 'item',
					fieldId: 'orderdoc',
					line: i
				});
				if (poId && poIds.indexOf(poId) === -1) {
					poIds.push(poId);
				}
			}
			return poIds;
		}


		// Step-1.3: getPoSummaryById() - PO -> { statusref, location }
		function getPoSummaryById(poIds) {
			var byId = {};
			var uniquePoIds = uniq(poIds);

			if (!uniquePoIds.length) {
				return byId;
			}

			search.create({
				type: 'purchaseorder',
				filters: [
					['type', 'anyof', 'PurchOrd'],
					'AND',
					['mainline', 'is', 'T'],
					'AND',
					['internalid', 'anyof', uniquePoIds]
				],
				columns: [
					search.createColumn({ name: 'internalid' }),
					search.createColumn({ name: 'statusref' }),
					search.createColumn({ name: 'location' })
				]
			}).run().each(function (res) {
				var poId = res.getValue({ name: 'internalid' });
				byId[poId] = {
					statusref: res.getValue({ name: 'statusref' }),
					location: res.getValue({ name: 'location' })
				};
				return true;
			});

			return byId;
		}


		// Step-1.4: isPprEnabledForAnyPo() - checks PO's Location "Enable Purchase Price Review" (cached by location)
		function isPprEnabledForAnyPo(poSummaryById) {
			var locEnabledCache = {};

			for (var poId in poSummaryById) {
				if (!Object.prototype.hasOwnProperty.call(poSummaryById, poId)) {
					continue;
				}

				var locId = poSummaryById[poId].location;
				if (!locId) {
					continue;
				}

				if (locEnabledCache[locId] === undefined) {
					var fields = search.lookupFields({
						type: record.Type.LOCATION,
						id: locId,
						columns: [PPR_ENABLE_FIELD_ID]
					});
					locEnabledCache[locId] = !!fields[PPR_ENABLE_FIELD_ID];
				}

				if (locEnabledCache[locId]) {
					return true;
				}
			}

			return false;
		}


		// Step-1.5: allPosPendingBill() - verifies all related PO(s) statusref = pendingBill
		function allPosPendingBill(poSummaryById) {
			for (var poId in poSummaryById) {
				if (!Object.prototype.hasOwnProperty.call(poSummaryById, poId)) {
					continue;
				}
				if (poSummaryById[poId].statusref !== PO_STATUS_PENDING_BILL) {
					return false;
				}
			}
			return true;
		}


		
		/**
		 * Step-2: getInputData()
		 * - Builds the input search for Vendor Bills eligible for auto-approval
		 * - Eligibility criteria:
		 *   (a) Type = Vendor Bill
		 *   (b) Mainline = T
		 *   (c) Purchase Price Review Complete (custbody_c53174_pprc) = T
		 *   (d) Status = Pending Approval (VendBill:D)
		 */
		function getInputData() {
			try {
				var scriptObj = runtime.getCurrentScript();

				log.audit(LOG_TAG + ' Step-2 getInputData() - START', {
					scriptId: scriptObj.id,
					deploymentId: scriptObj.deploymentId,
					executionContext: runtime.executionContext,
					remainingUsage: scriptObj.getRemainingUsage()
				});

				// Step-2.1: Build search
				var vendorbillSearchObj = search.create({
					type: "vendorbill",
					filters: [
						["type", "anyof", "VendBill"],
						"AND",
						["mainline", "is", "T"],
						"AND",
						["custbody_c53174_pprc", "is", "T"],
						"AND",
						["status", "anyof", VB_STATUS_PENDING_APPROVAL]
					],
					columns: ['internalid']
				});

				// Step-2.2: (Testing) Log eligible record count (helps validate Phase-1: no inputs vs inputs)
				var eligibleCount = vendorbillSearchObj.runPaged().count;
				log.audit(LOG_TAG + ' Step-2.2 Eligible Vendor Bills count', {
					eligibleCount: eligibleCount,
					searchFilters: 'type=VendBill, mainline=T, custbody_c53174_pprc=T, status=' + VB_STATUS_PENDING_APPROVAL
				});

				log.audit(LOG_TAG + ' Step-2 getInputData() - END', {
					eligibleCount: eligibleCount
				});

				// Step-2.3: Return search as input to Map/Reduce
				return vendorbillSearchObj;

			} 
            catch (e) {
				log.error(LOG_TAG + ' Step-2 getInputData() - ERROR', {
					errorName: e.name,
					errorMessage: e.message,
					errorStack: (e.stack || '')
				});
			}
		}


		/**
		 * Step-3: map()
		 * - Loads each VB
		 * - Validates gating conditions (FDD 81313):
		 *   (a) PPR enabled on at least one related PO Location
		 *   (b) ALL related PO(s) are in Pending Bill status
		 * - If eligible: approves the Vendor Bill (approvalstatus = 2)
		 */
		function map(context) {
			var recId = context.key;

			try {
				log.debug(LOG_TAG + ' Step-3.1 Parsed VB details', {
					recId: recId
				})


				// Step-3.2: Load Vendor Bill
				var recObj = record.load({
					type: "vendorbill",
					id: recId,
					isDynamic: true
				});

				log.debug(LOG_TAG + ' Step-3.2 Vendor Bill loaded', {
					vbId: recId,
					currentApprovalStatus: recObj.getValue({ fieldId: 'approvalstatus' }),
					pprComplete: recObj.getValue({ fieldId: 'custbody_c53174_pprc' })
				});


				// Step-3.3: Collect PO IDs from VB line(s)
				var poIds = getBillPoIds(recObj);
				log.debug(LOG_TAG + ' Step-3.3 PO IDs found on bill lines', {
					vbId: recId,
					poIdsCount: poIds.length,
					poIds: poIds
				});


				// Step-3.4: Fetch PO summary (statusref + location) for gating checks
				var poSummaryById = getPoSummaryById(poIds);
				log.debug(LOG_TAG + ' Step-3.4 PO Summary', {
					vbId: recId,
					poSummaryById: poSummaryById
				});


				// Step-3.5: Gate - must have at least one PO and PPR enabled on at least one PO location
				if (!Object.keys(poSummaryById).length) {
					log.debug(LOG_TAG + ' Step-3.5 SKIP auto-approval', {
						vbId: recId,
						reason: 'No related PO(s) found on VB item lines.'
					});
					return;
				}

				var pprEnabledAny = isPprEnabledForAnyPo(poSummaryById);
				if (!pprEnabledAny) {
					log.debug(LOG_TAG + ' Step-3.5 SKIP auto-approval', {
						vbId: recId,
						reason: 'PPR disabled for all associated PO locations.'
					});
					return;
				}


				// Step-3.6: Gate - all PO(s) must be Pending Bill
				var allPendingBill = allPosPendingBill(poSummaryById);
				if (!allPendingBill) {
					log.debug(LOG_TAG + ' Step-3.6 SKIP auto-approval', {
						vbId: recId,
						reason: 'One or more associated PO(s) not in Pending Bill status.',
						expectedStatusRef: PO_STATUS_PENDING_BILL
					});
					return;
				}


				// Step-3.7: Approve the VB
				log.audit(LOG_TAG + ' Step-3.7 APPROVING Vendor Bill', {
					vbId: recId,
					setApprovalStatusTo: VB_APPROVAL_STATUS_APPROVED
				});

				recObj.setValue("approvalstatus", VB_APPROVAL_STATUS_APPROVED);
				var recObjId = recObj.save();

				log.audit(LOG_TAG + ' Step-3.7 Vendor Bill APPROVED', {
					vbId: recId,
					savedId: recObjId
				});

				log.audit(LOG_TAG + ' Step-3 reduce() - END', {
					vbId: recId,
					result: 'APPROVED'
				});

			} 
            catch (e) {
				log.error(LOG_TAG + ' Step-3 reduce() - ERROR', {
					vbId: recId,
					errorName: e.name,
					errorMessage: e.message,
					errorStack: (e.stack || '')
				});

			}
		}
		
		return {
			getInputData: getInputData,
			map: map
		};
	});