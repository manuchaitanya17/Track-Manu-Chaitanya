/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 *
 */
/*****************************************************************************
 *  * Copyright (c) 2021 - Present Crowe LLP - All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Crowe LLP. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered with Crowe LLP.
*
* FILE NAME: CSS_MR_create_invoice_record.js
* DEVOPS TASK: 
* AUTHOR: Sudesh Srivastava
* DATE CREATED: 
* DESCRIPTION: This script create invoice and payment from custom invoice records.
* REVISION HISTORY
* Date          DevOps item No.    By                      Issue Fix Summary   
*============================================================================                  
*****************************************************************************/

define(['N/record', 'N/runtime', 'N/query', 'N/search', 'N/file', 'N/email', 'N/format', 'N/error', 'N/render','./Crowe_library.js'],
	function (record, runtime, query, search, file, email, format, error, render, library) {
		var fileid = '';

		function getInputData() {
			try {
				var mapArr = new Array();
				
				var customrecord_c_custom_invoiceSearchObj = search.create({
					type: "customrecord_c105779_custom_inv_header",
					filters:
					   [
						  ["isinactive","is","F"], 
						  "AND", 
						  ["custrecord_c105779_error_message","isempty",""],
						  "AND",
						  ["custrecord_c105779_original_inv","anyof","@NONE@"]
					   ],
					columns:
					   [
						  search.createColumn({
							 name: "internalid",
							 label: "Internal Id"
						  })
					   ]
				});
				var resultsSet = customrecord_c_custom_invoiceSearchObj.run();
				var result = resultsSet.getRange(0, 999);
				log.debug('result',result);
				log.debug('Total tran record',result.length);
				if (result.length > 0) 
				{
					var invHeaderarr = new Array();
					for(var f = 0; f < result.length; f++) 
					{
						var customInvheadrer = result[f].getValue({
							name: "internalid"
						});
						log.debug('customInvheadrer',customInvheadrer);

						invHeaderarr.push(customInvheadrer);
					}
				}
				log.debug('invHeaderarr',invHeaderarr);
				return invHeaderarr;
			}
			catch (ex) {
				log.debug('Error get', ex.message);
			}
		}

		function map(context) {
			var vendTranarr = new Array();
			try 
			{
				var rec_detail = JSON.parse(context.value);
				log.debug('recDetail',rec_detail);

				if(library.isNotEmpty(rec_detail))
				{
					var customrecord_c105779_custom_invoiceSearchObj = search.create({
						type: "customrecord_c105779_custom_invoice",
						filters:
						[
							["custrecord_c_error_message","isempty",""], 
							"AND", 
							["custrecord_c_approved","is","T"], 
							"AND", 
							["isinactive","is","F"], 
							"AND", 
							["custrecord_c_custom_inv_header","anyof",rec_detail]
						],
						columns:
						[
						   search.createColumn({name: "custrecord_c_amount", label: "Amount"}),
						   search.createColumn({name: "custrecord_c_amt_before_vat", label: "Amount Before VAT"}),
						   search.createColumn({name: "custrecord_c_approved", label: "Approved"}),
						   search.createColumn({name: "custrecord_c_billing_address", label: "Billing Address"}),
						   search.createColumn({name: "custrecord_c_country", label: "Country"}),
						   search.createColumn({name: "custrecord_c_custom_inv_header", label: "Custom Invoice Header"}),
						   search.createColumn({name: "custrecord_c_customer", label: "Customer"}),
						   search.createColumn({name: "custrecord_c_email", label: "Email"}),
						   search.createColumn({name: "custrecord_c_file_detail", label: "File Detail"}),
						   search.createColumn({name: "id", label: "ID"}),
						   search.createColumn({name: "internalid", label: "Internal ID"}),
						   search.createColumn({name: "custrecord_c_invoice_date", label: "Invoice Date"}),
						   search.createColumn({name: "custrecord_c_invoice_number", label: "Invoice Number"}),
						   search.createColumn({name: "custrecord_c_invoice_to", label: "Invoice To"}),
						   search.createColumn({name: "custrecord_c_item", label: "Item"}),
						   search.createColumn({name: "custrecord_c_journal_subtitle", label: "Journal Subtitle"}),
						   search.createColumn({name: "custrecord_c_journal_title", label: "Journal Title"}),
						   search.createColumn({name: "custrecord_c_manuscript_publish_year", label: "Manuscript Publishing Year"}),
						   search.createColumn({name: "custrecord_c_payment_mode", label: "Payment Mode"}),
						   search.createColumn({name: "custrecord_c_payment_status", label: "Payment Status"}),
						   search.createColumn({name: "custrecord_c_reference_number", label: "Reference Number"}),
						   search.createColumn({name: "custrecord_c_service_description", label: "Service Description"}),
						   search.createColumn({name: "custrecord_c_service_disc_amount", label: "Service Discounted Amount"}),
						   search.createColumn({name: "custrecord_c_service_name", label: "Service Name"}),
						   search.createColumn({name: "custrecord_c_service_price", label: "Service Price"}),
						   search.createColumn({name: "custrecord_c_shipping_address", label: "Shipping Address"}),
						   search.createColumn({name: "custrecord_c_transaction_date", label: "Transaction Date"}),
						   search.createColumn({name: "custrecord_c_vat", label: "VAT"})
						]
					});
					var resultsSet = customrecord_c105779_custom_invoiceSearchObj.run();
					var result1 = resultsSet.getRange(0, 999);
					log.debug('result1',result1);
					log.debug('Total inv record',result1.length);
					var pushInarr = false;
					var lineArr = new Array();
					const byInvoice = new Map();
					for(var j = 0; j < result1.length; j++) 
					{
						var invName = result1[j].getValue({
							name: "custrecord_c_invoice_number"
						});
						var invHeader = result1[j].getValue({
							name: "custrecord_c_custom_inv_header"
						});

						var invAmt = result1[j].getValue({
							name: "custrecord_c_amount"
						});
						var invBilladdress = result1[j].getValue({
							name: "custrecord_c_billing_address"
						});
						var invCountry = result1[j].getValue({
							name: "custrecord_c_country"
						});
						var invCustomer = result1[j].getValue({
							name: "custrecord_c_customer"
						});
						var invCustomeremail = result1[j].getValue({
							name: "custrecord_c_email"
						});
						var invDate = result1[j].getValue({
							name: "custrecord_c_invoice_date"
						});
						var invTo = result1[j].getValue({
							name: "custrecord_c_invoice_to"
						});
						var invItem = result1[j].getValue({
							name: "custrecord_c_item"
						});
						var invJournalsubtitle = result1[j].getValue({
							name: "custrecord_c_journal_subtitle"
						});
						var invJournaltitle = result1[j].getValue({
							name: "custrecord_c_journal_title"
						});
						var invPublishyear = result1[j].getValue({
							name: "custrecord_c_manuscript_publish_year"
						});

						var invPaymentmode = result1[j].getValue({
							name: "custrecord_c_payment_mode"
						});
						var invPaymentsts = result1[j].getValue({
							name: "custrecord_c_payment_status"
						});
						var invRefno = result1[j].getValue({
							name: "custrecord_c_reference_number"
						});
						var invServicedesc = result1[j].getValue({
							name: "custrecord_c_service_description"
						});
						var invDiscamt = result1[j].getValue({
							name: "custrecord_c_service_disc_amount"
						});
						var invServicename = result1[j].getValue({
							name: "custrecord_c_service_name"
						});
						var invServiceprice = result1[j].getValue({
							name: "custrecord_c_service_price"
						});
						var invShippingaddress = result1[j].getValue({
							name: "custrecord_c_shipping_address"
						});
						var invTrandate = result1[j].getValue({
							name: "custrecord_c_transaction_date"
						});
						var invVat = result1[j].getValue({
							name: "custrecord_c_vat"
						});

						if (!byInvoice.has(invName)) {
							byInvoice.set(invName, {
							  invoiceNumber: invName,
							  invoiceBilladdress: invBilladdress,
							  invoiceShipaddress: invShippingaddress,
							  invoiceTrandate: invDate,
							  invoiceCustomerid: invCustomer,
							  invoiceheaderid: invHeader,
							  invoicePmtsts: invPaymentsts,
							  invoicePmtmode: invPaymentmode,
							  lineItem: []
							});
						}

						byInvoice.get(invName).lineItem.push({
							itemId: invItem || '',  
							itemRate: invServiceprice !== '' && invServiceprice != null ? String(invServiceprice) : '',
							itemQty: 1
						});
					}

					var invDetails = Array.from(byInvoice.values());
					log.debug('invDetails',invDetails);

					context.write({
						key: invHeader,
						value: invDetails
					})

				}
			}
			catch (ex) 
			{
				log.error('ERROR : map', ex.message);
			}
		}

		/**
		 * Helper: Add new item line OR update existing line if same item already exists
		 */
		function addOrUpdateItem(invRec, itemId, itemRate, itemQty) {
			try {
				var lineCount = invRec.getLineCount({
					sublistId: 'item'
				});
				var lineFound = false;

				for (var i = 0; i < lineCount; i++) {
					var existingItem = invRec.getSublistValue({
						sublistId: 'item',
						fieldId: 'item',
						line: i
					});

					if (existingItem == itemId) {
						// Update existing line
						invRec.selectLine({
							sublistId: 'item',
							line: i
						});

						if (library.isNotEmpty(itemRate)) {
							invRec.setCurrentSublistValue({
								sublistId: 'item',
								fieldId: 'rate',
								value: itemRate
							});
						}

						if (library.isNotEmpty(itemQty)) {
							invRec.setCurrentSublistValue({
								sublistId: 'item',
								fieldId: 'quantity',
								value: itemQty
							});
						}

						invRec.commitLine({
							sublistId: 'item'
						});

						lineFound = true;
						break;
					}
				}

				// If not found, add as new line
				if (!lineFound) {
					invRec.selectNewLine({
						sublistId: 'item'
					});

					if (library.isNotEmpty(itemId)) {
						invRec.setCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'item',
							value: itemId
						});
					}

					invRec.setCurrentSublistValue({
						sublistId: 'item',
						fieldId: 'price',
						value: -1
					});


					if (library.isNotEmpty(itemRate)) {
						invRec.setCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'rate',
							value: itemRate
						});
					}

					if (library.isNotEmpty(itemQty)) {
						invRec.setCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'quantity',
							value: itemQty
						});
					}

					invRec.commitLine({
						sublistId: 'item'
					});
				}
			} catch (e) {
				log.error('Error in addOrUpdateItem', e);
			}
		}

		function reduce(context) {
			try 
			{
				var hearderId = context.key;
				var invValue = context.values;
				invValue = JSON.parse(invValue);
				log.debug('hearderId reduce', hearderId);
				log.debug('value reduce', invValue);
				log.debug('value length reduce', invValue.length);

				var customer_id = invValue[0].invoiceCustomerid;
				var tranDt = invValue[0].invoiceTrandate;						
				var ship_Addr = invValue[0].invoiceShipaddress;	
				log.debug('ship_Addr',ship_Addr);	
				var bill_Addr = invValue[0].invoiceBilladdress;
				var itemLength = invValue[0].lineItem.length;
				log.debug('itemLength',itemLength);

				var invPmtsts = invValue[0].invoicePmtsts;
				log.debug('invPmtsts',invPmtsts);
				
				var invPmtmode = invValue[0].invoicePmtmode;
				log.debug('invPmtmode',invPmtmode);
				
				
				var invNo = invValue[0].invoiceNumber;
				log.debug('invNo',invNo);
				var invNSid = '';

				if(library.isNotEmpty(customer_id) && itemLength > 0)
				{
					var invRec = '';
					invNSid = library.findInvoice(invNo);
					log.debug('invNSid',invNSid);

					if(library.isNotEmpty(invNSid))
					{
						invRec = record.load({
							type: 'invoice',
							id: invNSid,
							isDynamic: true
						});
						var invSts = invRec.getValue('status');
						log.debug('invSts',invSts);
						if(invSts == 'Paid In Full' && invPmtsts == 'Complete')
						{
							return;
						}
					}
					else
					{
						invRec = record.transform({
							fromType: record.Type.CUSTOMER,
							fromId: customer_id,
							toType: record.Type.INVOICE,
							isDynamic: true,
						});
					}

					invRec.setValue({
						fieldId: 'location',
						value: 1
					});
					invRec.setValue({
						fieldId: 'custbody_c_inv_ref_no',
						value: invNo
					});
					log.debug('tranDt',tranDt);
					if(library.isNotEmpty(tranDt))
					{
						invRec.setValue({
							fieldId: 'trandate',
							value: format.parse({ value: tranDt, type: format.Type.DATE })
						});
					}
					log.debug('test','test');
					invRec.setValue({
						fieldId: 'approvalstatus',
						value: 2
					});
					
					invRec.setValue({
						fieldId: 'shipaddress',
						value: ship_Addr
					});
					
					
					invRec.setValue({
						fieldId: 'custbody_c_pmt_status',
						value: invPmtsts
					});
					invRec.setValue({
						fieldId: 'custbody_c_pmt_mode',
						value: invPmtmode
					});
					
					invRec.setValue({
						fieldId: 'billaddress',
						value: bill_Addr
					});
					
					var billLineadded = false;
					log.debug('itemLength',itemLength);
					if(itemLength > 0) 
					{
						for(var n = 0; n < itemLength; n++)
						{
							var itmId = invValue[0].lineItem[n].itemId;
							var itmRate = invValue[0].lineItem[n].itemRate;
							var itmQty = invValue[0].lineItem[n].itemQty;

							// 🔹 NEW LOGIC: add or update existing line
							addOrUpdateItem(invRec, itmId, itmRate, itmQty);

							var lcount  = invRec.getLineCount({
								sublistId: 'item'
							});
							log.debug('lcount',lcount);
							billLineadded = true;
						}
					}

					if(billLineadded)
					{
						invNSid = invRec.save();
						log.debug('invNSid 1',invNSid);
						if(library.isNotEmpty(invNSid))
						{
							record.submitFields({
								type: 'customrecord_c105779_custom_inv_header',
								id: hearderId,
								values: {
									custrecord_c105779_original_inv: invNSid
								}
							});
							if(library.isNotEmpty(invPmtsts) && invPmtsts == 'Complete')
							{
								var pmtRec = record.transform({
									fromType: record.Type.INVOICE,
									fromId: invNSid,
									toType: record.Type.CUSTOMER_PAYMENT
								});
								var amtBill = pmtRec.getValue('total');
								log.debug('amtBill',amtBill);
								var billAmount = amtBill;
								
								pmtRec.setValue({
									fieldId: 'trandate',
									value: format.parse({ value: tranDt, type: format.Type.DATE })
								});
	
								var billCount = pmtRec.getLineCount('apply');
								log.debug('billCount',billCount);
								if(billCount>0)
								{
									for(var b=0; b<billCount; b++)
									{
										var docNo = pmtRec.getSublistValue({
											sublistId: 'apply',
											fieldId: 'doc',
											line: b
										});
										var transType = pmtRec.getSublistValue({
											sublistId: 'apply',
											fieldId: 'trantype',
											line: b
										});
										
										if(library.isNotEmpty(docNo) && docNo == invNSid)
										{
											pmtRec.setSublistValue({
												sublistId: 'apply',
												fieldId: 'apply',
												line: b,
												value: true
											});
										}
									}
									
									var pmtId = pmtRec.save({
										enableSourcing: true,
										ignoreMandatoryFields: true
									});
									log.debug('pmtId',pmtId);
								}
							}
							else if(library.isNotEmpty(invPmtsts) && (invPmtsts == 'Reject' || invPmtsts == 'Cancel'))
							{
								var creditmemoRec = record.transform({
									fromType: record.Type.INVOICE,
									fromId: invNSid,
									toType: record.Type.CREDIT_MEMO
								});
								var tDt = '13/8/2024'
								creditmemoRec.setValue('trandate',format.parse({ value: tDt, type: format.Type.DATE }));
								var creditMemoId = creditmemoRec.save();
								log.debug('creditMemoId',creditMemoId);
							}
						}
					}							
				}
			}
			catch (errorObj) {
				log.debug('Error reduce', errorObj);
			}
		}

		function summarize(summary) {
			try {
				log.debug('Summary', 'Summary');
			}
			catch (errorObj) {
				log.debug('Error summary', JSON.stringify(errorObj));
			}
		}

		function usage() {
			return runtime.getCurrentScript().getRemainingUsage();
		}	

		return {
			getInputData: getInputData,
			map: map,
			reduce: reduce,
			summarize: summarize
		};
	});
