/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/record', 'N/search', './lodash.min'],

	function (record, search, lodash) {

		// Step-0: Location gating field on Location record (Enable Purchase Price Review)
		var PPR_ENABLE_FIELD_ID = 'custrecord_c53174_enable_ppr';


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


		// Step-1.2: getPoToPprEnabledMap() - PO -> Location -> Enable Purchase Price Review (checkbox)
		function getPoToPprEnabledMap(poIds) {
			var enabledByPo = {};
			var uniquePoIds = uniq(poIds);

			log.debug('[PPR TEST] Step-1.2 getPoToPprEnabledMap() - START', {
				inputPoIdsCount: (poIds || []).length,
				uniquePoIdsCount: uniquePoIds.length,
				uniquePoIds: uniquePoIds
			});

			if (!uniquePoIds.length) {
				log.debug('[PPR TEST] Step-1.2 getPoToPprEnabledMap() - END', 'No PO IDs provided. Returning empty map.');
				return enabledByPo;
			}

			// Step-1.2.1: PO -> Location (header-level); used for gating PPR execution by location checkbox.
			var poToLoc = {};
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
					search.createColumn({ name: 'location' })
				]
			}).run().each(function (res) {
				var poId = res.getValue({ name: 'internalid' });
				poToLoc[poId] = res.getValue({ name: 'location' });
				return true;
			});

			log.debug('[PPR TEST] Step-1.2.1 PO -> Location map', poToLoc);

			// Step-1.2.2: Lookup location checkbox (cached)
			var locEnabledCache = {};
			for (var poId in poToLoc) {
				if (!Object.prototype.hasOwnProperty.call(poToLoc, poId)) {
					continue;
				}
				var locId = poToLoc[poId];
				if (!locId) {
					enabledByPo[poId] = false;
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
				enabledByPo[poId] = locEnabledCache[locId];
			}

			log.debug('[PPR TEST] Step-1.2 getPoToPprEnabledMap() - END', {
				enabledByPo: enabledByPo
			});

			return enabledByPo;
		}


		/**
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.newRecord - New record
		 * @param {string} scriptContext.type - Trigger type
		 * @param {Form} scriptContext.form - Current form
		 * @Since 2015.2
		 */

		// Step-2: afterSubmit() - Vendor Bill EDIT: Detect Bill line rate changes and reset PPRL + VB header PPRC
		//
		// Testing Phases (expected):
		// Phase-1: Trigger gating -> only on EDIT
		// Phase-2: Rate Change detection -> build rateChangArray
		// Phase-3: Location gating -> only proceed when PO location has Enable PPR checked
		// Phase-4: Search & update PPRLs (set To Be Reviewed + clear Rate to Pay)
		// Phase-5: Update Vendor Bill header (custbody_c53174_pprc = false) when any PPRL updated
		// Phase-6: Error handling/logging
		function afterSubmit(context) {
			try {

				log.debug('[PPR TEST] Step-2 afterSubmit() - START', {
					contextType: context.type,
					recType: (context.newRecord && context.newRecord.type),
					recId: (context.newRecord && context.newRecord.id)
				});

				// Phase-1: Trigger gating -> only on EDIT
				if (context.type == context.UserEventType.EDIT) {

					log.debug('[PPR TEST] Phase-1 Trigger gating PASSED', {
						message: 'Context is EDIT. Proceeding with rate-change evaluation.'
					});

					var rateChangArray = [];
					var poArray = [];
					var itemArray = [];
					var newRecord = context.newRecord;
					var oldRecord = context.oldRecord;

					// Phase-2: Rate Change detection
					var lineCount = newRecord.getLineCount({ sublistId: 'item' });
					log.debug('[PPR TEST] Phase-2 Line Count', { lineCount: lineCount });

					for (var z = 0; z < lineCount; z++) {
						var newRate = newRecord.getSublistValue({
							sublistId: 'item',
							fieldId: 'rate',
							line: z
						});
						var oldRate = oldRecord.getSublistValue({
							sublistId: 'item',
							fieldId: 'rate',
							line: z
						});

						// Only track lines where rate actually changed
						if (newRate && oldRate && newRate != oldRate) {
							var lineItem = newRecord.getSublistValue({
								sublistId: 'item',
								fieldId: 'item',
								line: z
							});
							var orderDoc = newRecord.getSublistValue({
								sublistId: 'item',
								fieldId: 'orderdoc',
								line: z
							});
							var orderLine = newRecord.getSublistValue({
								sublistId: 'item',
								fieldId: 'orderline',
								line: z
							});

							log.debug('[PPR TEST] Phase-2 Rate changed on line', {
								line: z,
								oldRate: oldRate,
								newRate: newRate,
								lineItem: lineItem,
								orderDoc: orderDoc,
								orderLine: orderLine
							});

							if (poArray.indexOf(orderDoc) == -1) {
								poArray.push(orderDoc);
							}

							if (itemArray.indexOf(lineItem) == -1) {
								itemArray.push(lineItem);
							}

							rateChangArray.push({ 'poId': orderDoc, 'poItem': lineItem, 'rateChange': newRate, 'ordLine': orderLine });
						}
					}

					log.debug('[PPR TEST] Phase-2 rateChangArray summary', {
						changedLinesCount: rateChangArray.length,
						poArray: poArray,
						itemArray: itemArray,
						rateChangArray: rateChangArray
					});

					// If no changed lines, stop here (nothing to update)
					if (!rateChangArray || rateChangArray.length === 0) {
						log.debug('[PPR TEST] Phase-2 EXIT', 'No rate changes detected. No PPRL reset required.');
						return;
					}

					// Phase-3: Location gating (FDD 81313)
					log.debug('[PPR TEST] Phase-3 Location gating START', {
						poArrayCount: poArray.length,
						poArray: poArray
					});

					// FDD 81313: if PPR is not enabled on the PO's location, do not reset PPRL/PPRC.
					var poEnabledMap = getPoToPprEnabledMap(poArray);

					log.debug('[PPR TEST] Phase-3 Location gating map', poEnabledMap);

					rateChangArray = rateChangArray.filter(function (o) { return poEnabledMap[o.poId]; });

					log.debug('[PPR TEST] Phase-3 Filtered rateChangArray', {
						remainingCount: rateChangArray.length,
						filteredRateChangArray: rateChangArray
					});

					if (rateChangArray.length === 0) {
						log.debug('[PPR TEST] Phase-3 EXIT', 'All changed lines are from POs with PPR disabled. Skipping reset.');
						return;
					}

					// Rebuild PO + Item arrays after gating filter (logic unchanged)
					poArray = [];
					itemArray = [];
					for (var r = 0; r < rateChangArray.length; r++) {
						if (poArray.indexOf(rateChangArray[r].poId) === -1) {
							poArray.push(rateChangArray[r].poId);
						}
						if (itemArray.indexOf(rateChangArray[r].poItem) === -1) {
							itemArray.push(rateChangArray[r].poItem);
						}
					}

					log.debug('[PPR TEST] Phase-3 Arrays rebuilt after gating', {
						poArray: poArray,
						itemArray: itemArray
					});


					// Phase-4: Search & update PPRLs
					if (rateChangArray.length > 0) {

						log.debug('[PPR TEST] Phase-4 PPRL search START', {
							vendorBillId: newRecord.id,
							poArray: poArray,
							itemArray: itemArray
						});

						var customrecord_c53174_ppvreviewlineSearchObj = search.create({
							type: "customrecord_c53174_ppvreviewline",
							filters:
								[
									["custrecord_c53174_bill", "anyof", newRecord.id],
									"AND",
									["custrecord_c53174_ppvrl_poitem", "anyof", itemArray],
									"AND",
									["custrecord_c53174_ppvrl_po", "anyof", poArray]
								],
							columns:
								[
									search.createColumn({ name: "internalid", label: "Internal ID" }),
									search.createColumn({ name: "custrecord_c53174_ppvrl_status", label: "Status" }),
									search.createColumn({ name: "custrecord_c53174_ppvrl_po", label: "custrecord_c53174_ppvrl_po" }),
									search.createColumn({ name: "custrecord_c53174_ppvrl_poitem", label: "custrecord_c53174_ppvrl_poitem" }),
									search.createColumn({ name: "custrecord_c53174_ppvrl_poline", label: "custrecord_c53174_ppvrl_poline" })
								]
						});

						var searchResultCount = customrecord_c53174_ppvreviewlineSearchObj.runPaged().count;
						log.debug('[PPR TEST] Phase-4 PPRL search result count', { searchResultCount: searchResultCount });

						if (searchResultCount > 0) {
							var vbSubmitFlag = false;

							customrecord_c53174_ppvreviewlineSearchObj.run().each(function (result) {
								var pprlPO = result.getValue({ name: "custrecord_c53174_ppvrl_po", label: "custrecord_c53174_ppvrl_po" });
								var pprlItem = result.getValue({ name: "custrecord_c53174_ppvrl_poitem", label: "custrecord_c53174_ppvrl_poitem" });
								var pprlLine = result.getValue({ name: "custrecord_c53174_ppvrl_poline", label: "custrecord_c53174_ppvrl_poline" });

								var index = _.findIndex(rateChangArray, function (o) {
									return o.poId == pprlPO && o.poItem == pprlItem && o.ordLine == pprlLine;
								});

								log.debug('[PPR TEST] Phase-4 PPRL matching', {
									pprlPO: pprlPO,
									pprlItem: pprlItem,
									pprlLine: pprlLine,
									matchedIndex: index
								});

								if (index > -1) {
									var pprlId = result.getValue({ name: "internalid", label: "Internal ID" });

									log.debug('[PPR TEST] Phase-4 Updating PPRL', {
										pprlId: pprlId,
										newBillRate: rateChangArray[index].rateChange,
										statusSetTo: 1,
										payRateCleared: true
									});

									record.submitFields({
										type: "customrecord_c53174_ppvreviewline",
										id: pprlId,
										values: {
											custrecord_c53174_billrate: rateChangArray[index].rateChange,
											custrecord_c53174_ppvrl_status: 1,
											custrecord_c53174_ppvrl_payrate: ''
										},
										options: {
											ignoreMandatoryFields: true
										}
									});

									vbSubmitFlag = true;
								}

								return true;
							});

							// Phase-5: Update Vendor Bill header PPRC flag
							if (vbSubmitFlag) {
								log.debug('[PPR TEST] Phase-5 Updating Vendor Bill header PPRC', {
									vendorBillId: newRecord.id,
									custbody_c53174_pprc_setTo: false
								});

								record.submitFields({
									type: "vendorbill",
									id: newRecord.id,
									values: {
										custbody_c53174_pprc: false
									},
									options: {
										ignoreMandatoryFields: true
									}
								});
							} 
                            else {
								log.debug('[PPR TEST] Phase-5 No VB header update needed', {
									vendorBillId: newRecord.id,
									reason: 'No PPRL rows matched / updated (vbSubmitFlag=false).'
								});
							}

						} else {
							log.debug('[PPR TEST] Phase-4 EXIT', 'No PPRL records found for the changed PO/item combination(s).');
						}
					}

				} 
                else {
					log.debug('[PPR TEST] Phase-1 EXIT', {
						reason: 'Script runs only on EDIT. No processing done.',
						contextType: context.type
					});
				}

				log.debug('[PPR TEST] Step-2 afterSubmit() - END', {
					contextType: context.type,
					recId: (context.newRecord && context.newRecord.id)
				});

			}
			catch (err) {
				// Phase-6: Error handling/logging
				log.error('[PPR TEST] Phase-6 ERROR', err.toString());
				log.error('[PPR TEST] Phase-6 ERROR DETAILS', {
					recId: (context && context.newRecord && context.newRecord.id),
					errorName: err.name,
					errorMessage: err.message,
					errorStack: (err.stack || '')
				});
			}
		}

		return {
			afterSubmit: afterSubmit
		};
	});
