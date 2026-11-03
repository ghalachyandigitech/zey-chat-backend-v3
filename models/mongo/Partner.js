const {Schema, model} = require('mongoose');
const chatUserModel = require('./ChatUser');

// const file = ["disable", "manual-disable", "enable", "manual-enable"];
// const request = ['auto', 'manual'];
// const status = ['inactive','active'];

const partnerSchema = new Schema({
    name: {type: String},
    file: {type: Number},
    request: {type: Number},
    status: {type: Number},
    dashboardImage: {type: String},
    key: {type: String}
}, {versionKey: false, timestamps: {createdAt: 'createdAt', updatedAt: 'updatedAt'}});

async function setPartner(partner){
    const visitors = {assigned: [], incoming: [], served: []};
    const chats = [];
    for(const chat of partner.chats){
        const partnerChat = [chat._id.toString(), []];
        const visitor = {};
        for(const user of chat.users){
            if(chat.status >= 2 || user.info.role === 4) partnerChat[1].push(user.info._id.toString());
            if(chat.status !== 4){
                if(user.info.role === 4){
                    visitor._id = user.info._id.toString();
                    visitor.name = user.info.name;
                    visitor.chatId = chat._id.toString();
                    visitor.countryCode = user.info.countryCode;
                    visitor.ip = user.info.ip;
                    visitor.userAgent = user.info.userAgent;
                    visitor.referrer = user.info.referer;
                    visitor.banExpire = user.info.banExpire;
                    visitor.pastChats = await chatUserModel.countDocuments({userId: visitor._id});
                    visitor.roleCreated = chat.logs[1] ? chat.logs[1].createdAt: chat.logs[0].createdAt;
                }else{
                    visitor.companionId = user.info._id.toString();
                }
            }
        }

        partnerChat[1].filter(userId => userId !== undefined);
        chats.push(partnerChat);
        if(chat.status !== 4) visitors[['assigned', 'incoming', 'served', 'served'][chat.status]].push([visitor._id, visitor]);
    }

    return [chats, visitors];
}

partnerSchema.statics.getPartnerIoData = async function(partnerId){
    const objectPartnerId = new Types.ObjectId(partnerId);
    const [partner] = await this.aggregate(
        [
            {$match: {_id: objectPartnerId}},
            {$lookup:
                    {
                        from: 'chats',
                        localField: "_id",
                        foreignField: "partnerId",
                        as: "chats",
                        pipeline: [
                            {$match: {status: {$in: [0,1,2,3,4]}}},
                            {$lookup:
                                    {
                                        from: 'chat_users',
                                        localField: "_id",
                                        foreignField: "chatId",
                                        as: "users",
                                        pipeline: [
                                            {$lookup:
                                                    {
                                                        from: 'user_partners',
                                                        localField: "userId",
                                                        foreignField: "_id",
                                                        as: "info",
                                                    }
                                            },
                                            {$unwind: '$info'}
                                        ]
                                    }
                            }
                        ]
                    },
            },
        ]
    );

    const [chats, visitors] = await setPartner(partner);
    return {
        _id: partner._id.toString(),
        file: partner.file,
        meta: partner.meta,
        name: partner.name,
        request: partner.request,
        activeChats: chats,
        visitors: visitors
    }
};

partnerSchema.statics.getPartnersIoData = async function(){
    const partners = await this.aggregate(
        [
            {$match: {status: 1}},
            {$lookup:
                    {
                        from: 'chats',
                        localField: "_id",
                        foreignField: "partnerId",
                        as: "chats",
                        pipeline: [
                            {$match: {status: {$in: [0,1,2,3,4]}}},
                            {$lookup:
                                    {
                                        from: 'chat_users',
                                        localField: "_id",
                                        foreignField: "chatId",
                                        as: "users",
                                        pipeline: [
                                            {$lookup:
                                                    {
                                                        from: 'user_partners',
                                                        localField: "userId",
                                                        foreignField: "_id",
                                                        as: "info",
                                                    }
                                            },
                                            {$unwind: '$info'}
                                        ]
                                    }
                            }
                        ]
                    },
            },
        ]
    );

    const result = [];
    for(const partner of partners){
        const [chats, visitors] = await setPartner(partner);
        result.push({
            _id: partner._id.toString(),
            file: partner.file,
            meta: partner.meta,
            name: partner.name,
            request: partner.request,
            activeChats: chats,
            visitors: visitors
        });
    }

    return result;
};

partnerSchema.statics.getPartners = async function(){
    const partners = await this.find({});

    return partners.map(partner => ({
        _id: partner._id,
        name: partner.name,
        status: partner.status,
        file: partner.file
    }))
};

partnerSchema.statics.getPartnersIndexed = async function(partnersIds){
    const partnersIndexed = {};
    const partners = await this.find({_id: {$in: partnersIds}}).select('name key');

    partners.forEach(partner => {
        partnersIndexed[partner._id] = {
            name: partner.name,
            key: partner.key
        };
    });

    return partnersIndexed;
};

module.exports = model('Partner', partnerSchema);