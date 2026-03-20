/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
/*****************************************************************************
 *  * Copyright (c) 2021 - Present Crowe LLP - All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Crowe LLP. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered with Crowe LLP.
*
* FILE NAME: c106392_UE_call_map_reduce.js
* DEVOPS TASK: ENH 106392, DT 106393
* AUTHOR: Manu Chaitanya
* DATE CREATED: 15/July/2025
* DESCRIPTION: This Script calls the MR Script to update territory.
*****************************************************************************/
define(['N/task'], function (task) {

    function afterSubmit(context) {
		try
		{
			if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) return;

			var masterTerritoryId = context.newRecord.id;
			var mode = context.type;

			log.debug("masterTerritoryId", masterTerritoryId);
			log.debug("mode", mode);

			var mrTask = task.create({
				taskType: task.TaskType.MAP_REDUCE,
				scriptId: 'customscript_c106392_mr_upd_territory',
				// deploymentId: 'customdeploy_mr_customer_processor',
				params: {
					custscript_masterterritoryid: masterTerritoryId,
					custscript_mode: mode
				}
			});

			log.debug("MR Called!")
			var taskId = mrTask.submit();
		}
		catch(e)
		{
			log.error('error',e.message());
		}
      
    }

    return {
        afterSubmit: afterSubmit
    };
});
