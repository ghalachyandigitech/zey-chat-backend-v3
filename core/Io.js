const Partner = require('./Partner');
const Auth = require('../controllers/socket/v1/Auth');
const Chats = require('../controllers/socket/v1/Chats');
const Users = require('../controllers/socket/v1/Users');
const Message = require('../controllers/socket/v1/Message');
const Permission = require('../controllers/socket/v1/Permission');
const {partnerCron, ipCron} = require('../controllers/socket/v1/Cron');
const partnerModel = require('../models/Partner');
const widgetModel = require('../models/Widget');
const userPartnerModel = require('../models/UserPartner');
const {IP_ADDRESSES_CRON_INTERVAL, CRON_DISCONNECT_AGENTS_INTERVAL, CRON_DISCONNECT_VISITORS_INTERVAL, CRON_AUTO_ANSWER_INTERVAL, CRON_MEILI_SEARCH_TASKS_INTERVAL} = process.env;

let io = null;
const partners = {};

exports.Io = async function(server){
    console.log(new Date());
    io = server;
    io._nsps.delete('/');

    setInterval(() => ipCron(), IP_ADDRESSES_CRON_INTERVAL);

    const partners = await partnerModel.getPartnersIoData();
    partners.forEach(async partner => {
        exports.createIo(partner, await widgetModel.getPartnerWidgets(partner._id))
    });
};

exports.deleteIo = function(partnerId){
    const partner = partners[partnerId];
    if(!partner) return;

    partner.io.local.disconnectSockets();
    partner.io.server._nsps.delete('/' + partnerId);
    delete partners[partnerId];
};

exports.getPartner = function (partnerId){
    return partners[partnerId];
};

exports.updatePartnerWidget = function(partnerId, widgetId, widget){
    const partner = partners[partnerId];
    if(partner) partner.widgets[widgetId] = widget;
};

exports.updatePartnerMeta = function(partnerId, meta){
    const partner = partners[partnerId];
    if(partner) partner.meta = meta;
};

exports.deletePartnerWidget = function(partnerId, widgetId){
    const partner = partners[partnerId];
    if(partner) delete partner.widgets[widgetId];
};

exports.logoutPartnerAgents = function(partnerId, userId){
    const partner = partners[partnerId];
    if(partner) partner.authAgentsLogout(userId);
};

exports.createIo = async function({_id, file, meta, request, name, activeChats, visitors}, widgets){
    const partnerIo = io.of(_id);
    const partner = new Partner(partnerIo, file, request, name, activeChats, visitors, widgets, meta);
    const auth = new Auth(partner);
    const chats = new Chats(partner);
    const users = new Users(partner, chats.setAutoAnswer);
    const message = new Message(partner);
    const permissions = new Permission(partner);
    const cron = new partnerCron(partner, chats.setAutoAnswer, auth.agentsLogout);

    setInterval(() => {cron.disconnectAgents()}, CRON_DISCONNECT_AGENTS_INTERVAL);
    setInterval(() => {cron.disconnectVisitors()}, CRON_DISCONNECT_VISITORS_INTERVAL);
    setInterval(() => {cron.autoAnswer()}, CRON_AUTO_ANSWER_INTERVAL);
    setInterval(() => {cron.meiliSearchTasks()}, CRON_MEILI_SEARCH_TASKS_INTERVAL);

    partnerIo.on('connection', async function(socket){
        const {role, userId, widgetId} = socket.handshake.auth;

        if(role === 'visitors'){
            const widget = partner.widgets[widgetId];
            if(!widget) return socket.disconnect();

            const user = await auth.setVisitor(socket.id, socket.handshake, socket.request.headers);
            if(!user) return socket.disconnect();

            socket.emit('user.update', [!user.banExpire, user._id, partner.file, widget, partner.meta]);
            if(user.chatId) chats.recoverById(user.chatId, 'visitors', user._id);

            socket.on('chats.set', chats.set);
            socket.on('chats.end', chats.end);
            socket.on('chats.rate', chats.rate);
            socket.on('message.read', message.read);
            socket.on('message.delivered', message.delivered);
            socket.on('message.page', message.page);
            socket.on('message.typing', message.typing);
            socket.on('message.set', message.set);
            socket.on('visitors.update.role', users.visitorUpdateRole);
            socket.on('visitors.update.referrer', users.visitorUpdateReferrer);
            socket.on('disconnecting', auth.disconnectingVisitor);
        }else if(role === 'agents' || role === 'team-leads' || role === 'admins'){
            partner.users['disconnected-agents'].delete(userId);

            const userPartner = await userPartnerModel.findUser(userId);
            if(!userPartner) return socket.disconnect();

            let user;
            if(role === 'agents' || role === 'team-leads'){
                user = await auth.setAgents(socket.id, userPartner, socket.handshake.auth, chats.recover);

                socket.join('agents');
                socket.on('chats.get', chats.get);
                socket.on('chats.end', chats.end);
                socket.on('chats.transfer.set', chats.transferSet);
                socket.on('chats.internal.set', chats.internalSet);
                socket.on('permission.file', permissions.chatFile);
                socket.on('message.set', message.set);
                socket.on('message.page', message.page);
                socket.on('message.read', message.read);
                socket.on('message.typing', message.typing);
                socket.on('agents.update.status', users.updateStatus);
                socket.on('disconnecting', auth.disconnectingAgent);
                socket.on('logout', auth.logout);
            }

            if(role === 'team-leads' || role ==='admins'){
                socket.join('admins');
                socket.on('permission.ban', permissions.ban);
                socket.on('chats.view', chats.view);
                socket.on('chats.view.end', chats.viewEnd);
                socket.on('admins.set.request', permissions.setRequest);
                socket.on('agents.logout', auth.agentsLogout);
            }

            if(role === 'team-leads'){
                await auth.setTeamLeads(user, userPartner.views);

                socket.join('team-leads');
                socket.on('chats.transfer.offer', chats.transferOffer);
            }

            if(role === 'admins'){
                user = await auth.setAdmins(userPartner.views);

                socket.on('agents.inactive', auth.agentsInactive);
            }

            socket.on('get.visitors', users.getVisitor);
            socket.on('update.visitors', users.updateVisitor);

            socket.join(partner.id);
            socket.emit('user.update', [user, partner.getAgents(), partner.file]);  //todo partner file karox a petq chi
        }else{
            socket.disconnect();
        }
    });

    partner.authAgentsLogout = auth.agentsLogout;
    partners[_id] = partner;
};