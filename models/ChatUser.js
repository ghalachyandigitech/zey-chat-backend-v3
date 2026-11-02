const { Types, model, Schema } = require('mongoose');

const chatUserSchema = new Schema({
    chatId: {type: Types.ObjectId, ref: 'Chat'},
    userId: {type: Types.ObjectId, ref: 'UserPartner'},
    createdAt: { type: Date }
}, {versionKey: false});

chatUserSchema.statics.getVisitorChatInfo = async function(userId){
    const [chatUser] = await this.aggregate(
        [
            {$match: {userId: new Types.ObjectId(userId)}},
            {$lookup:
                {
                    from: 'chats',
                    localField: "chatId",
                    foreignField: "_id",
                    as: "chat",
                    pipeline:[{$match: {status: {$nin: [4, 5, 6]}}}]
                }
            },
            {$unwind: '$chat'}
        ]
    );

    if(chatUser && chatUser.chatId) return {
        chatId: chatUser.chatId.toString(),
        status: chatUser.chat.status,
        roleCreated: chatUser.chat.logs[1] ? chatUser.chat.logs[1].createdAt : chatUser.chat.logs[0].createdAt,
    }
};

chatUserSchema.statics.getVisitorActiveChatId = async function(userId){
    const [chatUser] = await this.aggregate(
        [
            {$match: {userId: new Types.ObjectId(userId)}},
            {$lookup:
                {
                    from: 'chats',
                    localField: "chatId",
                    foreignField: "_id",
                    as: "chat",
                    pipeline:[{$match: {status: {$nin: [4, 5, 6]}}}]
                }
            },
            {$unwind: '$chat'}
        ]
    );

    if(!chatUser || !chatUser.chatId) return ''; //todo dzel

    return chatUser.chatId.toString();
};

chatUserSchema.statics.getAgentChatUserId = async function(chatId){
    const [chatUser] = await this.aggregate(
        [
            {$match: {chatId: new Types.ObjectId(chatId)}},
            {$lookup:
                    {
                        from: 'user_partners',
                        localField: "userId",
                        foreignField: "_id",
                        as: "user",
                        pipeline:[{$match: {role: {$ne: 4}}}],
                    }
            },
            {$unwind: "$user"}
        ]
    );

    return chatUser._id.toString();
};

chatUserSchema.statics.hasChatByUsers = async function(userId, companionUserId){
    const [chat] = await this.aggregate(
        [
            {$match: {userId: new Types.ObjectId(userId)}},
            {$lookup:
                {
                    from: 'chat_users',
                    localField: "chatId",
                    foreignField: "chatId",
                    as: "companion",
                    pipeline:[{$match: {userId: new Types.ObjectId(companionUserId)}}]
                }
            },
            {$unwind: '$companion'}
        ]
    );

    return !!chat;
};

module.exports = model("Chat_user", chatUserSchema);
chatUserSchema.index({userId: 1});
chatUserSchema.index({chatId: 1});
module.exports.createIndexes();