/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/record', 'N/search', 'N/runtime', 'N/error', './lodash.min', 'N/query'],

function(record, search, runtime, error, lodash, query) {

	// Step-0: Constants / Logging Prefix
	var LOG_PREFIX = '[E1P2S1][CSS UE PPRL Updates]';

	// TESTING PHASES (E1P2S1)
	// PHASE-1: Status = Use Bill Rate (2)  -> Pay Rate auto-sets to Bill Rate
	// PHASE-2: Status = Use PO Rate (3)    -> Pay Rate auto-sets to PO Rate
	// PHASE-3: Status = Use Custom Rate (4) and Pay Rate blank -> throw error "Please fill in Rate to Pay"
	// PHASE-4: Pay Rate changes (EDIT/XEDIT) -> update matching Item Receipt line rate (match PO + Item + PO line OR lineuniquekey)
	// PHASE-5: Sync Vendor Bill field custbody_c53174_pprc based on remaining PPRLs "To Be Reviewed" (status=1)
	// PHASE-6: Error handling -> if RCRD_HAS_BEEN_CHANGED, mark Update Pending + write error message on PPRL


	/**
	 *
	 * @param {Object} scriptContext
	 * @param {Record} scriptContext.newRecord - New record
	 * @param {Record} scriptContext.oldRecord - Old record
	 * @param {string} scriptContext.type - Trigger type
	 * @Since 2015.2
	 */


	// Step-1: beforeSubmit() - Pay Rate Defaulting + Validation based on PPRL Status (PHASE-1/2/3)
	function beforeSubmit(context) {

		log.debug(LOG_PREFIX + ' Step-1 beforeSubmit() - START', {
			contextType: context.type,
			executionContext: runtime.executionContext,
			recType: (context.newRecord && context.newRecord.type),
			recId: (context.newRecord && context.newRecord.id)
		});

		log.debug("beforeSubmit()");
		var oldRec = context.oldRecord;
		var newRec = context.newRecord;

		var scrTyp = runtime.executionContext;
		var customRateError;


		// Step-1.1: Only run logic on EDIT/XEDIT
		if (context.type !== context.UserEventType.CREATE) {

			var newStatus = newRec.getValue("custrecord_c53174_ppvrl_status");
			var oldStatus = (oldRec ? oldRec.getValue("custrecord_c53174_ppvrl_status") : null);

			var newPayRateNow = newRec.getValue("custrecord_c53174_ppvrl_payrate");
			var oldPayRateNow = (oldRec ? oldRec.getValue("custrecord_c53174_ppvrl_payrate") : null);

			log.debug(LOG_PREFIX + ' Step-1.1 Current values snapshot', {
				pprlId: newRec.id,
				newStatus: newStatus,
				oldStatus: oldStatus,
				newPayRate: newPayRateNow,
				oldPayRate: oldPayRateNow,
				contextType: context.type
			});

			log.debug("Current Rec- " + newRec.id,
				"newPayRate- " + newRec.getValue("custrecord_c53174_ppvrl_payrate") +
				", oldPayRate- " + oldRec.getValue("custrecord_c53174_ppvrl_payrate")
			);


			// Step-1.2 (PHASE-1): Status = Use Bill Rate (2) => set Pay Rate = Bill Rate
			if (newRec.getValue("custrecord_c53174_ppvrl_status") == 2) {

				log.debug(LOG_PREFIX + ' [PHASE-1] Status=Use Bill Rate (2) -> setting Pay Rate to Bill Rate', {
					pprlId: newRec.id,
					billRateValue: (oldRec ? oldRec.getValue("custrecord_c53174_billrate") : null)
				});

				log.debug("Current Rec- " + newRec.id, " Set Bill Rate");
				newRec.setValue("custrecord_c53174_ppvrl_payrate", oldRec.getValue("custrecord_c53174_billrate"));


			// Step-1.3 (PHASE-2): Status = Use PO Rate (3) => set Pay Rate = PO Rate
			} 
            else if (newRec.getValue("custrecord_c53174_ppvrl_status") == 3) {

				log.debug(LOG_PREFIX + ' [PHASE-2] Status=Use PO Rate (3) -> setting Pay Rate to PO Rate', {
					pprlId: newRec.id,
					poRateValue: (oldRec ? oldRec.getValue("custrecord_c53174_ppvrl_porate") : null)
				});

				log.debug("Current Rec- " + newRec.id, " Set PO Rate");
				newRec.setValue("custrecord_c53174_ppvrl_payrate", oldRec.getValue("custrecord_c53174_ppvrl_porate"));


			// Step-1.4 (PHASE-3): Status = Use Custom Rate (4) => Require Pay Rate (throw if missing)
			} 
            else if (newRec.getValue("custrecord_c53174_ppvrl_status") == 4) {

				log.debug(LOG_PREFIX + ' [PHASE-3] Status=Use Custom Rate (4) -> validating Pay Rate is present', {
					pprlId: newRec.id,
					contextType: context.type
				});

				// IMPORTANT: Keep existing logic as-is
				if (context.type == context.UserEventType.XEDIT) {
					log.debug(LOG_PREFIX + ' Step-1.4.1 XEDIT detected -> lookupFields for Pay Rate', {
						pprlId: newRec.id
					});

					var newPayingRate = search.lookupFields({
						type: newRec.type,
						id: newRec.id,
						columns: ['custrecord_c53174_ppvrl_payrate']
					});
					var newPayRate = newPayingRate['custrecord_c53174_ppvrl_payrate'];

					log.debug(LOG_PREFIX + ' Step-1.4.1 lookupFields result', {
						pprlId: newRec.id,
						newPayRate: newPayRate
					});
				}
				else {
					var newPayRate = newRec.getValue("custrecord_c53174_ppvrl_payrate");

					log.debug(LOG_PREFIX + ' Step-1.4.2 Non-XEDIT -> using newRecord Pay Rate', {
						pprlId: newRec.id,
						newPayRate: newPayRate
					});
				}

				log.debug("Current Rec- " + newRec.id, "newPayRate- " + newPayRate);

				if (!newPayRate) {

					log.error(LOG_PREFIX + ' [PHASE-3] BLOCK SAVE - Custom Rate selected but Pay Rate missing', {
						pprlId: newRec.id,
						status: newRec.getValue("custrecord_c53174_ppvrl_status")
					});

					customRateError = error.create({
						name: 'Rate To Pay is missing',
						message: 'Please fill in Rate to Pay',
						notifyOff: false
					});
					throw customRateError.message;
				}
			}
			else {
				// Step-1.5: Other statuses (ex: To Be Reviewed=1) -> no Pay Rate override here
				log.debug(LOG_PREFIX + ' Step-1.5 No Pay Rate auto-set for this status', {
					pprlId: newRec.id,
					status: newRec.getValue("custrecord_c53174_ppvrl_status")
				});
			}

		} 
        else {
			log.debug(LOG_PREFIX + ' Step-1 beforeSubmit() - EXIT', 'CREATE context detected -> no Pay Rate override/validation in this script.');
		}

		log.debug(LOG_PREFIX + ' Step-1 beforeSubmit() - END', {
			pprlId: (context.newRecord && context.newRecord.id),
			contextType: context.type
		});
	}


	// Step-2: afterSubmit() - When Pay Rate changes, update Item Receipt + Sync Vendor Bill PPRC (PHASE-4/5/6)
	function afterSubmit(context) {
		// NOTE: Keeping structure/functionality as-is. Only adding logs.
		var newRecSafe = context.newRecord;

		try {
			log.debug(LOG_PREFIX + ' Step-2 afterSubmit() - START', {
				contextType: context.type,
				executionContext: runtime.executionContext,
				recType: (context.newRecord && context.newRecord.type),
				recId: (context.newRecord && context.newRecord.id)
			});

			log.debug("afterSubmit()");
			var oldRec = context.oldRecord;
			var newRec = context.newRecord;

			var scrTyp = runtime.executionContext;

			// Step-2.1: Only run on EDIT/XEDIT and not MAP/REDUCE
			if (runtime.executionContext !== runtime.ContextType.MAP_REDUCE &&
				(context.type == context.UserEventType.EDIT || context.type == context.UserEventType.XEDIT)) {

				var oldPayRate = oldRec.getValue("custrecord_c53174_ppvrl_payrate");
				var newPayRate = newRec.getValue("custrecord_c53174_ppvrl_payrate");
				log.debug("Current Rec- " + newRec.id, "oldPayRate- " + oldPayRate + ", newPayRate- " + newPayRate);

				log.debug(LOG_PREFIX + ' Step-2.1 Pay Rate compare', {
					pprlId: newRec.id,
					oldPayRate: oldPayRate,
					newPayRate: newPayRate,
					changed: (oldPayRate != newPayRate),
					contextType: context.type
				});


				// Step-2.2 (PHASE-4): If Pay Rate changed -> Update Item Receipt + Sync VB PPRC
				if (oldPayRate != newPayRate) {

					log.debug(LOG_PREFIX + ' [PHASE-4] Pay Rate changed -> calling updateIBShipment()', {
						pprlId: newRec.id,
						recType: newRec.type
					});

					var pprlRecId = updateIBShipment(newRec.type, newRec.id);
					log.debug("pprlRecId", pprlRecId);

					log.debug(LOG_PREFIX + ' [PHASE-4] updateIBShipment() completed', {
						pprlId: newRec.id,
						returnedId: pprlRecId
					});

				} 
                else {
					log.debug(LOG_PREFIX + ' Step-2.2 No action - Pay Rate unchanged', {
						pprlId: newRec.id
					});
				}

			} 
            else {

				log.debug(LOG_PREFIX + ' Step-2 afterSubmit() - EXIT', {
					reason: 'Not EDIT/XEDIT or executionContext is MAP_REDUCE',
					contextType: context.type,
					executionContext: runtime.executionContext
				});
			}

			log.debug(LOG_PREFIX + ' Step-2 afterSubmit() - END', {
				pprlId: (context.newRecord && context.newRecord.id),
				contextType: context.type
			});

		} 
        catch (e) {
			// Keep original error log, but make it safer + more informative for testing.
			log.error(LOG_PREFIX + ' Step-2 afterSubmit() ERROR', {
				pprlId: (newRecSafe && newRecSafe.id),
				errorName: e.name,
				errorMessage: e.message,
				errorStack: (e.stack || '')
			});

			// Existing log line kept (but now safe due to newRecSafe var)
			log.error("Error from beforeSubmit()" + (newRecSafe && newRecSafe.id), e.toString());
		}
	}


	// Step-3: updateIBShipment() - Updates Item Receipt rates + sync Vendor Bill PPRC + writes error state (PHASE-4/5/6)
	function updateIBShipment(recType, recId) {
		var pprlRecObj = null;

		log.debug(LOG_PREFIX + ' Step-3 updateIBShipment() - START', {
			recType: recType,
			recId: recId
		});

		try {
			// Step-3.1 Load PPRL record
			pprlRecObj = record.load({
				type: recType,
				id: recId,
				isDynamic: true,
			});
			log.debug("PPRL RecID- " + recId + ", RecObj", pprlRecObj);


			// Step-3.2 Read needed fields from PPRL
			var pprlVB = pprlRecObj.getValue("custrecord_c53174_bill");
			var pprlPOId = pprlRecObj.getValue("custrecord_c53174_ppvrl_po");
			var pprlItem = pprlRecObj.getValue("custrecord_c53174_ppvrl_poitem");
			var pprlPOLine = pprlRecObj.getValue("custrecord_c53174_ppvrl_poline");
			var pprlPOLineUniqKey = pprlRecObj.getValue("custrecord_c53174_ppvrl_po_lineuniquekey");
			var pprlPayRate = pprlRecObj.getValue("custrecord_c53174_ppvrl_payrate");

			log.debug(LOG_PREFIX + ' Step-3.2 PPRL field snapshot', {
				pprlId: recId,
				pprlVB: pprlVB,
				pprlPOId: pprlPOId,
				pprlItem: pprlItem,
				pprlPOLine: pprlPOLine,
				pprlPOLineUniqKey: pprlPOLineUniqKey,
				pprlPayRate: pprlPayRate
			});


			// Step-3.3 (PHASE-4): Update Item Receipt rates when Rate to Pay changes (match by PO + PO line / lineuniquekey).
			if (pprlPOId && pprlItem && pprlPayRate) {

				log.debug(LOG_PREFIX + ' [PHASE-4] Searching Item Receipts to update', {
					pprlId: recId,
					pprlPOId: pprlPOId,
					pprlItem: pprlItem,
					pprlPayRate: pprlPayRate
				});

				var itemReceiptIds = [];

				search.create({
					type: "transaction",
					filters: [
						["type", "anyof", "ItemRcpt"],
						"AND",
						["mainline", "is", "F"],
						"AND",
						["cogs", "is", "F"],
						"AND",
						["taxline", "is", "F"],
						"AND",
						["shipping", "is", "F"],
						"AND",
						["createdfrom", "anyof", pprlPOId],
						"AND",
						["item", "anyof", pprlItem]
					],
					columns: [
						search.createColumn({ name: "internalid", summary: "GROUP" })
					]
				}).run().each(function (res) {
					var irId = res.getValue({ name: "internalid", summary: "GROUP" });
					if (irId && itemReceiptIds.indexOf(irId) === -1) {
						itemReceiptIds.push(irId);
					}
					return true;
				});

				log.debug(LOG_PREFIX + ' [PHASE-4] Item Receipts found', {
					pprlId: recId,
					itemReceiptCount: itemReceiptIds.length,
					itemReceiptIds: itemReceiptIds
				});

				for (var r = 0; r < itemReceiptIds.length; r++) {
					var itemRcptId = itemReceiptIds[r];

					log.debug(LOG_PREFIX + ' Step-3.3.1 Loading Item Receipt', {
						pprlId: recId,
						itemRcptId: itemRcptId
					});

					var itemRcptRec = record.load({
						type: record.Type.ITEM_RECEIPT,
						id: itemRcptId,
						isDynamic: true,
					});

					var itemRcptLineCount = itemRcptRec.getLineCount({ sublistId: 'item' });
					var updated = false;
					var updatedLineCount = 0;

					log.debug(LOG_PREFIX + ' Step-3.3.2 Scanning Item Receipt lines', {
						itemRcptId: itemRcptId,
						itemRcptLineCount: itemRcptLineCount
					});

					for (var iRLine = 0; iRLine < itemRcptLineCount; iRLine++) {

						var iRItemPO = itemRcptRec.getSublistValue({
							sublistId: 'item',
							fieldId: 'orderdoc',
							line: iRLine
						});
						if (iRItemPO != pprlPOId) {
							continue;
						}

						var iRLineItem = null;
						try {
							iRLineItem = itemRcptRec.getSublistValue({
								sublistId: 'item',
								fieldId: 'itemkey',
								line: iRLine
							});
						} 
						catch (e) { }

						if (!iRLineItem) {
							iRLineItem = itemRcptRec.getSublistValue({
								sublistId: 'item',
								fieldId: 'item',
								line: iRLine
							});
						}

						if (iRLineItem != pprlItem) {
							continue;
						}

						var iRItemPOLine = itemRcptRec.getSublistValue({
							sublistId: 'item',
							fieldId: 'orderline',
							line: iRLine
						});

						var matches = (pprlPOLine && iRItemPOLine == pprlPOLine);

						if (!matches && pprlPOLineUniqKey) {
							try {
								var iRLineUniqKey = itemRcptRec.getSublistValue({
									sublistId: 'item',
									fieldId: 'lineuniquekey',
									line: iRLine
								});
								matches = (iRLineUniqKey == pprlPOLineUniqKey);
							} 
							catch (e) { }
						}

						if (matches) {

							log.debug(LOG_PREFIX + ' [PHASE-4] Updating Item Receipt line rate', {
								itemRcptId: itemRcptId,
								line: iRLine,
								pprlId: recId,
								newRate: pprlPayRate,
								matchBy: (pprlPOLine ? 'orderline' : 'lineuniquekey'),
								iRItemPOLine: iRItemPOLine,
								pprlPOLine: pprlPOLine,
								pprlPOLineUniqKey: pprlPOLineUniqKey
							});

							itemRcptRec.selectLine({
								sublistId: 'item',
								line: iRLine
							});
							itemRcptRec.setCurrentSublistValue({
								sublistId: 'item',
								fieldId: 'rate',
								value: pprlPayRate
							});
							itemRcptRec.commitLine({
								sublistId: 'item'
							});

							updated = true;
							updatedLineCount++;
						}
					}

					if (updated) {
						var irRecId = itemRcptRec.save();
						log.debug("PPRL RecID- " + recId, "Updated Item Receipt- " + irRecId);

						log.debug(LOG_PREFIX + ' [PHASE-4] Item Receipt updated', {
							pprlId: recId,
							itemRcptId: itemRcptId,
							savedId: irRecId,
							updatedLineCount: updatedLineCount
						});
					} 
					else {
						log.debug(LOG_PREFIX + ' Step-3.3.3 No matching lines updated on Item Receipt', {
							pprlId: recId,
							itemRcptId: itemRcptId
						});
					}
				}
			} 
            else {
				log.debug(LOG_PREFIX + ' Step-3.3 Skip Item Receipt update', {
					reason: 'Missing PO/Item/PayRate on PPRL',
					pprlId: recId,
					pprlPOId: pprlPOId,
					pprlItem: pprlItem,
					pprlPayRate: pprlPayRate
				});
			}


			// Step-3.4 (PHASE-5): Update Vendor Bill "Purchase Price Review Complete" checkbox based on PPRLs to review
			if (pprlVB) {

				log.debug(LOG_PREFIX + ' [PHASE-5] Syncing Vendor Bill PPRC', {
					pprlId: recId,
					vbId: pprlVB
				});

				var pPRLRevReqCount = search.create({
					type: "customrecord_c53174_ppvreviewline",
					filters: [
						["custrecord_c53174_bill", "anyof", pprlVB],
						"AND",
						["custrecord_c53174_ppvrl_status", "anyof", "1"]
					],
					columns: []
				}).runPaged().count;

				log.debug("PPRL Rec- " + recId, "PPRLs To Be Reviewed count- " + pPRLRevReqCount);

				log.debug(LOG_PREFIX + ' [PHASE-5] VB PPRC decision', {
					vbId: pprlVB,
					toBeReviewedCount: pPRLRevReqCount,
					willSetPprc: (pPRLRevReqCount == 0)
				});

				record.submitFields({
					type: record.Type.VENDOR_BILL,
					id: pprlVB,
					values: {
						custbody_c53174_pprc: (pPRLRevReqCount == 0)
					},
					options: {
						enableSourcing: false,
						ignoreMandatoryFields: true
					}
				});
			} 
            else {
				log.debug(LOG_PREFIX + ' Step-3.4 Skip VB PPRC sync', {
					reason: 'custrecord_c53174_bill is empty on PPRL',
					pprlId: recId
				});
			}


			// Step-3.5 Clear error message and save PPRL
			pprlRecObj.setValue("custrecord_c53174_ppvrl_error_msg", '');
			var pprlId = pprlRecObj.save();
			log.debug("pprlId", pprlId);

			log.debug(LOG_PREFIX + ' Step-3 updateIBShipment() - END', {
				pprlId: pprlId
			});

			return pprlId;

		} 
        catch (e) {

			log.error(LOG_PREFIX + ' [PHASE-6] Error while updating Item Receipt rates / syncing VB', {
				pprlId: recId,
				errorName: e.name,
				errorMessage: e.message,
				errorStack: (e.stack || '')
			});

			log.error("An error occurred while updating Item Receipt rates", e.toString());

			// Step-3.6 (PHASE-6): Write error msg to PPRL and optionally set Update Pending
			if (pprlRecObj) {
				try {
					if (e.name == 'RCRD_HAS_BEEN_CHANGED') {

						log.debug(LOG_PREFIX + ' [PHASE-6] RCRD_HAS_BEEN_CHANGED -> setting Update Pending', {
							pprlId: recId
						});

						pprlRecObj.setValue("custrecord_c53174_update_pending", true);
					}

					pprlRecObj.setValue(
						"custrecord_c53174_ppvrl_error_msg",
						"An error occurred while updating the Rate on Item Receipt for the Item, with following error message- " + '\n' + '\n' + e.toString()
					);

					var pprlIdCatch = pprlRecObj.save();
					log.debug("pprlIdCatch", pprlIdCatch);

					log.debug(LOG_PREFIX + ' [PHASE-6] Error written to PPRL record', {
						pprlId: pprlIdCatch
					});

				} 
				catch (inner) {
					log.error(LOG_PREFIX + ' [PHASE-6] Error while writing PPRL error message', {
						pprlId: recId,
						errorName: inner.name,
						errorMessage: inner.message,
						errorStack: (inner.stack || '')
					});

					log.error("Error while writing PPRL error message", inner.toString());
				}
			}
		}
	}

	return {
		beforeSubmit: beforeSubmit,
		afterSubmit: afterSubmit
	};

});
