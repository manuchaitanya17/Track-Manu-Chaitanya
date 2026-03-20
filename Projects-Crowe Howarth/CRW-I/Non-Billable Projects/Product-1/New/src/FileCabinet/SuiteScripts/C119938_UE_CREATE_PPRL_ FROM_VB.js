/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/record', 'N/search', 'N/runtime', 'N/ui/serverWidget', './lodash.min','N/error', 'N/query','N/email', 'N/url','N/config'],

function(record, search, runtime, serverWidget, lodash, error, query,email, url,config) {

	// Step-0: Constants / Configuration
	// Step-0.1: Location field used for gating (Enable Purchase Price Review)
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


	// Step-1.2: hasAnyEnabled() - returns true if any value in map is true
	function hasAnyEnabled(map) {
		for (var k in (map || {})) {
			if (Object.prototype.hasOwnProperty.call(map, k) && map[k]) {
				return true;
			}
		}
		return false;
	}


	// Step-1.3: getPoToPprEnabledMap() - PO -> Location -> Enable Purchase Price Review (checkbox)
	function getPoToPprEnabledMap(poIds) {
		var enabledByPo = {};
		var uniquePoIds = uniq(poIds);

		log.debug('[PPR TEST] Step-1.3 getPoToPprEnabledMap() - input', {
			poIdsCount: (poIds || []).length,
			uniquePoIdsCount: uniquePoIds.length,
			uniquePoIds: uniquePoIds
		});

		if (!uniquePoIds.length) {
			log.debug('[PPR TEST] Step-1.3 getPoToPprEnabledMap() - exit', 'No PO IDs provided.');
			return enabledByPo;
		}

		// Step-1.3.1: PO -> Location (header-level)
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

		log.debug('[PPR TEST] Step-1.3.1 PO -> Location map', poToLoc);

		// Step-1.3.2: Lookup Location checkbox (cached)
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

		log.debug('[PPR TEST] Step-1.3 output enabledByPo', enabledByPo);

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


	// Step-2: beforeLoad() - (UI logic / buttons - currently nothing for FDD)
	function beforeLoad(context) {

		// Step-2.1: Recreate PPRL button removed (out of scope for FDD 81313).
		log.debug('[PPR TEST] Step-2 beforeLoad()', {
			type: context.type,
			recType: (context.newRecord && context.newRecord.type),
			recId: (context.newRecord && context.newRecord.id)
		});
	}


	// Step-3: beforeSubmit() - Approval Gating / blocking (FDD requirement)
	function beforeSubmit(context) {

		log.debug("[PPR TEST] Step-3 beforeSubmit() - START", {
			type: context.type,
			recType: (context.newRecord && context.newRecord.type),
			recId: (context.newRecord && context.newRecord.id)
		});

		log.debug("beforeSubmit()");
		var currentRecord = context.newRecord;
		log.debug('bS(), currentRecord', currentRecord);

		// Step-3.1: Only enforce gating when the Vendor Bill is being approved.
		var vbStat = currentRecord.getValue("approvalstatus");
		var vbOldStat = null;

		if (context.type !== context.UserEventType.CREATE && context.oldRecord) {
			try {
				vbOldStat = context.oldRecord.getValue("approvalstatus");
			} 
            catch (e) {
				vbOldStat = null;
			}
		}

		log.debug('[PPR TEST] Step-3.1 Approval status check', {
			vbStat: vbStat,
			vbOldStat: vbOldStat
		});

		if (!(vbStat && vbStat == 2 && vbOldStat != vbStat)) {
			log.debug('[PPR TEST] Step-3 beforeSubmit() - EXIT', 'Not an approval transition to Approved (2).');
			return;
		}

		// Step-3.2: Collect PO IDs from bill item lines
		var lineCount = currentRecord.getLineCount("item");
		log.debug("lineCount", lineCount);

		var poArray = [];
		for (var x = 0; x < lineCount; x++) {
			var poId = currentRecord.getSublistValue({
				sublistId: 'item',
				fieldId: 'orderdoc',
				line: x
			});
			if (poId && poArray.indexOf(poId) === -1) {
				poArray.push(poId);
			}
		}

		log.debug("poArray", poArray.length);
		log.debug('[PPR TEST] Step-3.2 PO IDs on bill lines', poArray);

		if (poArray.length === 0) {
			log.debug('[PPR TEST] Step-3 beforeSubmit() - EXIT', 'No PO IDs found on bill lines (orderdoc empty). No approval gating applied.');
			return;
		}

		// Step-3.3: Location Gating
		// FDD 81313: If PPR is not enabled on the PO's location, do not block approval.
		var poEnabledMap = getPoToPprEnabledMap(poArray);
		if (!hasAnyEnabled(poEnabledMap)) {
			log.debug('[PPR TEST] Step-3.3 beforeSubmit() - EXIT', {
				reason: 'PPR not enabled on any related PO location. No approval block.',
				poEnabledMap: poEnabledMap
			});
			return;
		}


		// Step-3.4: If any PPRL is still "To Be Reviewed", block approval.
		if (currentRecord.id) {
			var reviewReqCount = search.create({
				type: "customrecord_c53174_ppvreviewline",
				filters: [
					["custrecord_c53174_bill", "anyof", currentRecord.id],
					"AND",
					["custrecord_c53174_ppvrl_status", "anyof", "1"]
				],
				columns: []
			}).runPaged().count;

			log.debug("VB- " + currentRecord.id, "PPRLs To Be Reviewed count- " + reviewReqCount);
			log.debug('[PPR TEST] Step-3.4 reviewReqCount', {
				vbId: currentRecord.id,
				reviewReqCount: reviewReqCount
			});

			if (reviewReqCount > 0) {
				log.debug('[PPR TEST] Step-3.4 BLOCKING approval', {
					vbId: currentRecord.id,
					message: 'PPRLs exist in To Be Reviewed status.'
				});

				var customRateError = error.create({
					name: 'Approval Error',
					message: 'Since the Bill Rates and the associated PO rates of the Item(s) are different, you must complete the PPRL process before you can approve the Vendor Bill.',
					notifyOff: false
				});
				throw customRateError.message;
			}
		}

		// Step-3.5: Keep the header field in sync for downstream automation (auto-approve, etc).
		log.debug('[PPR TEST] Step-3.5 Approval allowed - setting PPRC true', {
			vbId: currentRecord.id
		});
		currentRecord.setValue("custbody_c53174_pprc", true);

		log.debug("[PPR TEST] Step-3 beforeSubmit() - END", {
			vbId: currentRecord.id
		});
	}


	// Step-4: afterSubmit() - CREATE: Create PPRL Lines + Set PPRC
	function afterSubmit(context) {
		try {
			log.debug("[PPR TEST] Step-4 afterSubmit() - START", {
				type: context.type,
				executionContext: runtime.executionContext,
				recType: (context.newRecord && context.newRecord.type),
				recId: (context.newRecord && context.newRecord.id)
			});

			log.debug("afterSubmit()")
			var rec = context.newRecord;
			var scrTyp = runtime.executionContext;
			var needsSave = false;


			// Step-4.1: Only run logic for CREATE (PPRL Generation happens on create)
			if (context.type == context.UserEventType.CREATE) {

				log.debug('[PPR TEST] Step-4.1 CREATE flow detected', { vbId: rec.id });

				// Step-4.2: Load Vendor Bill in dynamic mode (to write recmach sublist lines)
				var recObj = record.load({
					type: record.Type.VENDOR_BILL,
					id: rec.id,
					isDynamic: true,
				});

				var vbLineCount = recObj.getLineCount({
					sublistId: 'item'
				});
				log.debug("VB- " + rec.id, "Item Line Count- " + vbLineCount);
				log.debug('[PPR TEST] Step-4.2 Item line count', { vbId: rec.id, vbLineCount: vbLineCount });

				// Step-4.3: Build arrays needed for search (items/POs/PO lines)
				var vbItemDetails = [];
				var vbItems = [];
				var vbPOs = [];
				var vbPOLine = [];
				var pprlLineCounts = 0;
				var VbPOSearchResult = [];

				for (i = 0; i < vbLineCount; i++) {

					var vbLineItem = recObj.getSublistValue({
						sublistId: 'item',
						fieldId: 'item',
						line: i
					});
					var vbLinePO = recObj.getSublistValue({
						sublistId: 'item',
						fieldId: 'orderdoc',
						line: i
					});
					var vbLinePOLineNum = recObj.getSublistValue({
						sublistId: 'item',
						fieldId: 'orderline',
						line: i
					});
					var vbLineRate = recObj.getSublistValue({
						sublistId: 'item',
						fieldId: 'rate',
						line: i
					});

					if (vbLineItem && vbLinePO && vbLinePOLineNum) {

						vbItemDetails.push({
							"item": vbLineItem,
							"PO": vbLinePO,
							"PO_line": vbLinePOLineNum,
							"VB_Rate": vbLineRate
						});
						vbItems.push(vbLineItem);
						if (vbLinePO && vbPOs.indexOf(vbLinePO) == -1) {
							vbPOs.push(vbLinePO);
						}
						vbPOLine.push(vbLinePOLineNum);

					} 

				} 

				log.debug("VB- " + rec.id + ", vbItemDetails.length- " + vbItemDetails.length, vbItemDetails);

				log.debug('[PPR TEST] Step-4.3 Built VB item/PO arrays', {
					vbId: rec.id,
					vbItemDetailsCount: vbItemDetails.length,
					vbItemsCount: vbItems.length,
					vbPOsCount: vbPOs.length,
					vbPOLineCount: vbPOLine.length,
					vbPOs: vbPOs
				});


				// Step-4.4: Location Gating (Phase-1/Phase-2 Testing)
				var poEnabledMap = {};
				var pprEnabledAny = false;
				if (vbPOs.length > 0) {
					poEnabledMap = getPoToPprEnabledMap(vbPOs);
					pprEnabledAny = hasAnyEnabled(poEnabledMap);

					log.debug('[PPR TEST] Step-4.4 Location Gating Results', {
						vbId: rec.id,
						pprEnabledAny: pprEnabledAny,
						poEnabledMap: poEnabledMap
					});

					if (pprEnabledAny) {
						//Filter to only POs whose Location has "Enable Purchase Price Review" checked.
						vbItemDetails = vbItemDetails.filter(function (d) { return poEnabledMap[d.PO]; });

						// Rebuild Arrays used for the downstream joined search.
						vbItems = [];
						vbPOs = [];
						vbPOLine = [];
						for (var d = 0; d < vbItemDetails.length; d++) {
							vbItems.push(vbItemDetails[d].item);
							if (vbPOs.indexOf(vbItemDetails[d].PO) === -1) {
								vbPOs.push(vbItemDetails[d].PO);
							}
							vbPOLine.push(vbItemDetails[d].PO_line);
						}

						log.debug('[PPR TEST] Step-4.4 Filtered to enabled POs only', {
							vbId: rec.id,
							filteredItemDetailsCount: vbItemDetails.length,
							filteredPOs: vbPOs
						});
					}
				}


				// Step-4.5: If PPR Enabled & there are eligible POs, proceed with joined search + create PPRLs
				if(pprEnabledAny && vbPOs.length > 0){

					log.debug('[PPR TEST] Step-4.5 Proceeding with PPRL creation', {
						vbId: rec.id,
						vbItemsCount: vbItems.length,
						vbPOsCount: vbPOs.length,
						vbPOLineCount: vbPOLine.length
					});

					// Step-4.6: Build the joined search filters/columns to get PO Rate & VB Rate snapshots
					var filters = [
						["type", "anyof", "VendBill"],
						"AND",
						["mainline", "is", "F"],
						"AND",
						["cogs", "is", "F"],
						"AND",
						["taxline", "is", "F"],
						"AND",
						["shipping", "is", "F"],
						"AND",
						["item.type", "anyof", "Assembly", "InvtPart"],
						"AND",
						["item.internalid", "anyof", vbItems],
						"AND",
						["appliedtotransaction.internalid", "anyof", vbPOs],
						"AND",
						["appliedtotransaction.line", "anyof", vbPOLine],
						"AND",
						["internalid", "anyof", recObj.id]
					];

					var columns = [
						search.createColumn({
							name: "internalid",
							join: "appliedToTransaction",
							label: "PO Internal ID"
						}),
						search.createColumn({
							name: "tranid",
							join: "appliedToTransaction",
							label: "PO Document Number"
						}),
						search.createColumn({
							name: "rate",
							join: "appliedToTransaction",
							label: "PO Item Rate"
						}),
						search.createColumn({
							name: "item",
							join: "appliedToTransaction",
							label: "PO Item"
						}),
						search.createColumn({
							name: "line",
							join: "appliedToTransaction",
							label: "PO Item Line ID"
						}),
						search.createColumn({
							name: "linesequencenumber",
							join: "appliedToTransaction",
							label: "PO Item Line Sequence Number"
						}),
						search.createColumn({
							name: "lineuniquekey",
							join: "appliedToTransaction",
							label: "PO Item Line Unique Key"
						}),
						search.createColumn({
							name: "quantity",
							join: "appliedToTransaction",
							label: "PO Quantity"
						}),
						search.createColumn({
							name: "item",
							label: "VB Item"
						}),
						search.createColumn({
							name: "rate",
							label: "VB Item Rate"
						}),
						search.createColumn({
							name: "internalid",
							join: "vendor",
							label: "Vendor Internal ID"
						}),
						search.createColumn({name: "unit", label: "unit"}),
						search.createColumn({name: "unitstype",join: "item",label: "baseunitvalue"}),
						search.createColumn({name: "formulatext",formula: "{item.unitstype}",label: "baseunit"}),
						search.createColumn({name: "quantity", label: "VB Quantity"}),
					];

					log.debug('[PPR TEST] Step-4.6 Running VB/PO joined search', {
						vbId: rec.id,
						filterPOs: vbPOs,
						filterPOLines: vbPOLine,
						filterItems: vbItems
					});

					var vbPOItemDetailSearch = searchAllRecord(record.Type.VENDOR_BILL, null, filters, columns);
					log.debug("VB- " + rec.id + ", vbPOItemDetailSearch.length- " + vbPOItemDetailSearch.length, vbPOItemDetailSearch);

					VbPOSearchResult = pushSearchResultIntoArray(vbPOItemDetailSearch);
					log.debug("VbPOSearchResult.length- " + VbPOSearchResult.length, VbPOSearchResult);

					log.debug('[PPR TEST] Step-4.6 Search results summary', {
						vbId: rec.id,
						vbPOItemDetailSearchCount: (vbPOItemDetailSearch || []).length,
						VbPOSearchResultCount: (VbPOSearchResult || []).length
					});

					// Step-4.7: If search returns results, prepare unit conversion & create PPRL lines
					if (VbPOSearchResult.length > 0) {

						// Step-4.7.1 Unit Type conversion lookup table
						var unitstypeSearchObj = search.create({
							type: "unitstype",
							filters: [],
							columns: [
								search.createColumn({name: "internalid", label: "Internal ID"}),
								search.createColumn({name: "name",sort: search.Sort.ASC,label: "Name"}),
								search.createColumn({name: "unitname", label: "Unit Name"}),
								search.createColumn({name: "conversionrate", label: "Rate"})
							]
						});

						var converstionRate = [];
						unitstypeSearchObj.run().each(function(result){
							var json = {};
							json['internalid'] = result.getValue({name: "internalid", label: "Internal ID"}); 
							json['unitname'] = result.getValue({name: "unitname", label: "Unit Name"}); 
							json['conversionrate'] = result.getValue({name: "conversionrate", label: "Rate"}); 
							converstionRate.push(json);
							return true;
						});

						log.debug('[PPR TEST] Step-4.7.1 Unit conversion records loaded', {
							vbId: rec.id,
							conversionCount: converstionRate.length
						});


						// Step-4.7.2 Create PPRL sublist lines
						for (j = 0; j < vbItemDetails.length; j++) {
							var diffAmt;

							recObj.selectNewLine({
								sublistId: 'recmachcustrecord_c53174_bill'
							});

							var poItemRate;

							var itemIndex = _.findIndex(VbPOSearchResult, function(o) {
								return o["PO Item"] == vbItemDetails[j].item && o["PO Internal ID"] == vbItemDetails[j].PO && o["PO Item Line ID"] == vbItemDetails[j].PO_line;
							});

							log.debug("j- " + j, "itemIndex- " + itemIndex);

							if (itemIndex != -1) {
								poItemRate = VbPOSearchResult[itemIndex]["PO Item Rate"];
								log.debug("j- " + j, "poItemRate- " + poItemRate);
								poItemLineUniqKey = VbPOSearchResult[itemIndex]["PO Item Line Unique Key"];
								log.debug("j- " + j, "poItemLineUniqKey- " + poItemLineUniqKey);
							} else {
								log.debug('[PPR TEST] Step-4.7.2 Skipping line - itemIndex not found in search results', {
									vbId: rec.id,
									j: j,
									item: vbItemDetails[j] && vbItemDetails[j].item,
									po: vbItemDetails[j] && vbItemDetails[j].PO,
									poLine: vbItemDetails[j] && vbItemDetails[j].PO_line
								});
							}

							if(VbPOSearchResult[itemIndex]["unit"] != VbPOSearchResult[itemIndex]["baseunit"]){
								var unitIndex = _.findIndex(converstionRate, function(o) {
									return o.internalid == VbPOSearchResult[itemIndex]["baseunitvalue"] && o.unitname == VbPOSearchResult[itemIndex]["unit"];
								});
								if(unitIndex > -1){
									var converstion = converstionRate[unitIndex].conversionrate; 
									var billItemRate = VbPOSearchResult[itemIndex]["VB Item Rate"];
									var poItemRate = VbPOSearchResult[itemIndex]["PO Item Rate"];
									VbPOSearchResult[itemIndex]["VB Item Rate"] = billItemRate * converstion; 
									VbPOSearchResult[itemIndex]["PO Item Rate"] = poItemRate * converstion;
									VbPOSearchResult[itemIndex]["PO Quantity"] = VbPOSearchResult[itemIndex]["PO Quantity"] / converstion; 
									log.debug("Bill Item Rate", VbPOSearchResult[itemIndex]["VB Item Rate"]);	
									log.debug("PO Item Rate", VbPOSearchResult[itemIndex]["PO Item Rate"]);
									log.debug("PO Quantity", VbPOSearchResult[itemIndex]["PO Quantity"]);								 
								}
							}

							// Step-4.7.3 Set required PPRL fields
							recObj.setCurrentSublistValue({
								sublistId: 'recmachcustrecord_c53174_bill',
								fieldId: 'custrecord_c53174_bill',
								value: rec.id
							});
							recObj.setCurrentSublistValue({
								sublistId: 'recmachcustrecord_c53174_bill',
								fieldId: 'custrecord_c53174_ppvrl_po',
								value: VbPOSearchResult[itemIndex]["PO Internal ID"]
							});
							recObj.setCurrentSublistValue({
								sublistId: 'recmachcustrecord_c53174_bill',
								fieldId: 'custrecord_c53174_ppvrl_vendor',
								value: VbPOSearchResult[itemIndex]["Vendor Internal ID"]
							});
							recObj.setCurrentSublistValue({
								sublistId: 'recmachcustrecord_c53174_bill',
								fieldId: 'custrecord_c53174_ppvrl_poline',
								value: VbPOSearchResult[itemIndex]["PO Item Line ID"]
							});
							recObj.setCurrentSublistValue({
								sublistId: 'recmachcustrecord_c53174_bill',
								fieldId: 'custrecord_c53174_ppvrl_poitem',
								value: VbPOSearchResult[itemIndex]["PO Item"]
							});
							recObj.setCurrentSublistValue({
								sublistId: 'recmachcustrecord_c53174_bill',
								fieldId: 'custrecord_c53174_ppvrl_porate',
								value: VbPOSearchResult[itemIndex]["PO Item Rate"]
							});
							recObj.setCurrentSublistValue({
								sublistId: 'recmachcustrecord_c53174_bill',
								fieldId: 'custrecord_c53174_billrate',
								value: VbPOSearchResult[itemIndex]["VB Item Rate"]
							});
							recObj.setCurrentSublistValue({
								sublistId: 'recmachcustrecord_c53174_bill',
								fieldId: 'custrecord_c53174_ppvrl_po_lineuniquekey',
								value: VbPOSearchResult[itemIndex]["PO Item Line Unique Key"]
							});


							// Step-4.7.4 Compare PO rate vs Bill rate and set Status + Rate to Use
							diffAmt = Number(VbPOSearchResult[itemIndex]["PO Item Rate"] - VbPOSearchResult[itemIndex]["VB Item Rate"]);
							log.debug("diffAmt init", diffAmt);
							if (diffAmt < 0) {
								diffAmt = diffAmt * -1;
							}
							log.debug("diffAmt fin", diffAmt);

							if (diffAmt > Number(0.01999)) {
								log.debug("Set Review Req Status");

								recObj.setCurrentSublistValue({
									sublistId: 'recmachcustrecord_c53174_bill',
									fieldId: 'custrecord_c53174_ppvrl_status',
									value: 1
								});
								recObj.setCurrentSublistValue({
									sublistId: 'recmachcustrecord_c53174_bill',
									fieldId: 'custrecord_c53174_ppvrl_payrate',
									value: ''
								});
							} 
                            else {
								log.debug("Set Pay Bill Rate Status");

								recObj.setCurrentSublistValue({
									sublistId: 'recmachcustrecord_c53174_bill',
									fieldId: 'custrecord_c53174_ppvrl_status',
									value: 2
								});
								recObj.setCurrentSublistValue({
									sublistId: 'recmachcustrecord_c53174_bill',
									fieldId: 'custrecord_c53174_ppvrl_payrate',
									value: VbPOSearchResult[itemIndex]["VB Item Rate"]
								});
							}


							// Step-4.7.5 Set additional fields used later
							recObj.setCurrentSublistValue({
								sublistId: 'recmachcustrecord_c53174_bill',
								fieldId: 'custrecord_c53174_po_line_qty',
								value: Math.abs(VbPOSearchResult[itemIndex]["PO Quantity"])
							});
							recObj.setCurrentSublistValue({
								sublistId: 'recmachcustrecord_c53174_bill',
								fieldId: 'custrecord_c53174_bill_line_qty',
								value: Math.abs(VbPOSearchResult[itemIndex]["VB Quantity"])
							});

							// Step-4.7.6 Track “resolved” line count (status != To Be Reviewed)
							var currLineStat = recObj.getCurrentSublistValue({
								sublistId: 'recmachcustrecord_c53174_bill',
								fieldId: 'custrecord_c53174_ppvrl_status'
							});
							log.debug("currLineStat", currLineStat);
							if (currLineStat && currLineStat != 1) {
								pprlLineCounts++;
							}

							// Step-4.7.7 Commit sublist line
							recObj.commitLine({
								sublistId: 'recmachcustrecord_c53174_bill'
							});

							log.debug('[PPR TEST] Step-4.7.7 PPRL line committed', {
								vbId: rec.id,
								j: j,
								status: currLineStat
							});

							needsSave = true;

						} 

						// Step-4.8 Set Bill header PPRC based on PPRL statuses
						if (VbPOSearchResult.length === 0 || pprlLineCounts == VbPOSearchResult.length) {
							recObj.setValue("custbody_c53174_pprc", true);
							log.debug('[PPR TEST] Step-4.8 Set PPRC TRUE', {
								vbId: rec.id,
								pprlLineCounts: pprlLineCounts,
								totalLines: VbPOSearchResult.length
							});
						} 
                        else {
							recObj.setValue("custbody_c53174_pprc", false);
                            recObj.setValue("approvalstatus", 1);

							log.debug('[PPR TEST] Step-4.8 Set PPRC FALSE', {
								vbId: rec.id,
								pprlLineCounts: pprlLineCounts,
								totalLines: VbPOSearchResult.length
							});
						}
						needsSave = true;

					} 


					// Step-4.9 Save the Vendor Bill if any changes were made
					if (needsSave) {
						var vbId = recObj.save();
						log.debug("vbId", vbId);
						log.debug('[PPR TEST] Step-4.9 Saved Vendor Bill after PPRL creation', {
							vbId: vbId
						});
					} 
                    else {
						log.debug('[PPR TEST] Step-4.9 No changes to save (needsSave=false)', { vbId: rec.id });
					}
				}
				else if (pprEnabledAny) {

					// Step-4.10 No eligible inventoried lines for PPR; mark review complete.
					log.debug('[PPR TEST] Step-4.10 No eligible inventoried lines found - marking PPRC TRUE', {
						vbId: rec.id
					});
					recObj.setValue("custbody_c53174_pprc", true);
					var vbIdNoLines = recObj.save();
					log.debug("vbIdNoLines", vbIdNoLines);
				}
				else {

					// Step-4.11 PPR not enabled on any related PO location (Phase-1 expected)
					log.debug('[PPR TEST] Step-4.11 PPR not enabled for related PO location(s) - skipping PPRL creation', {
						vbId: rec.id,
						vbPOs: vbPOs,
						poEnabledMap: poEnabledMap,
						pprEnabledAny: pprEnabledAny
					});
				}

			}
			else {
				// Step-4.13 afterSubmit called for non-CREATE context
				log.debug('[PPR TEST] Step-4.13 afterSubmit() - non CREATE context, no PPRL creation executed', {
					type: context.type,
					vbId: (context.newRecord && context.newRecord.id)
				});
			}

			log.debug("[PPR TEST] Step-4 afterSubmit() - END", {
				type: context.type,
				recId: (context.newRecord && context.newRecord.id)
			});

		} 
        catch (e) {
			log.error("Error from afterSubmit() on " + rec.id, e.toString());
			log.error("[PPR TEST] afterSubmit() ERROR DETAILS", {
				recId: (rec && rec.id),
				errorName: e.name,
				errorMessage: e.message,
				errorStack: (e.stack || '')
			});
		}
	}


	// Step-5: Utility Functions (kept as-is, with added error logging where helpful)
	function searchAllRecord(recordType, searchId, searchFilter, searchColumns) {
		try {
			var arrSearchResults = [];
			var count = 1000,
				min = 0,
				max = 1000;
			var searchObj = false;
			if (recordType == null) {
				recordType = null;
			}
			if (searchId) {
				searchObj = search.load({
					id: searchId
				});
				if (searchFilter) {
					searchObj.addFilters(searchFilter);
				}
				if (searchColumns) {
					searchObj.addColumns(searchColumns);
				}
			} else {
				searchObj = search.create({
					type: recordType,
					filters: searchFilter,
					columns: searchColumns
				})
			}

			var rs = searchObj.run();

			while (count == 1000) {
				var resultSet = rs.getRange({
					start: min,
					end: max
				});
				if (resultSet != null) {
					arrSearchResults = arrSearchResults.concat(resultSet);
					min = max;
					max += 1000;
					count = resultSet.length;
				}
			}
		} 
        catch (e) {
			log.debug('Error searching for VB PO Item Details ', e.message);
			log.error('[PPR TEST] searchAllRecord() ERROR', {
				errorName: e.name,
				errorMessage: e.message,
				errorStack: (e.stack || '')
			});
		}
		return arrSearchResults;
	}


	function pushSearchResultIntoArray(searchResultSet) {
		var arrayList = new Array();
		for (var iterate in searchResultSet) {
			var resultObj = {};
			var cols = searchResultSet[0].columns;
			resultObj['type'] = searchResultSet[iterate].recordType;
			for (var coliterate in cols) {
				var prop;
				if (cols[coliterate].label)
					prop = cols[coliterate].label;
				else
					prop = cols[coliterate].name;

				resultObj[prop] = searchResultSet[iterate].getValue({
					name: cols[coliterate]
				});
			}
			arrayList.push(resultObj);
		}
		return arrayList;
	}

	return {
		beforeLoad: beforeLoad,
		beforeSubmit: beforeSubmit,
		afterSubmit: afterSubmit
	};
});
