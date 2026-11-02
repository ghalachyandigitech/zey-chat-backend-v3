const redis = require('../../core/Redis');

module.exports = {
    getAutoAnswers(partnerId){
        return redis.client.sendCommand(['SMEMBERS', `p${partnerId}`])
    },

    async deleteAutoAnswer(partnerId, chatId){
        await redis.client.sendCommand(['SREM', `p${partnerId}`, chatId]);
        await redis.client.sendCommand(['DEL', `a${chatId}`]);
    },

    async updateAutoAnswerDate(chatId, seconds){
        const chat = await redis.client.sendCommand(['HVALS', `a${chatId}`]);
        if(!chat.length) return;

        await redis.client.sendCommand(['HMSET', `a${chatId}`,
            'seconds', `${seconds + parseInt(chat[0])}`,
        ]);

        return true;
    },

    async getAutoAnswer(chatId){
        const chat = await redis.client.sendCommand(['HVALS', `a${chatId}`]);
        if(chat.length){
            chat[0] = parseInt(chat[0]);
            chat[2] = parseInt(chat[2]);
        }

        return chat;
    },

    async setAutoAnswer(partnerId, chatId, seconds, lastUserId, status){
        await redis.client.sendCommand(['SADD', `p${partnerId}`, chatId]);
        return redis.client.sendCommand(['HMSET', `a${chatId}`,
            'seconds', `${seconds}`,
            'lastUserId', `${lastUserId}`,
            'status', `${status}`,
        ]);
    },

    async getCronAutoAnswerChatId(){
        return await redis.client.sendCommand(['GET', `autoAnswerChatId`]);
    },

    async setCronAutoAnswerChatId(chatId){
        await redis.client.sendCommand(['SET', `autoAnswerChatId`, chatId]);
    },

    async deleteCronAutoAnswerChatId(){
        await redis.client.sendCommand(['DEL', `autoAnswerChatId`]);
    }
};
