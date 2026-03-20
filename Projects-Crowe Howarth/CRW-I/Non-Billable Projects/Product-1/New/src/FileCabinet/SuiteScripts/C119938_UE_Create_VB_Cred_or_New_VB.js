	/**
	 * @NApiVersion 2.x
	 * @NScriptType UserEventScript
	 * @NModuleScope Public
	 */
	 define(['N/record', 'N/search', 'N/runtime', './lodash.min', 'N/query','N/file','N/format','N/email','N/task'],

	 function(record, search, runtime, lodash, query,file,format,email,task) {

		 var PPR_ENABLE_FIELD_ID = 'custrecord_c53174_enable_ppr';

		 // Step-0: Logging helpers (consistent logs during functional testing)
		 var LOG_PREFIX = '[PPR TEST][UE Create VB Credit/New VB]';
		 function logDebug(step, title, details) {
		 	try { log.debug(LOG_PREFIX + ' ' + step + ' ' + title, details); } catch (e) {}
		 }
		 function logAudit(step, title, details) {
		 	try { log.audit(LOG_PREFIX + ' ' + step + ' ' + title, details); } catch (e) {}
		 }
		 function logError(step, title, details) {
		 	try { log.error(LOG_PREFIX + ' ' + step + ' ' + title, details); } catch (e) {}
		 }


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

		 function hasAnyEnabled(map) {
			 for (var k in (map || {})) {
				 if (Object.prototype.hasOwnProperty.call(map, k) && map[k]) {
					 return true;
				 }
			 }
			 return false;
		 }


		 function getPoToPprEnabledMap(poIds) {
		 	// Step-1.3: Determine if PPR is enabled for each PO based on PO Location
		 	logDebug('Step-1.3', 'getPoToPprEnabledMap() - input', { poIdsCount: (poIds || []).length, poIds: poIds });
			 var enabledByPo = {};
			 var uniquePoIds = uniq(poIds);
			 if (!uniquePoIds.length) {
				 logDebug('Step-1.3', 'getPoToPprEnabledMap() - output', enabledByPo);
				 return enabledByPo;
			 }

			 // PO -> Location (header-level)
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

			 logDebug('Step-1.3', 'getPoToPprEnabledMap() - output', enabledByPo);
			 return enabledByPo;
		 }


		 function isPprEnabledForAnyPo(poIds) {
			 // Step-1.4: Quick gate - true if any associated PO Location has PPR enabled
			 var enabledByPo = getPoToPprEnabledMap(poIds);
			 var anyEnabled = hasAnyEnabled(enabledByPo);
			 logDebug('Step-1.4', 'isPprEnabledForAnyPo()', { poIdsCount: (poIds || []).length, anyEnabled: anyEnabled, enabledByPo: enabledByPo });
			 return anyEnabled;
		 }


		 /**
		  *
		  * @param {Object} scriptContext
		  * @param {Record} scriptContext.newRecord - New record
		  * @param {string} scriptContext.type - Trigger type
		  * @param {Form} scriptContext.form - Current form
		  * @Since 2015.2
		  */

		 function afterSubmit(context) {
			 try {

			 	// Step-2.0: Entry log
			 	logAudit('Step-2.0', 'afterSubmit() - START', {
			 		type: context.type,
			 		executionContext: runtime.executionContext,
			 		recType: (context.newRecord && context.newRecord.type),
			 		recId: (context.newRecord && context.newRecord.id)
			 	});

				 log.debug("afterSubmit()");
				 var qtyVarianceArray = [];
				 var priceVarianceArray = [];
				 var vendCredId;
				 var vendBillId = '';
				 var rec = context.newRecord;
				 var oldRec = context.oldRecord;


				 // Step-2.0.1: Defensive gating (script is expected to run on EDIT)
				 logDebug('Step-2.0.1', 'Context snapshot', { type: context.type, vbId: (context.newRecord && context.newRecord.id), hasOldRecord: !!oldRec });

				if (context.type !== context.UserEventType.EDIT) {
				 	logAudit('Phase-0', 'EXIT (Non-EDIT event)', { type: context.type });
				 	return;
				}

				if (!oldRec) {
				 	logAudit('Phase-0', 'EXIT (Missing oldRecord)', 'oldRecord is not available. Cannot compare approval status.');
				 	return;
				}

				 var qtyVarItemId, rateVarItemId;
		
				 var vbOldStat = oldRec.getValue("approvalstatus");

				 var vbStat = rec.getValue("approvalstatus");
				 log.debug("VB- " + rec.id, "vb Old Status- " + vbOldStat + ", VB New Stat- " + vbStat);


				 // Step-2.1: Approval transition check
				 var approvalTransition = (vbOldStat && vbStat && vbOldStat != vbStat && vbStat == 2);
				 logAudit('Phase-1', 'Approval transition check', { vbOldStat: vbOldStat, vbStat: vbStat, approvalTransition: approvalTransition });

				 if (!approvalTransition) {
				 	logAudit('Phase-1', 'EXIT (Not approved)', 'No status change to Approved (2).');
				 	return;
				 }


				 if (approvalTransition) {
				 	logAudit('Phase-1', 'PASS (Approved)', { vbId: rec.id });

					 // FDD 81313: If PPR is not enabled on the PO's location, do not create Credit/Debit notes.
					 var poIds = [];
					 var vbItemLineCountForGate = rec.getLineCount({ sublistId: 'item' });
					 for (var g = 0; g < vbItemLineCountForGate; g++) {
						 var poId = rec.getSublistValue({
							 sublistId: 'item',
							 fieldId: 'orderdoc',
							 line: g
						 });
						 if (poId && poIds.indexOf(poId) === -1) {
							 poIds.push(poId);
						 }
					 }


					 // Step-2.2: PO IDs collected from Vendor Bill lines (for PPR-enabled gating)
					 logDebug('Phase-2', 'PO IDs collected', { poIdsCount: (poIds || []).length, poIds: poIds });
					 if (!poIds.length || !isPprEnabledForAnyPo(poIds)) {
					 	logAudit('Phase-2', 'EXIT (No PO IDs or PPR disabled)', { poIdsCount: (poIds || []).length, poIds: poIds });
						 log.debug("VB- " + rec.id, "PPR disabled for all associated PO locations - skipping Credit/Debit creation.");
						 return;
					 }

					 // FDD 81313: Credit/Debit creation should only happen when PPR is complete.
					 var vbPprComplete = rec.getValue("custbody_c53174_pprc");
					 logAudit('Phase-3', 'PPR Complete check', { vbId: rec.id, pprComplete: vbPprComplete });
					 if (!vbPprComplete) {
					 	logAudit('Phase-3', 'EXIT (PPR not complete)', 'custbody_c53174_pprc is false.');
						 log.debug("VB- " + rec.id, "Purchase Price Review Complete is not checked - skipping Credit/Debit creation.");
						 return;
					 }

					 var vbSub = rec.getValue("subsidiary");
					 //log.debug("VB- " + rec.id,"vbSub- " + vbSub);

					 if (vbSub) {

						 var subQtyRateVarValues = search.lookupFields({
							 type: search.Type.SUBSIDIARY,
							 id: vbSub,
							 columns: ['custrecord_c53174_qty_variance', 'custrecord_c53174_rate_variance']
						 });

						 log.debug("VB- " + rec.id + ", subQtyRateVarValues", subQtyRateVarValues);

						 qtyVarItemId = subQtyRateVarValues['custrecord_c53174_qty_variance'][0]['value'];
						 rateVarItemId = subQtyRateVarValues['custrecord_c53174_rate_variance'][0]['value'];

					 }
					 log.debug("VB- " + rec.id, "qtyVarItemId- " + qtyVarItemId + ", rateVarItemId- " + rateVarItemId);
					 logAudit('Phase-4', 'Variance items by subsidiary', { vbId: rec.id, subsidiaryId: subsidiaryId, qtyVarItemId: qtyVarItemId, rateVarItemId: rateVarItemId });
					 if (!qtyVarItemId || !rateVarItemId) {
					 	logError('Phase-4', 'Missing variance item mapping', { vbId: rec.id, subsidiaryId: subsidiaryId, qtyVarItemId: qtyVarItemId, rateVarItemId: rateVarItemId });
					 }

					 var vBId = rec.id;

					 var billInvoice = rec.getValue("tranid");

					 var vbLoc = rec.getValue("location");
					 
					 var bolNumber = rec.getValue("custbody_c5637_bol_number");
	 
					 var vbPOItemDetailsArr = [];
					 var vbPPRLDetails = [];
					 var vbibShipDetails = [];
					 var payRcptAmt = 0;
					 var vbTotalAmt = 0;
					 var vend = rec.getValue("entity");

					 var vbItemLineCount = rec.getLineCount({
						 sublistId: 'item'
					 });

					 var vbpprlLineCount = rec.getLineCount({
						 sublistId: 'recmachcustrecord_c53174_bill'
					 });
					 
					 // Step-2.4: Load Unit Type conversion rates (for unit-based math)
					 logDebug('Step-2.4', 'Loading Unit Type conversion rates', 'Starting unitstype search');
					 var unitstypeSearchObj = search.create({
							type: "unitstype",
							filters:
							[
							],
							columns:
							[ 
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

					 var vendorbillSearchObj = search.create({
						 type: "vendorbill",
						 filters: [
							 ["type", "anyof", "VendBill"],
							 "AND",
							 ["internalid", "anyof", vBId],
							 "AND",
							 ["mainline", "is", "F"],
							 "AND",
							 ["shipping", "is", "F"],
							 "AND",
							 ["cogs", "is", "F"],
							 "AND",
							 ["taxline", "is", "F"],
							 "AND",
							 ["item.type", "anyof", "Assembly", "InvtPart"]
						 ],
						 columns: [
							 search.createColumn({
								 name: "internalid",
								 join: "vendor",
								 label: "Vendor"
							 }),
							 search.createColumn({
								 name: "altname",
								 join: "vendor"
							 }),
							 search.createColumn({
								 name: "custentity_c53174_claim_email_address",
								 join: "vendor"
							 }),
							 search.createColumn({
								 name: "custentity_productline_buyer",
								 join: "vendor"
							 }),
							 //Bill Item details
							 search.createColumn({
								 name: "internalid",
								 label: "Bill Number"
							 }),
							 search.createColumn({
								 name: "tranid",
								 label: "Bill Invoice Number"
							 }),
							 search.createColumn({
								 name: "item",
								 label: "Bill Item"
							 }),
							 search.createColumn({
								 name: "amount",
								 label: "Bill Item Amount"
							 }),
							 search.createColumn({
								 name: "rate",
								 label: "Bill Item Rate"
							 }),
							 search.createColumn({
								 name: "quantityuom",
								 label: "Bill Item Quantity"
							 }),
							 search.createColumn({
								 name: "line",
								 label: "Bill Line Id"
							 }),
							 search.createColumn({
								 name: "lineuniquekey",
								 label: "Bill Item Line Unique Key"
							 }),
						 
							 //PO Item Details
							 search.createColumn({
								 name: "internalid",
								 join: "appliedToTransaction",
								 label: "PO Number"
							 }),
							 search.createColumn({
								 name: "tranid",
								 join: "appliedToTransaction",
								 label: "PO Doc Number"
							 }),
							 search.createColumn({
								 name: "item",
								 join: "appliedToTransaction",
								 label: "PO Item"
							 }),
							 search.createColumn({
								 name: "line",
								 join: "appliedToTransaction",
								 label: "PO Line Id"
							 }),
							 search.createColumn({
								 name: "lineuniquekey",
								 join: "appliedToTransaction",
								 label: "PO Line Unique Key"
							 }),
							 search.createColumn({
								 name: "quantityuom",
								 join: "appliedToTransaction",
								 label: "PO Item Quantity"
							 }),
							 search.createColumn({
								 name: "rate",
								 join: "appliedToTransaction",
								 label: "PO Item Quantity"
							 }),
							 search.createColumn({
								 name: "amount",
								 join: "appliedToTransaction",
								 label: "PO Item Quantity"
							 }),
							 search.createColumn({name: "unit", label: "unit"}),
							 search.createColumn({name: "unitstype",join: "item",label: "baseunitvalue"}),
							 search.createColumn({name: "formulatext",formula: "{item.unitstype}",label: "baseunit"}),
							 search.createColumn({name: "custcol_pd_item_mpn",label: "mpn"})
						 ]
					 });
					 var searchResultCount = vendorbillSearchObj.runPaged().count;
					 //log.debug("VB- " + vBId + ", VB-PO Search result count",searchResultCount);
					 vendorbillSearchObj.run().each(function(result) {
						 // .run().each has a limit of 4,000 results
						 var unitConvertion = false;
						 var vendor = result.getValue({
							 name: "internalid",
							 join: "vendor"
						 });
						 var vendorName = result.getValue({
							 name: "altname",
							 join: "vendor"
						 }); 
						 var claimEmailAddress = result.getValue({
							 name: "custentity_c53174_claim_email_address",
							 join: "vendor"
						 });
						 var buyerId = result.getValue({
							 name: "custentity_productline_buyer",
							 join: "vendor"
						 });
						 //Fetching Bill Item Details
						 var billId = result.getValue({
							 name: "internalid"
						 });
						 var billInvoice = result.getValue({
							 name: "tranid"
						 });
						 var billItem = result.getValue({
							 name: "item"
						 });
						 var billItemAmt = result.getValue({
							 name: "amount"
						 });
						 if (billItemAmt && billItemAmt < 0) {
							 billItemAmt = billItemAmt * -1;
						 }
						 
						 var billUnit = result.getValue({name: "unit", label: "unit"});
						 var itemUnitId = result.getValue({name: "unitstype",join: "item",label: "baseunitvalue"});
						 var itemUnit = result.getValue({name: "formulatext",formula: "{item.unitstype}",label: "baseunit"});
						 
						 if(billUnit != itemUnit){
						   var unitIndex = _.findIndex(converstionRate, function(o) {
							  return o.internalid == itemUnitId && o.unitname == billUnit;
						   });
								 
						   if(unitIndex > -1){
							 var converstion = converstionRate[unitIndex].conversionrate; 
							 var billRate = result.getValue({name: "rate"});
							 var billItemRate = billRate * converstion;  
							 unitConvertion = true;
						   }
						   else{
							 var billItemRate = result.getValue({
							   name: "rate"
							 });
						   }
						 }
						 else{
						   var billItemRate = result.getValue({
							 name: "rate"
						   });
						 }
						 
						 var billItemQty = result.getValue({
							 name: "quantityuom"
						 });
						 if (billItemQty && billItemQty < 0) {
							 billItemQty = billItemQty * -1;
						 }
						 var billItemLineId = result.getValue({
							 name: "line"
						 });
						 var billItemLineUniq = result.getValue({
							 name: "lineuniquekey"
						 });
						 var billMpn = result.getValue({
							 name: "custcol_pd_item_mpn"
						 });
						 
						 //Fetching PO Item Details
						 var poId = result.getValue({
							 name: "internalid",
							 join: "appliedToTransaction"
						 });
						 var poDocNum = result.getValue({
							 name: "tranid",
							 join: "appliedToTransaction"
						 });
						 var poItem = result.getValue({
							 name: "item",
							 join: "appliedToTransaction"
						 });
						 var poItemLineNum = result.getValue({
							 name: "line",
							 join: "appliedToTransaction"
						 });
						 var poItemLineUniq = result.getValue({
							 name: "lineuniquekey",
							 join: "appliedToTransaction"
						 });
						 var poItemRate = result.getValue({
							 name: "rate",
							 join: "appliedToTransaction"
						 });
						 var poItemAmt = result.getValue({
							 name: "amount",
							 join: "appliedToTransaction"
						 });
						 vbTotalAmt = Number(vbTotalAmt) + Number(billItemAmt);
						 var billItemText = result.getText({
							 name: "item"
						 });
						 vbPOItemDetailsArr.push({
							 "billId": billId,
							 "billInvoice": billInvoice,
							 "billItem": billItem,
							 "billItemAmt": billItemAmt,
							 "billItemRate": billItemRate,
							 "billItemQty": billItemQty,
							 "billItemLineId": billItemLineId,
							 "billItemLineUniq": billItemLineUniq,
							 "poId": poId,
							 "poDocNum": poDocNum,
							 "poItem": poItem,
							 "poItemLineNum": poItemLineNum,
							 "poItemLineUniq": poItemLineUniq,
							 "poItemRate": poItemRate,
							 "poItemAmt": poItemAmt,
							 "billItemText":billItemText,
							 "vendorName":vendorName,
							 "EmailAddress":claimEmailAddress,
							 "buyerId":buyerId,
							 "unitConvertion":unitConvertion,
							 "billMpn":billMpn
						 });

						 return true;
					 });

					 log.debug("VB- " + vBId + "vbPOItemDetailsArr.length- " + vbPOItemDetailsArr.length, vbPOItemDetailsArr);
					 logAudit('Phase-5', 'VB+PO line details loaded', { vbId: vBId, count: vbPOItemDetailsArr.length });

					 var customrecord_c53174_ppvreviewlineSearchObj = search.create({
						 type: "customrecord_c53174_ppvreviewline",
						 filters: [
							 ["custrecord_c53174_bill", "anyof", vBId]
						 ],
						 columns: [
							 search.createColumn({
								 name: "internalid",
								 sort: search.Sort.DESC,
								 label: "Internal ID"
							 }),
							 search.createColumn({
								 name: "custrecord_c53174_bill",
								 label: "Vendor Bill"
							 }),
							 search.createColumn({
								 name: "custrecord_c53174_ppvrl_po",
								 label: "Purchase Order"
							 }),
							 search.createColumn({
								 name: "custrecord_c53174_ppvrl_poline",
								 label: "PO Line Number"
							 }),
							 search.createColumn({
								 name: "custrecord_c53174_ppvrl_poitem",
								 label: "PO Line Item"
							 }),
							 search.createColumn({
								 name: "custrecord_c53174_ppvrl_po_lineuniquekey",
								 label: "PO Item Line Unique Key"
							 }),
							 search.createColumn({
								 name: "custrecord_c53174_ppvrl_porate",
								 label: "PO Rate Snapshot"
							 }),
							 search.createColumn({
								 name: "custrecord_c53174_billrate",
								 label: "Bill Rate Snapshot"
							 }),
							 search.createColumn({
								 name: "custrecord_c53174_ppvrl_payrate",
								 label: "Rate to Pay"
							 }),
							 search.createColumn({
								 name: "custrecord_c53174_ppvrl_error_msg",
								 label: "Error Message"
							 })
						 ]
					 });
					 var searchResultCount = customrecord_c53174_ppvreviewlineSearchObj.runPaged().count;
					 //log.debug("VB- " + vBId + ", PPRL search count",searchResultCount);
					 customrecord_c53174_ppvreviewlineSearchObj.run().each(function(result) {
						 // .run().each has a limit of 4,000 results

						 var pprlId = result.getValue({
							 name: "internalid"
						 });
						 var pprlVB = result.getValue({
							 name: "custrecord_c53174_bill"
						 });
						 var pprlPO = result.getValue({
							 name: "custrecord_c53174_ppvrl_po"
						 });
						 var pprlPOLine = result.getValue({
							 name: "custrecord_c53174_ppvrl_poline"
						 });
						 var pprlPOItem = result.getValue({
							 name: "custrecord_c53174_ppvrl_poitem"
						 });
						 var pprlPOItemUniqKey = result.getValue({
							 name: "custrecord_c53174_ppvrl_po_lineuniquekey"
						 });
						 var pprlPORate = result.getValue({
							 name: "custrecord_c53174_ppvrl_porate"
						 });
						 var pprlVBRate = result.getValue({
							 name: "custrecord_c53174_billrate"
						 });
						 var pprlPayRate = result.getValue({
							 name: "custrecord_c53174_ppvrl_payrate"
						 });

						 vbPPRLDetails.push({
							 "pprlId": pprlId,
							 "pprlVB": pprlVB,
							 "pprlPO": pprlPO,
							 "pprlPOLine": pprlPOLine,
							 "pprlPOItem": pprlPOItem,
							 "pprlPOItemUniqKey": pprlPOItemUniqKey,
							 "pprlPORate": pprlPORate,
							 "pprlVBRate": pprlVBRate,
							 "pprlPayRate": pprlPayRate
						 });
						 return true;
					 });
					 //log.debug("VB- " + vBId + "vbPPRLDetails.length- " + vbPPRLDetails.length, vbPPRLDetails);
					 logAudit('Phase-5', 'PPRL details loaded', { vbId: vBId, count: (vbPPRLDetails || []).length });

					 // FDD 81313: Use Item Receipt quantities to calculate pay-per-receipt and variance quantities.
					 var poLineUniqByKey = {};
					 var poIdsForRcpt = [];
					 var itemIdsForRcpt = [];
					 for (var q = 0; q < vbPOItemDetailsArr.length; q++) {
						 var mapPoId = vbPOItemDetailsArr[q].poId;
						 var mapItemId = vbPOItemDetailsArr[q].poItem;
						 var mapPoLine = vbPOItemDetailsArr[q].poItemLineNum;
						 var mapPoLineUniq = vbPOItemDetailsArr[q].poItemLineUniq;
						 poLineUniqByKey[mapPoId + '|' + mapPoLine + '|' + mapItemId] = mapPoLineUniq;
						 if (mapPoId && poIdsForRcpt.indexOf(mapPoId) === -1) {
							 poIdsForRcpt.push(mapPoId);
						 }
						 if (mapItemId && itemIdsForRcpt.indexOf(mapItemId) === -1) {
							 itemIdsForRcpt.push(mapItemId);
						 }
					 }

					 if (poIdsForRcpt.length > 0 && itemIdsForRcpt.length > 0) {
						 var itemReceiptSearchObj = search.create({
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
								 ["createdfrom", "anyof", poIdsForRcpt],
								 "AND",
								 ["item", "anyof", itemIdsForRcpt]
							 ],
							 columns: [
								 search.createColumn({ name: "createdfrom", summary: "GROUP" }),
								 search.createColumn({ name: "item", summary: "GROUP" }),
								 search.createColumn({ name: "line", join: "appliedToTransaction", summary: "GROUP" }),
								 search.createColumn({ name: "quantityuom", summary: "SUM" })
							 ]
						 });
						 var rcptCount = itemReceiptSearchObj.runPaged().count;
						 log.debug("Vb- " + vBId + ", Item Receipt search count", rcptCount);
						 itemReceiptSearchObj.run().each(function (result) {
							 var rcptPoId = result.getValue({ name: "createdfrom", summary: "GROUP" });
							 var rcptItem = result.getValue({ name: "item", summary: "GROUP" });
							 var rcptPoLine = result.getValue({ name: "line", join: "appliedToTransaction", summary: "GROUP" });
							 var qtyRcvd = result.getValue({ name: "quantityuom", summary: "SUM" });
							 if (qtyRcvd && qtyRcvd < 0) {
								 qtyRcvd = qtyRcvd * -1;
							 }
							 qtyRcvd = Number(qtyRcvd) || 0;
							 var uniqKey = poLineUniqByKey[rcptPoId + '|' + rcptPoLine + '|' + rcptItem];
							 vbibShipDetails.push({
								 "ibShipId": null,
								 "ibShipItem": rcptItem,
								 "ibShipPO": rcptPoId,
								 "ibShipLineId": rcptPoLine,
								 "ibShipPORate": null,
								 "ibShipQtyBilled": null,
								 "ibShipQtyExp": null,
								 "ibShipQtyRcvd": qtyRcvd,
								 "ibShipItemAmt": null,
								 "ibShipItemIntId": null,
								 "ibShipLineUniqKey": uniqKey || rcptPoLine
							 });
							 return true;
						 });
					 }

					 log.debug("VB- " + vBId + "vbibShipDetails.length- " + vbibShipDetails.length, vbibShipDetails);
					 logAudit('Phase-5', 'Item Receipt/Shipping details loaded', { vbId: vBId, count: vbibShipDetails.length });

					 if (vbibShipDetails.length === 0) {
					 	logAudit('Phase-5', 'EXIT (No Item Receipt/Shipping details)', { vbId: vBId, reason: 'No item receipt lines found (vbibShipDetails empty).' });
						 log.debug("VB- " + vBId, "No Item Receipts found for associated PO lines - skipping Credit/Debit creation.");
						 return;
					 }

					 for (i = 0; i < vbPPRLDetails.length; i++) {

						 var itemIndex = _.findIndex(vbibShipDetails, function(o) {
							 return o.ibShipItem == vbPPRLDetails[i].pprlPOItem && o.ibShipPO == vbPPRLDetails[i].pprlPO && o.ibShipLineUniqKey == vbPPRLDetails[i].pprlPOItemUniqKey;
						 });
						 //log.debug("itemIndex@" + i,itemIndex)

						 if (itemIndex != -1) {
							 var ibShipItemRcvd = vbibShipDetails[itemIndex].ibShipQtyRcvd;
							 payRcptAmt = Number(payRcptAmt) + Number(ibShipItemRcvd * vbPPRLDetails[i]['pprlPayRate']);
						 }

					 }// end for() pay per receipt amt calculation

					 log.debug("Vb- " + vBId, "Pay Per Receipt Amt- " + payRcptAmt + ", Vb Total amt- " + vbTotalAmt);
					 // Step-2.9: Decision - Vendor Credit vs New Vendor Bill
					 var decisionDiff = (payRcptAmt - vbTotalAmt);
					 logAudit('Phase-6', 'Decision amounts', { vbId: vBId, payRcptAmt: payRcptAmt, vbTotalAmt: vbTotalAmt, diff: decisionDiff });
					 if (decisionDiff === 0) {
					 	logAudit('Phase-6', 'NO ACTION', 'Pay per receipt amount matches VB total. No credit/debit required.');
					 }

					 //payRcptAmt = 1;
					 // create Bill Credit Memo
					 if (payRcptAmt < vbTotalAmt) {
					 	logAudit('Phase-7', 'Creating Vendor Credit', { vbId: vBId, payRcptAmt: payRcptAmt, vbTotalAmt: vbTotalAmt });
						 log.debug("VB- " + rec.id, "Create Vendor Credit");
						 var qtyVarianceCnt = 0;
						 var addOtherItem = true;
						 
						 var vendCred = record.transform({
							 fromType: 'vendorbill',
							 fromId: vBId,
							 toType: 'vendorcredit',
							 isDynamic: true,
						 });
						 
						 var vcLineCount = vendCred.getLineCount({
							 sublistId: 'item'
						 });
						 log.debug("VB- " + vBId, "vcLineCount- " + vcLineCount);
						 
						 //removing existing lines
						 for (var i = 0; i < vcLineCount; i++) {

							 vendCred.removeLine({
								 sublistId: 'item',
								 line: 0,
								 ignoreRecalc: true
							 });
						 }

						 var vendCredRefNo = 'CREDIT-' + billInvoice;
						 vendCred.setValue("subsidiary", vbSub);
						 vendCred.setValue("entity", vend);
						 vendCred.setValue("tranid", vendCredRefNo);
						 vendCred.setValue("createdfrom", vBId);
						 vendCred.setValue("memo", "Bill# " + billInvoice);
						 vendCred.setValue("location", vbLoc);
						 
						 var recId = rec.id; 
					 
					 var queryString = "SELECT sotl.transaction AS soid,potl.location AS loc,sotl.entity AS customer,st.custbody_c4311_soh_shipclass AS shipclass,";
				 queryString += "st.terms AS term,st.custbody_c4311_soh_freightterm AS freightterms,st.custbody_c5718_powerordertype AS powerorder,tl.item AS itemid,";
				 queryString += "tl.quantity AS qty,sotl.custcol_c14193_memo AS memo,i.custitem_c5657_limitqty AS limitqty,st.foreigntotal AS amt,";
				 queryString += "bt.custbody_c5637_tracking_number AS trackingnum,bt.custbody_c5637_actual_shipping_carrier AS shippingcarrier,bt.custbody_c5637_actual_shipping_class AS shippingclass,";
				 queryString += "bt.custbody_c5637_number_pallets AS pallets,bt.custbody_c5637_total_manifested_packag AS manifestedpackage,";
				 queryString += "bt.custbody_c5637_total_manifested_weight AS manifestedweight,bt.custbody_c5637_bol_number AS bolnumber,bt.custbody_c5637_bol_comment AS bolcomment,";
				 queryString += "bt.custbody_c5637_arn_number AS arnnumber,bt.custbody_c5637_actual_ship_class_code AS classcode,bt.custbody_c5637_carrier_service AS carrierservice,sotl.id AS lineid,sotl.specialorder AS specialorder,";
				 queryString += "sotl.custcol_c47548_vendor_direct AS vendordirect,sotl.custcol_c47548_special_order AS orderspecial,tl.id AS vbline ";
				 queryString += "FROM transactionline AS tl ";
				 queryString += "JOIN transaction AS bt ON tl.transaction = bt.id ";
				 queryString += "JOIN transactionline AS potl ON tl.item = potl.item AND tl.custcol_c47548_order_doc = potl.transaction AND tl.custcol_c47548_line_unique_key = potl.uniquekey ";
				 queryString += "JOIN transactionline AS sotl ON potl.custcol_c47548_created_from = sotl.transaction AND sotl.item = potl.item ";
				 queryString += "JOIN transaction AS st ON sotl.transaction = st.id AND st.recordtype = 'salesorder' ";
				 queryString += "JOIN item AS i ON tl.item = i.id ";
				 queryString += "JOIN subsidiary AS s ON sotl.subsidiary = s.id ";
				 queryString += "WHERE tl.transaction = '" + recId + "' AND tl.mainline = 'F' AND tl.taxline = 'F' AND tl.iscogs = 'F' AND tl.donotdisplayline = 'F' ";
				 queryString += "AND potl.mainline = 'F' AND potl.taxline = 'F' AND potl.iscogs = 'F' AND potl.donotdisplayline = 'F' ";
				 queryString += "AND sotl.mainline = 'F' AND sotl.taxline = 'F' AND sotl.iscogs = 'F' AND sotl.donotdisplayline = 'F' AND (sotl.dropship = 'T' OR (sotl.specialorder = 'T' AND sotl.location = s.custrecord_c47548_drop_ship_location) OR sotl.custcol_c47548_vendor_direct = 'T')";

				 //log.debug('queryString', queryString);
				 var queryResults = query.runSuiteQL({ query: queryString });
				 var records = queryResults.asMappedResults();
				 log.debug('records', records);
				 log.debug('records length', records.length);

						 //Staging items
						 
						 for (j = 0; j < vbPOItemDetailsArr.length; j++) {
							 var ibShipItemIndex = _.findIndex(vbibShipDetails, function(o) {
								 return o.ibShipPO == vbPOItemDetailsArr[j].poId && o.ibShipItem == vbPOItemDetailsArr[j].poItem && o.ibShipLineUniqKey == vbPOItemDetailsArr[j].poItemLineUniq;
							 });
							 //log.debug("ibShipItemIndex@" + j,ibShipItemIndex);

							 var pprlItemIndex = _.findIndex(vbPPRLDetails, function(o) {
								 return o.pprlPO == vbPOItemDetailsArr[j].poId && o.pprlPOItem == vbPOItemDetailsArr[j].poItem && o.pprlPOItemUniqKey == vbPOItemDetailsArr[j].poItemLineUniq;
							 });
							 //log.debug("pprlItemIndex@" + j,pprlItemIndex);

							 if (ibShipItemIndex != -1) {

								 if (vbPOItemDetailsArr[j].billItemQty != vbibShipDetails[ibShipItemIndex].ibShipQtyRcvd && records.length == 0) {
									 vendCred.selectNewLine({
										 sublistId: 'item'
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'item',
										 value: qtyVarItemId
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_original_item',
										 value: vbPOItemDetailsArr[j].billItem
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'quantity',
										 value: Math.abs(vbPOItemDetailsArr[j].billItemQty - vbibShipDetails[ibShipItemIndex].ibShipQtyRcvd)
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'rate',
										 value: vbPOItemDetailsArr[j].billItemRate
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_po_number',
										 value: vbPOItemDetailsArr[j].poId
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_po_line',
										 value: vbPOItemDetailsArr[j].poItemLineNum
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_bill_num',
										 value: vbPOItemDetailsArr[j].billId
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_applied_bill_line',
										 value: vbPOItemDetailsArr[j].billItemLineId
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_billed_price',
										 value: vbPOItemDetailsArr[j].billItemRate
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_accepted_price',
										 value: vbPPRLDetails[pprlItemIndex].pprlPayRate
									 });
									 vendCred.commitLine({
										 sublistId: 'item'
									 });
									 qtyVarianceCnt++;
									 if(Math.abs(vbPOItemDetailsArr[j].billItemQty - vbibShipDetails[ibShipItemIndex].ibShipQtyRcvd) != Math.abs(vbPOItemDetailsArr[j].billItemQty)){
										 addOtherItem = false;
									 }
									 
									 // quantity variance 
									 var billCreditAmt = (vbPOItemDetailsArr[j].billItemRate)*(Math.abs(vbPOItemDetailsArr[j].billItemQty - vbibShipDetails[ibShipItemIndex].ibShipQtyRcvd));
									 var jsonObj = {};
									 jsonObj['billInvoice']        = vbPOItemDetailsArr[j].billInvoice;
									 jsonObj['poDocNum']           = vbPOItemDetailsArr[j].poDocNum; 
									 jsonObj['vendorName']         = vbPOItemDetailsArr[j].vendorName;
									 jsonObj['item']               = vbPOItemDetailsArr[j].billItemText;
									 jsonObj['billQuantity']       = vbPOItemDetailsArr[j].billItemQty;
									 jsonObj['billCreditQuantity'] = Math.abs(vbPOItemDetailsArr[j].billItemQty - vbibShipDetails[ibShipItemIndex].ibShipQtyRcvd);
									 jsonObj['billCreditRate']     = vbPOItemDetailsArr[j].billItemRate;
									 jsonObj['billCreditAmt']      = billCreditAmt;
									 jsonObj['EmailAddress']       = vbPOItemDetailsArr[j].EmailAddress; 
									 jsonObj['buyerId']            = vbPOItemDetailsArr[j].buyerId;
									 jsonObj['billMpn']            = vbPOItemDetailsArr[j].billMpn;
									 qtyVarianceArray.push(jsonObj);
								 }

							 } else if(records.length == 0){
							   
							   log.debug("VB- " + vBId, "Removed Line adding as Qty var" )
								 vendCred.selectNewLine({
										 sublistId: 'item'
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'item',
										 value: qtyVarItemId
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_original_item',
										 value: vbPOItemDetailsArr[j].billItem
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'quantity',
										 value: vbPOItemDetailsArr[j].billItemQty
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'rate',
										 value: vbPOItemDetailsArr[j].billItemRate
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_po_number',
										 value: vbPOItemDetailsArr[j].poId
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_po_line',
										 value: vbPOItemDetailsArr[j].poItemLineNum
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_bill_num',
										 value: vbPOItemDetailsArr[j].billId
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_applied_bill_line',
										 value: vbPOItemDetailsArr[j].billItemLineId
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_billed_price',
										 value: vbPOItemDetailsArr[j].billItemRate
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_accepted_price',
										 value: vbPPRLDetails[pprlItemIndex].pprlPayRate
									 });
									 vendCred.commitLine({
										 sublistId: 'item'
									 });
                                     qtyVarianceCnt++;									 
									 
									 // quantity variance
									 var jsonObj = {};
									 jsonObj['billInvoice']        = vbPOItemDetailsArr[j].billInvoice;
									 jsonObj['poDocNum']           = vbPOItemDetailsArr[j].poDocNum; 
									 jsonObj['vendorName']         = vbPOItemDetailsArr[j].vendorName;
									 jsonObj['item']               = vbPOItemDetailsArr[j].billItemText;
									 jsonObj['billQuantity']       = vbPOItemDetailsArr[j].billItemQty;
									 jsonObj['billCreditQuantity'] = vbPOItemDetailsArr[j].billItemQty;
									 jsonObj['billCreditRate']     = vbPOItemDetailsArr[j].billItemRate;
									 jsonObj['billCreditAmt']      = vbPOItemDetailsArr[j].billItemAmt;
									 jsonObj['EmailAddress']       = vbPOItemDetailsArr[j].EmailAddress; 
									 jsonObj['buyerId']            = vbPOItemDetailsArr[j].buyerId;
									 jsonObj['billMpn']            = vbPOItemDetailsArr[j].billMpn;
									 qtyVarianceArray.push(jsonObj);
							 }

							 if ((pprlItemIndex != -1 && ibShipItemIndex > -1) || (pprlItemIndex != -1 && records.length > 0)) {
								 if(vbPOItemDetailsArr[j].unitConvertion){
									 var itemBillRate = vbPOItemDetailsArr[j].billItemRate; 
									 vendCred.setValue("custbody_c53174_converstion", itemBillRate);
									 vbPOItemDetailsArr[j].billItemRate = vendCred.getValue({fieldId: 'custbody_c53174_converstion'});
								 }
								 
								 if (vbPOItemDetailsArr[j].billItemRate != vbPPRLDetails[pprlItemIndex].pprlPayRate && Math.abs(vbPOItemDetailsArr[j].billItemRate - vbPPRLDetails[pprlItemIndex].pprlPayRate) > 0.009999) {  								
									 vendCred.selectNewLine({
										 sublistId: 'item'
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'item',
										 value: rateVarItemId
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_original_item',
										 value: vbPOItemDetailsArr[j].billItem
									 });
									 
									 if(ibShipItemIndex > -1){
									   vendCred.setCurrentSublistValue({
										   sublistId: 'item',
										   fieldId: 'quantity',
										   value: vbibShipDetails[ibShipItemIndex].ibShipQtyRcvd
									   });
									 }
									 else{
									   vendCred.setCurrentSublistValue({
										   sublistId: 'item',
										   fieldId: 'quantity',
										   value: vbPOItemDetailsArr[j].billItemQty
									   });	
									 }
									 
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'rate',
										 value: Math.abs(vbPOItemDetailsArr[j].billItemRate - vbPPRLDetails[pprlItemIndex].pprlPayRate)
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_po_number',
										 value: vbPOItemDetailsArr[j].poId
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_po_line',
										 value: vbPOItemDetailsArr[j].poItemLineNum
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_bill_num',
										 value: vbPOItemDetailsArr[j].billId
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_applied_bill_line',
										 value: vbPOItemDetailsArr[j].billItemLineId
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_billed_price',
										 value: vbPOItemDetailsArr[j].billItemRate
									 });
									 vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_accepted_price',
										 value: vbPPRLDetails[pprlItemIndex].pprlPayRate
									 });
									 vendCred.commitLine({
										 sublistId: 'item'
									 });
									 // price variance
									 
									 if(ibShipItemIndex > -1){
									   var billCreditAmt = (Math.abs(vbPOItemDetailsArr[j].billItemRate - vbPPRLDetails[pprlItemIndex].pprlPayRate))*vbibShipDetails[ibShipItemIndex].ibShipQtyRcvd;
									 }
									 else{
									   var billCreditAmt = (Math.abs(vbPOItemDetailsArr[j].billItemRate - vbPPRLDetails[pprlItemIndex].pprlPayRate))*vbPOItemDetailsArr[j].billItemQty;
									 }
									 
									 var jsonObj = {};
									 jsonObj['billInvoice']        = vbPOItemDetailsArr[j].billInvoice;
									 jsonObj['poDocNum']           = vbPOItemDetailsArr[j].poDocNum; 
									 jsonObj['vendorName']         = vbPOItemDetailsArr[j].vendorName;
									 jsonObj['item']               = vbPOItemDetailsArr[j].billItemText;
									 jsonObj['billQuantity']       = vbPOItemDetailsArr[j].billItemQty;
									 jsonObj['billedPrice']        = vbPOItemDetailsArr[j].billItemRate;
									 jsonObj['acceptedPrice']      = vbPPRLDetails[pprlItemIndex].pprlPayRate; 
									 jsonObj['billCreditRate']     = Math.abs(vbPOItemDetailsArr[j].billItemRate - vbPPRLDetails[pprlItemIndex].pprlPayRate);
									 jsonObj['billCreditAmt']      = billCreditAmt;
									 jsonObj['EmailAddress']       = vbPOItemDetailsArr[j].EmailAddress;
									 jsonObj['buyerId']            = vbPOItemDetailsArr[j].buyerId;
									 jsonObj['billMpn']            = vbPOItemDetailsArr[j].billMpn;
									 
									 if(ibShipItemIndex > -1){
									   jsonObj['billCreditQuantity'] = vbibShipDetails[ibShipItemIndex].ibShipQtyRcvd;
									 }
									 else{
									   jsonObj['billCreditQuantity'] = vbPOItemDetailsArr[j].billItemQty;	
									 }
									 
									 priceVarianceArray.push(jsonObj);
								 }

							 }

						 } //end for()

						 log.debug("VB- " + rec.id + ", Vendor Credit Record Obj- ", vendCred);
						 
						 var finalLineCnt = vendCred.getLineCount({sublistId: 'item'});
						 log.debug("finalLineCnt", finalLineCnt);
						 
						 if(finalLineCnt > 0){
						   log.debug("addOtherItem", addOtherItem);
						   log.debug("vbPOItemDetailsArr.length", vbPOItemDetailsArr.length);
						   log.debug("qtyVarianceCnt", qtyVarianceCnt);
						   if(addOtherItem && vbPOItemDetailsArr.length == qtyVarianceCnt){
							   for(var f = 0; f < vbItemLineCount; f++){
								   var itemType = rec.getSublistValue({sublistId: 'item',fieldId: 'itemtype',line: f});
								   if(itemType != 'Assembly' && itemType != 'InvtPart'){
									   var billItemId = rec.getSublistValue({sublistId: 'item',fieldId: 'item',line: f});
									   var billQty = rec.getSublistValue({sublistId: 'item',fieldId: 'quantity',line: f});
									   var billLineRate = rec.getSublistValue({sublistId: 'item',fieldId: 'rate',line: f});
									   
									   vendCred.selectNewLine({
										 sublistId: 'item'
									   });
									   vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'item',
										 value: billItemId
									   });
									   vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'quantity',
										 value: billQty
									   });
									   vendCred.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'rate',
										 value: billLineRate
									   });
									   
									   var itemAmt = vendCred.getCurrentSublistValue({sublistId: 'item',fieldId: 'amount'});
									   var itemMpn = rec.getSublistText({sublistId: 'item',fieldId: 'item',line: f});
									   
									   vendCred.commitLine({
										 sublistId: 'item'
									   });
									   
									   var jsonObj = {};
									   jsonObj['billInvoice']        = vbPOItemDetailsArr[0].billInvoice;
									   jsonObj['poDocNum']           = vbPOItemDetailsArr[0].poDocNum; 
									   jsonObj['vendorName']         = vbPOItemDetailsArr[0].vendorName;
									   jsonObj['item']               = billItemId;
									   jsonObj['billQuantity']       = billQty;
									   jsonObj['billCreditQuantity'] = billQty;
									   jsonObj['billCreditRate']     = billLineRate;
									   jsonObj['billCreditAmt']      = itemAmt;
									   jsonObj['EmailAddress']       = vbPOItemDetailsArr[0].EmailAddress; 
									   jsonObj['buyerId']            = vbPOItemDetailsArr[0].buyerId;
									   jsonObj['billMpn']            = itemMpn;
									   qtyVarianceArray.push(jsonObj);
								   }
							   }
						   }

						   // Apply the Vendor Credit to the source Vendor Bill for the credit total (not the VB total).
						   var vendCredApplyLine = vendCred.findSublistLineWithValue({
							   sublistId: 'apply',
							   fieldId: 'doc',
							   value: Number(vBId)
						   });
						   if (vendCredApplyLine == -1) {
							   vendCredApplyLine = vendCred.findSublistLineWithValue({
								   sublistId: 'apply',
								   fieldId: 'internalid',
								   value: Number(vBId)
							   });
						   }
						   log.debug("vendCredApplyLine", vendCredApplyLine);

						   if (vendCredApplyLine != -1) {
							   var credTotal = vendCred.getValue({ fieldId: 'total' });
							   credTotal = Math.abs(Number(credTotal)) || 0;
							   vendCred.selectLine({
								   sublistId: "apply",
								   line: vendCredApplyLine
							   });
							   vendCred.setCurrentSublistValue({
								   sublistId: 'apply',
								   fieldId: 'apply',
								   value: true
							   });
							   vendCred.setCurrentSublistValue({
								   sublistId: 'apply',
								   fieldId: 'amount',
								   value: credTotal
							   });
							   vendCred.commitLine({
								   sublistId: "apply"
							   });
						   }
						   vendCredId = vendCred.save();
						   log.debug("VB- " + rec.id, "Vendor Credit Record Id- " + vendCredId);
						 }

						 if (vendCredId) {

							 var id = record.submitFields({
								 type: record.Type.VENDOR_BILL,
								 id: rec.id,
								 values: {
									 custbody_c41749_ppra: payRcptAmt,
									 custbody_c43409_claimfiled: true,
									 memo: 'Claim Filed'
								 },
								 options: {
									 enableSourcing: false,
									 ignoreMandatoryFields: true
								 }
							 });
							 log.debug("Vend Credit-VBId-", id);
						 }

					 } //end create Vendor Credit

					 // Create Vendor Bill
					 if (payRcptAmt > vbTotalAmt) {
					 	logAudit('Phase-8', 'Creating New Vendor Bill (Debit Note)', { vbId: vBId, payRcptAmt: payRcptAmt, vbTotalAmt: vbTotalAmt });

						 log.debug("VB- " + rec.id, "Create Vendor Bill");
						 var vendBill = record.create({
							 type: "vendorbill",
							 isDynamic: true,
						 });
						 var vendBillRefNo = 'OVERAGES-' + billInvoice;
						 vendBill.setValue("subsidiary", vbSub);
						 vendBill.setValue("entity", vend);
						 vendBill.setValue("tranid", vendBillRefNo);
						 vendBill.setValue("location", vbLoc);
						 vendBill.setValue("custbody_c53174_vb_debit_note", true);
						 //Staging items
						 for (j = 0; j < vbPOItemDetailsArr.length; j++) {

							 var ibShipItemIndex = _.findIndex(vbibShipDetails, function(o) {
								 return o.ibShipPO == vbPOItemDetailsArr[j].poId && o.ibShipItem == vbPOItemDetailsArr[j].billItem && o.ibShipLineUniqKey == vbPOItemDetailsArr[j].poItemLineUniq;
							 });
							 //log.debug("ibShipItemIndex@" + j,ibShipItemIndex);

							 var pprlItemIndex = _.findIndex(vbPPRLDetails, function(o) {
								 return o.pprlPOItem == vbPOItemDetailsArr[j].billItem;
							 });
							 //log.debug("pprlItemIndex@" + j,pprlItemIndex);

							 if (ibShipItemIndex != -1) {

								 if (vbPOItemDetailsArr[j].billItemQty != vbibShipDetails[ibShipItemIndex].ibShipQtyRcvd) {
									 log.debug("Set Qty Diff Item")
									 vendBill.selectNewLine({
										 sublistId: 'item'
									 });
									 vendBill.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'item',
										 value: qtyVarItemId
									 });
									 vendBill.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_original_item',
										 value: vbPOItemDetailsArr[j].billItem
									 });
									 vendBill.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'quantity',
										 value: Math.abs(vbPOItemDetailsArr[j].billItemQty - vbibShipDetails[ibShipItemIndex].ibShipQtyRcvd)
									 });
									 vendBill.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'rate',
										 value: vbPOItemDetailsArr[j].billItemRate
									 });
									 vendBill.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_po_number',
										 value: vbPOItemDetailsArr[j].poId
									 });
									 vendBill.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_po_line',
										 value: vbPOItemDetailsArr[j].poItemLineNum
									 });
									 vendBill.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_bill_num',
										 value: vbPOItemDetailsArr[j].billId
									 });
									 vendBill.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_applied_bill_line',
										 value: vbPOItemDetailsArr[j].billItemLineId
									 });
									 vendBill.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_billed_price',
										 value: vbPOItemDetailsArr[j].billItemRate
									 });
									 vendBill.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_accepted_price',
										 value: vbPPRLDetails[pprlItemIndex].pprlPayRate
									 });
									 vendBill.commitLine({
										 sublistId: 'item'
									 });
								 }

							 }

							 if (pprlItemIndex != -1) {
								 
								 if (vbPOItemDetailsArr[j].billItemRate != vbPPRLDetails[pprlItemIndex].pprlPayRate && Math.abs(vbPOItemDetailsArr[j].billItemRate - vbPPRLDetails[pprlItemIndex].pprlPayRate) > 0.009999) {
									 log.debug("Set rate Diff Item")
									 vendBill.selectNewLine({
										 sublistId: 'item'
									 });
									 vendBill.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'item',
										 value: rateVarItemId
									 });
									 vendBill.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_original_item',
										 value: vbPOItemDetailsArr[j].billItem
									 });
									 vendBill.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'quantity',
										 value: '1'
									 });

									 vendBill.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'rate',
										 value: Math.abs(vbPOItemDetailsArr[j].billItemRate - vbPPRLDetails[pprlItemIndex].pprlPayRate)
									 });
									 vendBill.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_po_number',
										 value: vbPOItemDetailsArr[j].poId
									 });
									 vendBill.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_po_line',
										 value: vbPOItemDetailsArr[j].poItemLineNum
									 });
									 vendBill.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_bill_num',
										 value: vbPOItemDetailsArr[j].billId
									 });
									 vendBill.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_applied_bill_line',
										 value: vbPOItemDetailsArr[j].billItemLineId
									 });
									 vendBill.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_billed_price',
										 value: vbPOItemDetailsArr[j].billItemRate
									 });
									 vendBill.setCurrentSublistValue({
										 sublistId: 'item',
										 fieldId: 'custcol_c53174_dc_accepted_price',
										 value: vbPPRLDetails[pprlItemIndex].pprlPayRate
									 });
									 vendBill.commitLine({
										 sublistId: 'item'
									 });
								 }

							 }

						 } //end for()
						 log.debug("VB- " + rec.id + ", New Vendor Bill Record Obj- ", vendBill);
					 
					     var billLineCnt = vendBill.getLineCount({sublistId: 'item'});
						 log.debug("billLineCnt", billLineCnt);
						 
						 if(billLineCnt > 0){
						   vendBillId = vendBill.save();
						 }
						 log.debug("VB- " + rec.id, "New Vendor Bill Record Id- " + vendBillId);

						 if (vendBillId) {

							 var id = record.submitFields({
								 type: record.Type.VENDOR_BILL,
								 id: rec.id,
								 values: {
									 custbody_c41749_ppra: payRcptAmt
								 },
								 options: {
									 enableSourcing: false,
									 ignoreMandatoryFields: true
								 }
							 });
							 log.debug("New Vend Bill-VBId-", id);
						 }

					 } // end create Vendor Bill
					 
					 
					 // Credit Memo Printout/Email on Generation start
					 log.debug('qtyVarianceArray', JSON.stringify(qtyVarianceArray)); 
					 log.debug('priceVarianceArray', JSON.stringify(priceVarianceArray)); 
					 var emailAddress;
					 var buyer;
					 var attachment = [];
					 var totaPriceCredit = 0;
					 var totalQtyCredit = 0;
					 var date = new Date();
					 var parsedDate= format.format({
						 value: date,
						 type: format.Type.DATE
					 });
					 if(qtyVarianceArray.length>0){
						 
						 var contents = 'Date'+',' + 'Invoice Number' + ',' + 'Purchase Order'+',' + 'BOL Number'+',' + 'Vendor'+',' + 'Item'+',' + 'Quantity Billed'+',' + 'Quantity Received'+',' + 'Quantity Short'+',' + 'Invoiced Rate'+',' + 'Claim Amount'+'\n';
						 for(var aa = 0; aa < qtyVarianceArray.length; aa++) {
							 
							 if(aa == 0){
								 emailAddress      = qtyVarianceArray[aa].EmailAddress; 
								 buyer             = qtyVarianceArray[aa].buyerId;
							 }
							 var invoiceNumber      = qtyVarianceArray[aa].billInvoice;
							 var purchaseOrder      = qtyVarianceArray[aa].poDocNum;
							 var vendorName 		   = qtyVarianceArray[aa].vendorName;
							 var item 			   = qtyVarianceArray[aa].billMpn;
							 var quantityBilled 	   = qtyVarianceArray[aa].billQuantity;
							 var qantityShort       = qtyVarianceArray[aa].billCreditQuantity;
							 var qtyReceived 	   = quantityBilled-qantityShort;
							 var invoiceRate        = qtyVarianceArray[aa].billCreditRate;
							 var claimAmt	       = qtyVarianceArray[aa].billCreditAmt;
							 totalQtyCredit         += claimAmt;
							 purchaseOrder = 'Purchase Order #'+purchaseOrder;
							 contents += parsedDate + ',' +invoiceNumber + ',' +purchaseOrder + ',' +bolNumber + ',' +vendorName + ',' +item + ','+ quantityBilled + ',' + qtyReceived + ',' + qantityShort + ',' + invoiceRate + ',' +claimAmt +'\n';
						 }
						 var qtyPriceObj = file.create({
							 name: 'Quantity Variances Claim Against Invoice '+billInvoice+'.csv',
							 fileType: file.Type.CSV,
							 contents: contents,
							 folder: 3078984,
							 isOnline: true
						 });
						 attachment.push(qtyPriceObj);
						 var qtyFileId = qtyPriceObj.save();
						 log.debug('Quantity Variance File', qtyFileId);
					 }
					 
					 if(priceVarianceArray.length>0){
						 
						 var contents = 'Date'+',' + 'Invoice Number' + ',' + 'Purchase Order'+',' + 'BOL Number'+',' + 'Vendor'+',' + 'Item'+',' + 'Quantity Billed'+',' + 'Quantity Received'+',' + 'Quantity Claimed'+',' +  'Invoiced Rate'+',' + 'PD Pay Rate'+',' + 'Rate Difference'+','  + 'Claim Amount'+'\n';
						 for(var bb = 0; bb < priceVarianceArray.length; bb++) {		
									 
							 if(bb == 0){
								 emailAddress      = priceVarianceArray[bb].EmailAddress;
								 buyer             = priceVarianceArray[bb].buyerId;
							 }
							 var invoiceNumber      = priceVarianceArray[bb].billInvoice;
							 var purchaseOrder      = priceVarianceArray[bb].poDocNum;
							 var vendorName 		   = priceVarianceArray[bb].vendorName;
							 var item 			   = priceVarianceArray[bb].billMpn;
							 var quantityBilled 	   = priceVarianceArray[bb].billQuantity;
							 var qtyReceived        = priceVarianceArray[bb].billCreditQuantity;
							 var invoiceRate        = priceVarianceArray[bb].billedPrice;
							 var pdPayRate          = priceVarianceArray[bb].acceptedPrice;
							 var billCreditRate     = priceVarianceArray[bb].billCreditRate;
							 var claimAmt	       = priceVarianceArray[bb].billCreditAmt;
							 
							 totaPriceCredit        += claimAmt;
							 purchaseOrder = 'Purchase Order #'+purchaseOrder;
							 
							 contents += parsedDate + ',' +invoiceNumber + ',' +purchaseOrder + ',' +bolNumber + ',' +vendorName + ',' +item + ','+ quantityBilled + ',' + qtyReceived +',' + qtyReceived + ',' + invoiceRate + ',' + pdPayRate + ',' + billCreditRate + ',' +claimAmt +'\n';
						 }
						 var priceFileObj = file.create({
							 name: 'Price Variances Claim Against Invoice '+billInvoice+'.csv',
							 fileType: file.Type.CSV,
							 contents: contents,
							 folder: 3078984,
							 isOnline: true
						 });
						 attachment.push(priceFileObj);
						 var priceFileId = priceFileObj.save();
						 log.debug('Quantity Variance File', priceFileId);
					 }
					 
					 var totalCredit = parseFloat(totaPriceCredit)+parseFloat(totalQtyCredit);
					 totalCredit = totalCredit.toFixed(2);
					 var body = "<p>Invoice - " +billInvoice+ " will be short paid by $" +totalCredit+ " based on the variances claimed and identified in the attached file(s). Quantity Variances and Price Variances are reported in separate files.</p>\
					  <br><p>Please Note:</p>\
					  <p>Quantity Variances Claimed are Items that were either not Received or Damaged.</p>";
					  
					  var buyerEmail;
					  if(buyer){
						  var employeddLookUp = search.lookupFields({
							  type: 'employee',
							  id: buyer,
							  columns: 'email'
						  });
						   buyerEmail = employeddLookUp.email;
					  }
					 
					 if(!emailAddress && buyerEmail){
						  emailAddress = buyerEmail;
					  } 
					  log.debug('buyerEmail1', buyerEmail);
					  log.debug('emailAddress1', emailAddress);
					  
					  if(emailAddress && buyerEmail){
						  
						 emailAddress = emailAddress.split(';');
						 email.send({
							 author: 167455, //Vendor claims
							 recipients: emailAddress,
							 subject: 'Invoice - '+billInvoice+' | Vendor Bill Variance Claim' ,
							 body:body,
							 attachments: attachment,
							 bcc: ['kevin.riebeling@powerdistributors.com','todd.graham@powerdistributors.com'],
							 cc:[buyerEmail],
							 relatedRecords: {transactionId:parseInt(vendCredId)}
						 });
					  }
					  else if(emailAddress){
						  email.send({
							 author: 167455, //Vendor claims
							 recipients: emailAddress,
							 subject: 'Invoice - '+billInvoice+' | Vendor Bill Variance Claim' ,
							 body:body,
							 attachments: attachment,
							 bcc: ['kevin.riebeling@powerdistributors.com','todd.graham@powerdistributors.com'],
							 relatedRecords: {transactionId:parseInt(vendCredId)}
						 });
					  }
					 // Credit Memo Printout/Email on Generation end
					 
				 } // end of If(statConditions)
					 
				 
			 } catch (e) {
				 log.error("Error from afterSubmit() on " + rec.id, e.toString());
			 }
		 }

		 return {
			 afterSubmit: afterSubmit
		 };
	 });
