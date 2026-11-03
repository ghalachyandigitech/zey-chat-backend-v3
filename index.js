require('dotenv').config();

const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser');
// const {setError} = require('./helpers/logHelper');
const redis = require('./core/Redis');
const {Server} = require("socket.io");
const {Io} = require('./core/Io');
const routes = require('./routes/api/v1/index');
const meiliSearch = require('./core/MeiliSearch');
const { MONGODB_URI, PORT, STATIC_PATH, REDIS_URI, MEILI_SEARCH_URI, MEILI_SEARCH_KEY } = process.env;
const SOCKET_MAX_BUFFER_SIZE = parseInt(process.env.SOCKET_MAX_BUFFER_SIZE);
require('./core/Response');

const app = express();

app.use(bodyParser.json({limit: '50mb'}));
app.use(cors({origin: '*'}));
app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({ createParentPath: true }));
app.use(express.static(`${__dirname}/${STATIC_PATH}`));
app.use('/api/v1', routes);

const server = require('http').createServer(app);

(async () => {
    await mongoose.connect(MONGODB_URI, {/*socketTimeoutMS: 10000,*/maxPoolSize: 10});
    await redis.connect(REDIS_URI);
    await meiliSearch.connect(MEILI_SEARCH_URI, MEILI_SEARCH_KEY);

    Io(new Server(server, {maxHttpBufferSize: SOCKET_MAX_BUFFER_SIZE, cors: {origin: "*", methods: ["GET", "POST"]}}));

    server.listen(PORT, () => console.log(`Server is running in ${PORT}`));

    process.on('uncaughtException', err => {
        // express.response.json({test: 1});
        console.log(err)
    });
})();
