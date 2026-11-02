const {createClient} = require('redis');

module.exports = {
    client: null,
    async connect(url){
        this.client = await createClient({url: url}).connect();
    }
};