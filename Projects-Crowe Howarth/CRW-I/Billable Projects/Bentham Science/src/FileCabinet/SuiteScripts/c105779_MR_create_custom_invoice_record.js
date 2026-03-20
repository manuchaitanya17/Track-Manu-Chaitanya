/**
 * @NApiVersion 2.x
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
* FILE NAME: CSS_MR_create_custom_invoice_record.js
* DEVOPS TASK: 
* AUTHOR: Sudesh Srivastava
* DATE CREATED: 
* DESCRIPTION: This script create the custom invoice records.
* REVISION HISTORY
* Date          DevOps item No.    By                      Issue Fix Summary   
*============================================================================                  
*****************************************************************************/

define(['N/record', 'N/runtime', 'N/query', 'N/search', 'N/file', 'N/email', 'N/format', 'N/error', 'N/render','./Crowe_library.js'],
	function (record, runtime, query, search, file, email, format, error, render,library) {
		var fileid = '';
		function getInputData() {
			try {
				var mapArr = new Array();
				var scriptObj = runtime.getCurrentScript();
				var beforeFolderid = scriptObj.getParameter({ name: 'custscript_c_before_process' });
				var sql = "SELECT name,folder,id FROM File where folder = '" + beforeFolderid + "'";
				var result = query.runSuiteQL({
					query: sql
				}).asMappedResults();
				log.debug('result',result);
				log.debug('result.length',result.length);
				if (result.length > 0) 
				{
					for(var f = 0; f < result.length; f++) 
					{
						fileid = result[f].id;
						log.debug('fileid', fileid);
						var tranFile = file.load({
							id: fileid
						});
						log.debug('tranFile size', tranFile.size);
						if (tranFile.size > 0) 
						{
							var FileData = tranFile.getContents();
							log.debug('FileData',FileData);
											 
							var jsonData = JSON.parse(FileData);
							log.debug('jsonData',jsonData);
							log.debug('jsonData',jsonData.invoice.length);
							for(var g=0;g<jsonData.invoice.length;g++)
							{
								log.debug('jsonData.invoice',jsonData.invoice[g]);
								var mapObj = {};
								mapObj['fileId'] = fileid;
								mapObj['recordJson'] = jsonData.invoice[g];
								
								mapArr.push(mapObj);
							}
						}
					}
				}
				log.debug('mapArr', mapArr);
				return mapArr;
			}
			catch (ex) {
				log.debug('Error get', ex.message);
			}
		}
		function map(context) {
			try {
				var rec_detail = JSON.parse(context.value);
				log.debug('recDetail',rec_detail);
				
				var file_Id = rec_detail.fileId
				var invoiceNumber = rec_detail.recordJson.invoiceNumber;
				var journalSubtitle = rec_detail.recordJson.journalSubtitle;
				var journalTitle = rec_detail.recordJson.journalTitle;
				var referenceNumber = rec_detail.recordJson.referenceNumber;
				var manuscriptPublishingYear = rec_detail.recordJson.manuscriptPublishingYear;
				var invoiceDate = rec_detail.recordJson.invoiceDate;
				var invoiceTo = rec_detail.recordJson.invoiceTo;
				var emailAddress = rec_detail.recordJson.emailAddress;
				var billingAddress = rec_detail.recordJson.billingAddress;
				var shippingAddress = rec_detail.recordJson.shippingAddress;
				var totalAmount_before_vat = rec_detail.recordJson.totalAmount_before_vat;
				var vat = rec_detail.recordJson.vat;
				var totalAmount = rec_detail.recordJson.totalAmount;
				var paymentStatus = rec_detail.recordJson.paymentStatus;
				var transactionDate = rec_detail.recordJson.transactionDate;
				var country = rec_detail.recordJson.country;
				var paymentMode = rec_detail.recordJson.paymentMode;
				var services = rec_detail.recordJson.services;
				
				log.debug('services',services.length);

				var errArrheaderFld = new Array();
				var custinvRecheader = record.create({
					type: 'customrecord_c105779_custom_inv_header'
				});
				
				if(library.isNotEmpty(emailAddress))
				{
					var custInternalid = library.findCustomerInNS(emailAddress,invoiceTo);
					custinvRecheader.setValue({
						fieldId: 'custrecord_c105779_invoice_to',
						value: invoiceTo
					});
					if(library.isNotEmpty(custInternalid))
					{
						custinvRecheader.setValue({
							fieldId: 'custrecord_c105779_customer',
							value: custInternalid
						});
					}
					else
					{
						var custRec = record.create({
							type: record.Type.CUSTOMER,
							isDynamic: true
						});
						custRec.setValue({
							fieldId: 'companyname',
							value: invoiceTo
						});
						custRec.setValue({
							fieldId: 'email',
							value: emailAddress
						});
						
						var custId = custRec.save({enableSourcing: true,
							ignoreMandatoryFields: true});
						log.debug('custId',custId);
						if(library.isNotEmpty(custId))
							{
								custinvRecheader.setValue({
									fieldId: 'custrecord_c105779_customer',
									value: custId
								});
							}	
						//errArrheaderFld.push('Customer is not available.');
					}
					
				}
				else
				{
					errArrheaderFld.push('Email is not available in JSON.');
				}			
				
				if(library.isNotEmpty(invoiceNumber))
				{
					custinvRecheader.setValue({
						fieldId: 'custrecord_c105779_invoice_number',
						value: invoiceNumber
					});
				}
								
				if(library.isNotEmpty(paymentMode))
				{
					custinvRecheader.setValue({
						fieldId: 'custrecord_c105779_pmt_mode',
						value: paymentMode
					});
				}
				if(library.isNotEmpty(paymentStatus))
				{
					custinvRecheader.setValue({
						fieldId: 'custrecord_c105779_pmt_sts',
						value: paymentStatus
					});
				}
				
				if(library.isNotEmpty(journalSubtitle))
				{
					custinvRecheader.setValue({
						fieldId: 'custrecord_c105779_journal_subtitle',
						value: journalSubtitle
					});
				}
				if(library.isNotEmpty(journalTitle))
				{
					custinvRecheader.setValue({
						fieldId: 'custrecord_c105779_journal_title',
						value: journalTitle
					});
				}
				if(library.isNotEmpty(referenceNumber))
				{
					custinvRecheader.setValue({
						fieldId: 'custrecord_c105779_reference_number',
						value: referenceNumber
					});
				}
				if(library.isNotEmpty(manuscriptPublishingYear))
				{
					custinvRecheader.setValue({
						fieldId: 'custrecord_c105779_manuscript_pub_year',
						value: manuscriptPublishingYear
					});
				}
				if(library.isNotEmpty(invoiceDate))
				{
					var invDate = library.dateformat(invoiceDate);
					// invDate = new Date(invDate);
					log.debug('invDate',invDate);
					custinvRecheader.setValue({
						fieldId: 'custrecord_c105779_invoice_date',
						value: invDate
					});
				}
				if(library.isNotEmpty(emailAddress))
				{
					custinvRecheader.setValue({
						fieldId: 'custrecord_c105779_email',
						value: emailAddress
					});
				}
				if(library.isNotEmpty(billingAddress))
				{
					custinvRecheader.setValue({
						fieldId: 'custrecord_c105779_billing_address',
						value: billingAddress
					});
				}
				if(library.isNotEmpty(shippingAddress))
				{
					custinvRecheader.setValue({
						fieldId: 'custrecord_c105779_shipping_address',
						value: shippingAddress
					});
				}
				
				if(library.isNotEmpty(totalAmount_before_vat))
				{
					custinvRecheader.setValue({
						fieldId: 'custrecord_c105779_amount_before_vat',
						value: totalAmount_before_vat
					});
				}
				if(library.isNotEmpty(vat))
				{
					custinvRecheader.setValue({
						fieldId: 'custrecord_c105779_vat',
						value: vat
					});
				}
				
				if(library.isNotEmpty(totalAmount))
				{
					custinvRecheader.setValue({
						fieldId: 'custrecord_c105779_amount',
						value: totalAmount
					});
				}
				if(library.isNotEmpty(country))
				{
					log.debug('Country',country);
					//var countryCode = library.countryList(country);
					custinvRecheader.setText({
						fieldId: 'custrecord_c105779_country',
						text: country
					});
				}
				custinvRecheader.setValue({
					fieldId: 'custrecord_c105779_file_detail',
					value: file_Id
				});
				custinvRecheader.setValue({
					fieldId: 'custrecord_c105779_error_message',
					value:  errArrheaderFld.toString()
				});
				var customheaderInvid = custinvRecheader.save();
				log.debug('customheaderInvid',customheaderInvid);
				for(var h=0;h<services.length;h++)
				{
					var errArrFld = new Array();
					var serviceName = services[h].serviceName;
					var serviceDescription = services[h].serviceDescription;
					var servicePrice = services[h].servicePrice;
					var serviceDiscountedAmount = services[h].serviceDiscountedAmount;

					var invRec = record.create({
						type: 'customrecord_c105779_custom_invoice'
					});
					
					if(library.isNotEmpty(emailAddress))
					{
						var custInternalid = library.findCustomerInNS(emailAddress,invoiceTo);
						log.debug('custInternalid',custInternalid);
						invRec.setValue({
							fieldId: 'custrecord_c_invoice_to',
							value: invoiceTo
						});
						if(library.isNotEmpty(custInternalid))
						{
							invRec.setValue({
								fieldId: 'custrecord_c_customer',
								value: custInternalid
							});
						}
						else
						{
							var custRec = record.create({
								type: record.Type.CUSTOMER,
								isDynamic: true
							});
							custRec.setValue({
								fieldId: 'companyname',
								value: invoiceTo
							});
							custRec.setValue({
								fieldId: 'email',
								value: emailAddress
							});
							
							var custId = custRec.save({enableSourcing: true,
								ignoreMandatoryFields: true});
							log.debug('custId',custId);
							if(library.isNotEmpty(custId))
								{
									invRec.setValue({
										fieldId: 'custrecord_c_customer',
										value: custId
									});
								}	
							//errArrFld.push('Customer is not available.');
						}
						
					}
					else
					{
						errArrFld.push('Email is not available in JSON.');
					}
					
					if(library.isNotEmpty(serviceName))
					{
						var itmInternalid = library.findItemInNS(serviceName);
						invRec.setValue({
							fieldId: 'custrecord_c_service_name',
							value: serviceName
						});
						if(library.isNotEmpty(itmInternalid))
						{
							invRec.setValue({
								fieldId: 'custrecord_c_item',
								value: itmInternalid
							});
						}
						else
						{
							errArrFld.push('Item is not available.');
						}
					}
					else
					{
						errArrFld.push('Item is not available in JSON.');
					}
					
					////////////////////////////////////////////////////////////////////////////////////////
					
					
					if(library.isNotEmpty(invoiceNumber))
					{
						invRec.setValue({
							fieldId: 'custrecord_c_invoice_number',
							value: invoiceNumber
						});
					}
					if(library.isNotEmpty(journalSubtitle))
					{
						invRec.setValue({
							fieldId: 'custrecord_c_journal_subtitle',
							value: journalSubtitle
						});
					}
					if(library.isNotEmpty(journalTitle))
					{
						invRec.setValue({
							fieldId: 'custrecord_c_journal_title',
							value: journalTitle
						});
					}
					if(library.isNotEmpty(referenceNumber))
					{
						invRec.setValue({
							fieldId: 'custrecord_c_reference_number',
							value: referenceNumber
						});
					}
					if(library.isNotEmpty(manuscriptPublishingYear))
					{
						invRec.setValue({
							fieldId: 'custrecord_c_manuscript_publish_year',
							value: manuscriptPublishingYear
						});
					}
					if(library.isNotEmpty(invoiceDate))
					{
						var invDate = library.dateformat(invoiceDate);
						invDate = new Date(invDate);
						log.debug('invDate',invDate);
						invRec.setValue({
							fieldId: 'custrecord_c_invoice_date',
							value: invDate
						});
					}
					if(library.isNotEmpty(emailAddress))
					{
						invRec.setValue({
							fieldId: 'custrecord_c_email',
							value: emailAddress
						});
					}
					if(library.isNotEmpty(billingAddress))
					{
						invRec.setValue({
							fieldId: 'custrecord_c_billing_address',
							value: billingAddress
						});
					}
					if(library.isNotEmpty(shippingAddress))
					{
						invRec.setValue({
							fieldId: 'custrecord_c_shipping_address',
							value: shippingAddress
						});
					}
					
					if(library.isNotEmpty(totalAmount_before_vat))
					{
						invRec.setValue({
							fieldId: 'custrecord_c_amt_before_vat',
							value: totalAmount_before_vat
						});
					}
					if(library.isNotEmpty(vat))
					{
						invRec.setValue({
							fieldId: 'custrecord_c_vat',
							value: vat
						});
					}
					
					if(library.isNotEmpty(totalAmount))
					{
						invRec.setValue({
							fieldId: 'custrecord_c_amount',
							value: totalAmount
						});
					}
					if(library.isNotEmpty(paymentStatus))
					{
						invRec.setValue({
							fieldId: 'custrecord_c_payment_status',
							value: paymentStatus
						});
					}
					if(library.isNotEmpty(country))
					{
						log.debug('Country',country);
						//var countryCode = library.countryList(country);
						invRec.setText({
							fieldId: 'custrecord_c_country',
							text: country
						});
					}
					if(library.isNotEmpty(paymentMode))
					{
						invRec.setValue({
							fieldId: 'custrecord_c_payment_mode',
							value: paymentMode
						});
					}
					if(library.isNotEmpty(serviceDescription))
					{
						invRec.setValue({
							fieldId: 'custrecord_c_service_description',
							value: serviceDescription
						});
					}
					if(library.isNotEmpty(servicePrice))
					{
						invRec.setValue({
							fieldId: 'custrecord_c_service_price',
							value: servicePrice
						});
					}
					if(library.isNotEmpty(serviceDiscountedAmount))
					{
						invRec.setValue({
							fieldId: 'custrecord_c_service_disc_amount',
							value: serviceDiscountedAmount
						});
					}
					invRec.setValue({
						fieldId: 'custrecord_c_json_data',
						value: JSON.stringify(rec_detail)
					});
					invRec.setValue({
						fieldId: 'custrecord_c_file_detail',
						value: file_Id
					});
					if(library.isNotEmpty(customheaderInvid))
					{
						invRec.setValue({
							fieldId: 'custrecord_c_custom_inv_header',
							value: customheaderInvid
						});
					}
					if(errArrFld.length == 0)
					{
						invRec.setValue({
							fieldId: 'custrecord_c_approved',
							value:  true
						});
					}
					else
					{
						invRec.setValue({
							fieldId: 'custrecord_c_error_message',
							value:  errArrFld.toString()
						});
					}
					var customInvid = invRec.save();
				}
				
				context.write({
					key: file_Id,
					value: ''
				})
				
			}
			catch (ex) {
				log.error('ERROR : map', ex.message);
			}
		}
		function reduce(context) {
			
			try 
			{
				var processFolderid = runtime.getCurrentScript().getParameter({ name: 'custscript_c_processed_folder'});
                var fileId = Number(context.key);
                var mapValue = (context.values);
				log.debug('fileid reduce', fileId);
				log.debug('value reduce', mapValue);
				var tranFile = file.load({
					id: fileId
				});
				tranFile.folder = processFolderid;
				var fileId1 = tranFile.save();
			}
			catch (errorObj) {
				log.debug('Error reduce', JSON.stringify(errorObj));
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