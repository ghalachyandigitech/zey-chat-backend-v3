const Users = require('./Users');

module.exports = class Partner{
    constructor(io, file, request, name, chats, visitors, widgets, meta){
        this.id = io.name.slice(1);
        this.io = io;
        this.file = file;
        this.meta = meta || 0;
        this.name = name;
        this.request = request;
        this.widgets = widgets;

        this.users = new Users(visitors);
        this['chats'] = new Map(chats);
        this['visitorsAgents'] = new Map();
    }

    companionId(chatId, userId){
        const chat = this['chats'].get(chatId);

        return chat.findLast(id => id !== userId) || 'agents';
    }

    createRelation(visitorId, agentId){
        const agent = this.users['agents'].get(agentId);
        if(!agent) return;

        this['visitorsAgents'].set(visitorId, agentId);
        agent['visitors'].add(visitorId);
    }

    deleteRelations(agent){
        agent['visitors'].forEach(userId => this['visitorsAgents'].delete(userId));
        agent['visitors'].clear();
    }

    deleteRelation(agentId, visitorId){
        const id = this['visitorsAgents'].get(visitorId);
        if(id === agentId){
            this.users.get('agents', agentId)['visitors'].delete(visitorId);
            this['visitorsAgents'].delete(visitorId);
        }
    }

    socketDisconnect(role, id){
        const socket = this.io.sockets.get(this.users.getParam(role, id, 'id'));
        this.users.delete(role, id);

        if(socket) socket.removeAllListeners();
    }

    joinToRoom(roomId, role, id){
        const socket = this.io.sockets.get(this.users.getParam(role, id, 'id'));
        if(socket) socket.join(roomId);
    }

    leaveRoom(roomId, role, id){
        const socket = this.io.sockets.get(this.users.getParam(role, id, 'id'));
        if(socket) socket.leave(roomId);
    }

    emitTo(role, id, eventName, data){
        this.io.to(this.users.getParam(role, id, 'id')).emit(eventName, data);
    }

    updateAgent(id, data){
        for(const pointer of ['agents', 'disconnected-agents']){
            const agent = this.users[pointer].get(id);
            if(agent){
                for(const [key, value] of Object.entries(data)) agent[key] = value;

                if(data.pointer && data.pointer !== pointer){
                    this.users[pointer].delete(id);
                    this.users.set(data.pointer, id, agent);
                }

                return agent;
            }
        }
    }

    visitorUpdateRoleAuto(id, newRole){
        for(const role of ['active', 'idle']){
            const visitor = this.users[role].get(id);
            if(visitor){
                visitor.roleUpdated = Date.now();
                this.users[role].delete(id);
                this.users.set(newRole, id, visitor);

                this.io.to('admins').emit('visitors.update', [visitor, newRole]);

                break;
            }
        }
    }

    visitorUpdateRoleManual(id, newRole){
        for(const role of ['served', 'active', 'incoming', 'assigned', 'idle', 'disconnected-visitors']){
            const visitor = this.users[role].get(id);

            if(visitor){
                this.users[role].delete(id);
                if(newRole !== 'disconnected-visitors') this.users.set(newRole, id, visitor);

                this.io.to('admins').emit('visitors.update', [visitor, newRole]);

                break;
            }
        }
    }

    updateVisitor(id, data){
        for(const role of ['served', 'active', 'incoming', 'assigned', 'idle', 'disconnected-visitors']){
            const visitor = this.users[role].get(id);
            if(visitor){
                for(const [key, value] of Object.entries(data)){
                    if(key === 'pastChats') visitor['pastChats']++;
                    else visitor[key] = value;
                }

                return [visitor, role];
            }
        }
    }

    getAgents(){
        return [
            ...this.users['agents'].values(), //todo lriv datan petq chi
            ...this.users['disconnected-agents'].values()
        ];
    }

    getVisitors(){
        return {
            'idle': Array.from(this.users['idle'].values()),
            'active': Array.from(this.users['active'].values()),
            'served': Array.from(this.users['served'].values()),
            'incoming': Array.from(this.users['incoming'].values()),
            'assigned': Array.from(this.users['assigned'].values())
        }
    }
};