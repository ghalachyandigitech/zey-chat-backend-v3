const {saveBuffer} = require("../../../helpers/fileHelper");
const chatMessageModel = require('../../../models/mongo/ChatMessage');
const messageModel = require('../../../models/redis/messageModel');
const unreadModel = require('../../../models/redis/unreadModel');

const fileExes = ['image/jpeg', 'image/png', 'image/jpg', 'video/mp4'];

module.exports = function(partner){
    this.page = async function([chatId, firstMessageId]){
        const {role} = this.handshake.auth;

        const offsetId = parseInt(firstMessageId.slice(1));
        if(isNaN(offsetId) || offsetId < 0)
            return this.emit('message.page', [[], 1, chatId]);

        let [messages, ended] = await messageModel.getMessageRange(chatId, offsetId);

        if(!messages.length && role === 'team-leads')
            [messages, ended] = await chatMessageModel.getMessageRange(chatId, offsetId);

        this.emit('message.page', [messages, ended, chatId]);
    };

    this.delivered = async function([chatId, delivered]){
        try {
            const {userId} = this.handshake.auth;

            const companionId = partner.companionId(chatId, userId);
            await unreadModel.unreadToDelivered(chatId, partner.companionId(chatId, companionId), delivered);

            partner.io.to(chatId).emit('message.delivered', [userId, chatId, delivered]);
        }catch(e){}
    };

    this.read = async function(chatId){
        try {
            const {userId} = this.handshake.auth;

            const companionId = partner.companionId(chatId, userId);
            await unreadModel.deleteUnread(chatId, partner.companionId(chatId, companionId));

            partner.io.to(chatId).emit('message.read', [userId, chatId]);
        }catch(e){}
    };

    this.set = async function([chatId, [hashId, [text, file]]]){
        const {userId} = this.handshake.auth;

        const companionId = partner.companionId(chatId, userId);
        const date = new Date();
        const filePath = file[0] && fileExes.includes(file[0].toLowerCase()) ? await saveBuffer(file): '';
        const messageId = await messageModel.setMessage(chatId, [userId, text, filePath, date]);
        await unreadModel.setUnread(chatId, companionId, messageId);

        partner.io.to(chatId).emit('message.new', [[messageId, userId, text, filePath, date], hashId, chatId]);
    };

    this.typing = function([typing, chatId]){
        const {userId} = this.handshake.auth;

        partner.io.to(chatId).emit('message.typing', [userId, typing, chatId]);
    }
};