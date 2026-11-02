const { IPinfoWrapper, LruCache } = require("node-ipinfo");
const { IP_INFO_TOKEN } = process.env;

const cache = new LruCache({ max: 100000, ttl: 60 * 60 * 24 * 1000});

const getIpInfo = async (ip) => {
    try {
        if (ip.substr(0, 7) === "::ffff:") ip = ip.substr(7);

        const ipinfo = new IPinfoWrapper(IP_INFO_TOKEN, cache);

        const {country, city, countryCode} = await ipinfo.lookupIp(ip);
        return {country, city, countryCode};
    }catch (e) {//todo set log
        return {country: '', city: '', countryCode: ''}
    }
};

module.exports = getIpInfo;