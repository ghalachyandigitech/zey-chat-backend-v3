const {WIDGET_MAIN_PATH} = process.env;
const widgetModel = require("../../../models/mongo/Widget");
const {validationResult} = require('express-validator');
const {updatePartnerWidget, deletePartnerWidget} = require('../../../core/Io');

const script = `<script>function _0x2b5f(_0x3b8609,_0x1b7aac){var _0x5eac8f=_0x5eac();return _0x2b5f=function(_0x2b5f3c,_0x3f0354){_0x2b5f3c=_0x2b5f3c-0xdc;var _0xccbca=_0x5eac8f[_0x2b5f3c];return _0xccbca;},_0x2b5f(_0x3b8609,_0x1b7aac);}(function(_0x485c45,_0x6dd9b3){var _0x43280f=_0x2b5f,_0x4c3555=_0x485c45();while(!![]){try{var _0x5ba069=-parseInt(_0x43280f(0xe3))/0x1+parseInt(_0x43280f(0xe4))/0x2+parseInt(_0x43280f(0xe9))/0x3+parseInt(_0x43280f(0xdf))/0x4+parseInt(_0x43280f(0xde))/0x5*(-parseInt(_0x43280f(0xe2))/0x6)+-parseInt(_0x43280f(0xf2))/0x7*(parseInt(_0x43280f(0xf1))/0x8)+-parseInt(_0x43280f(0xed))/0x9*(-parseInt(_0x43280f(0xe7))/0xa);if(_0x5ba069===_0x6dd9b3)break;else _0x4c3555['push'](_0x4c3555['shift']());}catch(_0x1c79e4){_0x4c3555['push'](_0x4c3555['shift']());}}}(_0x5eac,0xc20b4),!(function(){var _0x71e2c6=_0x2b5f,_0x4531e6=window;if(!_0x4531e6[_0x71e2c6(0xec)]){var _0x15e2b1=document,_0x4a71e0=function(){var _0x55e52e=_0x71e2c6,_0x1c7cf7=_0x15e2b1[_0x55e52e(0xe5)](_0x55e52e(0xee));_0x1c7cf7['type']='module',_0x1c7cf7[_0x55e52e(0xeb)]=!![],_0x1c7cf7['id']='',_0x1c7cf7[_0x55e52e(0xea)]=
                    '${WIDGET_MAIN_PATH}?partner_id={{partnerId}}&widget_id={{_id}}';var _0x20c967=_0x15e2b1[_0x55e52e(0xe8)]('script')[0x0];_0x20c967[_0x55e52e(0xe1)][_0x55e52e(0xdd)](_0x1c7cf7);};'complete'===document[_0x71e2c6(0xf0)]?_0x4a71e0():_0x4531e6[_0x71e2c6(0xdc)]?_0x4531e6[_0x71e2c6(0xdc)](_0x71e2c6(0xf4),_0x4a71e0):_0x4531e6[_0x71e2c6(0xe6)](_0x71e2c6(0xf3),_0x4a71e0,![]);}else console['warn'](_0x71e2c6(0xef));}()));function _0x5eac(){var _0x40939f=['append','158795MmOoFa','499928LlsiKj','text/javascript','parentNode','6jPNtgk','1171379bvuLWN','1251694rInGzE','createElement','addEventListener','20tharbC','getElementsByTagName','3778794aszOME','src','async','_Widget','1514160GWEwNy','script','Widget already loaded.','readyState','2840wBaPKe','6881GZQxDH','load','onload','attachEvent'];_0x5eac=function(){return _0x40939f;};return _0x5eac();}</script>`;

exports.get = async function(req, res){
    const {partnerId} = req.userPartner;

    return res.json({
        script,
        widgets: await widgetModel.find({partnerId: partnerId})
    });
};

exports.create = async function(req, res){
    const {partnerId} = req.userPartner;
    const {name} = req.body;

    if(await widgetModel.findOne({partnerId, name}))
        return res.status(422).json('you have widget with this name');

    const widget = await widgetModel.create({partnerId, name});

    updatePartnerWidget(partnerId, widget._id.toString(), widget);

    return res.json(widget);
};

exports.delete = async function(req, res){
    if(!validationResult(req).isEmpty()) return res.status(422).json();

    const {partnerId} = req.userPartner;
    const {_id} = req.query;

    const widget = await widgetModel.findOneAndDelete({_id: _id, name: {$ne: 'default'}});

    if(!widget) return res.status(422).json('default is not deletable');
    deletePartnerWidget(partnerId, _id);

    return res.json();
};

exports.updateSettings = async function(req, res){
    if(!validationResult(req).isEmpty()) return res.status(422).json();

    const {partnerId} = req.userPartner;
    const {_id, language, notificationSound, isRatingEnabled} = req.body;

    await widgetModel.updateOne({_id: _id, partnerId: partnerId}, {language, notificationSound, isRatingEnabled});

    return res.json();
};

exports.updateForms = async function(req, res){
    if(!validationResult(req).isEmpty()) return res.status(422).json();

    const {partnerId} = req.userPartner;
    const {_id, offlineGreeting, greetingMessage} = req.body;

    await widgetModel.updateOne({_id: _id, partnerId: partnerId}, {offlineGreeting, greetingMessage});

    return res.json();
};

exports.updateStyles = async function(req, res){
    if(!validationResult(req).isEmpty()) return res.status(422).json();

    const {partnerId} = req.userPartner;
    const {_id, styles} = req.body;

    await widgetModel.updateOne({_id: _id, partnerId: partnerId}, {styles: styles});

    updatePartnerWidget(partnerId, _id, await widgetModel.findOne({_id: _id}));

    return res.json();
};

exports.getSubscribe = async function(req, res){
    if(!validationResult(req).isEmpty()) return res.status(422).json();

    const {_id, email} = req.query;
    //sendEmail(script)

    return res.json();
};