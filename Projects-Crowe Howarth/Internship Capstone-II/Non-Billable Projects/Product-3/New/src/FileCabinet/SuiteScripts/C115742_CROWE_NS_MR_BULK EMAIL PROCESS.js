/**
 * Type				: MapReduce Script
 * ScriptId			: customscript_css_mr_bulk_email_process
 * Deployement Id	: customdeploy_css_mr_bulk_email_process
 *
 * Description		: MapReduce for bulk email process for transactions.
 */
/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/runtime', './lodash.min.js', 'N/format', 'N/query', 'N/email', 'N/render', 'N/https', 'N/url', 'N/file'],
	/**
	 * @param {record} record
	 * @param {search} search
	 */
	function (record, search, runtime, _, format, query, email, render, https, url, file) {

		/**
		 * Marks the beginning of the Map/Reduce process and generates input data.
		 *
		 * @typedef {Object} ObjectRef
		 * @property {number} id - Internal ID of the record instance
		 * @property {string} type - Record type id
		 *
		 * @return {Array|Object|Search|RecordRef} inputSummary
		 * @since 2015.1
		*/
		function getInputData() {
			var scriptObj = runtime.getCurrentScript();
			log.debug('getCurrentUser', runtime.getCurrentUser());
			log.debug({ title: 'Data scriptObj', details: JSON.stringify(scriptObj) })
			var markedTimeBillIds = scriptObj.getParameter({ name: 'custscript_marked_time_bill_ids' });
			log.debug({ title: 'Date Received', details: markedTimeBillIds });
			var ismarkall = scriptObj.getParameter({ name: 'custscript_markedall' });
			log.debug({ title: 'ismarkall', details: ismarkall });
			if (ismarkall && ismarkall != null && ismarkall != '' && (ismarkall == false || ismarkall == 'false' || ismarkall == 'F')) {
				var timeBillData = JSON.parse(markedTimeBillIds);
			}
			// Added by Sudesh
			// var markedInvIds = scriptObj.getParameter({ name: 'custscript_marked_time_bill_ids' });
			// log.debug({ title: 'Invoice ID', details: markedInvIds });


			if (ismarkall && ismarkall != null && ismarkall != '' && (ismarkall == true || ismarkall == 'true' || ismarkall == 'T')) {
				var result = searchAllInvoice(markedTimeBillIds);
				return result;
			}
			else {
				var result = _.chain(timeBillData).groupBy("custpage_css_customer").map(function (v, i) {
					return {
						custpage_css_customer: i,
						custpage_id: _.map(v, 'custpage_id'),

						custpage_css_trandate: _.map(v, 'custpage_css_trandate'),
						custpage_css_period: _.map(v, 'custpage_css_period'),
						custpage_css_transactiontype: _.map(v, 'custpage_css_transactiontype'),
						// custpage_css_invtype: _.map(v, 'custpage_css_invtype'),
						custpage_css_account: _.map(v, 'custpage_css_account'),
						custpage_css_projectid: _.map(v, 'custpage_css_projectid'),
						custpage_css_memo: _.map(v, 'custpage_css_memo'),
						custpage_css_amount: _.map(v, 'custpage_css_amount'),
						custpage_css_subsidiary: _.map(v, 'custpage_css_subsidiary'),
						custpage_css_subsidiaryval: _.map(v, 'custpage_css_subsidiaryval'),
						custpage_css_internalid: _.map(v, 'custpage_css_internalid'),
						custpage_css_customerval: _.map(v, 'custpage_css_customerval'),
						emailAddresses: _.map(v, 'emailaddr')

					}
				}).value();
			}
			log.debug({ title: 'Date result', details: result });
			return result;
		}

		/**
		 * Executes when the map entry point is triggered and applies to each key/value pair.
		 *
		 * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
		 * @since 2015.1
		 */
		function map(context) {
			try {
				var tranData = JSON.parse(context.value);
				log.debug({ title: 'Data tranData', details: JSON.stringify(tranData) })
				var tranIntId = tranData.custpage_css_internalid;
				var tranType = tranData.custpage_css_transactiontype;
				var invType = tranData.custpage_css_invtype;
				var customer = tranData.custpage_css_customerval;
				var projectId = tranData.custpage_css_projectid;
				var subsidiary = tranData.custpage_css_subsidiary;
				var subsidiaryVal = tranData.custpage_css_subsidiaryval;
				var is_marked = tranData.Ismarked;

				log.debug('is_marked : ', is_marked);

				log.debug('tranIntId + tranType + invType + projectId', tranIntId + ' + ' + tranType + ' + ' + invType + ' + ' + projectId);
				log.debug('subsidiary : ' + subsidiaryVal, subsidiary);

				/*var payVendor = tranData.custpage_csa_vendorval;
				var employeeId = tranData.employeeId;
				var employee = tranData.custpage_csa_employee;
				var projectid = tranData.custpage_csa_projectval;*/

				var emailAddresses = tranData.emailAddresses;
				log.debug('emailAddresses', JSON.stringify(emailAddresses));
				log.debug('emailAddresses.length', emailAddresses.length);

				var emailRecipientsArr = [];
				if (is_marked == true || is_marked == 'true') {
					emailRecipientsArr.push(emailAddresses);
				}
				else {
					if (emailAddresses.length > 0) {
						var emails = emailAddresses[0].email;
						for (var ea in emails) {
							if (!!emails[ea]) {
								emailRecipientsArr.push(emails[ea]);
							}
						}
					}
				}
				log.debug("projectId.length >> " + projectId.length, projectId[0]);
				log.debug("emailRecipientsArr >> ", emailRecipientsArr);
				log.debug("customer >> ", customer + ' : customer[0] > ' + customer[0]);

				if (is_marked == true || is_marked == 'true') {
					var contactQuery = "SELECT cust.id, ct.email, ct.custentity_override_customer_email ";
					contactQuery += "FROM customer cust ";
					contactQuery += "LEFT JOIN job proj on proj.id = " + projectId;
					contactQuery += " LEFT JOIN contact ct on ct.company = proj.id ";
					contactQuery += "WHERE (cust.id = proj.parent ) AND (ct.custentity_css_include_on_bulkemail = 'T')";

					log.debug("contactQuery >> ", contactQuery);
					var contactQueryData = query.runSuiteQL(contactQuery);
					var contactQueryResults = contactQueryData.asMappedResults();
					log.debug("contactQueryResults >> ", contactQueryResults);
					if (contactQueryResults.length > 0) {
						for (var ce in contactQueryResults) {
							if (contactQueryResults[ce].email) {
								if (contactQueryResults[ce].custentity_override_customer_email == 'T') {
									var contactMail = [];
									contactMail.push(contactQueryResults[ce].email);
									emailRecipientsArr = contactMail;
								}
								else {
									emailRecipientsArr.push(contactQueryResults[ce].email);
								}
							}
						}
					}
					log.debug("emailRecipientsArr with contact >> ", emailRecipientsArr);
				}
				else {
					if (projectId[0]) {
						var contactQuery = "SELECT cust.id, ct.email, ct.custentity_override_customer_email ";
						contactQuery += "FROM customer cust ";
						contactQuery += "LEFT JOIN job proj on proj.id = " + projectId[0];
						contactQuery += " LEFT JOIN contact ct on ct.company = proj.id ";
						contactQuery += "WHERE (cust.id = proj.parent ) AND (ct.custentity_css_include_on_bulkemail = 'T')";

						log.debug("contactQuery >> ", contactQuery);
						var contactQueryData = query.runSuiteQL(contactQuery);
						var contactQueryResults = contactQueryData.asMappedResults();
						log.debug("contactQueryResults >> ", contactQueryResults);
						if (contactQueryResults.length > 0) {
							for (var ce in contactQueryResults) {
								if (contactQueryResults[ce].email) {
									if (contactQueryResults[ce].custentity_override_customer_email == 'T') {
										var contactMail = [];
										contactMail.push(contactQueryResults[ce].email);
										emailRecipientsArr = contactMail;
									}
									else {
										emailRecipientsArr.push(contactQueryResults[ce].email);
									}
								}
							}
						}
						log.debug("emailRecipientsArr with contact >> ", emailRecipientsArr);
					}
				}
				var currentUser = runtime.getCurrentUser();
				var author = currentUser.id		//-5;
				var cclist = [];
				if (subsidiary.length && subsidiaryVal.length) {
					if (is_marked == true || is_marked == 'true') {
						var subsidiaryQuery = "SELECT custrecord_csa_bee, name,custrecord_csa_bpbe FROM subsidiary WHERE id = " + subsidiaryVal;
						var subsidiaryResult = getQuery(subsidiaryQuery);
						if (subsidiaryResult.length) {
							var ccEmail = '';
							if (tranType == 'Bill Payment') {
								ccEmail = subsidiaryResult[0]["custrecord_csa_bpbe"] || "";
							}
							else {
								ccEmail = subsidiaryResult[0]["custrecord_csa_bee"] || "";
							}
							if (ccEmail) {

								cclist.push(ccEmail);
							}
						}
					}
					else {
						var subsidiaryQuery = "SELECT custrecord_csa_bee, name,custrecord_csa_bpbe FROM subsidiary WHERE id = " + subsidiaryVal[0];
						var subsidiaryResult = getQuery(subsidiaryQuery);
						if (subsidiaryResult.length) {
							var ccEmail = '';
							if (tranType == 'Bill Payment') {
								ccEmail = subsidiaryResult[0]["custrecord_csa_bpbe"] || "";
							}
							else {
								ccEmail = subsidiaryResult[0]["custrecord_csa_bee"] || "";
							}
							if (ccEmail) {

								cclist.push(ccEmail);
							}
						}
					}


					// if((subsidiary[0]).indexOf('Wellhart') == -1){
					// var cclist = ['ar@bartonassociates.com'];
					// }else{
					// var cclist = ['ar@wellhart.com'];
					// }
				}
				var templateId = '', templateName = '';

				if (tranType) {
					var tplList = getDataFromSetupPage();
					log.debug("tplList >> ", tplList);
					log.debug("tranType >> ", tranType);
					log.debug("tranType2 >> ", tranType[0]);

					if (is_marked == true || is_marked == 'true') {
						switch (tranType) {
							case 'Invoice':       templateId = tplList.stdInvoiceTplId; break;
							case 'Bill':          // fall-through
							case 'Vendor Bill':   templateId = tplList.stdBillTplId;    break;
							case 'Bill Payment':  templateId = tplList.stdBillPayTplId; break;
						}
					}
					else {
						switch (tranType[0]) {
							case 'Invoice':       templateId = tplList.stdInvoiceTplId; break;
							case 'Bill':          // fall-through
							case 'Vendor Bill':   templateId = tplList.stdBillTplId;    break;
							case 'Bill Payment':  templateId = tplList.stdBillPayTplId; break;
						}
					}

					if (tranType && tranType == 'Invoice') {
						if (is_marked == true || is_marked == 'true') {
							switch (invType) {
								case '1':
									templateId = tplList.buyoutInvTplId || templateId;
									break;
								case '2':
									templateId = tplList.cancelInvTplId || templateId;
									break;
								case '3':
									templateId = tplList.prepayInvTplId || templateId;
									break;
								case '4':
									templateId = tplList.timeExpInvTplId || templateId;
									break;
							}
						}
						else {
							switch (invType[0]) {
								case '1':
									templateId = tplList.buyoutInvTplId || templateId;
									break;
								case '2':
									templateId = tplList.cancelInvTplId || templateId;
									break;
								case '3':
									templateId = tplList.prepayInvTplId || templateId;
									break;
								case '4':
									templateId = tplList.timeExpInvTplId || templateId;
									break;
							}
						}
					}
					log.debug("templateId >> ", templateId);
					//templateId = getfileId(templateName);

					if (tranType == 'Bill Payment' || tranType == 'Bill' || tranType == 'Vendor Bill') {
						if (is_marked == true || is_marked == 'true') {
							var entityVal = { type: "vendor", id: Number(customer) };	//customer[0]
							log.debug("entityVal >> ", entityVal);
						}
						else {
							var entityVal = { type: "vendor", id: Number(customer[0]) };	//customer[0]
							log.debug("entityVal >> ", entityVal);
						}

					}
					if (tranType == 'Invoice') {
						if (is_marked == true || is_marked == 'true') {
							var entityVal = { type: "customer", id: Number(customer) };	//customer[0]
							log.debug("entityVal >> ", entityVal);
						}
						else {
							var entityVal = { type: "customer", id: Number(customer[0]) };	//customer[0]
							log.debug("entityVal >> ", entityVal);
						}
					}
					if (tranIntId && templateId) {
						if (is_marked == true || is_marked == 'true') {
							var transactionId = Number(tranIntId);
						}
						else {
							var transactionId = Number(tranIntId[0]);
						}

						var mergeResult = render.mergeEmail({
							templateId: templateId,		//419,	//'custemailtmpl_bulk_invoice_tpl',
							entity: null,
							recipient: entityVal,
							supportCaseId: null,
							transactionId: transactionId,	//tranIntId[0],
							customRecord: null
						});
						log.debug("mergeResult >> ", JSON.stringify(mergeResult));
						var emailSubject = mergeResult.subject;
						var emailBody = mergeResult.body;

						var attachmentArr = [];
						if (is_marked == true || is_marked == 'true') {
							try {
								if (tranType == 'Invoice') {
									var invrec = record.load({ type: 'invoice', id: tranIntId });
									var isfileattach = invrec.getValue('custbody_c67916_beaf');
									log.debug('isfileattach', isfileattach);
									if (isfileattach == true || isfileattach == 'T') {
										var filearr = new Array();
										var invoicefileSearchObj = search.create({
											type: "invoice",
											filters:
												[
													["type", "anyof", "CustInvc"],
													"AND",
													["internalid", "anyof", tranIntId]
												],
											columns:
												[
													search.createColumn({
														name: "internalid",
														join: "file",
														summary: "GROUP",
														sort: search.Sort.ASC,
														label: "Internal ID"
													})
												]
										});
										var resultsSet = invoicefileSearchObj.run();
										var results = resultsSet.getRange(0, 999);
										if (results.length > 0) {
											for (var f = 0; f < results.length; f++) {
												var fileid = results[f].getValue({
													name: "internalid",
													join: "file",
													summary: "GROUP"
												});
												var fileobj = file.load({ id: fileid });
												attachmentArr.push(fileobj);
											}
										}
									}
									else {
										//var scheme = 'https://';
										//var host = url.resolveDomain({ hostType: url.HostType.APPLICATION });
										var link = url.resolveScript({
											scriptId: 'customscript_csa_sl_consolidated_pdf',
											deploymentId: 'customdeploy_csa_consolidate_pdf_dep',
											returnExternalUrl: true,
											params: {
												poid: tranIntId,
												tomail: 'T'
											}
										});
										//var invoicePDFSuitelet = scheme + host + link;
										var invoicePDFSuitelet = link;
										//invoicePDFSuitelet = invoicePDFSuitelet + "&poid=" + (tranIntId[intId]).toString() + "&tomail=T";
										log.debug("invoicePDFSuitelet", invoicePDFSuitelet);
									}
								}
								if (tranType == 'Bill Payment') {
									var pmtrec = record.load({ type: 'vendorpayment', id: tranIntId });
									var ispmtfileattach = pmtrec.getValue('custbody_c67916_beaf');
									log.debug('ispmtfileattach', ispmtfileattach);
									if (ispmtfileattach == true || ispmtfileattach == 'T') {
										var filearr = new Array();
										var invoicefileSearchObj = search.create({
											type: "vendorpayment",
											filters:
												[
													["type", "anyof", "VendPymt"],
													"AND",
													["internalid", "anyof", tranIntId]
												],
											columns:
												[
													search.createColumn({
														name: "internalid",
														join: "file",
														summary: "GROUP",
														sort: search.Sort.ASC,
														label: "Internal ID"
													})
												]
										});
										var resultsSet = invoicefileSearchObj.run();
										var results = resultsSet.getRange(0, 999);
										if (results.length > 0) {
											for (var f = 0; f < results.length; f++) {
												var fileid = results[f].getValue({
													name: "internalid",
													join: "file",
													summary: "GROUP"
												});
												var fileobj = file.load({ id: fileid });
												attachmentArr.push(fileobj);
											}
										}
									}
									else {
										var link = url.resolveScript({
											scriptId: 'customscript_csa_sl_generatepaymentvouch',
											deploymentId: 'customdeploy_csa_sl_generatepaymentvouch',
											returnExternalUrl: true,
											params: {
												custpage_billpayment_id: tranIntId,
												custpage_tomail: 'T'
											}
										});
									}
									var invoicePDFSuitelet = link;
									log.debug("invoicePDFSuitelet", invoicePDFSuitelet);
								}
								if (tranType == 'Bill') {
									var billrec = record.load({ type: 'vendorbill', id: tranIntId });
									var isbillfileattach = billrec.getValue('custbody_c67916_beaf');
									log.debug('isbillfileattach', isbillfileattach);
									if (isbillfileattach == true || isbillfileattach == 'T') {
										var filearr = new Array();
										var billfileSearchObj = search.create({
											type: "vendorbill",
											filters:
												[
													["type", "anyof", "VendBill"],
													"AND",
													["internalid", "anyof", tranIntId]
												],
											columns:
												[
													search.createColumn({
														name: "internalid",
														join: "file",
														summary: "GROUP",
														sort: search.Sort.ASC,
														label: "Internal ID"
													})
												]
										});
										var resultsSet = billfileSearchObj.run();
										var results = resultsSet.getRange(0, 999);
										if (results.length > 0) {
											for (var f = 0; f < results.length; f++) {
												var fileid = results[f].getValue({
													name: "internalid",
													join: "file",
													summary: "GROUP"
												});
												var fileobj = file.load({ id: fileid });
												attachmentArr.push(fileobj);
											}
										}
									}
									// else
									// {
									// var link = url.resolveScript({
									// scriptId: 'customscript_csa_sl_generatepaymentvouch',
									// deploymentId: 'customdeploy_csa_sl_generatepaymentvouch',
									// returnExternalUrl: true,
									// params: {
									// custpage_billpayment_id: tranIntId[intId],
									// custpage_tomail: 'T'
									// }
									// });
									// }									
									// var invoicePDFSuitelet = link;
									// log.debug("invoicePDFSuitelet", invoicePDFSuitelet);
								}
								log.debug("invoicePDFSuitelet", invoicePDFSuitelet);
								if (invoicePDFSuitelet) {
									var responseVal = https.get({
										url: invoicePDFSuitelet
										//headers: headerObj
									});
									log.debug("responseVal", responseVal);
									log.debug("responseVal.body", responseVal.body);
									if (responseVal.body) {
										try {
											/*var fileObj = file.create({
												name: 'Transaction ' + tranIntId[intId],
												fileType: file.Type.PDF,
												contents: responseVal.body,
												description: 'This is a generated transaction PDF file.',
												//encoding: file.Encoding.UTF8,
												folder: -15,
												isOnline: true
											});
											var fileId = fileObj.save();*/
											var fileId = responseVal.body;
											if (fileId) {
												var fileObjNew = file.load({ id: fileId });
												attachmentArr.push(fileObjNew);
											}
										} catch (err) {
											log.debug('Error', err);
										}
									}
								}
							}
							catch (e) {
								log.error('ERROR in loop', e);
							}
						}
						else {
							for (var intId in tranIntId) {
								log.debug("tranIntId[intId]", tranIntId[intId]);
								log.debug("tranType", tranType);
								try {
									if (tranType[intId] == 'Invoice') {
										var invrec = record.load({ type: 'invoice', id: tranIntId[intId] });
										var isfileattach = invrec.getValue('custbody_c67916_beaf');
										log.debug('isfileattach', isfileattach);
										if (isfileattach == true || isfileattach == 'T') {
											var filearr = new Array();
											var invoicefileSearchObj = search.create({
												type: "invoice",
												filters:
													[
														["type", "anyof", "CustInvc"],
														"AND",
														["internalid", "anyof", tranIntId[intId]]
													],
												columns:
													[
														search.createColumn({
															name: "internalid",
															join: "file",
															summary: "GROUP",
															sort: search.Sort.ASC,
															label: "Internal ID"
														})
													]
											});
											var resultsSet = invoicefileSearchObj.run();
											var results = resultsSet.getRange(0, 999);
											if (results.length > 0) {
												for (var f = 0; f < results.length; f++) {
													var fileid = results[f].getValue({
														name: "internalid",
														join: "file",
														summary: "GROUP"
													});
													var fileobj = file.load({ id: fileid });
													attachmentArr.push(fileobj);
												}
											}
										}
										else {
											//var scheme = 'https://';
											//var host = url.resolveDomain({ hostType: url.HostType.APPLICATION });
											var link = url.resolveScript({
												scriptId: 'customscript_csa_sl_consolidated_pdf',
												deploymentId: 'customdeploy_csa_consolidate_pdf_dep',
												returnExternalUrl: true,
												params: {
													poid: tranIntId[intId],
													tomail: 'T'
												}
											});
											//var invoicePDFSuitelet = scheme + host + link;
											var invoicePDFSuitelet = link;
											//invoicePDFSuitelet = invoicePDFSuitelet + "&poid=" + (tranIntId[intId]).toString() + "&tomail=T";
											log.debug("invoicePDFSuitelet", invoicePDFSuitelet);
										}
									}
									if (tranType[intId] == 'Bill Payment') {
										var pmtrec = record.load({ type: 'vendorpayment', id: tranIntId[intId] });
										var ispmtfileattach = pmtrec.getValue('custbody_c67916_beaf');
										log.debug('ispmtfileattach', ispmtfileattach);
										if (ispmtfileattach == true || ispmtfileattach == 'T') {
											var filearr = new Array();
											var invoicefileSearchObj = search.create({
												type: "vendorpayment",
												filters:
													[
														["type", "anyof", "VendPymt"],
														"AND",
														["internalid", "anyof", tranIntId[intId]]
													],
												columns:
													[
														search.createColumn({
															name: "internalid",
															join: "file",
															summary: "GROUP",
															sort: search.Sort.ASC,
															label: "Internal ID"
														})
													]
											});
											var resultsSet = invoicefileSearchObj.run();
											var results = resultsSet.getRange(0, 999);
											if (results.length > 0) {
												for (var f = 0; f < results.length; f++) {
													var fileid = results[f].getValue({
														name: "internalid",
														join: "file",
														summary: "GROUP"
													});
													var fileobj = file.load({ id: fileid });
													attachmentArr.push(fileobj);
												}
											}
										}
										else {
											var link = url.resolveScript({
												scriptId: 'customscript_csa_sl_generatepaymentvouch',
												deploymentId: 'customdeploy_csa_sl_generatepaymentvouch',
												returnExternalUrl: true,
												params: {
													custpage_billpayment_id: tranIntId[intId],
													custpage_tomail: 'T'
												}
											});
										}
										var invoicePDFSuitelet = link;
										log.debug("invoicePDFSuitelet", invoicePDFSuitelet);
									}
									if (tranType[intId] == 'Bill') {
										var billrec = record.load({ type: 'vendorbill', id: tranIntId[intId] });
										var isbillfileattach = billrec.getValue('custbody_c67916_beaf');
										log.debug('isbillfileattach', isbillfileattach);
										if (isbillfileattach == true || isbillfileattach == 'T') {
											var filearr = new Array();
											var billfileSearchObj = search.create({
												type: "vendorbill",
												filters:
													[
														["type", "anyof", "VendBill"],
														"AND",
														["internalid", "anyof", tranIntId[intId]]
													],
												columns:
													[
														search.createColumn({
															name: "internalid",
															join: "file",
															summary: "GROUP",
															sort: search.Sort.ASC,
															label: "Internal ID"
														})
													]
											});
											var resultsSet = billfileSearchObj.run();
											var results = resultsSet.getRange(0, 999);
											if (results.length > 0) {
												for (var f = 0; f < results.length; f++) {
													var fileid = results[f].getValue({
														name: "internalid",
														join: "file",
														summary: "GROUP"
													});
													var fileobj = file.load({ id: fileid });
													attachmentArr.push(fileobj);
												}
											}
										}
										// else
										// {
										// var link = url.resolveScript({
										// scriptId: 'customscript_csa_sl_generatepaymentvouch',
										// deploymentId: 'customdeploy_csa_sl_generatepaymentvouch',
										// returnExternalUrl: true,
										// params: {
										// custpage_billpayment_id: tranIntId[intId],
										// custpage_tomail: 'T'
										// }
										// });
										// }									
										// var invoicePDFSuitelet = link;
										// log.debug("invoicePDFSuitelet", invoicePDFSuitelet);
									}
									log.debug("invoicePDFSuitelet", invoicePDFSuitelet);
									if (invoicePDFSuitelet) {
										var responseVal = https.get({
											url: invoicePDFSuitelet
											//headers: headerObj
										});
										log.debug("responseVal", responseVal);
										log.debug("responseVal.body", responseVal.body);
										if (responseVal.body) {
											try {
												/*var fileObj = file.create({
													name: 'Transaction ' + tranIntId[intId],
													fileType: file.Type.PDF,
													contents: responseVal.body,
													description: 'This is a generated transaction PDF file.',
													//encoding: file.Encoding.UTF8,
													folder: -15,
													isOnline: true
												});
												var fileId = fileObj.save();*/
												var fileId = responseVal.body;
												if (fileId) {
													var fileObjNew = file.load({ id: fileId });
													attachmentArr.push(fileObjNew);
												}
											} catch (err) {
												log.debug('Error', err);
											}
										}
									}
								}
								catch (e) {
									log.error('ERROR in loop', e);
								}
							}
						}

						log.debug("attachmentArr>>> ", attachmentArr);
						log.debug("customer[0]>>> ", customer[0]);

						log.debug("emailRecipientsArr>>> ", emailRecipientsArr);
						log.debug("cclist>>> ", cclist);

						var to_email = [];
						if (is_marked == true || is_marked == 'true') {
							to_email.push(emailAddresses);
						}
						else {
							emailRecipientsArr.forEach(function (eml) {
								if (to_email.indexOf(eml) == -1) {
									to_email.push(eml)
								}
							});
						}

						var cc_email = [];
						cclist.forEach(function (eml) {
							if (cc_email.indexOf(eml) == -1) {
								cc_email.push(eml)
							}
						});
						log.debug("to_email ", to_email);
						log.debug("cc_email ", cc_email);

						if (attachmentArr.length > 0) {
							if (is_marked == true || is_marked == 'true') {
								email.send({
									author: author,
									recipients: to_email,
									cc: cc_email,
									subject: emailSubject,
									body: emailBody,
									attachments: attachmentArr,
									relatedRecords: {
										//transactionId: transactionId,
										entityId: customer
									}
								});
								updateTransactionRecord(tranType, tranIntId, is_marked);
							}
							else {
								email.send({
									author: author,
									recipients: to_email,
									cc: cc_email,
									subject: emailSubject,
									body: emailBody,
									attachments: attachmentArr,
									relatedRecords: {
										//transactionId: transactionId,
										entityId: customer[0]
									}
								});
								updateTransactionRecord(tranType[0], tranIntId, is_marked);
							}
						}
						else {
							if (is_marked == true || is_marked == 'true') {
								email.send({
									author: author,
									recipients: to_email,
									cc: cc_email,
									subject: emailSubject,
									body: emailBody,
									//attachments: [fileObj],
									relatedRecords: {
										//transactionId: transactionId,
										entityId: customer
									}
								});
								updateTransactionRecord(tranType, tranIntId, is_marked);
							}
							else {
								email.send({
									author: author,
									recipients: to_email,
									cc: cc_email,
									subject: emailSubject,
									body: emailBody,
									//attachments: [fileObj],
									relatedRecords: {
										//transactionId: transactionId,
										entityId: customer[0]
									}
								});
								updateTransactionRecord(tranType[0], tranIntId, is_marked);
							}
						}
						log.debug("email sent >> ", "Email sent.");
					}
				}
			}
			catch (e) {
				log.debug('Error MR Bulk email', e.message);
			}
		}

		function getQuery(queryStr) {
			if (queryStr.length) {
				var resultSet = query.runSuiteQL({
					query: queryStr
				});
				log.audit("asMappedResults:", resultSet.asMappedResults());
				if (resultSet && resultSet.results && resultSet.results.length > 0) {
					return resultSet.asMappedResults();
				} else {
					return [];
				}
			}
		}

		function updateTransactionRecord(tranType, transactionId, is_marked) {
			try {
				var recordTypeVal;
				log.debug('tranType: transactionId', tranType + ': ' + transactionId + ' == ' + is_marked)
				if (tranType, transactionId) {
					switch (tranType) {
						case 'Invoice':
							recordTypeVal = 'invoice';
							break;
						case 'Bill':
							recordTypeVal = 'vendorbill';
							break;
						case 'Bill Payment':
							recordTypeVal = 'vendorpayment';
							break;
					}
					if (recordTypeVal) {
						if (is_marked == true || is_marked == 'true') {
							var tranId = record.submitFields({
								type: recordTypeVal,
								id: transactionId,
								values: {
									'custbody_bulk_email_status': 1
								},
								options: {
									enableSourcing: false,
									ignoreMandatoryFields: true
								}
							});
						}
						else {
							for (var intId in transactionId) {
								var tranId = record.submitFields({
									type: recordTypeVal,
									id: transactionId[intId],
									values: {
										'custbody_bulk_email_status': 1
									},
									options: {
										enableSourcing: false,
										ignoreMandatoryFields: true
									}
								});
							}
						}
					}
				}
			} catch (e) {
				log.error('ERROR MR Bulk email updateTransactionRecord', e);
			}
		}

		/**
		 * Executes when the reduce entry point is triggered and applies to each group.
		 *
		 * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
		 * @since 2015.1
		 */
		function reduce(context) {

		}


		/**
		 * Executes when the summarize entry point is triggered and applies to the result set.
		 *
		 * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
		 * @since 2015.1
		 */
		function summarize(summary) {
			/// JD - Code Added & updated Dt.07.07.2021 ///
			try {

			} catch (err) {
				log.error("summary error", err);
			}
			/// END ///
		}

		// Get Invoice details Added by sudesh
		function searchAllInvoice(markedInvIds) {
			try {
				var invarr = new Array();
				var invresults = new Array();
				invarr.push(markedInvIds);
				markedInvIds = markedInvIds.split(',');
				log.debug('markedInvIds', markedInvIds);
				var filterArr = new Array();
				filterArr.push(search.createFilter({ name: 'internalid', join: null, operator: search.Operator.ANYOF, values: markedInvIds }));
				// filterArr.push(search.createFilter({ name: 'type', join: null, operator: search.Operator.ANYOF, values: 'CustInvc' }));
				filterArr.push(search.createFilter({ name: 'mainline', join: null, operator: search.Operator.IS, values: "T" }));

				var tranSearchObj = search.create({
					type: "transaction",
					filters: filterArr,
					columns:
						[
							search.createColumn({ name: "internalid", sort: search.Sort.ASC, label: "Internal ID" }),
							search.createColumn({ name: "type", label: "Type" }),
							search.createColumn({ name: "recordtype", label: "Record Type" }),
							search.createColumn({ name: "tranid", label: "Document Number" }),
							search.createColumn({ name: "entity", label: "Name" }),
							search.createColumn({ name: "internalid", join: "jobMain", label: "Internal ID" }),
							search.createColumn({ name: "subsidiary", label: "Subsidiary" }),
							search.createColumn({ name: "email", label: "Email" }),
							search.createColumn({ name: "email", join: "customer", label: "Email" }),
							search.createColumn({ name: "email", join: "vendor", label: "Email" }),
							search.createColumn({ name: "custbody_csa_invoice_type_field", label: "Invoice Type" }),
							search.createColumn({ name: "statusref", label: "Status" }),
							search.createColumn({ name: "custbody_csa_employee", label: "CSA - Employee" })
						]
				});
				var tranSearchCount = tranSearchObj.runPaged().count;
				log.debug("tranSearchObj result count1", tranSearchCount);
				var invresultdata = tranSearchObj.run();
				invresultdata.each(function (result) {
					var resultObj = {};
					var resultlineObj = {};
					resultlineObj['email'] = [];
					resultObj['custpage_css_internalid'] = result.getValue('internalid');
					resultObj['custpage_css_transactiontype'] = result.getText('type');
					resultObj['custpage_css_invtype'] = result.getValue('custbody_csa_invoice_type_field');
					resultObj['custpage_css_subsidiary'] = result.getText('subsidiary');
					resultObj['custpage_css_subsidiaryval'] = result.getValue('subsidiary');
					resultObj['custpage_css_projectid'] = result.getValue({ name: 'internalid', join: 'jobMain' });
					resultObj['custpage_css_customerval'] = result.getValue('entity');
					//resultlineObj['email'].push(result.getValue({name: 'email', join: 'customer'}));

					//Code Changed:
					// resultObj['emailaddr'] = result.getValue({ name: 'email', join: 'customer' });
					// resultObj['emailAddresses'] = result.getValue({ name: 'email', join: 'customer' });
					var typeText = result.getText('type');

					// Prefer transaction "entity" email by context:
					// - Customer email for Invoice
					// - Vendor email for Bill/Bill Payment
					var entityEmail = (typeText === 'Invoice')
					? result.getValue({ name: 'email', join: 'customer' })
					: result.getValue({ name: 'email', join: 'vendor' });

					// keep structure MR.map expects
					resultObj['emailaddr']      = entityEmail;           // mark-all path uses string
					resultObj['emailAddresses'] = entityEmail;


					resultObj['Ismarked'] = true;

					invresults.push(resultObj);
					return true;
				})
				log.debug('invresults', invresults);
				return invresults;
			}
			catch (err) {
				log.error("Error in InvSavedSearch", err);
			}
		}

		function getDataFromSetupPage() {
			var customrecord_css_bulk_email_preferenceObj = search.create({
				type: "customrecord_css_bulk_email_preference",
				filters: [],
				columns: [
					search.createColumn({ name: "custrecord_css_bep_invoice_email_tpl", label: "INVOICE EMAIL TEMPLATE" }),
					search.createColumn({ name: "custrecord_css_bep_bill_email_tpl", label: "VENDOR BILL EMAIL TEMPLATE" }),
					search.createColumn({ name: "custrecord_css_bep_billpay_email_tpl", label: "BILL PAYMENT EMAIL TEMPLATE" }),
					search.createColumn({ name: "custrecord_css_bep_buyout_email_tpl", label: "BUYOUT INVOICE EMAIL TEMPLATE" }),
					search.createColumn({ name: "custrecord_css_bep_cancellation_inv_tpl", label: "CANCELLATION INVOICE EMAIL TEMPLATE" }),
					search.createColumn({ name: "custrecord_css_bep_prepay_inv_tpl", label: "PREPAY INVOICE EMAIL TEMPLATE" }),
					search.createColumn({ name: "custrecord_css_bep_time_exp_inv_tpl", label: "TIME & EXPENSE INVOICE EMAIL TEMPLATE" })
				]
			});
			var searchSetUpPageCount = customrecord_css_bulk_email_preferenceObj.runPaged().count;
			// log.debug("searchSetUpPageCount _", searchSetUpPageCount);

			if (searchSetUpPageCount > 0) {
				var searchSetUpPageResult = customrecord_css_bulk_email_preferenceObj.run().getRange({
					start: 0,
					end: 1
				});
				var stdInvoiceTplId = searchSetUpPageResult[0].getValue({ name: "custrecord_css_bep_invoice_email_tpl" });
				var stdBillTplId = searchSetUpPageResult[0].getValue({ name: "custrecord_css_bep_bill_email_tpl" });
				var stdBillPayTplId = searchSetUpPageResult[0].getValue({ name: "custrecord_css_bep_billpay_email_tpl" });
				var buyoutInvTplId = searchSetUpPageResult[0].getValue({ name: "custrecord_css_bep_buyout_email_tpl" });
				var cancelInvTplId = searchSetUpPageResult[0].getValue({ name: "custrecord_css_bep_cancellation_inv_tpl" });
				var prepayInvTplId = searchSetUpPageResult[0].getValue({ name: "custrecord_css_bep_prepay_inv_tpl" });
				var timeExpInvTplId = searchSetUpPageResult[0].getValue({ name: "custrecord_css_bep_time_exp_inv_tpl" });

				setUpPageData = {
					"stdInvoiceTplId": stdInvoiceTplId,
					"stdBillTplId": stdBillTplId,
					"stdBillPayTplId": stdBillPayTplId,
					"buyoutInvTplId": buyoutInvTplId,
					"cancelInvTplId": cancelInvTplId,
					"prepayInvTplId": prepayInvTplId,
					"timeExpInvTplId": timeExpInvTplId
				}
				log.debug("setUpPageData", setUpPageData);
			}
			return setUpPageData;
		}

		function getfileId(clientScript) {
			//we can make it as function to reuse.
			var search_folder = search.create({
				type: 'folder',
				filters: [{
					name: 'name',
					join: 'file',
					operator: 'is',
					values: clientScript
				}],
				columns: [{
					name: 'internalid',
					join: 'file',
				}]
			});
			var searchFolderId = '';
			var searchFolderName = '';
			search_folder.run().each(function (result) {
				searchFolderId = result.getValue({
					name: 'internalid',
					join: 'file'
				});
				//log.debug('searchFolderId',searchFolderId);
				return true;
			});
			return searchFolderId;
		}

		return {
			getInputData: getInputData,
			map: map,
			reduce: reduce,
			summarize: summarize
		};

	}
);