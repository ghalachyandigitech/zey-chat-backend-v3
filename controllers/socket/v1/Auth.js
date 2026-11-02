const ipModel = require('../../../models/redis/ipModel');
const chatModel = require('../../../models/Chat');
const chatUserModel = require('../../../models/ChatUser');
const userPartnerModel = require('../../../models/UserPartner');

module.exports = function(partner){
    this.setAdmins = async function(views){
        return {
            request: partner.request,
            views: await chatModel.getTeamLeadViews(views),
            visitors: partner.getVisitors(),
            file: partner.file,
        };
    };

    this.setTeamLeads = async function(agent, views){
        agent.request = partner.request;
        agent.views = await chatModel.getTeamLeadViews(views);
        agent.visitors = partner.getVisitors();
        agent.transfers = await chatModel.getTeamLeadTransfers(partner.id, agent._id);
    };

    this.setAgents = async function(socketId, userPartner, auth, chatRecover){
        const agent = {
            '_id': auth['userId'],
            'id': socketId,
            'name': userPartner.name,
            'status': userPartner.status,
            'role': ['', '', 'team-leads', 'agents'][userPartner.role],
            'visitors': new Set(),
            'disconnected': 0
        };

        partner.users.set('agents', auth['userId'], agent);
        partner.io.to(partner.id).emit('agents.update.status', [agent._id, agent.status, agent.name, agent.role]);

        const recovers = await chatModel.getAgentRecovers(partner.id, auth['userId']);
        recovers.forEach(chat => {chatRecover(chat, 'agents');});

        return {
            status: userPartner.status,
            messageFlag: userPartner.messageFlag,
            requestFlag: userPartner.requestFlag,
            requests: await chatModel.getAgentRequests(partner.id)
        };
    };

    this.setVisitor = async function(socketId, {auth, headers}, {['user-agent']: userAgent}){
        const location = {};
        const xForwardedFor = headers['x-forwarded-for'];
        let role;
        let visitor = partner.users.getVisitor(auth['userId']);

        if(!visitor){
            visitor = await userPartnerModel.getCreateVisitor(auth, partner.id, auth['referrer']);
            partner.users.set('disconnected-visitors', visitor._id, visitor);
        }

        auth['userId'] = visitor._id;

        if(visitor.userAgent !== userAgent) location.userAgent = userAgent;

        if(xForwardedFor && visitor.ip !== xForwardedFor){
            const [country, city, countryCode] = await ipModel.findIp(xForwardedFor);

            location.ip = xForwardedFor;
            location.location = country + ' ' + city;
            location.countryCode = countryCode;
        }

        if(Object.keys(location).length) await userPartnerModel.updateVisitorLocation(visitor._id, location);

        if(visitor.banExpire && visitor.banExpire < new Date()){
            await userPartnerModel.updateOne({_id: visitor._id}, {$unset: {banExpire: ''}});
            partner.io.to('admins').emit('permission.ban.set', ['', visitor._id]);
            visitor.banExpire = '';
        }

        [visitor, role] = partner.updateVisitor(visitor._id, {id: socketId, banExpire: visitor.banExpire, ...location});
        if(partner.io.sockets.get(socketId)) {
            partner.visitorUpdateRoleManual(visitor._id, role === 'disconnected-visitors' ? 'active' : role);

            return {_id: visitor._id, banExpire: visitor.banExpire, chatId: visitor.chatId};
        }
    };

    this.disconnectingVisitor = async function(){
        const {userId} = this.handshake.auth;

        if(this.id !== partner.users.getParam('visitors', userId, 'id')) return;

        partner.visitorUpdateRoleAuto(userId, 'disconnected-visitors');
    };

    this.disconnectingAgent = function(){
        const {userId} = this.handshake.auth;

        if(this.id !== partner.users.getParam('agents', userId, 'id')) return;

        const agent = partner.updateAgent(userId, {pointer: 'disconnected-agents', disconnected: Date.now()});
        partner.deleteRelations(agent);
    };

    async function logout(userId, status){
        const agent = partner.users.get('agents', userId);
        if(agent){
            partner.socketDisconnect('agents', userId);
            partner.deleteRelations(agent);
        }

        await userPartnerModel.updateOne({partnerId: partner.id, _id: userId}, {status: status, views: [], token: ''});

        partner.io.to(partner.id).emit('agents.update.status', [userId, status]);
    }

    this.agentsInactive = async function([userId, status]){
        if(![0,1].includes(status*1)) return;

        logout(userId, status*1);
    };

    this.agentsLogout = async function(userId){
        const {status} = await userPartnerModel.findOne({_id: userId});
        if(status > 0) logout(userId, 1);
    };

    this.logout = function(){
        const {userId} = this.handshake.auth;

        const socket = partner.io.sockets.get(this.id);
        if(socket) socket.removeAllListeners();

        logout(userId, 1);
    }
};