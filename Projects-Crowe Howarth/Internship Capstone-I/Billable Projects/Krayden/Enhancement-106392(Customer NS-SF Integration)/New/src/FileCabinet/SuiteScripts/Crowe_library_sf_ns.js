/*
	Created By: Crowe LLP 
	library functions for authentication to salesforce,making requests and handling responses
*/
/**
 * @NModuleScope Public
 */

define(["N/runtime", "N/https", "N/format", 'N/log', 'N/record', 'N/search', 'N/url', 'N/config'],
	function (runtime, https, format, log, record, search, url, config) {
		// Get SF tokent to send data from NS
		function geturl() {

			var endP_sf = runtime.getCurrentScript().getParameter({ name: 'custscript_sfendpointurl' });
			var clientid = runtime.getCurrentScript().getParameter({ name: 'custscript_client_id' });
			var clientsecret = runtime.getCurrentScript().getParameter({ name: 'custscript_client_secret_key' });
			// var uname = runtime.getCurrentScript().getParameter({ name: 'custscript_user_name' });
			// var pwd = runtime.getCurrentScript().getParameter({ name: 'custscript_password' });

			log.debug('endP_sf', endP_sf);
			log.debug('clientid', clientid);
			log.debug('clientsecret', clientsecret);
			// log.debug('uname', uname);
			// log.debug('pwd', pwd);

			var url1 = endP_sf + '/services/oauth2/token';
			log.debug('url1', url1);
			var postData = {};
			postData['grant_type'] = 'client_credentials';
			postData['client_id'] = clientid;
			postData['client_secret'] = clientsecret;
			// postData['username'] = uname;
			// postData['password'] = pwd;
			var sfdcResponse = https.post({
				url: url1,
				body: postData
			});
			log.debug('sfdcResponse', sfdcResponse);
			if (!isResponseError(sfdcResponse.code)) {
				var sfAuthJson = JSON.parse(sfdcResponse.body);
				var accesstkn = sfAuthJson.access_token;
				var instanceurl = sfAuthJson.instance_url;
				var tokentype = sfAuthJson.token_type;
				log.debug('accesstkn', accesstkn);
				log.debug('instanceurl', instanceurl);
				log.debug('tokentype', tokentype);
				return tokentype + ' ' + accesstkn;
			}
		}

		function isEmpty(stValue) {
			if ((stValue == '') || (stValue == null) || (stValue == undefined) || (stValue == 'null') || (stValue == 'undefined')) {
				return false;
			}
			return true;
		}

		/***********************************************************************************
		*   findCustomerInNS
		************************************************************************************/
		function findCustomerInNS(custId) {
			log.debug('custId', custId);
			var customerInternalid = null;
			var customersearch = search.create({
				type: "customer",
				filters:
					[
						["internalid", "anyof", custId],
						"AND",
						["isinactive", "is", "F"]
					],
				columns:
					[
						search.createColumn({ name: "custentity_crw_99680_sfcustomer_id", label: "SFID" })
					]
			});
			var resultsSet = customersearch.run();
			var results = resultsSet.getRange(0, 999);
			log.debug("Customer detail : ", JSON.stringify(results));
			if (results && results != null && results != '' && results.length > 0) {
				customerInternalid = results[0].getValue({
					name: "custentity_crw_99680_sfcustomer_id"
				});
				log.debug("customerInternalid : ", customerInternalid);
			}
			else {
				log.debug("Customer Not Found with : ", custId);
			}
			return customerInternalid;
		}


		/***********************************************************************************
		*   findSubsidiaryInNS
		************************************************************************************/
		function findSubsidiaryInNS(subsId) {
			log.debug('subsId', subsId);
			var subsidiaryShortform = null;
			var subsidiarySearchObj = search.create({
				type: "subsidiary",
				filters:
					[
						["internalid", "anyof", subsId],
						"AND",
						["isinactive", "is", "F"]
					],
				columns:
					[
						search.createColumn({ name: "custrecord_crw_99623_sub_short", label: "Subsidiary Shortform" })
					]
			});
			var resultsSet = subsidiarySearchObj.run();
			var results = resultsSet.getRange(0, 999);
			log.debug("Customer detail : ", JSON.stringify(results));
			if (results && results != null && results != '' && results.length > 0) {
				subsidiaryShortform = results[0].getText({
					name: "custrecord_crw_99623_sub_short"
				});
				log.debug("subsidiaryShortform : ", subsidiaryShortform);
			}
			else {
				log.debug("Subsidiary Not Found with : ", subsId);
			}
			return subsidiaryShortform;
		}

		/***********************************************************************************
		*   findItemInNS
		************************************************************************************/
		function findItemInNS(itmId) {
			log.debug('itmId', itmId);
			var itmSFid = null;
			var itemSearchObj = search.create({
				type: "item",
				filters:
					[
						["internalid", "anyof", itmId],
						"AND",
						["isinactive", "is", "F"]
					],
				columns:
					[
						search.createColumn({ name: "custitem_crw_99936_sf_itemid", label: "Salesforce ID" })
					]
			});
			var resultsSet = itemSearchObj.run();
			var results = resultsSet.getRange(0, 999);
			log.debug("Customer detail : ", JSON.stringify(results));
			if (results && results != null && results != '' && results.length > 0) {
				itmSFid = results[0].getValue({
					name: "custitem_crw_99936_sf_itemid"
				});
				log.debug("itmSFid : ", itmSFid);
			}
			else {
				log.debug("Item SF ID Not Found with : ", itmId);
			}
			return itmSFid;
		}



		/***********************************************************************************
		*   findCustomerbyemailInNS
		************************************************************************************/
		function findCustomerbyemailInNS(emailid) {
			log.audit('Searching customer by email', emailid);
			var customerInternalid = null;
			var customersearch = search.create({
				type: "customer",
				filters:
					[
						["email", "is", emailid],
						"AND",
						["isinactive", "is", "F"]
					],
				columns:
					[
						search.createColumn({ name: "internalid", sort: search.Sort.DESC, label: "Internal ID" })
					]
			});
			var resultsSet = customersearch.run();
			var results = resultsSet.getRange(0, 999);
			log.debug("Customer detail : ", JSON.stringify(results));
			if (results && results != null && results != '' && results.length > 0) {
				customerInternalid = results[0].getValue({
					name: "internalid"
				});
				log.debug("customerInternalid : ", customerInternalid);
			}
			else {
				log.debug("Customer Not Found with : ", consfid);
			}
			return customerInternalid;
		}

		/***********************************************************************************
		*   findOrderInNS
		************************************************************************************/
		function findOrderInNS(peid) {
			var orderInternalid = null;
			var ordersearch = search.create({
				type: "salesorder",
				columns: ["internalid"],
				filters: [["custbody_c72321_pe_salesforce_id", "is", peid], "AND", ["mainline", "is", "T"]]
			});
			var resultsSet = ordersearch.run();
			var results = resultsSet.getRange(0, 999);
			log.debug("Order detail : ", JSON.stringify(results));
			if (results && results != null && results != '' && results.length > 0) {
				orderInternalid = results[0].getValue({
					name: "internalid"
				});
				log.debug("orderInternalid : ", orderInternalid);
			}
			else {
				log.debug("Order Not Found with : ", peid);
			}
			return orderInternalid;
		}

		/***********************************************************************************
		*   findCustomerCategoryInNS
		************************************************************************************/
		function findCustomerCategoryInNS(CCname) {
			var CCInternalid = null;
			log.debug('CCname', CCname);
			var CCsearch = search.create({
				type: "customercategory",
				filters:
					[
						["name", "is", CCname],
						"AND",
						["isinactive", "is", "F"]
					],
				columns:
					[
						search.createColumn({
							name: "name",
							sort: search.Sort.ASC,
							label: "Name"
						}),
						search.createColumn({ name: "internalid", label: "Internal ID" })
					]
			});
			var resultsSet = CCsearch.run();
			log.debug('resultsSet', resultsSet.length);
			var results = resultsSet.getRange(0, 999);
			if (results && results != null && results != '' && results.length > 0) {
				CCInternalid = results[0].getValue({
					name: "internalid"
				});
			}
			else {
				log.debug("Customer Category Not Found with : ", CCname);
			}
			return CCInternalid;
		}


		/***********************************************************************************
		*   findBatchReferenceInNS
		************************************************************************************/
		function findBatchReferenceInNS(BRname) {
			var BRInternalid = null;
			log.debug('BRname', BRname);
			var BRsearch = search.create({
				type: "customlist_batchref",
				filters:
					[
						["name", "is", BRname],
						"AND",
						["isinactive", "is", "F"]
					],
				columns:
					[
						search.createColumn({
							name: "name",
							sort: search.Sort.ASC,
							label: "Name"
						}),
						search.createColumn({ name: "internalid", label: "Internal ID" })
					]
			});
			var resultsSet = BRsearch.run();
			log.debug('resultsSet', resultsSet.length);
			var results = resultsSet.getRange(0, 999);
			if (results && results != null && results != '' && results.length > 0) {
				BRInternalid = results[0].getValue({
					name: "internalid"
				});
			}
			else {
				log.debug("Batch reference Not Found with : ", BRname);
			}
			return BRInternalid;
		}

		/***********************************************************************************
		*   findBillingScheduleInNS
		************************************************************************************/
		function findBillingScheduleInNS(BSname) {
			var BSInternalid = null;
			log.debug('BSname', BSname);
			var BSsearch = search.create({
				type: "billingschedule",
				filters:
					[
						["name", "is", BSname],
						"AND",
						["isinactive", "is", "F"]
					],
				columns:
					[
						search.createColumn({
							name: "name",
							label: "Name"
						}),
						search.createColumn({ name: "internalid", label: "Internal ID" })
					]
			});
			var resultsSet = BSsearch.run();
			log.debug('BS resultsSet', resultsSet.length);
			var results = resultsSet.getRange(0, 999);
			if (results && results != null && results != '' && results.length > 0) {
				BSInternalid = results[0].getValue({
					name: "internalid"
				});
			}
			else {
				log.debug("BS Not Found with : ", BSname);
			}
			return BSInternalid;
		}

		/***********************************************************************************
		*   findSalesforceTermInNS
		************************************************************************************/
		function findSFtermInNS(sf_Term_id) {
			var termInternalid = null;
			var termsearch = search.create({
				type: "customrecord_c72321_sf_term_record",
				filters:
					[
						["custrecord_term_salesforce_id", "is", sf_Term_id],
						"AND",
						["isinactive", "is", "F"]
					],
				columns:
					[
						search.createColumn({
							name: "name",
							sort: search.Sort.ASC,
							label: "Name"
						}),
						search.createColumn({ name: "custrecord_pe_json", label: "PE JSON" }),
						search.createColumn({ name: "custrecord_term_salesforce_id", label: "Term Salesforce Id" }),
						search.createColumn({ name: "internalid", label: "Internal ID" })
					]
			});
			var resultsSet = termsearch.run();
			var results = resultsSet.getRange(0, 999);
			log.debug("Term detail : ", JSON.stringify(results));
			if (results && results != null && results != '' && results.length > 0) {
				termInternalid = results[0].getValue({
					name: "internalid"
				});
				log.debug("termInternalid : ", termInternalid);
			}
			else {
				log.debug("Term Not Found with : ", sf_Term_id);
			}
			return termInternalid;
		}

		/***********************************************************************************
		*   findDepartmentInNS
		************************************************************************************/
		function findDepartmentInNS(deptName) {
			var deptInternalid = null;
			var deptsearch = search.create({
				type: "department",
				filters:
					[
						["name", "is", deptName],
						"AND",
						["isinactive", "is", "F"]
					],
				columns:
					[
						search.createColumn({ name: "internalid", label: "Internal ID" })
					]
			});
			var resultsSet = deptsearch.run();
			var results = resultsSet.getRange(0, 999);
			log.debug("Dept detail : ", JSON.stringify(results));
			if (results && results != null && results != '' && results.length > 0) {
				deptInternalid = results[0].getValue({
					name: "internalid"
				});
				log.debug("deptInternalid : ", deptInternalid);
			}
			else {
				log.debug("Department Not Found with : ", deptName);
			}
			return deptInternalid;
		}

		/***********************************************************************************
		*   findLOBInNS
		************************************************************************************/
		function findLOBInNS(Lobname) {
			var lobInternalid = null;
			var lobsearch = search.create({
				type: "classification",
				filters:
					[
						["name", "is", Lobname],
						"AND",
						["isinactive", "is", "F"]
					],
				columns:
					[
						search.createColumn({ name: "internalid", label: "Internal ID" })
					]
			});
			var resultsSet = lobsearch.run();
			var results = resultsSet.getRange(0, 999);
			log.debug("LOB detail : ", JSON.stringify(results));
			if (results && results != null && results != '' && results.length > 0) {
				lobInternalid = results[0].getValue({
					name: "internalid"
				});
				log.debug("lobInternalid : ", lobInternalid);
			}
			else {
				log.debug("LOB Not Found with : ", Lobname);
			}
			return lobInternalid;
		}

		/***********************************************************************************
		*   findLOCInNS
		************************************************************************************/
		function findLOCInNS(Locname) {
			var locInternalid = null;
			var locsearch = search.create({
				type: "location",
				filters:
					[
						["name", "is", Locname],
						"AND",
						["isinactive", "is", "F"]
					],
				columns:
					[
						search.createColumn({ name: "internalid", label: "Internal ID" })
					]
			});
			var resultsSet = locsearch.run();
			var results = resultsSet.getRange(0, 999);
			log.debug("LOC detail : ", JSON.stringify(results));
			if (results && results != null && results != '' && results.length > 0) {
				locInternalid = results[0].getValue({
					name: "internalid"
				});
				log.debug("locInternalid : ", locInternalid);
			}
			else {
				log.debug("LOC Not Found with : ", Lobname);
			}
			return locInternalid;
		}

		/***********************************************************************************
		*   findMealPlanInNS
		************************************************************************************/
		function findMealPlanInNS(mpName) {
			var mpInternalid = null;
			var mpsearch = search.create({
				type: "customlist_cmeal_plan",
				filters:
					[
						["name", "is", mpName],
						"AND",
						["isinactive", "is", "F"]
					],
				columns:
					[
						search.createColumn({ name: "internalid", label: "Internal ID" })
					]
			});
			var resultsSet = mpsearch.run();
			var results = resultsSet.getRange(0, 999);
			log.debug("LOC detail : ", JSON.stringify(results));
			if (results && results != null && results != '' && results.length > 0) {
				mpInternalid = results[0].getValue({
					name: "internalid"
				});
				log.debug("mpInternalid : ", mpInternalid);
			}
			else {
				log.debug("Meal Plan Not Found with : ", mpName);
			}
			return mpInternalid;
		}


		/***********************************************************************************
		*   findMealitemInNS
		************************************************************************************/
		function findMealitemInNS(SFitem, mp, mpl, isInternational) {
			log.debug("Meal type : ", SFitem);
			log.debug("Meal plan : ", mp);
			log.debug("Meal location : ", mpl);
			log.debug("Meal International : ", isInternational);

			var mealItemdetail = null;
			var misearch = search.create({
				type: "customrecord_c72321_item_pricing",
				filters:
					[
						["custrecord_c72321_sf_item", "is", SFitem],
						"AND",
						["custrecord_c72321_meal_plan", "anyof", mp],
						"AND",
						["custrecord_c72321_camp_location", "anyof", mpl]
					],
				columns:
					[
						search.createColumn({
							name: "id",
							sort: search.Sort.ASC,
							label: "ID"
						}),
						search.createColumn({ name: "custrecord_c72321_amount", label: "Amount" }),
						search.createColumn({ name: "custrecord_c72321_item", label: "Item" }),
						search.createColumn({ name: "custrecord_c72321_internal_amount", label: "International Amount" })
					]
			});
			var resultsSet = misearch.run();
			var results = resultsSet.getRange(0, 999);
			log.debug("Meal Item detail : ", JSON.stringify(results));
			if (results && results != null && results != '' && results.length > 0) {
				var mitem = results[0].getValue({
					name: "custrecord_c72321_item"
				});
				var mitemlocalamt = results[0].getValue({
					name: "custrecord_c72321_amount"
				});
				var miteminternationalamt = results[0].getValue({
					name: "custrecord_c72321_internal_amount"
				});
				if (isInternational) {
					mealItemdetail = mitem + '-' + mitemlocalamt;
				}
				else {
					mealItemdetail = mitem + '-' + miteminternationalamt;
				}
				log.debug("mealItemdetail : ", mealItemdetail);
			}
			else {
				log.debug("Meal item Not Found with : ", SFitem);
			}
			return mealItemdetail;
		}


		/***********************************************************************************
		*   findHousingPlanInNS
		************************************************************************************/
		function findHousingPlanInNS(hpName) {
			var hpInternalid = null;
			var hpsearch = search.create({
				type: "customlist_c72321_housing_plan_list",
				filters:
					[
						["name", "is", hpName],
						"AND",
						["isinactive", "is", "F"]
					],
				columns:
					[
						search.createColumn({ name: "internalid", label: "Internal ID" })
					]
			});
			var resultsSet = hpsearch.run();
			var results = resultsSet.getRange(0, 999);
			log.debug("Housing plan detail : ", JSON.stringify(results));
			if (results && results != null && results != '' && results.length > 0) {
				hpInternalid = results[0].getValue({
					name: "internalid"
				});
				log.debug("hpInternalid : ", hpInternalid);
			}
			else {
				log.debug("Housing Plan Not Found with : ", hpName);
			}
			return hpInternalid;
		}

		/***********************************************************************************
		*   findHousingitemInNS
		************************************************************************************/
		function findHousingitemInNS(SFitem, hc, hpl, isInternational) {
			var housingItemdetail = null;
			var hisearch = search.create({
				type: "customrecord_c72321_item_pricing",
				filters:
					[
						["custrecord_c72321_sf_item", "is", SFitem],
						"AND",
						["custrecord_c72321_camp_location", "anyof", hpl],
						"AND",
						["custrecord_c72321_housing_plan", "anyof", hc]
					],
				columns:
					[
						search.createColumn({ name: "custrecord_c72321_amount", label: "Amount" }),
						search.createColumn({ name: "custrecord_c72321_item", label: "Item" }),
						search.createColumn({ name: "custrecord_c72321_internal_amount", label: "International Amount" })
					]
			});
			var resultsSet = hisearch.run();
			var results = resultsSet.getRange(0, 999);
			log.debug("Housing plan item detail : ", JSON.stringify(results));
			if (results && results != null && results != '' && results.length > 0) {
				var hitem = results[0].getValue({
					name: "custrecord_c72321_item"
				});
				var hitemlocalamt = results[0].getValue({
					name: "custrecord_c72321_amount"
				});
				var hiteminternationalamt = results[0].getValue({
					name: "custrecord_c72321_internal_amount"
				});
				if (isInternational) {
					housingItemdetail = hitem + '-' + hitemlocalamt;
				}
				else {
					housingItemdetail = hitem + '-' + hiteminternationalamt;
				}
				log.debug("housingItemdetail : ", housingItemdetail);
			}
			else {
				log.debug("Housing item Not Found with : ", SFitem);
			}
			return housingItemdetail;
		}

		/***********************************************************************************
		*   findInsurancePlanInNS
		************************************************************************************/
		function findInsurancePlanInNS(insName) {
			var insInternalid = null;
			var inssearch = search.create({
				type: "customlist_cinsurance_plan",
				filters:
					[
						["name", "is", insName],
						"AND",
						["isinactive", "is", "F"]
					],
				columns:
					[
						search.createColumn({ name: "internalid", label: "Internal ID" })
					]
			});
			var resultsSet = inssearch.run();
			var results = resultsSet.getRange(0, 999);
			log.debug("Insurance plan detail : ", JSON.stringify(results));
			if (results && results != null && results != '' && results.length > 0) {
				insInternalid = results[0].getValue({
					name: "internalid"
				});
				log.debug("insInternalid : ", insInternalid);
			}
			else {
				log.debug("Insurance Plan Not Found with : ", insName);
			}
			return insInternalid;
		}

		/***********************************************************************************
		*   findInsuranceitemInNS
		************************************************************************************/
		function findInsuranceitemInNS(SFitem, insc, insl, isInternational) {
			log.debug('Insurance type', SFitem);
			log.debug('Insurance Category', insc);
			log.debug('Insurance Location', insl);
			var insuranceItemdetail = null;
			var inssearch = search.create({
				type: "customrecord_c72321_item_pricing",
				filters:
					[
						["custrecord_c72321_sf_item", "is", SFitem],
						"AND",
						["custrecord_c72321_insurance_plan", "anyof", insc],
						"AND",
						["custrecord_c72321_camp_location", "anyof", insl]
					],
				columns:
					[
						search.createColumn({
							name: "id",
							sort: search.Sort.ASC,
							label: "ID"
						}),
						search.createColumn({ name: "custrecord_c72321_amount", label: "Amount" }),
						search.createColumn({ name: "custrecord_c72321_item", label: "Item" }),
						search.createColumn({ name: "custrecord_c72321_internal_amount", label: "International Amount" })
					]
			});
			var resultsSet = inssearch.run();
			var results = resultsSet.getRange(0, 999);
			log.debug("LOC detail : ", JSON.stringify(results));
			if (results && results != null && results != '' && results.length > 0) {
				var insitem = results[0].getValue({
					name: "custrecord_c72321_item"
				});
				var insitemlocalamt = results[0].getValue({
					name: "custrecord_c72321_amount"
				});
				var insiteminternationalamt = results[0].getValue({
					name: "custrecord_c72321_internal_amount"
				});
				if (isInternational) {
					insuranceItemdetail = insitem + '-' + insitemlocalamt;
				}
				else {
					insuranceItemdetail = insitem + '-' + insiteminternationalamt;
				}
				log.debug("insuranceItemdetail : ", insuranceItemdetail);
			}
			else {
				log.debug("Insurance item Not Found with : ", SFitem);
			}
			return insuranceItemdetail;
		}

		/***********************************************************************************
		*   findAdditionalitemInNS
		************************************************************************************/
		function findAdditionalitemInNS(SFitem, itmloc, isInternational) {
			log.debug('Additional type', SFitem);
			var additionalItemdetail = null;
			var inssearch = search.create({
				type: "customrecord_c72321_item_pricing",
				filters:
					[
						["custrecord_c72321_sf_item", "is", SFitem],
						"AND",
						["custrecord_c72321_camp_location", "anyof", itmloc]
					],
				columns:
					[
						search.createColumn({
							name: "id",
							sort: search.Sort.ASC,
							label: "ID"
						}),
						search.createColumn({ name: "custrecord_c72321_amount", label: "Amount" }),
						search.createColumn({ name: "custrecord_c72321_item", label: "Item" }),
						search.createColumn({ name: "custrecord_c72321_internal_amount", label: "International Amount" })
					]
			});
			var resultsSet = inssearch.run();
			var results = resultsSet.getRange(0, 999);
			log.debug("LOC detail : ", JSON.stringify(results));
			if (results && results != null && results != '' && results.length > 0) {
				var additem = results[0].getValue({
					name: "custrecord_c72321_item"
				});
				var additemlocalamt = results[0].getValue({
					name: "custrecord_c72321_amount"
				});
				var additeminternationalamt = results[0].getValue({
					name: "custrecord_c72321_internal_amount"
				});
				if (isInternational) {
					additionalItemdetail = additem + '-' + additemlocalamt;
				}
				else {
					additionalItemdetail = additem + '-' + additeminternationalamt;
				}
				log.debug("additionalItemdetail : ", additionalItemdetail);
			}
			else {
				log.debug(SFitem + " item Not Found with : ", SFitem);
			}
			return additionalItemdetail;
		}




		/***********************************************************************************
		*   findMonthInNS
		************************************************************************************/
		function findMonthInNS(monthname) {
			var monthItemdetail = null;
			var monthsearch = search.create({
				type: "customlist_c72321_month",
				filters:
					[
						["name", "is", monthname],
						"AND",
						["isinactive", "is", "F"]
					],
				columns:
					[
						search.createColumn({ name: "internalid", label: "Internal ID" })
					]
			});
			var resultsSet = monthsearch.run();
			var results = resultsSet.getRange(0, 999);
			log.debug("Month detail : ", JSON.stringify(results));
			if (results && results != null && results != '' && results.length > 0) {
				monthItemdetail = results[0].getValue({
					name: "internalid"
				});
				log.debug("monthItemdetail : ", monthItemdetail);
			}
			else {
				log.debug("Month item Not Found with : ", monthname);
			}
			return monthItemdetail;
		}

		/***********************************************************************************
		*   findYearInNS
		************************************************************************************/
		function findYearInNS(yearname) {
			var yearItemdetail = null;
			var yearsearch = search.create({
				type: "customlist_c72321_year",
				filters:
					[
						["name", "is", yearname],
						"AND",
						["isinactive", "is", "F"]
					],
				columns:
					[
						search.createColumn({ name: "internalid", label: "Internal ID" })
					]
			});
			var resultsSet = yearsearch.run();
			var results = resultsSet.getRange(0, 999);
			log.debug("Month detail : ", JSON.stringify(results));
			if (results && results != null && results != '' && results.length > 0) {
				yearItemdetail = results[0].getValue({
					name: "internalid"
				});
				log.debug("yearItemdetail : ", yearItemdetail);
			}
			else {
				log.debug("Year Not Found with : ", yearname);
			}
			return yearItemdetail;
		}

		/***********************************************************************************
		*   findStudentnationalityInNS
		************************************************************************************/
		function findStudentnationalityInNS(nationName) {
			var nationInternalid = null;
			var nationsearch = search.create({
				type: "customlist_c72321_cl_student_nation",
				filters:
					[
						["name", "is", nationName],
						"AND",
						["isinactive", "is", "F"]
					],
				columns:
					[
						search.createColumn({ name: "internalid", label: "Internal ID" })
					]
			});
			var resultsSet = nationsearch.run();
			var results = resultsSet.getRange(0, 999);
			log.debug("Nation detail : ", JSON.stringify(results));
			if (results && results != null && results != '' && results.length > 0) {
				nationInternalid = results[0].getValue({
					name: "internalid"
				});
				log.debug("nationInternalid : ", nationInternalid);
			}
			else {
				log.debug("Nation Not Found with : ", nationName);
			}
			return nationInternalid;
		}

		/***********************************************************************************
		*   findCampuslocationInNS
		************************************************************************************/
		function findCampuslocationInNS(clName) {
			var clInternalid = null;
			var clsearch = search.create({
				type: "customlist_c72321_campus_location",
				filters:
					[
						["name", "is", clName],
						"AND",
						["isinactive", "is", "F"]
					],
				columns:
					[
						search.createColumn({ name: "internalid", label: "Internal ID" })
					]
			});
			var resultsSet = clsearch.run();
			var results = resultsSet.getRange(0, 999);
			log.debug("campus location detail : ", JSON.stringify(results));
			if (results && results != null && results != '' && results.length > 0) {
				clInternalid = results[0].getValue({
					name: "internalid"
				});
				log.debug("clInternalid : ", clInternalid);
			}
			else {
				log.debug("campus location Not Found with : ", clName);
			}
			return clInternalid;
		}

		/***********************************************************************************
		*   findNationalityInNS
		************************************************************************************/
		function findNationalityInNS(sn, cl) {
			var nationsearch = search.create({
				type: "customrecord_c72321_nationality",
				filters:
					[
						["custrecord_c72321_campus_location", "anyof", cl],
						"AND",
						["custrecord_c72321_student_nation", "anyof", sn]
					],
				columns:
					[
						search.createColumn({
							name: "id",
							sort: search.Sort.ASC,
							label: "ID"
						}),
						search.createColumn({ name: "scriptid", label: "Script ID" }),
						search.createColumn({ name: "custrecord_c72321_student_nation", label: "Student Nationality" }),
						search.createColumn({ name: "custrecord_c72321_campus_location", label: "Campus Location" })
					]
			});
			var resultsSet = nationsearch.run();
			var results = resultsSet.getRange(0, 999);
			log.debug("Nationality detail : ", JSON.stringify(results));
			if (results && results != null && results != '' && results.length > 0) {
				return true;
			}
			else {
				log.debug("International type : ", "International");
				return false;
			}
		}

		/***********************************************************************************
		*   findBillingschedulerecurrencecountInNS
		************************************************************************************/
		function findBillingschedulerecurrencecountInNS(bsid) {
			var recurenceCount;
			var bsSearch = search.create({
				type: "billingschedule",
				filters:
					[
						["internalid", "anyof", bsid],
						"AND",
						["isinactive", "is", "F"]
					],
				columns:
					[
						search.createColumn({
							name: "id",
							label: "ID"
						}),
						search.createColumn({ name: "recurrencecount", label: "Recurrence Count" })
					]
			});
			var resultsSet = bsSearch.run();
			var results = resultsSet.getRange(0, 999);
			log.debug("Billing schedule detail : ", JSON.stringify(results));
			if (results && results != null && results != '' && results.length > 0) {
				recurenceCount = results[0].getValue({
					name: "recurrencecount"
				});
			}
			else {
				log.debug("Billing Schedule not available : ", "Billing Schedule not available");
			}
			return recurenceCount;
		}

		/***********************************************************************************
		*   findTutionitemInNS
		************************************************************************************/
		function findTutionitemInNS(SFitem, mnth, yrs, itmcredit, programsfid, tutionloc) {
			log.debug("Tution SFitem : ", SFitem);
			log.debug("Tution mnth : ", mnth);
			log.debug("Tution yrs : ", yrs);
			log.debug("Tution itmcredit : ", itmcredit);
			log.debug("Tution programsfid : ", programsfid);

			var tutionItemdetail = new Array();
			var inssearch = search.create({
				type: "customrecord_c72321_item_pricing",
				filters:
					[
						["custrecord_c72321_sf_item", "is", SFitem],
						"AND",
						["custrecord_c72321_month", "anyof", mnth],
						"AND",
						["custrecord_c72321_year", "anyof", yrs],
						"AND",
						["custrecord_c72321_minimun_credit", "lessthanorequalto", itmcredit],
						"AND",
						[["custrecord_c72321_maximum_credit", "greaterthanorequalto", itmcredit], "OR", ["custrecord_c72321_max_credit", "is", 'T']],
						"AND",
						["custrecord_c72321_program.custrecord_c72321_salesforce_id", "is", programsfid],
						"AND",
						["custrecord_c72321_camp_location", "anyof", tutionloc]
					],
				columns:
					[
						search.createColumn({ name: "custrecord_c72321_camp_location", label: "Campus Location" }),
						search.createColumn({ name: "custrecord_c72321_internal_amount", label: "International Amount" }),
						search.createColumn({ name: "custrecord_c72321_item", label: "Item" }),
						search.createColumn({ name: "custrecord_c72321_amount", label: "Local Amount" }),
						search.createColumn({ name: "custrecord_c72321_maximum_credit", label: "Maximum Credit" }),
						search.createColumn({ name: "custrecord_c72321_minimun_credit", label: "Minimum Credit" }),
						search.createColumn({ name: "custrecord_c72321_month", label: "Month" }),
						search.createColumn({ name: "custrecord_c72321_program", label: "Program" }),
						search.createColumn({ name: "custrecord_c72321_rate", label: "RATE PER CREDIT (LOCAL)" }),
						search.createColumn({ name: "custrecord_c72321_year", label: "Year" }),
						search.createColumn({ name: "custrecord_c72321_sf_item", label: "SF Item" }),
						search.createColumn({ name: "custrecord_c72321_max_credit", label: "Max Credit" }),
						search.createColumn({ name: "custrecord_c72321_ratepcredit_internat", label: "RATE PER CREDIT (INTERNATIONAL)" })
					]
			});
			var resultsSet = inssearch.run();
			var results = resultsSet.getRange(0, 999);
			log.debug("Tution detail : ", JSON.stringify(results));
			if (results && results != null && results != '' && results.length > 0) {
				var tuitionItemlocalamt = results[0].getValue({
					name: "custrecord_c72321_amount"
				});
				var tutionitem = results[0].getValue({
					name: "custrecord_c72321_item"
				});
				var mincredit = results[0].getValue({
					name: "custrecord_c72321_minimun_credit"
				});
				var maxcredit = results[0].getValue({
					name: "custrecord_c72321_maximum_credit"
				});
				var itemratelocal = results[0].getValue({
					name: "custrecord_c72321_rate"
				});
				var itemrateinternational = results[0].getValue({
					name: "custrecord_c72321_ratepcredit_internat"
				});
				var tutioniteminternationalamt = results[0].getValue({
					name: "custrecord_c72321_internal_amount"
				});
				var isMaxCredit = results[0].getValue({
					name: "custrecord_c72321_max_credit"
				});
				tutionItemdetail.push({
					't_local_amt': tuitionItemlocalamt,
					't_itm': tutionitem,
					't_minc': mincredit,
					't_maxc': maxcredit,
					't_itmratelocal': itemratelocal,
					't_itmrateinternational': itemrateinternational,
					't_international_amt': tutioniteminternationalamt,
					'isMax': isMaxCredit,
				});
				log.debug('tutionItemdetail', tutionItemdetail);
			}
			else {
				log.debug("Tution item Not Found with : ", SFitem);
			}
			return tutionItemdetail;
		}

		/***********************************************************************************
		*   findFAtemInNS
		************************************************************************************/
		function findFAtemInNS(SFitem, itmcredit) {
			log.debug("Tution SFitem : ", SFitem);
			log.debug("Tution itmcredit : ", itmcredit);

			var faItemdetail = new Array();
			var inssearch = search.create({
				type: "customrecord_c72321_item_pricing",
				filters:
					[
						["custrecord_c72321_sf_item", "is", SFitem],
						"AND",
						["custrecord_c72321_minimun_credit", "lessthanorequalto", itmcredit],
						"AND",
						[["custrecord_c72321_maximum_credit", "greaterthanorequalto", itmcredit], "OR", ["custrecord_c72321_max_credit", "is", 'T']]
					],
				columns:
					[
						search.createColumn({ name: "custrecord_c72321_amount", label: "Amount" }),
						search.createColumn({ name: "custrecord_c72321_item", label: "Item" }),
						search.createColumn({ name: "custrecord_c72321_sf_item", label: "SF Item" }),
						search.createColumn({ name: "custrecord_c72321_minimun_credit", label: "Minimum Credit" }),
						search.createColumn({ name: "custrecord_c72321_maximum_credit", label: "Maximum Credit" }),
						search.createColumn({ name: "custrecord_c72321_rate", label: "Rate" })
					]
			});
			var resultsSet = inssearch.run();
			var results = resultsSet.getRange(0, 999);
			log.debug("Tution detail : ", JSON.stringify(results));
			if (results && results != null && results != '' && results.length > 0) {
				var FAamt = results[0].getValue({
					name: "custrecord_c72321_amount"
				});
				var FAitem = results[0].getValue({
					name: "custrecord_c72321_item"
				});
				var FAmincredit = results[0].getValue({
					name: "custrecord_c72321_minimun_credit"
				});
				var FAmaxcredit = results[0].getValue({
					name: "custrecord_c72321_maximum_credit"
				});
				var FAitemrate = results[0].getValue({
					name: "custrecord_c72321_rate"
				});
				faItemdetail.push({
					'fa_amt': FAamt,
					'fa_itm': FAitem,
					'fa_minc': FAmincredit,
					'fa_maxc': FAmaxcredit,
					'fa_itmrate': FAitemrate,
				});
				log.debug('faItemdetail', faItemdetail);
			}
			else {
				log.debug("Financial Aid item Not Found with : ", SFitem);
			}
			return faItemdetail;
		}


		function getnumber(id) {
			var ret;
			ret = parseFloat(id);
			if (isNaN(ret)) {
				ret = 0;
			}
			return ret;
		}// getnumber


		function CallToSFDCAccount(request, tkn) {
			var endP_sf = runtime.getCurrentScript().getParameter({ name: 'custscript_sfendpointurl' });
			var url = endP_sf + '/services/apexrest/crowe_account/';
			url = encodeURI(url);
			log.debug('url new', url);
			var headerDetail = new Array();
			headerDetail['Authorization'] = tkn;
			headerDetail['Content-Type'] = 'application/json';
			headerDetail['Accept'] = 'application/json';

			var response = https.post({
				url: url,
				body: request,
				headers: headerDetail
			});
			log.debug('response msg', JSON.parse(response.body));
			return response.body;
		}

		function CallToSFDCProduct(request, tkn) {
			var endP_sf = runtime.getCurrentScript().getParameter({ name: 'custscript_sfendpointurl' });
			var url = endP_sf + '/services/apexrest/crowe_item/';
			url = encodeURI(url);
			log.debug('url new', url);
			var headerDetail = new Array();
			headerDetail['Authorization'] = tkn;
			headerDetail['Content-Type'] = 'application/json';
			headerDetail['Accept'] = 'application/json';

			var response = https.post({
				url: url,
				body: request,
				headers: headerDetail
			});
			log.debug('response msg', JSON.parse(response.body));
			return response.body;
		}

		function CallToSFDCInvoice(request, tkn) {
			var endP_sf = runtime.getCurrentScript().getParameter({ name: 'custscript_sfendpointurl' });
			var url = endP_sf + '/services/apexrest/crowe_invoice/';
			url = encodeURI(url);
			log.debug('url new', url);
			var headerDetail = new Array();
			headerDetail['Authorization'] = tkn;
			headerDetail['Content-Type'] = 'application/json';
			headerDetail['Accept'] = 'application/json';

			var response = https.post({
				url: url,
				body: request,
				headers: headerDetail
			});
			log.debug('response msg', (response.body));
			return response.body;
		}

		function dateformat(datevalue) {
			var dt = '';
			if (datevalue && datevalue != null && datevalue != '') {
				dt = datevalue.split('-');
				dt = dt[1] + '/' + dt[2] + '/' + dt[0];
				log.debug('dt', dt);
			}
			return dt;
		}

		function isResponseError(code) {

			if (code == '200' || code == '201' || code == '204') {
				return false;
			} else if (code == '400' || code == '401' || code == '403' || code == '404' || code == '405' || code == '415' || code == '500') {
				return true;
			}

		}
		function countryList(value) {
			var nsCountry = {
				"Afghanistan": "AF",
				"Aland Islands": "AX",
				"Albania": "AL",
				"Algeria": "DZ",
				"American Samoa": "AS",
				"Andorra": "AD",
				"Angola": "AO",
				"Anguilla": "AI",
				"Antarctica": "AQ",
				"Antigua and Barbuda": "AG",
				"Argentina": "AR",
				"Armenia": "AM",
				"Aruba": "AW",
				"Australia": "AU",
				"Austria": "AT",
				"Azerbaijan": "AZ",
				"Bahamas": "BS",
				"Bahrain": "BH",
				"Bangladesh": "BD",
				"Barbados": "BB",
				"Belarus": "BY",
				"Belgium": "BE",
				"Belize": "BZ",
				"Benin": "BJ",
				"Timor-Leste": "TL",
				"Bermuda": "BM",
				"Bhutan": "BT",
				"Bolivia": "BO",
				"Bonaire, Sint Eustatius and Saba": "BQ",
				"Bosnia and Herzegovina": "BA",
				"Botswana": "BW",
				"Bouvet Island": "BV",
				"Brazil": "BR",
				"British Indian Ocean Territory": "IO",
				"Brunei Darussalam": "BN",
				"Bulgaria": "BG",
				"Burkina Faso": "BF",
				"Burundi": "BI",
				"Cambodia": "KH",
				"Cameroon": "CM",
				"Canada": "CA",
				"Canary Islands": "IC",
				"Cape Verde": "CV",
				"Cayman Islands": "KY",
				"Central African Republic": "CF",
				"Ceuta and Melilla": "EA",
				"Chad": "TD",
				"Chile": "CL",
				"China": "CN",
				"Christmas Island": "CX",
				"Cocos (Keeling) Islands": "CC",
				"Colombia": "CO",
				"Comoros": "KM",
				"Congo, the Democratic Republic of the": "CD",
				"Congo, Republic of": "CG",
				"Cook Islands": "CK",
				"Costa Rica": "CR",
				"Cote d'Ivoire": "CI",
				"Croatia/Hrvatska": "HR",
				"Cuba": "CU",
				"Curaçao": "CW",
				"Cyprus": "CY",
				"Czech Republic": "CZ",
				"Denmark": "DK",
				"Djibouti": "DJ",
				"Dominica": "DM",
				"Dominican Republic": "DO",
				"East Timor": "TP",
				"Ecuador": "EC",
				"Egypt": "EG",
				"El Salvador": "SV",
				"Equatorial Guinea": "GQ",
				"Eritrea": "ER",
				"Estonia": "EE",
				"Ethiopia": "ET",
				"Falkland Islands": "FK",
				"Faroe Islands": "FO",
				"Fiji": "FJ",
				"Finland": "FI",
				"France": "FR",
				"French Guiana": "GF",
				"French Polynesia": "PF",
				"French Southern Territories": "TF",
				"Gabon": "GA",
				"Gambia": "GM",
				"Georgia": "GE",
				"Germany": "DE",
				"Ghana": "GH",
				"Gibraltar": "GI",
				"Greece": "GR",
				"Greenland": "GL",
				"Grenada": "GD",
				"Guadeloupe": "GP",
				"Guam": "GU",
				"Guatemala": "GT",
				"Guernsey": "GG",
				"Guinea": "GN",
				"Guinea-Bissau": "GW",
				"Guyana": "GY",
				"Haiti": "HT",
				"Heard Island and McDonald Islands": "HM",
				"Holy See (City Vatican State)": "VA",
				"Honduras": "HN",
				"Hong Kong": "HK",
				"Hungary": "HU",
				"Iceland": "IS",
				"India": "IN",
				"Indonesia": "ID",
				"Iran, Islamic Republic of": "IR",
				"Iraq": "IQ",
				"Ireland": "IE",
				"Isle of Man": "IM",
				"Israel": "IL",
				"Italy": "IT",
				"Jamaica": "JM",
				"Japan": "JP",
				"Jersey": "JE",
				"Jordan": "JO",
				"Kazakhstan": "KZ",
				"Kenya": "KE",
				"Korea, Democratic People's Republic of": "KP",
				"Kiribati": "KI",
				"Korea, Republic of": "KR",
				"Kosovo": "XK",
				"Virgin Islands (USA)": "VI",
				"Saint Martin (French part)": "MF",
				"Kuwait": "KW",
				"Kyrgyzstan": "KG",
				"Lao People's Democratic Republic": "LA",
				"Latvia": "LV",
				"Lebanon": "LB",
				"Lesotho": "LS",
				"Liberia": "LR",
				"Libya": "LY",
				"Liechtenstein": "LI",
				"Lithuania": "LT",
				"Luxembourg": "LU",
				"Macau": "MO",
				"Macedonia": "MK",
				"Madagascar": "MG",
				"Malawi": "MW",
				"Malaysia": "MY",
				"Maldives": "MV",
				"Mali": "ML",
				"Malta": "MT",
				"Marshall Islands": "MH",
				"Martinique": "MQ",
				"Mauritania": "MR",
				"Mauritius": "MU",
				"Mayotte": "YT",
				"Mexico": "MX",
				"Micronesia, Federal State of": "FM",
				"Moldova, Republic of": "MD",
				"Monaco": "MC",
				"Mongolia": "MN",
				"Montenegro": "ME",
				"Montserrat": "MS",
				"Morocco": "MA",
				"Mozambique": "MZ",
				"Myanmar (Burma)": "MM",
				"Namibia": "NA",
				"Nauru": "NR",
				"Nepal": "NP",
				"Netherlands": "NL",
				"Netherlands Antilles (Deprecated)": "AN",
				"New Caledonia": "NC",
				"New Zealand": "NZ",
				"Nicaragua": "NI",
				"Niger": "NE",
				"Nigeria": "NG",
				"Niue": "NU",
				"Norfolk Island": "NF",
				"Northern Mariana Islands": "MP",
				"Norway": "NO",
				"Oman": "OM",
				"Pakistan": "PK",
				"Palau": "PW",
				"Palestinian Territories": "PS",
				"Panama": "PA",
				"Papua New Guinea": "PG",
				"Paraguay": "PY",
				"Peru": "PE",
				"Philippines": "PH",
				"Pitcairn Island": "PN",
				"Poland": "PL",
				"Portugal": "PT",
				"Puerto Rico": "PR",
				"Qatar": "QA",
				"Reunion Island": "RE",
				"Romania": "RO",
				"Russian Federation": "RU",
				"Rwanda": "RW",
				"Saint Barthélemy": "BL",
				"Saint Helena, Ascension and Tristan da Cunha": "SH",
				"Saint Kitts and Nevis": "KN",
				"Saint Lucia": "LC",
				"Saint Martin": "MF",
				"Saint Vincent and the Grenadines": "VC",
				"Samoa": "WS",
				"San Marino": "SM",
				"Sao Tome and Principe": "ST",
				"Saudi Arabia": "SA",
				"Senegal": "SN",
				"Serbia": "RS",
				"Serbia and Montenegro (Deprecated)": "CS",
				"Seychelles": "SC",
				"Sierra Leone": "SL",
				"Singapore": "SG",
				"Sint Maarten (Dutch part)": "SX",
				"Slovak Republic": "SK",
				"Slovenia": "SI",
				"Solomon Islands": "SB",
				"Somalia": "SO",
				"South Africa": "ZA",
				"South Georgia and the South Sandwich Islands": "GS",
				"South Sudan": "SS",
				"Spain": "ES",
				"Sri Lanka": "LK",
				"Saint Pierre and Miquelon": "PM",
				"Sudan": "SD",
				"Suriname": "SR",
				"Svalbard and Jan Mayen": "SJ",
				"Swaziland": "SZ",
				"Sweden": "SE",
				"Switzerland": "CH",
				"Syrian Arab Republic": "SY",
				"Taiwan": "TW",
				"Tajikistan": "TJ",
				"Tanzania": "TZ",
				"Thailand": "TH",
				"Togo": "TG",
				"Tokelau": "TK",
				"Tonga": "TO",
				"Trinidad and Tobago": "TT",
				"Tunisia": "TN",
				"Turkey": "TR",
				"Turkmenistan": "TM",
				"Turks and Caicos Islands": "TC",
				"Tuvalu": "TV",
				"Uganda": "UG",
				"Ukraine": "UA",
				"United Arab Emirates": "AE",
				"United Kingdom": "GB",
				"United States": "US",
				"Uruguay": "UY",
				"US Minor Outlying Islands": "UM",
				"Uzbekistan": "UZ",
				"Vanuatu": "VU",
				"Venezuela": "VE",
				"Vietnam": "VN",
				"Virgin Islands (British)": "VG",
				"Virgin Islands (USA)": "VI",
				"Wallis and Futuna": "WF",
				"Western Sahara": "EH",
				"Yemen": "YE",
				"Zambia": "ZM",
				"Zimbabwe": "ZW"
			};
			if (typeof nsCountry[value] != 'undefined') {
				return nsCountry[value];
			}
		}
		return {
			geturl: geturl,
			findSFtermInNS: findSFtermInNS,
			findCustomerCategoryInNS: findCustomerCategoryInNS,
			findBatchReferenceInNS: findBatchReferenceInNS,
			findCustomerInNS: findCustomerInNS,
			isEmpty: isEmpty,
			findOrderInNS: findOrderInNS,
			findDepartmentInNS: findDepartmentInNS,
			findLOBInNS: findLOBInNS,
			findLOCInNS: findLOCInNS,
			findMealitemInNS: findMealitemInNS,
			dateformat: dateformat,
			findMealPlanInNS: findMealPlanInNS,
			findHousingitemInNS: findHousingitemInNS,
			findHousingPlanInNS: findHousingPlanInNS,
			findInsurancePlanInNS: findInsurancePlanInNS,
			findInsuranceitemInNS: findInsuranceitemInNS,
			findMonthInNS: findMonthInNS,
			findYearInNS: findYearInNS,
			findTutionitemInNS: findTutionitemInNS,
			findFAtemInNS: findFAtemInNS,
			CallToSFDCAccount: CallToSFDCAccount,
			countryList: countryList,
			findStudentnationalityInNS: findStudentnationalityInNS,
			findCampuslocationInNS: findCampuslocationInNS,
			findNationalityInNS: findNationalityInNS,
			getnumber: getnumber,
			findBillingScheduleInNS: findBillingScheduleInNS,
			findBillingschedulerecurrencecountInNS: findBillingschedulerecurrencecountInNS,
			findAdditionalitemInNS: findAdditionalitemInNS,
			findCustomerbyemailInNS: findCustomerbyemailInNS,
			CallToSFDCProduct: CallToSFDCProduct,
			findSubsidiaryInNS: findSubsidiaryInNS,
			findItemInNS: findItemInNS,
			CallToSFDCInvoice: CallToSFDCInvoice
		}
	});