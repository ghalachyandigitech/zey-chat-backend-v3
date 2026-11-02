const redis = require('../../core/Redis');
const getIpInfo = require('../../helpers/ipHelper');

module.exports = {
    async deleteIpAddress(ip){
        await redis.client.sendCommand(['SREM', 'ip-addresses', `${ip}`]);
        await redis.client.sendCommand(['DEL', `${ip}`]);

        return true;
    },

    getIpAddresses(){
        return redis.client.sendCommand(['SMEMBERS', 'ip-addresses']);
    },

    async getIpAddressDate(ip){
        const [,,,date] = await redis.client.sendCommand(['HVALS', `${ip}`]);

        return 1*date;
    },

    async findIp(ip){
        const ipInfo = await redis.client.sendCommand(['HVALS', `ip${ip}`]);
        if(!ipInfo.length){
            const {country, city, countryCode} = await getIpInfo(ip);
            await redis.client.sendCommand(['HSET', `ip${ip}`,
                `country`, country.toString(),
                `city`, city.toString(),
                `countryCode`, countryCode.toString()
            ]);

            await redis.client.sendCommand(['SADD', 'ip-addresses', `ip${ip}`]);

            ipInfo.push(country, city, countryCode);
        }

        await redis.client.sendCommand(['HSET', `ip${ip}`,
            `date`, Date.now().toString()
        ]);

        return ipInfo;
    }
};