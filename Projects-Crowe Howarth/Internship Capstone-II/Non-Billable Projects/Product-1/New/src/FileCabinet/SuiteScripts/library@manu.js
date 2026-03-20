define(['N/search'], (search) => {

    const getNextDateFromFrequency = (frequencyId, startDate) => {
        try {
            if (!frequencyId || !startDate) return null;

            var result = search.create({
                type: 'customrecord_crowe_sub_freq',
                filters: [['internalid', 'is', frequencyId]],
                columns: ['custrecord_num_months', 'custrecord_num_days']
            }).run().getRange({ start: 0, end: 1 })[0];

            if (result) {
                var numMonths = parseInt(result.getValue('custrecord_num_months')) || 0;
                var numDays = parseInt(result.getValue('custrecord_num_days')) || 0;
                log.debug("Months: ", numMonths);
                log.debug("Days: ", numDays);


                var nextDate = new Date(startDate);
                nextDate.setMonth(nextDate.getMonth() + numMonths);
                nextDate.setDate(nextDate.getDate() + numDays);
                log.debug("New Next Date: ", nextDate);

                return nextDate;
            }
        }

        catch (e) {
            log.error('Error in getNextDateFromFrequency', e);
        }
        return null;
    };

    return {
        getNextDateFromFrequency: getNextDateFromFrequency
    };
});