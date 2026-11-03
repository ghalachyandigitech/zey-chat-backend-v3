const userPartnerModel = require('../../../models/mongo/UserPartner');
const chatModel = require('../../../models/mongo/Chat');
const autoAnswerModel = require('../../../models/redis/autoAnswerModel');

module.exports = function(partner, setAutoAnswer){
    this.updateVisitor = async function([userPartnerId, data]){
        const {role} = this.handshake.auth;
        const {note} = data;

        await userPartnerModel.updateOne({_id: userPartnerId}, {note: note});

        partner.io.to('admins').emit('update.visitors', [userPartnerId, data]);
        if(role === 'agents') this.emit('update.visitors', [userPartnerId, data]);
    };

    this.getVisitor = async function(userId){
        this.emit('get.visitors', await userPartnerModel.getVisitor(partner.id, userId))
    };

    this.updateStatus = async function(status){
        status = parseInt(status);
        if(![2,3,4].includes(status)) return;

        const {userId} = this.handshake.auth;
        await userPartnerModel.updateOne({_id: userId}, {status: status});

        const agent = partner.updateAgent(userId, {status: status});

        if(status === 2) partner.deleteRelations(agent);
        partner.io.to(partner.id).emit('agents.update.status', [userId, status, agent.name, agent.role]);

        if(partner.request === 0 && status === 4){
            const chat = await chatModel.findOne({partnerId: partner.id, status: 1});
            if(chat){
                const chatId = chat._id.toString();

                autoAnswerModel.deleteAutoAnswer(partner.id, chatId);
                setAutoAnswer(chatId, 1, '', userId);
            }
        }
    };

    this.visitorUpdateRole = function(idle){
        const {userId} = this.handshake.auth;

        partner.visitorUpdateRoleAuto(userId, idle ? 'idle' : 'active');
    };

    this.visitorUpdateReferrer = async function(referrer){
        const {userId} = this.handshake.auth;
        const lastReferrer = partner.users.getParam('visitors', userId, 'referrer');

        if(lastReferrer !== referrer){
            await userPartnerModel.updateOne({_id: userId}, {$push: {referrers: referrer}});
            const [visitor] = partner.updateVisitor(userId, {referrer: referrer});
            partner.io.to('admins').emit('visitors.update', [visitor, ''])
        }
    };
};