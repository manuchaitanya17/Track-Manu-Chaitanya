/**
 * Type				: SUITELET
 * ScriptId			: customscript_css_sl_bulk_mail_process
 * Deployement Id	: customdeploy_css_sl_bulk_mail_process
 *
 * Description		: Suitelet for bulk mailing process
 */
/**
* @NApiVersion 2.x
* @NScriptType Suitelet
* @NModuleScope Public
*/
define(['N/ui/serverWidget', 'N/query', 'N/search', 'N/url', 'N/format', 'N/record', 'N/task', './lodash.min.js', 'N/file'],
	function (ui, query, search, url, format, record, task, _, file) {
		function onRequest(context) {
			var form;
			var setupDataObj = getDataFromSetupPage();
			//var mannualFlag = setupDataObj.custrecord_csa_manual_bill;
			//log.debug(mannualFlag);

			//Bulk Emailing-S1/P1
			if (context.request.method == 'GET') {
				if (true) {			//(mannualFlag) {
					try {
						log.debug("parameters", context.request.parameters);
						var custom = context.request.parameters.customer;
						var pageId = parseInt(context.request.parameters.page);
						var allids = context.request.parameters.ids;

						var all_invid = context.request.parameters.allinvidmark;
						if (all_invid && all_invid != null && all_invid != '') {
							all_invid = all_invid.split(',');
						}
						log.debug("all_invid", all_invid);


						//Step-1 Read the Data from the Parameter:
						var tranTypeText = context.request.parameters.trantypetext;
						var tranType = context.request.parameters.trantype;
						if (!tranType) { tranType = 1; }
						else { tranType = Number(tranType); }

						var subsidiaryVal = context.request.parameters.subsidiaryval;
						if (!subsidiaryVal) { subsidiaryVal = 0; }
						else { subsidiaryVal = Number(subsidiaryVal); }

						var invType = context.request.parameters.invtype || '';
						if (!invType) { invType = 0; }
						else { invType = Number(invType); }

						var employeeid = context.request.parameters.employeeid;
						if (!employeeid) { employeeid = 0; }
						else { employeeid = Number(employeeid); }

						var customerid = context.request.parameters.customerid;
						if (!customerid) { customerid = 0; }
						else { customerid = Number(customerid); }

						var collectionAnalystId = context.request.parameters.analyst;
						if (!collectionAnalystId) { collectionAnalystId = 0; }
						else { collectionAnalystId = Number(collectionAnalystId); }

						var checkValue = context.request.parameters.check;
						if (!checkValue) { checkValue = 0; }
						else { checkValue = Number(checkValue); }

						var vendorid = context.request.parameters.vendorid;
						if (!vendorid) { vendorid = 0; }
						else { vendorid = Number(vendorid); }

						var projectText = context.request.parameters.projectText;
						//log.debug('Project text', projectText);
						var is_markall = context.request.parameters.allmark;
						log.debug('is_markall', is_markall);

						var projectid = context.request.parameters.projectid;
						if (!projectid) { projectid = 0; }
						else { projectid = Number(projectid); }
						//log.debug('Project ID ', projectid);

						var projectFilter = projectid > 0 ? projectid : projectText;

						//var weekendingdate = context.request.parameters.weekendingdate;
						//if (weekendingdate) {
						//	var weekEndDate = weekendingdate;
						//} else { log.debug("No week Date "); }

						var startDateVal = context.request.parameters.startdate;
						var endDateVal = context.request.parameters.enddate;
						var invoiceDateVal = context.request.parameters.invoicedate;

						//var postDateVal = context.request.parameters.postDate;
						log.debug("startDateVal & End Value", "St Date " + startDateVal + " endDateVal " + endDateVal + " invoiceDate " + invoiceDateVal);


						//Step-2 Get Advance Project from the Setup Page:
						var searchCol = new Array();
						searchCol.push(search.createColumn({ name: 'custrecord_csa_advance_project' }));

						var getSetupSearchObj = searchAllRecord('customrecord_csa_system_setup', null, null, searchCol);
						var customerlist = { '--Show-All--': 0 };
						var currentcustomer;
						var employee;


						//Step-3 Started creating the Record:
						form = ui.createForm({ title: 'PROCESS BULK EMAIL' });

						//Note: Page Loads and Invoice gets selected by default, if !tranType:
						var transactionType = form.addField({ id: 'custpage_css_transactiontypefil', type: ui.FieldType.SELECT, label: 'Transaction Type' });
						if (!tranType || tranType == 0) { log.debug("tranType if 0"); transactionType.addSelectOption({ value: '0', text: '', isSelected: true }); }
						else { log.debug("tranType if not 0"); transactionType.addSelectOption({ value: '0', text: '' }); }
						if (tranType == 1) { log.debug("tranType if 1"); transactionType.addSelectOption({ value: '1', text: 'Invoice', isSelected: true }); }
						else { log.debug("tranType if not 1"); transactionType.addSelectOption({ value: '1', text: 'Invoice' }); }
						if (tranType == 2) { log.debug("tranType if 2"); transactionType.addSelectOption({ value: '2', text: 'Bill Payment', isSelected: true }); }
						else { log.debug("tranType if not 2"); transactionType.addSelectOption({ value: '2', text: 'Bill Payment' }); }
						if (tranType == 3) { log.debug("tranType if 3"); transactionType.addSelectOption({ value: '3', text: 'Vendor Bill', isSelected: true }); }
						else { log.debug("tranType if not 3"); transactionType.addSelectOption({ value: '3', text: 'Vendor Bill' }); }
						/*if (tranType != 0) {
							transactionType.defaultValue = Number(tranType);	
						}*/

						// var invoiceType = form.addField({ id: 'custpage_css_invoicetype', type: ui.FieldType.SELECT, label: 'Invoice Type', source: 'customrecord_invoice_type_2' });
						var subsidiaryField = form.addField({ id: 'custpage_css_subsidiary', type: ui.FieldType.SELECT, label: 'Subsidiary', source: 'subsidiary' });
						var startDate = form.addField({ id: 'custpage_css_startdate', type: ui.FieldType.DATE, label: 'Start Date' });

						var endDate = form.addField({ id: 'custpage_css_enddate', type: ui.FieldType.DATE, label: 'End Date' });
						var invoiceDate = form.addField({ id: 'custpage_css_invoicedate', type: ui.FieldType.DATE, label: 'Invoice Date' });

						var vendor = form.addField({ id: 'custpage_css_vendor', type: ui.FieldType.SELECT, label: 'Vendor', source: 'vendor' });
						var billCustomer = form.addField({ id: 'custpage_css_billcustomer', type: ui.FieldType.SELECT, label: 'Customer', source: 'customer' });
						// var collectionAnalyst = form.addField({ id: 'custpage_css_collection_analyst', type: ui.FieldType.SELECT, label: 'Collection Analyst', source: 'employee' });

						log.debug('checkValue', checkValue);
						var checkField = form.addField({ id: 'custpage_css_check', type: ui.FieldType.SELECT, label: 'Check' });
						if (checkValue == '' || checkValue == 0) { checkField.addSelectOption({ value: '0', text: '', isSelected: true }); } else {
							checkField.addSelectOption({ value: '0', text: '' });
						}
						if (checkValue == 1) { checkField.addSelectOption({ value: '1', text: 'EFT', isSelected: true }); } else {
							checkField.addSelectOption({ value: '1', text: 'EFT' });
						}
						if (checkValue == 2) { checkField.addSelectOption({ value: '2', text: 'Check', isSelected: true }); } else {
							checkField.addSelectOption({ value: '2', text: 'Check' });
						}

						// Added by sudesh
						var checkmarkallField = form.addField({ id: 'custpage_css_ismarkall', type: ui.FieldType.CHECKBOX, label: 'Mark All' });
						if (is_markall == true || is_markall == 'true') {
							checkmarkallField.defaultValue = 'T';
						}
						else {
							checkmarkallField.defaultValue = 'F';
						}
						// var checkunmarkallField = form.addField({ id: 'custpage_css_isunmarkall', type: ui.FieldType.CHECKBOX, label: 'UnMark All' });
						//billCustomer.updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
						if (vendorid) { vendor.defaultValue = vendorid; }
						if (customerid) { billCustomer.defaultValue = customerid; }
						// if (collectionAnalystId) { collectionAnalyst.defaultValue = collectionAnalystId; }
						/*if (getSetupSearchObj.length > 0) {
							var advanceProjectFlag = getSetupSearchObj[0].getValue({ name: 'custrecord_csa_advance_project' });
							if (advanceProjectFlag == false || advanceProjectFlag == "false" || advanceProjectFlag == "F") {
								var projectNameText = form.addField({ id: 'custpage_css_textproject', type: ui.FieldType.TEXT, label: 'PROJECT' });
							}
							else {
								var projectNameid = form.addField({ id: 'custpage_css_listproject', type: ui.FieldType.SELECT, label: 'PROJECT', source: 'job' });
							}
						}*/

						//var weekEndingDate = form.addField({ id: 'custpage_csa_weekendingdate', type: ui.FieldType.DATE, label: 'Week Endig Date' });
						//weekEndingDate.updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
						/*var timeEntryStatus = form.addField({ id: 'custpage_csa_time_entrystatus', type: ui.FieldType.SELECT, label: 'Time Entry Status' });
						timeEntryStatus.addSelectOption({ value: '0', text: '' });
						timeEntryStatus.addSelectOption({ value: '1', text: 'Open' });
						timeEntryStatus.addSelectOption({ value: '2', text: 'Pending Approval' });
						timeEntryStatus.addSelectOption({ value: '3', text: 'Approved' });
						timeEntryStatus.addSelectOption({ value: '4', text: 'Rejected' });*/

						// if (invType != 0) {
						// 	invoiceType.defaultValue = invType;
						// }
						if (subsidiaryVal != 0) {
							subsidiaryField.defaultValue = subsidiaryVal;
						}
						//if (weekEndDate != '' || weekEndDate != null || weekEndDate != undefined) {
						//weekEndingDate.defaultValue = weekEndDate;
						//}
						if (startDateVal != '' && startDateVal != null && startDateVal != undefined) {
							startDate.defaultValue = startDateVal;
						}
						if (endDateVal != '' && endDateVal != null && endDateVal != undefined) {
							endDate.defaultValue = endDateVal;
						}

						//Code Added 23/10
						if (invoiceDateVal) {
							invoiceDate.defaultValue = invoiceDateVal;
						}

						if (projectid) {
							projectNameid.defaultValue = projectid;
						}
						if (projectText != '' && projectText != undefined && projectText != 'undefined') {
							projectNameText.defaultValue = projectText;
						}

						//Bulk Emailing-S1/P2
						var fileName = 'CSS CS Bulk Mail Process.js';		//Client Path
						var fileid = getfileId(fileName);
						if (fileid) { form.clientScriptFileId = fileid; }

						var customerField = form.addField({ id: 'custpage_customerselect', type: ui.FieldType.SELECT, label: 'Select' }).updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
						var ids = form.addField({ id: 'custpage_allids', label: 'allids', type: ui.FieldType.LONGTEXT }).updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
						var trueids = form.addField({ id: 'custpage_trueids', label: 'true ids', type: ui.FieldType.LONGTEXT }).updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });

						// Added by sudesh
						var invids = form.addField({ id: 'custpage_invids', label: 'Invoice ids', type: ui.FieldType.LONGTEXT }).updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });

						form.addSubtab({ id: 'custpage_subtab', label: "TRANSACTION LIST" });
						if (allids) {
							ids.defaultValue = allids;
						}

						var PAGE_SIZE = 50;
						var paginationField = form.addField({ id: 'custpage_pagination', type: ui.FieldType.SELECT, label: 'Next Page', container: 'custpage_subtab' });
						var sublist = form.addSublist({ id: 'custpage_sublist', type: ui.SublistType.LIST, label: "Transaction List", tab: 'custpage_subtab' });
						///END///

						sublist.addField({ id: 'custpage_checkbox', type: ui.FieldType.CHECKBOX, label: 'APPLY' });
						sublist.addField({ id: 'custpage_id', type: ui.FieldType.TEXT, label: 'VIEW' });
						var tranInternalId = sublist.addField({ id: 'custpage_css_internalid', type: ui.FieldType.TEXT, label: 'INTERNAL ID' });
						tranInternalId.updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
						//var custProjInternalID = sublist.addField({ id: 'custpage_csa_cust_proj_id', type: ui.FieldType.TEXT, label: 'VIEW' });
						//custProjInternalID.updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });

						sublist.addField({ id: 'custpage_css_trandate', type: ui.FieldType.TEXT, label: 'TRANSACTION DATE' });
						sublist.addField({ id: 'custpage_css_period', type: ui.FieldType.TEXT, label: 'PERIOD' });
						sublist.addField({ id: 'custpage_css_transactiontype', type: ui.FieldType.TEXT, label: "TRANSACTION TYPE" });
						// var invTypefld = sublist.addField({ id: 'custpage_css_invtype', type: ui.FieldType.TEXT, label: "INVOICE TYPE" });
						// invTypefld.updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
						//sublist.addField({ id: 'custpage_css_tranid', type: ui.FieldType.TEXT, label: "DOCUMENT NUMBER" });
						//sublist.addField({ id: 'custpage_css_tranname', type: ui.FieldType.TEXT, label: "NAME" });
						//sublist.addField({ id: 'custpage_css_account', type: ui.FieldType.TEXT, label: "ACCOUNT" });
						sublist.addField({ id: 'custpage_css_memo', type: ui.FieldType.TEXT, label: "MEMO" });
						sublist.addField({ id: 'custpage_css_amount', type: ui.FieldType.TEXT, label: "AMOUNT" });
						// sublist.addField({ id: 'custpage_css_employee', type: ui.FieldType.TEXT, label: "EMPLOYEE" });
						sublist.addField({ id: 'custpage_css_subsidiary', type: ui.FieldType.TEXT, label: "SUBSIDIARY" });
						var subsidiaryv = sublist.addField({ id: 'custpage_css_subsidiaryval', type: ui.FieldType.TEXT, label: "SUBSIDIARY" });
						subsidiaryv.updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
						sublist.addField({ id: 'custpage_css_customer', type: ui.FieldType.TEXT, label: "CUSTOMER/VENDOR" });
						var projectFld = sublist.addField({ id: 'custpage_css_projectid', type: ui.FieldType.TEXT, label: "PROJECT" });
						projectFld.updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
						//sublist.addField({ id: 'custpage_css_vendor', type: ui.FieldType.TEXT, label: "VENDOR" });
						sublist.addField({ id: 'custpage_css_tranmail', type: ui.FieldType.TEXT, label: "EMAIL" });
						sublist.addField({ id: 'custpage_css_projmail', type: ui.FieldType.TEXT, label: "ENTITY EMAIL" });
						var additionalMail = sublist.addField({ id: 'custpage_css_additionalmail_1', type: ui.FieldType.TEXT, label: "ADDITIONAL EMAIL 1" });
						additionalMail.updateDisplayType({ displayType: ui.FieldDisplayType.ENTRY });
						var additionalMail2 = sublist.addField({ id: 'custpage_css_additionalmail_2', type: ui.FieldType.TEXT, label: "ADDITIONAL EMAIL 2" });
						additionalMail2.updateDisplayType({ displayType: ui.FieldDisplayType.ENTRY });
						var customerField = sublist.addField({ id: 'custpage_css_customerval', type: ui.FieldType.SELECT, label: "CUSTOMER", source: 'customer' });
						customerField.updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });	//INLINE });

						//payidField.updateDisplayType({displayType : ui.FieldDisplayType.HIDDEN});
						if (is_markall == true || is_markall == 'true') {
							var invdetail = getInvoiceSavedSearch(employeeid, customerid, projectid, startDateVal, endDateVal, invoiceDateVal, subsidiaryVal, tranType, invType, vendorid, collectionAnalystId, checkValue);
							log.debug('invdetail', invdetail);
							log.debug('invdetail.length', invdetail.length);
							log.debug('invdetail.1', invdetail[0]);

							if (all_invid && all_invid != null && all_invid != '' && all_invid.length > 0) {
								invids.defaultValue = all_invid.toString();
								ids.defaultValue = all_invid.toString();
							}
							else {
								invids.defaultValue = invdetail.toString();
								ids.defaultValue = invdetail.toString();
							}
						}
						else {
							invids.defaultValue = '';
							checkmarkallField.defaultValue = 'F';
						}
						var searchobj = getSavedSearch(PAGE_SIZE, employeeid, customerid, projectid, startDateVal, endDateVal, invoiceDateVal, subsidiaryVal, tranType, invType, vendorid, collectionAnalystId, checkValue);
						log.debug({ title: 'searchobj', ddetails: JSON.stringify(searchobj) });
						var pageCount = Math.ceil(searchobj.count / PAGE_SIZE);

						if (!pageId || pageId == '' || pageId < 0) {
							pageId = 0;
						}
						else if (pageId >= pageCount) {
							pageId = pageCount - 1;
						}

						for (i = 0; i < pageCount; i++) {
							if (i == pageId) {
								paginationField.addSelectOption({ value: 'pageid_' + i, text: ((i * PAGE_SIZE) + 1) + ' - ' + ((i + 1) * PAGE_SIZE), isSelected: true });
							} else {
								paginationField.addSelectOption({ value: 'pageid_' + i, text: ((i * PAGE_SIZE) + 1) + ' - ' + ((i + 1) * PAGE_SIZE) });
							}
						}
						/// END ///

						var dataWithVendorFilter = new Array();
						var dataWithProjectFilter = new Array();
						var results = fetchSalesOrders(searchobj, pageId);

						var payRecVendorFilterFlag = false;
						var payRecProjectFilterFlag = false;

					
						if (results) {
							log.debug("results _", JSON.stringify(results));
							log.debug("results.length _", results.length);
							//var recordURL =  'www.google.com';	
							var x = 0;
							var status = " ";
							var date = "";
							var serviceitemID = " ";
							for (var i = 0; i < results.length; i++) {
								if (results[i].memo == 'VOID') {
									continue;
								}
								//sublist.setSublistValue({ id: 'custpage_checkbox', line: x, value: 'T' });
								var intId = results[i].id;
								var recType = results[i].recType;

								//Code Changed by Manu:
								var recName = results[i].tranid; // this is already set in fetchSalesOrders
								if (intId && recType) {
								var output = url.resolveRecord({ recordType: recType, recordId: intId, isEditMode: false });
								var linkText = recName || (results[i].tranType + ' #' + intId);
								var recordLink = '<html><a href="' + output + '">' + linkText + '</a></html>';
								sublist.setSublistValue({ id: 'custpage_id', line: x, value: recordLink });
								}

								if (is_markall == 'true' || is_markall == 'T') {
									if (all_invid && all_invid != null && all_invid != '' && all_invid.length > 0) {
										if (all_invid.indexOf(results[i].id) != -1) {
											sublist.setSublistValue({ id: 'custpage_checkbox', line: x, value: 'T' });
										}
										else {
											sublist.setSublistValue({ id: 'custpage_checkbox', line: x, value: 'F' });
										}
									}
									else {
										sublist.setSublistValue({ id: 'custpage_checkbox', line: x, value: 'T' });
									}
								}
								else {
									sublist.setSublistValue({ id: 'custpage_checkbox', line: x, value: 'F' });
								}
								if (recordLink) { sublist.setSublistValue({ id: 'custpage_id', line: x, value: recordLink }); }
								if (results[i].id) { sublist.setSublistValue({ id: 'custpage_css_internalid', line: x, value: results[i].id }); }
								// sublist.setSublistValue({id : 'custpage_view',line : x,value : recordURL});
								if (results[i].date) { sublist.setSublistValue({ id: 'custpage_css_trandate', line: x, value: results[i].date || '' }); }
								if (results[i].period) { sublist.setSublistValue({ id: 'custpage_css_period', line: x, value: results[i].period || '' }); }
								if (results[i].tranType) { sublist.setSublistValue({ id: 'custpage_css_transactiontype', line: x, value: results[i].tranType || '' }); }
								// if (results[i].invType) { sublist.setSublistValue({ id: 'custpage_css_invtype', line: x, value: results[i].invType || '' }); }
								if (results[i].tranId) { sublist.setSublistValue({ id: 'custpage_css_tranid', line: x, value: results[i].tranId || '' }); }

								if (results[i].projectId) { sublist.setSublistValue({ id: 'custpage_css_projectid', line: x, value: results[i].projectId || '' }); }

								// if (results[i].account) { sublist.setSublistValue({ id: 'custpage_css_account', line: x, value: results[i].account || '' }); }
								if (results[i].memo) { sublist.setSublistValue({ id: 'custpage_css_memo', line: x, value: results[i].memo || '' }); }
								if (results[i].amount) { sublist.setSublistValue({ id: 'custpage_css_amount', line: x, value: results[i].amount || '' }); }
								// if (results[i].employee) { sublist.setSublistValue({ id: 'custpage_css_employee', line: x, value: results[i].employee || '' }); }
								if (results[i].subsidiary) { sublist.setSublistValue({ id: 'custpage_css_subsidiary', line: x, value: results[i].subsidiary || '' }); }
								if (results[i].subsidiaryVal) { sublist.setSublistValue({ id: 'custpage_css_subsidiaryval', line: x, value: results[i].subsidiaryVal || '' }); }
								if (results[i].customer) { sublist.setSublistValue({ id: 'custpage_css_customer', line: x, value: results[i].customer || '' }); }
								if (results[i].customerVal) { sublist.setSublistValue({ id: 'custpage_css_customerval', line: x, value: results[i].customerVal || '' }); }
								//if (results[i].vendor) { sublist.setSublistValue({ id: 'custpage_css_vendor', line: x, value: results[i].vendor || '' }); }
								//if (results[i].vendorVal) { sublist.setSublistValue({ id: 'custpage_css_customerval', line: x, value: results[i].vendorval || '' }); }
								if (results[i].tranmail) { sublist.setSublistValue({ id: 'custpage_css_tranmail', line: x, value: results[i].tranmail || '' }); }
								if (results[i].projmail) { sublist.setSublistValue({ id: 'custpage_css_projmail', line: x, value: results[i].projmail || '' }); }
								else if (results[i].venmail) { sublist.setSublistValue({ id: 'custpage_css_projmail', line: x, value: results[i].venmail || '' }); }
								//if (employeeName) { sublist.setSublistValue({ id: 'custpage_csa_employee', line: x, value: employeeName }); }

								/*if (parentName) { sublist.setSublistValue({ id: 'custpage_csa_customerval', line: x, value: results[i].item }) };//Customer
								if (comName) { sublist.setSublistValue({ id: 'custpage_csa_projectval', line: x, value: results[i].item }) };
								//if(subProjectName){sublist.setSublistValue({id : 'custpage_csa_projectval',line : x,value : subProjectName})}; //Project							
								*/
								x++;
							}
						}

						var datarec = form.addSubmitButton({ label: 'Send' });
						form.addButton({ id: 'custpage_search', label: 'Search', functionName: 'filterData()' });
						form.addButton({ id: 'custpage_refresh', label: 'Refresh', functionName: 'refreshPage()' });
						sublist.addButton({ id: 'custpage_markall', label: 'Mark All', functionName: 'markallfunction' });
						sublist.addButton({ id: 'custpage_unmarkall', label: 'Unmark All', functionName: 'unmarkallfunction' });
						context.response.writePage(form);

					}
					catch (error) {
						log.debug("error ", error);
						log.debug("error occured in GET", error.message);
					}
				}
				else {
					log.debug(mannualFlag);
					var form = ui.createForm({ title: 'Create Invoices' });
					var MessageField = form.addField({ id: 'custpage_message', type: ui.FieldType.TEXT, label: "Message :" });
					MessageField.defaultValue = 'Please Enable the Manual Batch Bill Processing Feature.';
					MessageField.updateDisplayType({ displayType: ui.FieldDisplayType.INLINE });

					context.response.writePage(form);
				}
			}

			//Bulk Emailing-S1/P3
			else {
				try {
					log.debug("error occured in custpage_sublistdata", context.request.parameters.custpage_sublistdata);
					log.debug("error occured in custpage_sublistfields", context.request.parameters.custpage_sublistfields);
					var sublistField = (context.request.parameters.custpage_sublistfields).split("\u0001");
					var sublistData = (context.request.parameters.custpage_sublistdata).split("\u0002");
					log.debug("sublistField >>> ", JSON.stringify(sublistField));
					log.debug("sublistData >>> ", JSON.stringify(sublistData));

					var ismarkall = context.request.parameters.custpage_css_ismarkall;
					log.debug('ismarkall', ismarkall);
					var totalinvid = context.request.parameters.custpage_invids;
					var arrayList = new Array();

					if (ismarkall == true || ismarkall == 'true' || ismarkall == 'T') {
						arrayList.push(totalinvid);
					}
					else {
						for (var sublistDataValue in sublistData) {
							var resultObj = {};
							var resultlineObj = {};
							resultlineObj['email'] = [];
							var sublistLineData = sublistData[sublistDataValue].split("\u0001");
							for (var sublistLineDataValue in sublistLineData) {
								if (sublistField[sublistLineDataValue] === 'custpage_css_tranmail') {
									resultlineObj['email'].push(sublistLineData[sublistLineDataValue]);
								}
								else if (sublistField[sublistLineDataValue] === 'custpage_css_projmail') {
									resultlineObj['email'].push(sublistLineData[sublistLineDataValue]);
								}
								else if (sublistField[sublistLineDataValue] === 'custpage_css_additionalmail_1') {
									resultlineObj['email'].push(sublistLineData[sublistLineDataValue]);
								}
								else if (sublistField[sublistLineDataValue] === 'custpage_css_additionalmail_2') {
									resultlineObj['email'].push(sublistLineData[sublistLineDataValue]);
								}
								else {
									resultObj[sublistField[sublistLineDataValue]] = sublistLineData[sublistLineDataValue];
								}
							}
							resultObj['emailaddr'] = resultlineObj;
							if (resultObj.custpage_checkbox == 'T') {
								arrayList.push(resultObj);
							}
						}
					}
					//log.debug("called POST arrayList",JSON.stringify(arrayList))
					var markChk = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_checkbox', line: 1 });
					log.debug("called POST markChk", JSON.stringify(markChk))
					var markedSOId = context.request.parameters.custpage_allids;
					log.debug("called POST arrayList", JSON.stringify(arrayList));

					var InvResultForm = ui.createForm({ title: 'Bulk Mail Process' });
					var statusField = InvResultForm.addField({ id: 'custpage_status', label: 'Status', type: ui.FieldType.INLINEHTML });
					var newInvRecField = InvResultForm.addField({ id: 'custpage_inv_rec', type: ui.FieldType.INLINEHTML, label: 'Go Back' });
					newInvRecField.updateLayoutType({ layoutType: ui.FieldLayoutType.OUTSIDEBELOW });

					if (ismarkall == true || ismarkall == 'true' || ismarkall == 'T') {
						var mytask = task.create({
							taskType: task.TaskType.MAP_REDUCE,
							scriptId: 'customscript_css_mr_bulk_email_process',
							deploymentId: '',
							params: {
								custscript_marked_time_bill_ids: totalinvid,
								custscript_markedall: true
							}
						});
					}
					else {
						var mytask = task.create({
							taskType: task.TaskType.MAP_REDUCE,
							scriptId: 'customscript_css_mr_bulk_email_process',
							deploymentId: '',
							params: {
								custscript_marked_time_bill_ids: JSON.stringify(arrayList),
								custscript_markedall: false
							}
						});
					}
					// var mytask = task.create({ taskType: task.TaskType.MAP_REDUCE, scriptId: 'customscript_css_mr_bulk_email_process', deploymentId: '', params: { custscript_marked_time_bill_ids: JSON.stringify(arrayList) } });
					try {
						mytask.submit();

						var scheme = 'https://';
						var host = url.resolveDomain({ hostType: url.HostType.APPLICATION });
						var link = url.resolveScript({ scriptId: 'customscript_css_sl_bulk_mail_process', deploymentId: 'customdeploy_css_sl_bulk_mail_process', });
						var urlVal = scheme + host + link;
						//var uvurl = 'https://tstdrv2150477.app.netsuite.com/app/center/card.nl?sc=40&whence='
						//urlVal += '&employeeid=0';
						//urlVal += "&markid=" + markedSOId

						//	LOGIC TO GET DYNAMIC URL ENDS
						var html = '';
						html += '<script>'
						html += 'window.open("' + urlVal + '","_self");</script>';
						newInvRecField.defaultValue = '<a href="' + urlVal + '">Go Back</a>';
						statusField.defaultValue = '<h2>' + 'Transaction emails have been sent.' + '</h2>';
					}
					catch (e) {
						log.error("error in submitting task", e.message)
						statusField.defaultValue = '<h2>' + 'Process Failed Due to' + e.message + '</h2>';
						context.response.writePage(InvResultForm);
					}
					//this logic below will get all the ids of the Time bills that has been marked 

					context.response.writePage(InvResultForm);
					//context.response.writeLine(html);
				}
				catch (error) {
					log.debug("error occured in POST", error.message);
				}
			}
		}

		function getfileId(clientScript) {
			//we can make it as function to reuse.
			var search_folder = search.create({ type: 'folder', filters: [{ name: 'name', join: 'file', operator: 'is', values: clientScript }], columns: [{ name: 'internalid', join: 'file' }] });
			var searchFolderId = '';
			var searchFolderName = '';
			search_folder.run().each(function (result) {
				searchFolderId = result.getValue({ name: 'internalid', join: 'file' });
				log.debug('searchFolderId', searchFolderId);
				return true;
			});
			return searchFolderId;
		}

		function fetchSalesOrders(searchobj, pageid) {
			try {
				log.debug("error occured in searchobj", searchobj);
				var results = new Array();
				var tbSearchData = new Array();

				if (searchobj.count != '0') {
					if (pageid == -1) {
						searchobj.each(function (result) {
							results.push(result.getValue(result.columns[0]));
							return true;
						})
						return results;
					}
					var searchPage = searchobj.fetch({ index: pageid });
					searchPage.data.forEach(function (result) {
						if (result.getText({ name: 'statusref' }) != 'Rejected') {
							results.push({
								'id': result.getValue({ name: 'internalid' }),
								'date': result.getValue({ name: 'trandate' }),
								'period': result.getText({ name: 'postingperiod' }),
								'tranType': result.getText({ name: 'type' }),
								'recType': result.getValue({ name: 'recordtype' }),
								'tranid': result.getValue({ name: 'tranid' }),
								'projectId': result.getValue({ name: 'internalid', join: 'jobMain' }),
								//'name': result.getValue({ name: 'tranid' }),
								'account': result.getText({ name: 'account' }),
								'memo': result.getValue({ name: 'memo' }),
								'amount': result.getValue({ name: 'amount' }),
								'subsidiary': result.getText({ name: 'subsidiary' }),
								'subsidiaryVal': result.getValue({ name: 'subsidiary' }),
								'customer': result.getText({ name: 'entity' }),
								'customerVal': result.getValue({ name: 'entity' }),
								'tranmail': result.getValue({ name: 'email' }),
								'projmail': result.getValue({ name: 'email', join: 'customer' }),
								'venmail': result.getValue({ name: 'email', join: 'vendor' })
								// 'invType': result.getValue({ name: 'custbody_csa_invoice_type_field' })
								// 'employee': result.getText({ name: 'custbody_csa_employee' })
							});
						}
						return true;
					});
				}

				log.debug("mergeDataArr _", JSON.stringify(results));
			}
			catch (e) {
				log.debug({ title: 'error', details: e.message })
			}
			return results;
		}

		function getSavedSearch(PAGE_SIZE, employeeid, customerid, projectid, startDateVal, endDateVal, invoiceDateVal, subsidiaryVal, tranTypeId, invoiceTypeId, vendorid, collectionAnalystId, checkValue) {
			try {
				//startDateVal = '4/1/2022';
				log.debug("startDateVal _", startDateVal);
				log.debug("endDateVal _", endDateVal);
				//log.debug("tranTypeId _", tranTypeId);
				log.debug("subsidiaryVal _", subsidiaryVal);
				//log.debug("invoiceTypeId _", invoiceTypeId);

				var tranType = '';
				// invoiceType = '';
				if (tranTypeId) {
					switch (tranTypeId) {
						case 1:
							tranType = 'CustInvc';
							break;
						case 2:
							tranType = 'VendPymt';
							break;
						case 3:
							tranType = 'VendBill';
							break;
					}
				}/*
				var tranQuery = "SELECT t.trandate, t.id, t.tranid, t.postingperiod, t.memo, t.foreigntotal, t.type, t.custbody_invoice_type_field ";
				tranQuery += "FROM transaction t ";
				tranQuery += "LEFT JOIN job j ON j.id = t.entity ";
				tranQuery += "WHERE (t.trandate > '" + startDateVal + "') AND (t.trandate < '" + endDateVal + "')";
				if (tranType) {
					tranQuery += " AND (t.type = '" + tranType+"')";
				}
				if (invoiceTypeID) {
					tranQuery += " AND (t.custbody_invoice_type_field = "+invoiceTypeID+")";
				}
				var tranQueryData = query.runSuiteQL(tranQuery);
				var tranQueryResults = tranQueryData.asMappedResults();
				if (tranQueryResults.length > 0) {
					var serItemText = tranQueryResults[0].itemid;
				}*/

				var filterArrVal = new Array();
				// if(tranType!='VendPymt')
				filterArrVal.push(search.createFilter({ name: 'custentitycsa_hideon_bulkemailing', join: 'customer', operator: search.Operator.IS, values: 'F' }));
				//VendBill
				if (tranType) { filterArrVal.push(search.createFilter({ name: 'type', join: null, operator: search.Operator.ANYOF, values: tranType })); }
				if (tranType == "CustInvc") { filterArrVal.push(search.createFilter({ name: 'status', join: null, operator: search.Operator.ANYOF, values: "CustInvc:A" })); }
				if (checkValue) {
					if (checkValue == "1" && tranType == "VendPymt") {
						filterArrVal.push(search.createFilter({ name: 'custbody_9997_is_for_ep_eft', join: null, operator: search.Operator.IS, values: "T" }));
					} else if (checkValue == "2" && tranType == "VendPymt") {
						filterArrVal.push(search.createFilter({ name: 'custbody_9997_is_for_ep_eft', join: null, operator: search.Operator.IS, values: "F" }));
					}
				}
				//else { filterArrVal.push(search.createFilter({ name: 'type', join: null, operator: search.Operator.ANYOF, values: ['CustInvc', 'VendPymt','VendBill'] })); }
				filterArrVal.push(search.createFilter({ name: 'mainline', join: null, operator: search.Operator.IS, values: "T" }));
				filterArrVal.push(search.createFilter({ name: 'custbody_bulk_email_status', join: null, operator: search.Operator.NONEOF, values: "1" }));		//1: "Sent"
				// filterArrVal.push(search.createFilter({ name: 'trandate', join: null, operator: search.Operator.ONORAFTER, values: '2/25/2023' }));
				if (invoiceDateVal) {
				filterArrVal.push(search.createFilter({
					name: 'trandate', join: null, operator: search.Operator.ON, values: invoiceDateVal
				}));
				} 
				else {
					if (startDateVal) { filterArrVal.push(search.createFilter({ name: 'trandate', join: null, operator: search.Operator.ONORAFTER, values: startDateVal })); }
					if (endDateVal) { filterArrVal.push(search.createFilter({ name: 'trandate', join: null, operator: search.Operator.ONORBEFORE, values: endDateVal })); }
				}

				if (subsidiaryVal) { filterArrVal.push(search.createFilter({ name: 'subsidiary', join: null, operator: search.Operator.ANYOF, values: subsidiaryVal })); }
				// if (invoiceTypeId) { filterArrVal.push(search.createFilter({ name: 'custbody_csa_invoice_type_field', join: null, operator: search.Operator.ANYOF, values: invoiceTypeId })); }
				if (vendorid) { filterArrVal.push(search.createFilter({ name: 'internalid', join: 'vendor', operator: search.Operator.ANYOF, values: vendorid })); }
				if (customerid) { filterArrVal.push(search.createFilter({ name: 'internalid', join: 'customer', operator: search.Operator.ANYOF, values: customerid })); }
				// if (collectionAnalystId) { filterArrVal.push(search.createFilter({ name: 'custentity_collection_analyst', join: 'customer', operator: search.Operator.ANYOF, values: collectionAnalystId })); }

				log.debug('filterArrVal', filterArrVal);
				log.debug('filterArrVal', filterArrVal.toString());
				var tranSearchObj = search.create({
					type: "transaction",
					filters: filterArrVal,
					columns:
						[
							search.createColumn({ name: "internalid", sort: search.Sort.ASC, label: "Internal ID" }),
							search.createColumn({ name: "trandate", label: "Date" }),
							search.createColumn({ name: "postingperiod", label: "Period" }),
							search.createColumn({ name: "type", label: "Type" }),
							search.createColumn({ name: "recordtype", label: "Record Type" }),
							search.createColumn({ name: "tranid", label: "Document Number" }),
							search.createColumn({ name: "entity", label: "Name" }),
							search.createColumn({ name: "internalid", join: "jobMain", label: "Internal ID" }),
							search.createColumn({ name: "account", label: "Account" }),
							search.createColumn({ name: "memo", label: "Memo" }),
							search.createColumn({ name: "amount", label: "Amount" }),
							search.createColumn({ name: "subsidiary", label: "Subsidiary" }),
							search.createColumn({ name: "amount", label: "Amount" }),
							search.createColumn({ name: "email", label: "Email" }),
							search.createColumn({ name: "email", join: "customer", label: "Email" }),
							search.createColumn({ name: "email", join: "vendor", label: "Email" }),
							// search.createColumn({ name: "custbody_csa_invoice_type_field", label: "Invoice Type" }),
							search.createColumn({ name: "statusref", label: "Status" }),
							search.createColumn({ name: "custbody_csa_employee", label: "CSA - Employee" })
						]
				});
				var tranSearchCount = tranSearchObj.runPaged().count;
				log.debug("tranSearchObj result count", tranSearchCount);
				//invoiceSearchObj.run().each(function (result) {
				//return true;
				//});
				var tranSearchResult = tranSearchObj.runPaged({ pageSize: PAGE_SIZE });

				if (PAGE_SIZE == -1) {
					return tranSearchObj.run();
				}
				log.debug({ title: 'customFilters', ddetails: JSON.stringify(tranSearchResult) });
				return tranSearchResult;

			}
			catch (err) {
				log.error("Error in returnTimesheetList", err);
			}
		}

		// Add by sudesh	
		function getInvoiceSavedSearch(employeeid, customerid, projectid, startDateVal, endDateVal, invoiceDateVal, subsidiaryVal, tranTypeId, invoiceTypeId, vendorid, collectionAnalystId, checkValue) {
			try {

				log.debug("startDateVal _1", startDateVal);
				log.debug("endDateVal _1", endDateVal);
				log.debug("subsidiaryVal _1", subsidiaryVal);

				// log.debug("employeeid _1", employeeid);
				// log.debug("customerid _1", customerid);
				// log.debug("projectid _1", projectid);
				// log.debug("tranTypeId _1", tranTypeId);
				// log.debug("invoiceTypeId _1", invoiceTypeId);
				// log.debug("checkValue _1", checkValue);
				// log.debug("collectionAnalystId _1", collectionAnalystId);

				var invresults = new Array();
				var tranType = '';
				// invoiceType = '';
				if (tranTypeId) {
					switch (tranTypeId) {
						case 1:
							tranType = 'CustInvc';
							break;
						case 2:
							tranType = 'VendPymt';
							break;
						case 3:
							tranType = 'VendBill';
							break;
					}
				}
				var filterArrVal1 = new Array();
				filterArrVal1.push(search.createFilter({ name: 'custentitycsa_hideon_bulkemailing', join: 'customer', operator: search.Operator.IS, values: 'F' }));
				//VendBill
				if (tranType) {
					filterArrVal1.push(search.createFilter({ name: 'type', join: null, operator: search.Operator.ANYOF, values: tranType }));
				}
				if (tranType == "CustInvc") {
					filterArrVal1.push(search.createFilter({ name: 'status', join: null, operator: search.Operator.ANYOF, values: "CustInvc:A" }));
				}
				if (checkValue) {
					if (checkValue == "1" && tranType == "VendPymt") {
						filterArrVal1.push(search.createFilter({ name: 'custbody_9997_is_for_ep_eft', join: null, operator: search.Operator.IS, values: "T" }));
					} else if (checkValue == "2" && tranType == "VendPymt") {
						filterArrVal1.push(search.createFilter({ name: 'custbody_9997_is_for_ep_eft', join: null, operator: search.Operator.IS, values: "F" }));
					}
				}
				filterArrVal1.push(search.createFilter({ name: 'mainline', join: null, operator: search.Operator.IS, values: "T" }));
				filterArrVal1.push(search.createFilter({ name: 'custbody_bulk_email_status', join: null, operator: search.Operator.NONEOF, values: "1" }));		//1: "Sent"
				// filterArrVal1.push(search.createFilter({ name: 'trandate', join: null, operator: search.Operator.ONORAFTER, values: '2/25/2023' }));
				if (invoiceDateVal) {
				filterArrVal1.push(search.createFilter({
					name: 'trandate', join: null, operator: search.Operator.ON, values: invoiceDateVal
				}));
				} 
				else {
					if (startDateVal) {
						filterArrVal1.push(search.createFilter({ name: 'trandate', join: null, operator: search.Operator.ONORAFTER, values: startDateVal }));
					}
					if (endDateVal) {
						filterArrVal1.push(search.createFilter({ name: 'trandate', join: null, operator: search.Operator.ONORBEFORE, values: endDateVal }));
					}
				}

				if (subsidiaryVal) {
					filterArrVal1.push(search.createFilter({ name: 'subsidiary', join: null, operator: search.Operator.ANYOF, values: subsidiaryVal }));
				}
				// if (invoiceTypeId) {
				// 	filterArrVal1.push(search.createFilter({ name: 'custbody_csa_invoice_type_field', join: null, operator: search.Operator.ANYOF, values: invoiceTypeId }));
				// }
				if (vendorid) {
					filterArrVal1.push(search.createFilter({ name: 'internalid', join: 'vendor', operator: search.Operator.ANYOF, values: vendorid }));
				}
				if (customerid) {
					filterArrVal1.push(search.createFilter({ name: 'internalid', join: 'customer', operator: search.Operator.ANYOF, values: customerid }));
				}
				// if (collectionAnalystId) {
				// 	filterArrVal1.push(search.createFilter({ name: 'custentity_collection_analyst', join: 'customer', operator: search.Operator.ANYOF, values: collectionAnalystId }));
				// }

				log.debug('filterArrVal1', filterArrVal1);
				log.debug('filterArrVal1', filterArrVal1.toString());
				var tranSearchObj = search.create({
					type: "transaction",
					filters: filterArrVal1,
					columns:
						[
							search.createColumn({ name: "internalid", sort: search.Sort.ASC, label: "Internal ID" }),
						]
				});
				var tranSearchCount = tranSearchObj.runPaged().count;
				log.debug("tranSearchObj result count1", tranSearchCount);
				var invresultdata = tranSearchObj.run();
				invresultdata.each(function (result) {
					var invid = result.getValue('internalid');
					// invresults.push({
					// "invid":invid,
					// "email2":
					// })

					// invresults.push(invid:{'email1':'','email2':''})
					invresults.push(invid);
					return true;
				})
				log.debug('invresults', invresults);
				return invresults;
			}
			catch (err) {
				log.error("Error in InvSavedSearch", err);
			}
		}



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
					searchObj = search.load({ id: searchId });
					if (searchFilter) {
						searchObj.addFilters(searchFilter);
					}
					if (searchColumns) {
						searchObj.addColumns(searchColumns);
					}
				} else {
					searchObj = search.create({ type: recordType, filters: searchFilter, columns: searchColumns })
				}

				var rs = searchObj.run();
				//searchColumns.push(rs.columns);
				//allColumns = rs.columns;

				while (count == 1000) {
					var resultSet = rs.getRange({ start: min, end: max });
					if (resultSet != null) {
						arrSearchResults = arrSearchResults.concat(resultSet);
						min = max;
						max += 1000;
						count = resultSet.length;
					}
				}
			}
			catch (e) {
				log.debug('Error searching for' + recordType + ':- ', e.message);
			}
			return arrSearchResults;
		}

		function getDataFromSetupPage() {
			var customrecord_csa_system_setup_recordSearchObj = search.create({
				type: "customrecord_csa_system_setup",
				filters: [["custrecord_csa_advance_project", "is", "T"]],
				columns: [
					search.createColumn({ name: "custrecord_csa_advance_project", label: "Advance Projects" }),
					search.createColumn({ name: "custrecord_csa_one_world_acct", label: "One World Account" }),
					search.createColumn({ name: "custrecord_csa_sales_role", label: "SALES ROLE" }),
					search.createColumn({ name: "custrecord_csa_inv_item_description", label: "Invoice Item Description Format" }),
					search.createColumn({ name: "custrecord_csa_invoicenoformat", label: "Invoice # Format" }),
					search.createColumn({ name: "custrecord_csa_recruiter_role", label: "Recruiter Role" }),
					search.createColumn({ name: "custrecord_csa_vms_discount", label: "VMS Discount" }),
					search.createColumn({ name: "custrecord_csa_standard_time", label: "Standard Time" }),
					search.createColumn({ name: "custrecord_csa_double_time", label: "Double Time" }),
					search.createColumn({ name: "custrecord_csa_over_time", label: "Over Time" }),
					search.createColumn({ name: "custrecord_csa_bill_standard_time", label: "Bill Standard Time" }),
					search.createColumn({ name: "custrecord_csa_bill_double_time", label: "Bill Double TIme" }),
					search.createColumn({ name: "custrecord_csa_bill_over_time", label: "Bill Over Time" }),
					search.createColumn({ name: "custrecord_csa_invoiceform", label: "Invoice Form" }),
					search.createColumn({ name: "custrecord_csa_vendor_bill_form", label: "Vendor Bill Form" }),
					search.createColumn({ name: "custrecord_csa_manual_bill", label: "Manual Batch Bill Processing Page" })
				]
			});
			var searchSetUpPageCount = customrecord_csa_system_setup_recordSearchObj.runPaged().count;
			// log.debug("searchSetUpPageCount _", searchSetUpPageCount);

			if (searchSetUpPageCount > 0) {
				var searchSetUpPageResult = customrecord_csa_system_setup_recordSearchObj.run().getRange({ start: 0, end: 1 });
				var advanceProject = searchSetUpPageResult[0].getValue({ name: "custrecord_csa_advance_project" });
				var oneWorldAccount = searchSetUpPageResult[0].getValue({ name: "custrecord_csa_one_world_acct" });
				var salesRole = searchSetUpPageResult[0].getValue({ name: "custrecord_csa_sales_role" });
				var invItemDescFormat = searchSetUpPageResult[0].getValue({ name: "custrecord_csa_inv_item_description" });
				var invoiceNoFormat = searchSetUpPageResult[0].getValue({ name: "custrecord_csa_invoicenoformat" });
				var recruiterRole = searchSetUpPageResult[0].getValue({ name: "custrecord_csa_recruiter_role" });
				var setUpVMSDiscount = searchSetUpPageResult[0].getValue({ name: "custrecord_csa_vms_discount" });
				var setupStandardTime = searchSetUpPageResult[0].getValue({ name: "custrecord_csa_standard_time" });
				var setupDoubleTime = searchSetUpPageResult[0].getValue({ name: "custrecord_csa_double_time" });
				var setupOverTime = searchSetUpPageResult[0].getValue({ name: "custrecord_csa_over_time" });
				var setupBillStnTime = searchSetUpPageResult[0].getValue({ name: "custrecord_csa_bill_standard_time" });
				var setupBillDoubleTime = searchSetUpPageResult[0].getValue({ name: "custrecord_csa_bill_double_time" });
				var setupBillOverTime = searchSetUpPageResult[0].getValue({ name: "custrecord_csa_bill_over_time" });
				var setupInvoiceForm = searchSetUpPageResult[0].getValue({ name: "custrecord_csa_invoiceform" });
				var setupBillForm = searchSetUpPageResult[0].getValue({ name: "custrecord_csa_vendor_bill_form" });

				var setUpPageData = {
					"advanceProject": advanceProject,
					"oneWorldAccount": oneWorldAccount,
					"salesRole": salesRole,
					"invItemDescFormat": invItemDescFormat,
					"invoiceNoFormat": invoiceNoFormat,
					"recruiterRole": recruiterRole,
					"setUpVMSDiscount": setUpVMSDiscount,
					"setupStandardTime": setupStandardTime,
					"setupDoubleTime": setupDoubleTime,
					"setupOverTime": setupOverTime,
					"setupBillStnTime": setupBillStnTime,
					"setupBillDoubleTime": setupBillDoubleTime,
					"setupBillOverTime": setupBillOverTime,
					"setupInvoiceForm": setupInvoiceForm,
					"setupBillForm": setupBillForm,
					"custrecord_csa_manual_bill": searchSetUpPageResult[0].getValue({ name: "custrecord_csa_manual_bill" })
				}
				log.debug("setUpPageData", setUpPageData);
			}
			return setUpPageData;
		}

		return {
			onRequest: onRequest,
		}
	});