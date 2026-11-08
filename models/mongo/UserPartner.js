const { Types, Schema, model } = require('mongoose');

const ROLE = {
    'super-admin': 0,
    'admin': 1,
    'team-lead': 2,
    'agent': 3,
    'visitor': 4
};

const STATUS = {
    'inactive': 0,
    'offline': 1,
    'invisible': 2,
    'away': 3,
    'online': 4
};

const userPartnerSchema = new Schema({
    name: {type: String},
    token: {type: String},
    tagLine: { type: String },
    userId: { type: Types.ObjectId, ref: 'User'},
    partnerId: {type: Types.ObjectId, ref: 'Partner'},
    widgetId: {type: Types.ObjectId, ref: 'Widget'},
    role: {type: Number, required: true},
    status: {type: Number, required: true},
    dashboardImage: {type: String},
    profileImage: {type: String},
    note: { type: String },
    countryCode: { type: String },
    ip: { type: String },
    location: { type: String },
    referrers: [String],
    userAgent: { type: String },
    visits: { type: Number },
    banExpire: { type: Date },
    banUpdatedAt: { type: Date },
    banReason: { type: String },
    limit: { type: Number },
    views: [Types.ObjectId],
    requestFlag: { type: Number },
    messageFlag: { type: Number },
}, {versionKey: false, timestamps: {createdAt:'createdAt', updatedAt:'updatedAt'}});

userPartnerSchema.statics.getPartnersAdmins = async function() {
    const partnersAdmins = {};
    const userPartners = await this.find({role: 1});

    userPartners.forEach(userPartner => {
        const _id = userPartner.partnerId;
        if(!partnersAdmins[_id]) partnersAdmins[_id] = [];

        partnersAdmins[_id].push(userPartner.userId);
    });

    return partnersAdmins;
};

userPartnerSchema.statics.getAgents = async function(partnerId){ //todo changed getAllUsers
    const userPartners = await this.aggregate([
        { $match: {partnerId: new Types.ObjectId(partnerId), role: {$in: [2,3]}}},
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user',
            }
        },
        { $unwind: "$user" }
    ]);

    return userPartners.map(userPartner => ({
        userPartnerId: userPartner._id,
        name: userPartner.name,
        email: userPartner.user.email,
        role: userPartner.role,
        status: userPartner.status,
        limit: userPartner.limit
    }));
};

userPartnerSchema.statics.createAgent = async function (partnerId, userId, {role, limit, name}){
    const agent = await this.create({
        partnerId: partnerId,
        userId: userId,
        role: role,
        limit: limit,
        name: name,
        status: 0,
        requestFlag: 0,
        messageFlag: 0
    });

    return {
        userPartnerId: agent._id,
        name: agent.name,
        role: agent.role,
        status: agent.status,
        limit: agent.limit
    }
};

userPartnerSchema.statics.getVisitor = async function(partnerId, _id) {
    return await this.findOne({partnerId, _id, role: 4})
        .select('userId name note country countryCode ip location visits referrers userAgent banExpire banReason')
        .populate({path: 'userId', model: 'User', select: 'email phone -_id'})
        .lean().then(user=> {
            return {
                _id: user._id,
                name: user.name,
                note: user.note,
                country: user.country,
                countryCode: user.countryCode,
                ip: user.ip,
                location: user.location,
                visits: user.visits,
                userAgent: user.userAgent,
                banReason: user.banReason || '',
                banExpire: user.banExpire || '',
                referrers: user.referrers,
                ...user.userId
            }
        });
};

userPartnerSchema.statics.getBannedVisitors = async function(partnerId) {
    return await this.find(
        {partnerId: partnerId, role: 4, banExpire: {$gte: new Date()}},
        'name banReason banUpdatedAt'
    );
};

userPartnerSchema.statics.getLogUsers = async function(userPartnerIds){
    const userPartners = await this.find({_id: {$in: userPartnerIds}}).select('name');

    return userPartners.reduce((acc, v) => {acc[v._id] = v.name; return acc}, {});
};

userPartnerSchema.statics.createVisitor = async function(partnerId, widgetId, referrer){
    const userModel = require('./User');
    const user = await userModel.create({});
    const name = Math.floor(Math.random() * 1000000000).toString();

    const {_id} = await this.create({
        partnerId: partnerId,
        userId: user._id.toString(),
        role: 4,
        status: 2,
        userAgent: '',
        name: name,
        widgetId: widgetId,
        referrers: [referrer]
    });

    return {
        _id: _id.toString(),
        ip: '',
        userAgent: '',
        name: name,
        referrer: referrer,
        pastChats: 0,
        created: Date.now()
    }
};

userPartnerSchema.statics.autoConnect = async function(partnerId, chatId, lastUserId){
    const chatModel = require('./Chat.js');
    const chatUserModel = require('./ChatUser.js');

    let freeAgents = [];
    let minLimit = Infinity;

    let agentsAssignedIds = await chatUserModel.find({
        chatId: {$in: (await chatModel.find({status: {$in: [0]}, partnerId: partnerId}, '_id')).map(chat => chat._id)}
    });
    agentsAssignedIds = agentsAssignedIds.map(chatUser => chatUser.userId.toString());

    const agents = await this.aggregate([
        {$match: {
                partnerId: new Types.ObjectId(partnerId), status: 4,
                $or: [{role: 2}, {role: 3}],
            }},
        {$lookup: {
                from: 'chat_users',
                localField: "_id",
                foreignField: "userId",
                as: "chatUsers",
                pipeline:[{$match: {
                        chatId: {$in: (await chatModel.find({status: {$in: [2]}, partnerId: partnerId}, '_id')).map(chat => chat._id)}}
                }],
            }},
    ]);

    agents.forEach(agent => {
        const agentId = agent._id.toString();
        if(agentId === lastUserId || agentsAssignedIds.includes(agentId)) return;

        const served = agent.chatUsers.length;

        if(agent.limit <= served) return;

        if(minLimit > served){
            minLimit = served;
            freeAgents = [agentId];
        }else if(minLimit === served){
            freeAgents.push(agentId);
        }
    });

    return freeAgents.length ? freeAgents[Math.floor(Math.random()*freeAgents.length)]: '';
};

userPartnerSchema.statics.findUser = async function(userPartnerId){
    return this.findOne(
        {_id: userPartnerId, status: {$gt: 1}, role: {$in: [1, 2, 3]}},
        'name role status requestFlag messageFlag views'
    );
};

userPartnerSchema.statics.updateVisitorLocation = async function(userId, visitor){
    return this.updateOne({_id: userId}, visitor);
};

userPartnerSchema.statics.getCreateVisitor = async function({userId, widgetId}, partnerId, referrer){
    let visitor = await this.findVisitor(userId);
    if(!visitor) visitor = await this.createVisitor(partnerId, widgetId, referrer);

    return visitor;
};

userPartnerSchema.statics.findVisitor = async function(userId){
    if(!Types.ObjectId.isValid(userId)) return;

    const [visitor] = await this.aggregate([
        {$match: {_id: new Types.ObjectId(userId)}},
        {$lookup:
            {
                from: 'chat_users',
                localField: "_id",
                foreignField: "userId",
                as: "chatUsers",
                pipeline:[
                    {$lookup:
                        {
                            from: 'chats',
                            localField: "chatId",
                            foreignField: "_id",
                            as: "chats",
                            pipeline: [{$match: {status: {$in: [5, 6]}}}]
                        }
                    },
                    {$match: {chats: {$ne: []}}}
                ],
            }
        },
    ]);

    if(visitor) return {
        _id: visitor._id.toString(),
        name: visitor.name,
        countryCode: visitor.countryCode,
        ip: visitor.ip,
        userAgent: visitor.userAgent,
        referrer: visitor.referrers[visitor.referrers.length-1],
        banExpire: visitor.banExpire,
        pastChats: visitor.chatUsers.length,
        created: Date.now()
    }
};

userPartnerSchema.statics.getMeiliSearchInfo = async function(_ids){
    const userPartners = await this.find({_id: {$in: _ids}}, 'name');

    return {
        agentsNames: userPartners.map(({name}) => name)
    }
};

userPartnerSchema.statics.getAgentsIdsByName = async function(partnerId, name){
    const agents = await this.find({partnerId: partnerId, $text: {$search: name}, role: {$in: [2,3]}}, '_id');

    return agents.map(({_id}) => _id.toString());
};

userPartnerSchema.statics.getUserPartnersIndexed = async function(userId){
    const userPartnersIndexed = {};
    const userPartners = await this.find({userId: userId, status: {$in: [1,2,3,4]}}).select('status partnerId role');

    userPartners.forEach(userPartner => {
        userPartnersIndexed[userPartner._id] = {
            partnerId: userPartner.partnerId,
            loginStatus: userPartner.status < 2 ? 2 : userPartner.status,
            role: userPartner.role
        };
    });

    return userPartnersIndexed;
};

module.exports = model("User_partner", userPartnerSchema);
userPartnerSchema.index({name: 'text'});
module.exports.createIndexes();