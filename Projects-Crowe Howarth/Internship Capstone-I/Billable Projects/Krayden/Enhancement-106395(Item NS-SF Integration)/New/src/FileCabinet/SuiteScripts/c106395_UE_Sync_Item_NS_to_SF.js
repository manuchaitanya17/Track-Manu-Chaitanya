/**
*@NApiVersion 2.0
*@NScriptType UserEventScript
*/
/*****************************************************************************
 *  * Copyright (c) 2021 - Present Crowe LLP - All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Crowe LLP. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered with Crowe LLP.
*
* FILE NAME: c106395_UE_Sync_Item_NS_to_SF.js
* DEVOPS TASK: ENH 106395, DT 106396
* AUTHOR: Manu Chaitanya
* DATE CREATED: 15/July/2025
* DESCRIPTION: This Script sync Item Record from NS to SF.
*****************************************************************************/

define(['N/record', 'N/search', 'N/format', 'N/runtime', 'N/https', 'N/http', './Crowe_library_sf_ns.js', 'N/render', 'N/email'],
    function (record, search, format, runtime, https, http, library, render, email) {
        function beforeLoad(context) {
            try {
                if (context.type == context.UserEventType.CREATE || context.type == context.UserEventType.COPY) {
                    var rec = context.newRecord;
                    rec.setValue({
                        fieldId: 'custitem_crw_99936_sf_itemid',
                        value: ''
                    });
                }

            }
            catch (e) {
                log.error('Error in beforeLoad', e.message);
            }
        }


        function afterSubmit(context) {
            try {
                if (context.type === 'create' || context.type === 'edit') {
                    // Allowed item types

                    var rec = context.newRecord;
                    var itmid = rec.id;
                    log.debug('Item id', itmid);

                    var itmtype = rec.type;
                    log.debug('itmtype', itmtype);


                    var allowedTypes = [
                        'inventoryitem',
                        'lotnumberedinventoryitem',
                        'assemblyitem',
                        'lotnumberedassemblyitem',
                        'noninventoryitem',
                        'otherchargeitem'
                    ];

                    if (allowedTypes.indexOf(rec.type) !== -1) {
                        var token = library.geturl();
                        log.debug('Token Code : ', token);
                        getitemFields(token, itmid, itmtype);
                    }

                    else {
                        log.debug('Skipped item type:', rec.type);
                    }
                }
            }
            catch (e) {
                log.error('function execute error message: ', e.message);
            }
        }

        function getitemFields(token, invid, itmtype) {
            try {
                var reqJson = {}
                var obj = [];
                log.debug('recid', invid);
                var itmRec = record.load({
                    type: itmtype,
                    id: invid
                });

                var itmName = itmRec.getValue('itemid');
                var displayName = itmRec.getValue('displayname');
                var desc = itmRec.getValue('salesdescription');


                var itmfieldLookUp = search.lookupFields({
                    type: 'item',
                    id: invid,
                    columns: ['subtype']
                });

                log.debug('itmfieldLookUp', itmfieldLookUp);
                var subtype = itmfieldLookUp.subtype;
                log.debug('subtype', subtype);

                if ((itmtype == 'noninventoryitem') && subtype != 'For Resale') {
                    return;
                }
                 if ((itmtype == 'otherchargeitem') && subtype == 'Purchase') {
                    return;
                }

                reqJson['internalId'] = invid;
                reqJson['itemName'] = itmName;
                reqJson['displayName'] = itmRec.getValue('displayname');
                reqJson['vendorName'] = itmRec.getValue('vendorname');
                var purchaseDescription = itmRec.getValue('purchasedescription');
				
				if(itmtype == 'lotnumberedassemblyitem')
				{
					reqJson['salesDescription'] = itmRec.getValue('description')
				}
				else
				{
					reqJson['salesDescription'] = itmRec.getValue('salesdescription') || purchaseDescription;
				}
                
                reqJson['manufacturer'] = itmRec.getValue('manufacturer');
           

                var subsArr = itmRec.getValue('subsidiary')[0];
                log.debug('subsArr 1', subsArr);

                var subsfieldLookUp = search.lookupFields({
                    type: 'subsidiary',
                    id: subsArr,
                    columns: ['custrecord_crw_99623_sub_short']
                });

                log.debug('subsfieldLookUp', subsfieldLookUp);

                var subs = "";
                if (subsfieldLookUp && subsfieldLookUp != null && subsfieldLookUp != "" && subsfieldLookUp != undefined && subsfieldLookUp.custrecord_crw_99623_sub_short.length > 0) {
                    subs = subsfieldLookUp.custrecord_crw_99623_sub_short[0]['text'];
                }


                // var subs = subsArr.flat()[0];
                log.debug('subs 2', subs);

                reqJson['subsidiary'] = subs || "";
                // reqJson['itemProcessGroup'] = itmRec.getText('itemprocessgroup');
                reqJson['manufacturerDivision'] = itmRec.getValue('custitem_crw_mfger_division');
                reqJson['supplierSegment'] = itmRec.getText('custitem_crw_supplier_segment');
                reqJson['inactive'] = itmRec.getValue('isinactive');
                reqJson['repacked'] = itmRec.getValue('custitem_crw_repacked');
                reqJson['availableForOpportunities'] = itmRec.getValue('custitem_crw_available_for_opps');
                reqJson['sfId'] = itmRec.getValue('custitem_crw_99936_sf_itemid');
                reqJson['productName'] = 'IT_' + subs + '_' + itmName;


                if (itmtype == 'noninventoryitem' || itmtype == 'otherchargeitem') {
                    reqJson['itemProcessGroup'] = "MASTER"
                }
                else {
                    reqJson['itemProcessGroup'] = itmRec.getText('custitem_c96395_product_line');
                }


                var vendorLinecount = itmRec.getLineCount('itemvendor');
                log.debug('vendorLinecount', vendorLinecount);
                if (vendorLinecount > 0) {
                    var vendId = itmRec.getSublistText({
                        sublistId: 'itemvendor',
                        fieldId: 'vendor',
                        line: 0
                    });
                    log.debug('vendId', vendId);
                    reqJson['Vendor'] = vendId;
                }
                obj.push(reqJson);
                var jsonString = JSON.stringify(obj[0]);
                log.debug('Item jsonString', jsonString);
                var response = library.CallToSFDCProduct(jsonString, token);
                log.debug('response', response);


                if (response && typeof response === 'string' && response != undefined) {

                    sfIdArray = response.split("-");
                    log.debug("status code", sfIdArray[1]);
                    log.debug("error code", sfIdArray[2]);

                    if (sfIdArray[1] == 200) {
                        var sfId = sfIdArray[2];

                        record.submitFields({
                            type: itmtype,
                            id: invid,
                            values: {
                                custitem_crw_99936_sf_itemid: sfId.substring(0, sfId.length - 1),
                                custitem_crw_100076_sfitem_err_msg: ""
                            }
                        });
                    }
                    else {
                        var sfErrorMessage = sfIdArray[2];

                        record.submitFields({
                            type: itmtype,
                            id: invid,
                            values: {
                                custitem_crw_100076_sfitem_err_msg: sfErrorMessage
                            }
                        });
                    }
                }

            }


            catch (ex) {
                log.debug({ title: 'Error', details: ex.message });
            }
        }

        function getnumber(id) {
            var ret;
            ret = parseFloat(id);
            if (isNaN(ret)) {
                ret = 0;
            }
            return ret;
        }
        return {
            beforeLoad: beforeLoad,
            afterSubmit: afterSubmit
        };
    });