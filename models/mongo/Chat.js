const {Schema, model, Types} = require('mongoose');

const STATUS = [
    'auto',
    'manual',
    'served',
    'transfer',
    'internal',
    'end',
    'missed'
];

const FILE = [
    'disable',
    'manual',
    'enable',
];

const chatSchema = new Schema({
    status: {type: Number, default: 0},
    partnerId: {type: Types.ObjectId, ref: 'Partner'},
    widgetId: {type: String},
    file: {type: Number},
    rating: {type: Number, default: 0},
    logs: [{
        userId: {type: Types.ObjectId, ref: 'UserPartner'},
        action: {type: String},
        createdAt: {type: Date, default: new Date()}
    }]
}, {versionKey: false, timestamps: {createdAt: 'createdAt', updatedAt: 'updatedAt'}});

function setChat(chat){
    if(chat){
        const logUsers = {};
        chat['logUsers'].forEach(logUser => logUsers[logUser._id.toString()] = logUser.name);

        const user = chat.user[0]?.userPartner || {};
        const companion = chat.users[0]?.userPartner[0] || {};
        const {name, styles} = (companion.widget && companion.widget[0]) || {styles: {}};

        return {
            _id: chat._id.toString(),
            status: chat.status,
            file: chat.file,
            logUsers: logUsers,
            widget: {
                name: name !== 'default' ? name || '' : '',
                styles: styles
            },
            user: {
                _id: user._id && user._id.toString(),
                name: user.name,
                image: user.profileImage,
            },
            companion: {
                _id: companion._id && companion._id.toString(),
                status: companion.status,
                name: companion.name,
                image: companion.profileImage,
                banExpire: companion.banExpire && companion.banExpire > new Date(),
            }
        };
    }
}

chatSchema.statics.getPastChats = async function (partnerId, userPartnerId) {
    const objectUserId = new Types.ObjectId(userPartnerId);

    const chats = await this.aggregate(
        [
            {$match: {partnerId: new Types.ObjectId(partnerId), status: {$in: [5, 6]}}},
            {$lookup:
                {
                    from: 'chat_users',
                    localField: "_id",
                    foreignField: "chatId",
                    as: "chatUser",
                    pipeline: [
                        {$match: {userId: objectUserId}},
                        {$lookup:
                            {
                                from: 'chat_users',
                                localField: "chatId",
                                foreignField: "chatId",
                                as: "agent",
                                pipeline: [
                                    {$match: {userId: {$ne: objectUserId}}},
                                    {
                                        $lookup:
                                            {
                                                from: 'user_partners',
                                                localField: "userId",
                                                foreignField: "_id",
                                                as: "user"
                                            }
                                    },
                                    {$unwind: '$user'}
                                ]
                            }
                        },
                        {$unwind: '$agent'}
                    ]
                }
            },
            {$unwind: '$chatUser'}
        ]
    );

    return chats.map(chat => ({
        _id: chat._id.toString(),
        createdAt: chat.createdAt,
        agentName: chat.chatUser.agent.user.name
    }));
};

chatSchema.statics.getTransferInfo = async function (chatId) {
    const [chat] = await this.aggregate([
        {$match: {_id: new Types.ObjectId(chatId)}},
        {
            $lookup:
                {
                    from: 'chat_users',
                    localField: "_id",
                    foreignField: "chatId",
                    as: "agent",
                    pipeline: [
                        {
                            $lookup:
                                {
                                    from: 'user_partners',
                                    localField: "userId",
                                    foreignField: "_id",
                                    as: "user",
                                    pipeline: [{$match: {role: {$ne: 4}}}],
                                }
                        },
                        {$unwind: "$user"}
                    ],
                }
        },
        {
            $lookup:
                {
                    from: 'chat_users',
                    localField: "_id",
                    foreignField: "chatId",
                    as: "visitor",
                    pipeline: [
                        {
                            $lookup:
                                {
                                    from: 'user_partners',
                                    localField: "userId",
                                    foreignField: "_id",
                                    as: "user",
                                    pipeline: [{$match: {role: 4}}],
                                }
                        },
                        {$unwind: "$user"}
                    ],
                }
        },
        {$unwind: "$agent"},
        {$unwind: "$visitor"},
    ]);

    if (chat) return {
        chatId: chat._id.toString(),
        agentName: chat.agent.user.name,
        agentId: chat.agent.user._id.toString(),
        visitorName: chat.visitor.user.name
    }
};

chatSchema.statics.getAgentRequests = async function (partnerId) {
    const chats = await this.find({partnerId: new Types.ObjectId(partnerId), status: 1});

    return chats.map(chat => chat._id.toString());
};

chatSchema.statics.getChat = async function (chatId, userId) {
    const objectUserId = new Types.ObjectId(userId);

    const [chat] = await this.aggregate(
        [
            {$match: {_id: new Types.ObjectId(chatId)}},
            {
                $lookup:
                    {
                        from: 'user_partners',
                        localField: "logs.userId",
                        foreignField: "_id",
                        as: "logUsers",
                    }
            },
            {
                $lookup:
                    {
                        from: 'chat_users',
                        localField: "_id",
                        foreignField: "chatId",
                        as: "user",
                        pipeline: [
                            {$match: {userId: objectUserId}},
                            {
                                $lookup:
                                    {
                                        from: 'user_partners',
                                        localField: "userId",
                                        foreignField: "_id",
                                        as: "userPartner"
                                    }
                            },
                            {$unwind: '$userPartner'}
                        ],
                    }
            },
            {
                $lookup:
                    {
                        from: 'chat_users',
                        localField: "_id",
                        foreignField: "chatId",
                        as: "users",
                        pipeline: [
                            {$match: {userId: {$ne: objectUserId}}},
                            {
                                $lookup:
                                    {
                                        from: 'user_partners',
                                        localField: "userId",
                                        foreignField: "_id",
                                        as: "userPartner",
                                        pipeline: [
                                            {
                                                $lookup:
                                                    {
                                                        from: 'widgets',
                                                        localField: "widgetId",
                                                        foreignField: "_id",
                                                        as: "widget"
                                                    }
                                            }
                                        ]
                                    }
                            }
                        ]
                    }
            },
        ]
    );

    return setChat(chat);
};

chatSchema.statics.getTeamLeadTransfers = async function (partnerId) {
    const chats = await this.aggregate([
        {$match: {partnerId: new Types.ObjectId(partnerId), status: 3}},
        {
            $lookup:
                {
                    from: 'chat_users', //todo chatId ov karox a lini
                    localField: "_id",
                    foreignField: "chatId",
                    as: "agent",
                    pipeline: [
                        {
                            $lookup:
                                {
                                    from: 'user_partners',
                                    localField: "userId",
                                    foreignField: "_id",
                                    as: "user",
                                    pipeline: [{$match: {role: {$ne: 4}}}],
                                }
                        },
                        {$unwind: "$user"}
                    ],
                }
        },
        {
            $lookup:
                {
                    from: 'chat_users',
                    localField: "_id",
                    foreignField: "chatId",
                    as: "visitor",
                    pipeline: [
                        {
                            $lookup:
                                {
                                    from: 'user_partners',
                                    localField: "userId",
                                    foreignField: "_id",
                                    as: "user",
                                    pipeline: [{$match: {role: 4}}],
                                }
                        },
                        {$unwind: "$user"}
                    ],
                }
        },
        {$unwind: "$agent"},
        {$unwind: "$visitor"},
    ]);

    return chats.map(chat => ({
        chatId: chat._id.toString(),
        agentName: chat.agent.user.name,
        visitorName: chat.visitor.user.name
    }));
};

chatSchema.statics.getAgentRecovers = async function (partnerId, userId) {
    const objectUserId = new Types.ObjectId(userId);
    const chats = await this.aggregate(
        [
            {$match: {partnerId: new Types.ObjectId(partnerId), status: {$in: [0, 2, 3, 4]}}},
            {
                $lookup:
                    {
                        from: 'user_partners',
                        localField: "logs.userId",
                        foreignField: "_id",
                        as: "logUsers",
                    }
            },
            {
                $lookup:
                    {
                        from: 'chat_users',
                        localField: "_id",
                        foreignField: "chatId",
                        as: "user",
                        pipeline: [
                            {$match: {userId: objectUserId}},
                            {
                                $lookup:
                                    {
                                        from: 'user_partners',
                                        localField: "userId",
                                        foreignField: "_id",
                                        as: "userPartner"
                                    }
                            },
                            {$unwind: '$userPartner'}
                        ],
                    }
            },
            {
                $lookup:
                    {
                        from: 'chat_users',
                        localField: "_id",
                        foreignField: "chatId",
                        as: "users",
                        pipeline: [
                            {$match: {userId: {$ne: objectUserId}}},
                            {
                                $lookup:
                                    {
                                        from: 'user_partners',
                                        localField: "userId",
                                        foreignField: "_id",
                                        as: "userPartner",
                                        pipeline: [
                                            {
                                                $lookup:
                                                    {
                                                        from: 'widgets',
                                                        localField: "widgetId",
                                                        foreignField: "_id",
                                                        as: "widget"
                                                    }
                                            }
                                        ],
                                    }
                            },
                        ],
                    }
            },
        ]
    );

    return chats.map(chat => setChat(chat));
};

chatSchema.statics.end = async function (chatId, status) {
    status = status < 2 ? 6 : 5;
    const {modifiedCount} = await this.updateOne({_id: chatId, status: {$nin: [5, 6]}}, {status});

    return modifiedCount ? status : undefined;
};

chatSchema.statics.setLog = async function (_id, userId, action) {
    return await this.updateOne({_id: _id}, {
        $push: {logs: {userId: userId, action: action, createdAt: new Date()}},
    });
};

chatSchema.statics.chatViewById = async function (chatId) {
    const [chat] = await this.aggregate(
        [
            {$match: {_id: new Types.ObjectId(chatId)}},
            {
                $lookup:
                    {
                        from: 'user_partners',
                        localField: "logs.userId",
                        foreignField: "_id",
                        as: "logUsers",
                    }
            },
            {
                $lookup:
                    {
                        from: 'chat_users',
                        localField: "_id",
                        foreignField: "chatId",
                        as: "user",
                        pipeline: [
                            {
                                $lookup:
                                    {
                                        from: 'user_partners',
                                        localField: "userId",
                                        foreignField: "_id",
                                        as: "userPartner",
                                        pipeline: [{$match: {role: {$in: [2, 3]}}}]
                                    }
                            },
                            {$unwind: '$userPartner'}
                        ]
                    }
            },
            {
                $lookup:
                    {
                        from: 'chat_users',
                        localField: "_id",
                        foreignField: "chatId",
                        as: "users",
                        pipeline: [
                            {
                                $lookup:
                                    {
                                        from: 'user_partners',
                                        localField: "userId",
                                        foreignField: "_id",
                                        as: "userPartner",
                                        pipeline: [
                                            {$match: {role: 4}},
                                            {
                                                $lookup:
                                                    {
                                                        from: 'widgets',
                                                        localField: "widgetId",
                                                        foreignField: "_id",
                                                        as: "widget"
                                                    }
                                            },
                                        ]
                                    }
                            },
                        ]
                    }
            },
        ]
    );

    return setChat(chat);
};

chatSchema.statics.getTeamLeadViews = async function (_ids) {
    const chats = await this.aggregate(
        [
            {$match: {status: {$nin: [4]}, _id: {$in: _ids}}},
            {
                $lookup:
                    {
                        from: 'chat_users',
                        localField: "_id",
                        foreignField: "chatId",
                        as: "agent",
                        pipeline: [
                            {
                                $lookup:
                                    {
                                        from: 'user_partners',
                                        localField: "userId",
                                        foreignField: "_id",
                                        as: "userPartner",
                                        pipeline: [{$match: {role: {$in: [2, 3]}}}]
                                    }
                            },
                            {$match: {'userPartner': {$ne: []}}}
                        ],
                    }
            },
            {
                $lookup:
                    {
                        from: 'chat_users',
                        localField: "_id",
                        foreignField: "chatId",
                        as: "visitor",
                        pipeline: [
                            {
                                $lookup:
                                    {
                                        from: 'user_partners',
                                        localField: "userId",
                                        foreignField: "_id",
                                        as: "userPartner",
                                        pipeline: [{$match: {role: 4}}]
                                    }
                            },
                            {$unwind: '$userPartner'}
                        ],
                    }
            },
            {$unwind: '$visitor'},
        ]
    );

    return chats.map(chat => ({
        _id: chat._id.toString(),
        status: chat.status,
        user: {
            _id: chat.agent[0]?.userId.toString(),
            name: chat.agent[0]?.userPartner[0]?.name,
        },
        companion: {
            _id: chat.visitor.userPartner._id.toString(), //todo petq chi erevi
            name: chat.visitor.userPartner.name
        }
    }));
};

chatSchema.statics.getMeiliSearchInfo = async function (chatId, visitorId) {
    const objectVisitorId = new Types.ObjectId(visitorId);

    const [chat] = await this.aggregate(
        [
            {$match: {_id: new Types.ObjectId(chatId)}},
            {
                $lookup:
                    {
                        from: 'chat_users',
                        localField: "_id",
                        foreignField: "chatId",
                        as: "visitor",
                        pipeline: [
                            {$match: {userId: objectVisitorId}},
                            {
                                $lookup:
                                    {
                                        from: 'user_partners',
                                        localField: "userId",
                                        foreignField: "_id",
                                        as: "userPartner"
                                    }
                            },
                            {$unwind: '$userPartner'}
                        ],
                    }
            },
            {$unwind: '$visitor'}
        ]
    );

    const logUsers = {};
    chat['logs'].forEach(({userId}) => {if(userId.toString() !== visitorId) logUsers[userId] = 1});

    return {
        agentsIds: Object.keys(logUsers),
        visitorName: chat.visitor.userPartner.name,
        createdAt: chat.createdAt.getTime()
    };
};

chatSchema.statics.createChat = async function (partnerId, status, file) {
    if(file === 3) file = 2;
    const {_id} = await this.create({partnerId: partnerId, status: status, file: file});

    return _id.toString();
};

chatSchema.statics.getChatStatus = async function (filter) {
    const chat = await this.findOne(filter);

    return parseInt(chat?.status);
};

chatSchema.statics.getChatById = async function (_id) {
    const chat = await this.findOne({_id: _id}).select('rating logs createdAt');

    return [chat.rating, chat.logs, chat.createdAt];
};

module.exports = model('Chat', chatSchema);
chatSchema.index({partnerId: 1});
chatSchema.index({status: 1});
module.exports.createIndexes();