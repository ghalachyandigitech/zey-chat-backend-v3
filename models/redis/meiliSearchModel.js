const redis = require('../../core/Redis');

module.exports = {
    async setPartnerTaskUid(partnerId, taskUid){
        await redis.client.sendCommand(['SADD', `ms${partnerId}-tasks`, `${taskUid}`]);

        return true;
    },

    async getPartnerTasks(partnerId){
        const tasks = await redis.client.sendCommand(['SMEMBERS', `ms${partnerId}-tasks`]);

        return tasks.map(uid => 1*uid);
    },

    deletePartnerTask(partnerId){
        return redis.client.sendCommand(['DEL', `ms${partnerId}-tasks`]);
    }
};