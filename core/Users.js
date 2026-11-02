module.exports = class Users{
    constructor(visitors){
        this['idle'] = new Map();
        this['active'] = new Map();
        this['served'] = new Map(visitors.served);
        this['assigned'] = new Map(visitors.assigned);
        this['incoming'] = new Map(visitors.incoming);
        this['disconnected-visitors'] = new Map();

        this['agents'] = new Map();
        this['disconnected-agents'] = new Map();
    }

    getParam(role, id, param){
        const user = this.get(role, id);
        if(user) return user[param];

        return '';
    }

    getVisitor(id){
        for(const role of ['served', 'incoming', 'assigned', 'active', 'idle', 'disconnected-visitors']){
            const user = this[role].get(id);
            if(user) return user;
        }
    }

    get(role, id){
        if(role === 'visitors'){
            for(const role of ['served', 'incoming', 'assigned', 'active', 'idle']){
                const user = this[role].get(id);
                if(user) return user;
            }
        }else if(role === 'agents'){
            for(const role of ['agents', 'disconnected-agents']){
                const user = this[role].get(id);
                if(user) return user;
            }
        }
    }

    set(role, id, data){
        this[role].set(id, data);
    }

    delete(role, id){
        if(role === 'agents'){
            for(const role of ['agents', 'disconnected-agents']){
                if(this[role].has(id)) return this[role].delete(id);
            }
        }else{
            this[role].delete(id);
        }
    }
};