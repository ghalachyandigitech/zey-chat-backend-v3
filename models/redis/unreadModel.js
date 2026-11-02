const redis = require('../../core/Redis');

module.exports = {
    async transferUnread(chatId, oldUserId, userId){
        const unread = await redis.client.sendCommand(['HGETALL', `u${chatId}${oldUserId}`]);
        if(unread.length) await redis.client.sendCommand(['HMSET', `u${chatId + userId}`, ...unread]);

        await redis.client.sendCommand(['DEL', `u${chatId}${oldUserId}`]);
    },

    setUnread(chatId, userId, messageId){
        return redis.client.sendCommand(['HMSET', `u${chatId + userId}`,
            `${messageId}`, `0`
        ]);
    },

    async deleteUnread(chatId, userId){
        await redis.client.sendCommand(['DEL', `u${chatId + userId}`]);
    },

    async getUnreadCount(chatId, userId){
        return await redis.client.sendCommand(['HLEN', `u${chatId + userId}`]);
    },

    async unreadToDelivered(chatId, userId, delivered){
        if(!delivered.length) delivered = await redis.client.sendCommand(['HKEYS', `u${chatId + userId}`]);
        if(!delivered.length) return;

        const unread = [];
        delivered.forEach(messageId => unread.push(messageId.toString(), '1'));

        await redis.client.sendCommand(['HMSET', `u${chatId + userId}`, ...unread]);
    },

    async getUnread(chatId, userId){
        return await redis.client.sendCommand(['HGETALL', `u${chatId + userId}`]);
    }
};
