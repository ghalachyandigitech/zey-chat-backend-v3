const redis = require('../../core/Redis');

const keys = 5;
const PAGE_MESSAGES_LIMIT = parseInt(process.env.PAGE_MESSAGES_LIMIT);

module.exports = {
    setMessage: async function(chatId, [userId, text, filePath, date]){
        const messageId = await redis.client.sendCommand(['INCR', `m${chatId}`]);
        await redis.client.sendCommand([`RPUSH`, `${chatId}`,
            `${messageId}`,
            `${userId}`,
            `${text}`,
            `${filePath || ''}`,
            `${date}`
        ]);

        return messageId;
    },

    getMessages(chatId){
        return redis.client.sendCommand(['LRANGE', `${chatId}`, `0`, `-1`]);
    },

    async getMessageRange(chatId, offsetId){
        let offset = 0;
        let to = 0;
        let ended = 0;

        if(!offsetId){
            to = await redis.client.sendCommand(['LLEN', `${chatId}`]);
            offset = to-PAGE_MESSAGES_LIMIT*keys;
        }else{
            to = (offsetId-1)*keys-1;
            offset = (offsetId-PAGE_MESSAGES_LIMIT-1)*keys;

            if(offset <= 0) ended = 1;
        }

        if(offset < 0) offset = 0;

        if(offset === 0 && to === -1) return [[], 1];
        return [await redis.client.sendCommand(['LRANGE', `${chatId}`, `${offset}`, `${to}`]), ended]
    },

    async deleteChat(chatId, users){
        await redis.client.sendCommand(['DEL', `${chatId}`]);

        for(const userId of users) redis.client.sendCommand(['DEL', `u${chatId + userId}`]);

        return redis.client.sendCommand(['DEL', `m${chatId}`]);
    },
};