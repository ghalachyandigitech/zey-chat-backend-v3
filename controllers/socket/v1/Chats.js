const {Types} = require('mongoose');
const messageModel = require('../../../models/redis/messageModel');
const autoAnswerModel = require('../../../models/redis/autoAnswerModel');
const unreadModel = require('../../../models/redis/unreadModel');
const chatModel = require('../../../models/mongo/Chat');
const chatUserModel = require('../../../models/mongo/ChatUser');
const chatMessageModel = require('../../../models/mongo/ChatMessage');
const userPartnerModel = require('../../../models/mongo/UserPartner');
const {setPartnerChat, updatePartnerChatRating} = require('../../../core/MeiliSearch');

module.exports = function(partner){
    async function setLog(chatId, userId, action, name){
        const message = ['', `${userId}_${action}`, '', new Date()];

        await chatModel.setLog(chatId, userId, action);
        const messageId = await messageModel.setMessage(chatId, message);

        partner['chats'].get(chatId).forEach(async (userId) => {
            await unreadModel.setUnread(chatId, userId, messageId);
        });

        message.unshift(messageId);
        partner.io.to(chatId).emit('message.new.log', [chatId, message, userId, name || '']);
    }

    async function chatRecover(chat, role){
        const companionId = partner.companionId(chat._id, chat.user._id);
        partner.emitTo(role, chat.user._id, 'chats.recover', [
            chat, //todo _id, file
            [2,3].includes(chat.status) ? chat.companion.name: '',
            await messageModel.getMessageRange(chat._id, 0),
            await unreadModel.getUnread(chat._id, companionId),
            await unreadModel.getUnreadCount(chat._id, partner.companionId(chat._id, companionId)),
            role === 'agents' ? partner.users.getParam('visitors', chat.companion._id, 'roleCreated'): 0
        ]);
        //todo timeout
        partner.joinToRoom(chat._id, role, chat.user._id);
    }

    async function getChat(chatId, userId){
        if(await autoAnswerModel.getCronAutoAnswerChatId() === chatId) return;
        await autoAnswerModel.deleteAutoAnswer(partner.id, chatId);

        const oldChat = await chatModel.findOneAndUpdate({_id: chatId, status: {$in: [0, 1, 3]}}, {$set: {status: 2}});
        if(!oldChat) return;

        const {status} = oldChat;

        if(status === 1){
            partner.io.to('agents').emit('chats.manual.delete', chatId);
            await chatUserModel.create({chatId: chatId, userId: userId});
        }

        const visitor = {companionId: userId};
        const chat = await chatModel.getChat(chatId, userId);
        const oldUserId = partner.companionId(chatId, chat.companion._id);

        await unreadModel.transferUnread(chatId, oldUserId, userId);
        partner['chats'].set(chatId, [userId, chat.companion._id]);

        if(status === 3){
            partner.emitTo('agents', oldUserId, 'chats.delete', chatId);
            partner.leaveRoom(chatId, 'agents', oldUserId);
            partner.io.to('admins').emit('chats.views.list.update', [chatId, oldUserId, {_id: userId, name: chat.user.name}]);
        }else{
            visitor.roleCreated = new Date();
        }

        partner.updateVisitor(chat.companion._id, visitor);
        partner.visitorUpdateRoleManual(chat.companion._id, 'served');
        partner.io.to(chatId).emit('chats.status', [chat.user.name || '', userId, chatId,'',chat.user.image]);

        if(status !== 0) await chatRecover(chat, 'agents');
        if(status === 3) await setLog(chatId, oldUserId, 'left');
        await setLog(chatId, userId, 'joined', chat.user.name);
    }

    async function autoAnswer(chatId, status, lastUserId, toUserId){
        if(!partner['chats'].has(chatId)) return autoAnswerModel.deleteAutoAnswer(partner.id, chatId);

        const visitorId = partner.companionId(chatId, lastUserId);

        if(lastUserId){
            partner.emitTo('agents', lastUserId, 'chats.delete', chatId);
            partner.leaveRoom(chatId, 'agents', lastUserId);
            await chatUserModel.deleteOne({chatId: chatId, userId: lastUserId});
        }else if(status === 1){
            partner.io.to('agents').emit(`chats.manual.delete`, chatId);
        }

        const newUserId = toUserId || await userPartnerModel.autoConnect(partner.id, chatId, lastUserId);
        if(newUserId){
            partner.updateVisitor(visitorId, {companionId: newUserId});
            await chatUserModel.create({userId: newUserId, chatId: chatId});
        }else{
            partner.updateVisitor(visitorId, {companionId: ''});
            partner.io.to('agents').emit(`chats.manual.set`, chatId);
        }

        const newStatus = !newUserId*1;
        partner.visitorUpdateRoleManual(visitorId, ['assigned', 'incoming'][newStatus]);

        if(newStatus !== status)await chatModel.updateOne({_id: chatId}, {status: newStatus});
        if(newUserId) chatRecover(await chatModel.getChat(chatId, newUserId), 'agents');
        await autoAnswerModel.setAutoAnswer(partner.id, chatId, 0, newUserId, newStatus);
    }

    this.setAutoAnswer = function(chatId, status, lastUserId){
        return autoAnswer(chatId, status, lastUserId);
    };

    this.recover = function(chat, role){
        return chatRecover(chat, role);
    };

    this.recoverById = async function(chatId, role, userId){
        return chatRecover(await chatModel.getChat(chatId, userId), role);
    };

    this.rate = async function([chatId, rating]){
        if(![1,2,3,4,5].includes(parseInt(rating))) return;

        await updatePartnerChatRating(partner.id, chatId, rating);

        await chatModel.updateOne({_id: chatId}, {rating: rating});
    };

    this.end = async function([chatId, companionUserId]){
        const {role, userId} = this.handshake.auth;

        const status = await chatModel.getChatStatus({_id: chatId});
        const chatEndStatus = await chatModel.end(chatId, status);
        if(chatEndStatus){
            const companionId = partner.companionId(chatId, userId);

            if(status !== 4){
                await autoAnswerModel.deleteAutoAnswer(partner.id, chatId);

                partner.io.to(chatId).emit('chats.end', chatId);
                if(status === 3) partner.io.to('team-leads').emit('transfer.new.delete', chatId);
                if(status === 1) partner.io.to('agents').emit('chats.manual.delete', chatId);
                if(status > 1 && role === 'visitors') partner.createRelation(userId, companionId);

                await setLog(chatId, userId, 'end chat');

                const visitorId = role === 'visitors' ? userId: companionId;
                const messages = await messageModel.getMessages(chatId);
                const messagesTexts = await chatMessageModel.setMessages(partner.id, chatId, messages);
                const {visitorName, agentsIds, createdAt} = await chatModel.getMeiliSearchInfo(chatId, visitorId);
                const {agentsNames} = await userPartnerModel.getMeiliSearchInfo(agentsIds);

                setPartnerChat(partner.id, {
                    _id: chatId,
                    status: chatEndStatus,
                    rating: 0,
                    messages: messagesTexts,
                    visitorName: visitorName,
                    visitorId: visitorId,
                    agentsNames: agentsNames,
                    agentsIds: agentsIds,
                    createdAt: createdAt
                });

                const [visitor] = partner.updateVisitor(visitorId, {roleCreated: '', pastChats: 1, chatId: '', companionId: ''});
                partner.visitorUpdateRoleManual(visitorId, partner.io.sockets.get(visitor.id) ? 'active' : 'disconnected-visitors');
            }else{
                partner.io.to(chatId).emit('chats.delete', chatId);

                await chatModel.deleteOne({_id: chatId});
                await chatUserModel.deleteMany({chatId: chatId});
            }

            await messageModel.deleteChat(chatId, [companionId, partner.companionId(chatId, companionId)]);
            partner.io.socketsLeave(chatId);
            partner['chats'].delete(chatId);
        }

        if(role !== 'visitors' && status !== 4) partner.deleteRelation(userId, companionUserId);
    };

    this.set = async function(){
        const {userId} = this.handshake.auth;
        if(await chatUserModel.getVisitorActiveChatId(userId)) return;

        let relatedAgentId = partner['visitorsAgents'].get(userId);
        if(relatedAgentId && partner.users.getParam('agents', relatedAgentId, 'status') !== 4) relatedAgentId = '';

        const chatUsers = !relatedAgentId ? [userId]: [userId, relatedAgentId];
        const chatStatus = !relatedAgentId ? partner.request: 2;
        const role = ['assigned', 'incoming', 'served'][chatStatus];

        const chatId = await chatModel.createChat(partner.id, chatStatus, partner.file);
        for(const id of chatUsers) await chatUserModel.create({chatId: chatId, userId: id});

        partner['chats'].set(chatId, chatUsers);
        partner.updateVisitor(userId, {role, chatId, roleCreated: new Date(), companionId: relatedAgentId || ''});
        partner.visitorUpdateRoleManual(userId, role);

        await setLog(chatId, userId, 'joined');

        if(relatedAgentId)             chatRecover(await chatModel.getChat(chatId, relatedAgentId), 'agents');
        else if(partner.request === 0) autoAnswer(chatId, 0);
        else if(partner.request === 1) partner.io.to('agents').emit('chats.manual.set', chatId);

        await chatRecover(await chatModel.getChat(chatId, userId), 'visitors');
    };

    this.internalSet = async function(companionUserId){
        const {userId} = this.handshake.auth;
        if(await chatUserModel.hasChatByUsers(userId, companionUserId)) return;

        const chatId = await chatModel.createChat(partner.id, 4, partner.file);
        await chatUserModel.create({chatId: chatId, userId: userId});
        await chatUserModel.create({chatId: chatId, userId: companionUserId});

        partner['chats'].set(chatId, [userId, companionUserId]);

        chatRecover(await chatModel.getChat(chatId, userId), 'agents'); //todo karoxa petq chi
        chatRecover(await chatModel.getChat(chatId, companionUserId), 'agents')
    };

    this.get = async function(chatId){
        const {userId} = this.handshake.auth;

        return getChat(chatId, userId);
    };

    this.transferSet = async function([chatId, rapid]){
        const {modifiedCount} = await chatModel.updateOne({_id: chatId, status: 2}, {status: 3});
        if(!modifiedCount) return;

        if(!rapid) partner.io.to('team-leads').emit('transfer.new.set', await chatModel.getTransferInfo(chatId));
    };

    this.transferOffer = async function([chatId, userId]){
        partner.io.to('team-leads').emit('transfer.new.delete', chatId);

        if(!userId){
            await chatModel.updateOne({_id: chatId}, {status: 2});

            const {agentId} = await chatModel.getTransferInfo(chatId);
            return partner.emitTo('agents', agentId, 'transfer.cancel', chatId);
        }

        const agentChatUserId = await chatUserModel.getAgentChatUserId(chatId);
        await chatUserModel.updateOne({_id: agentChatUserId}, {userId: userId});

        getChat(chatId, userId);
    };

    this.viewEnd = async function(chatId){
        const {userId} = this.handshake.auth;

        await userPartnerModel.updateOne({_id: userId}, {$pull: {views: new Types.ObjectId(chatId)}});
    };

    this.view = async function(chatId){
        const {userId} = this.handshake.auth;

        await userPartnerModel.updateOne({_id: userId}, {$addToSet: {views: new Types.ObjectId(chatId)}});
        const chat = await chatModel.chatViewById(chatId);
        const visitor = partner.users.get('visitors', chat.companion._id);

        this.emit('chats.view', [
            chat,
            visitor ? chat.companion.name: '',
            chat.status < 5 ? await messageModel.getMessageRange(chat._id, 0): await chatMessageModel.getMessageRange(chatId, 0),
            await unreadModel.getUnread(chat._id, chat.companion._id),
            await unreadModel.getUnread(chat._id, chat.user._id),
            visitor && visitor['roleCreated'] || 0
        ]);
        this.join(chatId);
    }
};