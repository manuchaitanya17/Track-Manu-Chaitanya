/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope Public
 */

define(['N/currentRecord', 'N/record', 'N/search', 'N/url', 'N/format', 'N/http', 'N/https', 'N/ui/message', 'N/runtime', 'N/query'],

    function (currentrecord, record, search, url, format, http, https, message, runtime, query) {
        var recobj;
        var i;
        var xlist = new Array();
        var PAGINATED_REC_DATA = '';
        var PAGINATED_REC_ID = '';
        var pagechanged = true;
        function pageInit(context) {
            recobj = context.currentRecord;
            var allids = recobj.getValue({ fieldId: 'custpage_allids' });
            var ismarkall = recobj.getValue({ fieldId: 'custpage_css_ismarkall' });

            if (allids) {
                allids = allids.split(",");
                xlist = allids;
            }
            setValuesinSublist(xlist, true);
            if (ismarkall == true || ismarkall == 'true' || ismarkall == 'T') {
                var allinvid = recobj.getValue({ fieldId: 'custpage_invids' });
                var paginatedRecData = getPaginatedRecData(allinvid);
                console.log("paginatedFileData123", paginatedRecData);
                PAGINATED_REC_ID = paginatedRecData['id'];
                var paginatedFileData = paginatedRecData['data'];
                console.log("paginatedFileData", paginatedFileData);
                if (paginatedFileData && paginatedFileData != null && paginatedFileData != '') {
                    PAGINATED_REC_DATA = paginatedFileData.split(',');
                }
                else {
                    if (allinvid && allinvid != null && allinvid != '') {
                        PAGINATED_REC_DATA = allinvid.split(',');
                    }
                }
                console.log("PAGINATED_REC_DATA", PAGINATED_REC_DATA);
                log.debug('PAGINATED_REC_DATA', PAGINATED_REC_DATA);
                if (PAGINATED_REC_DATA.length > 0) {
                    var form = context.currentRecord;
                    var sublistLineCount = form.getLineCount({
                        sublistId: 'custpage_sublist'
                    });
                    for (var i = 0; i < Number(sublistLineCount); i++) {
                        var uniqueId = form.getSublistValue({
                            sublistId: 'custpage_sublist',
                            line: i,
                            fieldId: 'custpage_css_internalid'
                        });

                        if (PAGINATED_REC_DATA.indexOf(uniqueId) != -1) {
                            // Using 1.0 for better performance in the current case. Form.setSublistValue not available.
                            nlapiSetLineItemValue('custpage_sublist', 'custpage_checkbox', i + 1, 'T');
                        }
                        else {
                            nlapiSetLineItemValue('custpage_sublist', 'custpage_checkbox', i + 1, 'F');
                        }
                    }
                }
            }
            else {
                var paginatedRecData = getPaginatedRecData(PAGINATED_REC_DATA);
                console.log("paginatedFileData123", paginatedRecData);
                PAGINATED_REC_ID = paginatedRecData['id'];
                var paginatedFileData = paginatedRecData['data'];
                console.log("paginatedFileData", paginatedFileData);
                updatePaginatedRec(PAGINATED_REC_ID, '');
            }
        }

        function fieldChanged(context) {
            var allinvid = recobj.getValue({ fieldId: 'custpage_invids' });
            if (allinvid && allinvid != null && allinvid != '') {
                allinvid = allinvid.split(',');
                console.log("allinvid", allinvid)
            }
            var cust = recobj.getValue({ fieldId: 'custpage_customerselect' });
            var startDate = recobj.getText("custpage_css_startdate");
            var endDate = recobj.getText("custpage_css_enddate");
            var invoiceDate = recobj.getText({ fieldId: 'custpage_css_invoicedate' }); // NEW


            //var weekEndingDate = recobj.getText({ fieldId: 'custpage_csa_weekendingdate' });
            var employeeid = recobj.getValue({ fieldId: 'custpage_csa_billemployee' });
            var customerid = recobj.getValue({ fieldId: 'custpage_csa_billcustomer' });
            var vendorid = recobj.getValue({ fieldId: 'custpage_css_vendor' });
            //var approvalStatus = recobj.getValue("custpage_csa_time_entrystatus");
            var postDate = recobj.getText({ fieldId: 'custpage_csa_postdate' });
            var analyst = recobj.getValue({ fieldId: 'custpage_css_collection_analyst' });


            var invTypeVal = recobj.getValue({ fieldId: 'custpage_css_invoicetype' });
            var tranTypeVal = recobj.getValue({ fieldId: 'custpage_css_transactiontypefil' });
            var tranTypeText = recobj.getText({ fieldId: 'custpage_css_transactiontypefil' });
            var subsidiaryVal = recobj.getValue({ fieldId: 'custpage_css_subsidiary' });
            var checkVal = recobj.getValue({ fieldId: 'custpage_css_check' });
            var ismarkall = recobj.getValue({ fieldId: 'custpage_css_ismarkall' });

            if (context.fieldId == 'custpage_customerselect') {
                console.log("opening the page again with added parameter of the customer", cust);
                var scheme = 'https://';
                var host = url.resolveDomain({ hostType: url.HostType.APPLICATION });
                var link = url.resolveScript({
                    scriptId: 'customscript_css_sl_bulk_mail_process',
                    deploymentId: 'customdeploy_css_sl_bulk_mail_process',
                });
                var urlVal = scheme + host + link;
                urlVal += '&customer=' + cust;
                urlVal += '&employeeid=' + employeeid;
                urlVal += '&vendorid=' + vendorid;
                urlVal += '&analyst=' + analyst;

                urlVal += '&invtype=' + invTypeVal;
                urlVal += '&trantype=' + tranTypeVal;
                urlVal += '&trantypetext=' + tranTypeText;
                urlVal += '&subsidiaryval=' + subsidiaryVal;
                urlVal += '&check=' + checkVal;
                urlVal += '&allmark=' + ismarkall;

                window.open(urlVal, '_self');
            }
            else if (context.fieldId == 'custpage_pagination') {
                if (typeof (xlist) == 'object') {
                    var finallist = xlist.join();
                }
                else {
                    finallist = xlist;
                }
                var pageId = context.currentRecord.getValue({ fieldId: 'custpage_pagination' });
                pageId = parseInt(pageId.split('_')[1]);
                console.log("PAGINATED_REC_DATA Paginaton", PAGINATED_REC_DATA);
                updatePaginatedRec(PAGINATED_REC_ID, PAGINATED_REC_DATA);
                var scheme = 'https://';
                var host = url.resolveDomain({ hostType: url.HostType.APPLICATION });
                var link = url.resolveScript({
                    scriptId: 'customscript_css_sl_bulk_mail_process',
                    deploymentId: 'customdeploy_css_sl_bulk_mail_process',
                });
                var urlVal = scheme + host + link;
                urlVal += '&startdate=' + startDate;
                urlVal += '&enddate=' + endDate;
                urlVal += '&invoicedate=' + invoiceDate; // NEW

                //urlVal += '&weekEndingDate =' + weekEndingDate;
                urlVal += '&postDate =' + postDate;
                urlVal += '&employeeid=' + employeeid;
                urlVal += '&customerid=' + cust;
                urlVal += '&vendorid=' + vendorid;
                urlVal += '&analyst=' + analyst;
                //urlVal += '&approvalStatus=' + approvalStatus;
                urlVal += '&page=' + pageId;
                if (ismarkall == true || ismarkall == 'true') {
                    urlVal += '&ids=';
                }
                else {
                    urlVal += '&ids=' + finallist;
                }
                urlVal += '&invtype=' + invTypeVal;
                urlVal += '&trantype=' + tranTypeVal;
                urlVal += '&trantypetext=' + tranTypeText;
                urlVal += '&subsidiaryval=' + subsidiaryVal;
                urlVal += '&check=' + checkVal;
                urlVal += '&allmark=' + ismarkall;
                window.open(urlVal, '_self');
            }
            else if (context.fieldId == 'custpage_checkbox') {
                var id = recobj.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_id', line: context.line });
                var checkstatus = recobj.getCurrentSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_checkbox' });
                var recid = recobj.getCurrentSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_css_internalid' });
                var pos = xlist.indexOf(id);
                console.log("before xlist", xlist)
                console.log('checkstatus' + pos, checkstatus)
                if (pos != -1) {
                    //this means that the number is already in the url list
                    if (checkstatus == false) {
                        xlist.splice(pos, 1)
                        console.log("after xlist", xlist)
                    }
                }
                else {
                    //it is not in the list
                    if (checkstatus == true) {
                        xlist.push(id);
                        console.log("after xlist", xlist)
                    }
                }
                if (ismarkall == true || ismarkall == 'true' || ismarkall == 'T') {
                    // alert('checkstatus : '+checkstatus);
                    // alert('recid : '+recid);
                    // alert('Index : '+allinvid.indexOf(recid));
                    if (checkstatus == true) {
                        if (PAGINATED_REC_DATA.indexOf(recid) == -1) {
                            PAGINATED_REC_DATA.push(recid);
                            recobj.setValue({ fieldId: 'custpage_invids', value: PAGINATED_REC_DATA.toString() });
                        }
                    }
                    else {
                        if (PAGINATED_REC_DATA.indexOf(recid) != -1) {
                            PAGINATED_REC_DATA.splice(PAGINATED_REC_DATA.indexOf(recid), 1);
                            console.log("allinvid", allinvid.toString());
                            recobj.setValue({ fieldId: 'custpage_invids', value: PAGINATED_REC_DATA.toString() });
                        }
                    }
                }
            }
            else if (context.fieldId == 'custpage_css_ismarkall') {
                console.log("opening the page again with added parameter of the customer", cust);
                var scheme = 'https://';
                var host = url.resolveDomain({ hostType: url.HostType.APPLICATION });
                var link = url.resolveScript({
                    scriptId: 'customscript_css_sl_bulk_mail_process',
                    deploymentId: 'customdeploy_css_sl_bulk_mail_process',
                });
                var urlVal = scheme + host + link;
                urlVal += '&startdate=' + startDate;
                urlVal += '&enddate=' + endDate;
                urlVal += '&invoicedate=' + invoiceDate; // NEW

                //urlVal += '&weekendingdate=' + weekEndingDate;
                urlVal += '&employeeid=' + employeeid;
                urlVal += '&vendorid=' + vendorid;
                urlVal += '&customerid=' + customerid;
                urlVal += '&analyst=' + analyst;
                urlVal += '&invtype=' + invTypeVal;
                urlVal += '&trantype=' + tranTypeVal;
                urlVal += '&trantypetext=' + tranTypeText;
                urlVal += '&subsidiaryval=' + subsidiaryVal;
                urlVal += '&check=' + checkVal;
                urlVal += '&allmark=' + ismarkall;
                // alert('urlVal '+urlVal);	
                window.open(urlVal, '_self');
            }
        }

        
        function filterData(context) {
            //alert('Test '+'Test');
            var startDate = recobj.getText("custpage_css_startdate");
            var endDate = recobj.getText("custpage_css_enddate");
            var invoiceDate = recobj.getText({ fieldId: 'custpage_css_invoicedate' }); // NEW

            //var weekEndingDate = recobj.getText({ fieldId: 'custpage_css_weekendingdate' });
            var employeeid = recobj.getValue({ fieldId: 'custpage_css_billemployee' });
            var vendorid = recobj.getValue({ fieldId: 'custpage_css_vendor' });
            var customerid = recobj.getValue({ fieldId: 'custpage_css_billcustomer' });
            var analyst = recobj.getValue({ fieldId: 'custpage_css_collection_analyst' });
            //var projectText = recobj.getValue({ fieldId: 'custpage_css_textproject' });
            //var projectid = recobj.getValue({ fieldId: 'custpage_css_listproject' });
            var ismarkall = recobj.getValue({ fieldId: 'custpage_css_ismarkall' });
            var invTypeVal = recobj.getValue({ fieldId: 'custpage_css_invoicetype' });
            var tranTypeVal = recobj.getValue({ fieldId: 'custpage_css_transactiontypefil' });
            var tranTypeText = recobj.getText({ fieldId: 'custpage_css_transactiontypefil' });
            var subsidiaryVal = recobj.getValue({ fieldId: 'custpage_css_subsidiary' });
            var checkVal = recobj.getValue({ fieldId: 'custpage_css_check' });

            var urlVal = url.resolveScript({
                scriptId: 'customscript_css_sl_bulk_mail_process',
                deploymentId: 'customdeploy_css_sl_bulk_mail_process',
            });
            //alert('urlVal '+urlVal);
            urlVal += '&startdate=' + startDate;
            urlVal += '&enddate=' + endDate;
            urlVal += '&invoicedate=' + invoiceDate; // NEW

            //urlVal += '&weekendingdate=' + weekEndingDate;
            urlVal += '&employeeid=' + employeeid;
            urlVal += '&vendorid=' + vendorid;
            urlVal += '&customerid=' + customerid;
            urlVal += '&analyst=' + analyst;
            //urlVal += '&projectText=' + projectText;
            //urlVal += '&projectid=' + projectid;
            //alert('urlVal1 '+urlVal);
            urlVal += '&invtype=' + invTypeVal;
            urlVal += '&trantype=' + tranTypeVal;
            urlVal += '&trantypetext=' + tranTypeText;
            // alert('urlVal12 '+urlVal);
            urlVal += '&subsidiaryval=' + subsidiaryVal;
            urlVal += '&check=' + checkVal;
            // alert('urlVal123 '+urlVal);
            urlVal += '&allmark=' + ismarkall;

            //alert('e'+urlVal);
            window.open(urlVal, '_self');
            //window.open('https://tstdrv2150477.app.netsuite.com/app/center/card.nl?sc=40&whence=','_self');

        }

        /*
         *  Update Paginated Custom record
         */
        function updatePaginatedRec(id, data) {
            try {
                console.log('data111', data)
                console.log('id2222', id)
                var recObj2 = record.load({
                    type: 'customrecord_bulk_email',
                    id: id
                });
                if (data == '') {
                    recObj2.setValue({
                        fieldId: 'custrecord_sublist_line_data',
                        value: ''
                    });
                }
                else {
                    recObj2.setValue({
                        fieldId: 'custrecord_sublist_line_data',
                        value: data.toString()
                    });
                }

                var id = recObj2.save();
                log.audit("PAGINATED_DATA_HOLDER_REC_TYPE Updated", id);

            }
            catch (err) {
                console.log("Error updating ", err)
            }

        }
        function getPaginatedRecData(allinvid) {
            var currentUser = runtime.getCurrentUser().id;
            console.log('currentUser', currentUser);
            var data = getCustomRec(allinvid, currentUser);
            return data;
        }


        /////   Set value in custom record.
        function getCustomRec(allinvid, userid) {
            console.log('userid', userid);
            var queryStr = "select id, custrecord_sublist_line_data from customrecord_bulk_email where custrecord_user='" + userid + "'";
            console.log('queryStr', queryStr);
            var fileRslt = runSuiteQuery(null, queryStr);
            var pageData = {}
            console.log('fileRslt', fileRslt.length)
            if (fileRslt.length > 0) {
                if (fileRslt[0]['custrecord_sublist_line_data'] == null || fileRslt[0]['custrecord_sublist_line_data'] == '' || fileRslt[0]['custrecord_sublist_line_data'] == 'null') {
                    console.log('update', 'update')
                    updatePaginatedRec(fileRslt[0]['id'], allinvid);
                    if (allinvid && allinvid != null && allinvid != '') {
                        pageData['data'] = allinvid.toString();
                        pageData['id'] = fileRslt[0]['id'];
                    }
                    return pageData;
                }
                else {
                    pageData['data'] = fileRslt[0]['custrecord_sublist_line_data'];
                    pageData['id'] = fileRslt[0]['id'];
                    return pageData;
                }
            }
            else {
                // Create a empty record
                var recObj1 = record.create({
                    type: 'customrecord_bulk_email',
                });
                recObj1.setValue({
                    fieldId: 'custrecord_user',
                    value: userid
                })

                recObj1.setValue({
                    fieldId: 'custrecord_sublist_line_data',
                    value: ''
                })
                var id = recObj1.save();
                log.debug("New PAGINATED_DATA_HOLDER_REC_TYPE" + userid, id);
                // return empty object string 
                pageData['data'] = ""
                pageData['id'] = id
                return pageData;
            }
        }

        function runSuiteQuery(type, qeuryString) {

            console.log("qeuryString:", qeuryString)

            var resultSet = query.runSuiteQL({
                query: qeuryString
            });
            console.log(type + " | asMappedResults:", resultSet.asMappedResults());

            if (resultSet && resultSet.results && resultSet.results.length > 0) {
                return resultSet.asMappedResults();
            } else {
                return [];
            }
        }

        function markallfunction() {
            var alllist = recobj.getValue({ fieldId: 'custpage_trueids' });
            console.log("values=alllist", alllist)
            xlist = alllist.split(",")
            console.log(xlist)
            setValuesinSublist('ALL', true)
            console.log("all has been marked", xlist)
        }

        function unmarkallfunction() {
            xlist = new Array()
            setValuesinSublist('ALL', false)
            console.log("all has been unmarked")
        }

        function saveRecord(context) {
            if (PAGINATED_REC_DATA.length > 0) {
                // IMPORTANT: Save the PAGINATED_REC_DATA to a Long text field
                recobj.setValue({
                    fieldId: "custpage_invids",
                    value: PAGINATED_REC_DATA.toString()
                });
                updatePaginatedRec(PAGINATED_REC_ID, '');
            }

            if (typeof (xlist) == 'object') {
                var finallist = xlist.join();
            }
            else {
                var finallist = xlist;
            }
            recobj.setValue({ fieldId: 'custpage_allids', value: finallist });
            console.log('xlist', xlist)
            if (xlist.length > 0) {
                var confirmmessage = message.create({ title: 'Mass mail process been Submitted.', message: 'please wait for a minute and referesh this page or view Process Bulk Mail page.', type: message.Type.INFORMATION });
                confirmmessage.show({ duration: 90000 })
                return true;
            }
            else {
                var confirmmessage = message.create({ title: 'Please Select a transaction to proceed', message: 'please select atleast one transaction to proceed.', type: message.Type.WARNING });
                confirmmessage.show({ duration: 90000 });
                return false;
            }

        }
        function setValuesinSublist(values, flag) {
            if (values == 'ALL') {
                var count = recobj.getLineCount({ sublistId: 'custpage_sublist' });
                for (var i = 0; i < count; i++) {
                    recobj.selectLine({ sublistId: 'custpage_sublist', line: i });
                    recobj.setCurrentSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_checkbox', value: flag });
                    recobj.commitLine({ sublistId: 'custpage_sublist' });
                }
            }
            else {
                var count = recobj.getLineCount({ sublistId: 'custpage_sublist' });
                for (var i = 0; i < count; i++) {
                    recobj.selectLine({ sublistId: 'custpage_sublist', line: i });
                    var curid = recobj.getSublistValue({ sublistId: 'custpage_sublist', line: i, fieldId: 'custpage_id' });
                    if (values.indexOf(curid) != -1) {
                        recobj.setCurrentSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_checkbox', value: flag });
                    }
                    recobj.commitLine({ sublistId: 'custpage_sublist' });
                }
            }
        }
        function getTheSalesOrders(custom) {
            var results = [];
            log.debug("value of custom is", custom)
            var mfilters = [["type", "anyof", "SalesOrd"], "AND", ["status", "anyof", "SalesOrd:F", "SalesOrd:E"], "AND", ["mainline", "is", "T"]];
            if (custom != 0) {
                var mfilters = [["type", "anyof", "SalesOrd"], "AND", ["entity", "anyof", custom], "AND", ["status", "anyof", "SalesOrd:F", "SalesOrd:E"], "AND", ["mainline", "is", "T"]]
            }
            var salesorderSearchObj = search.create({
                type: "salesorder",
                filters: [mfilters],
                columns:
                    [
                        search.createColumn({ name: "internalid", label: "Internal ID" }),
                        search.createColumn({ name: "statusref", label: "Status" }),
                        search.createColumn({ name: "transactionname", label: "Transaction Name" }),
                        search.createColumn({ name: "entity", label: "Customer Name" })

                    ]
            });

            var searchResultCount = salesorderSearchObj.runPaged().count;
            salesorderSearchObj.run().each(function (result) {
                // .run().each has a limit of 4,000 results
                results.push({
                    'id': result.getValue(result.columns[0]),
                    'status': result.getValue(result.columns[1]),
                    'name': result.getValue(result.columns[2]),
                    'customer': result.getText(result.columns[3]),
                    'customerId': result.getValue(result.columns[3]),
                })
                return true;
            });
            log.debug("salesorderSearchObj result count" + results.length, searchResultCount);
            return results;
        }
        function refreshPage(context) {
            window.location.reload(true);
        }
        return {
            pageInit: pageInit,
            markallfunction: markallfunction,
            unmarkallfunction: unmarkallfunction,
            fieldChanged: fieldChanged,
            filterData: filterData,
            refreshPage: refreshPage,
            saveRecord: saveRecord
        }
    });