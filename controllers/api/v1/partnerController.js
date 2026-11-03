const {validationResult} = require('express-validator');
const partnerModel = require('../../../models/mongo/Partner');
const userPartnerModel = require('../../../models/mongo/UserPartner');
const userModel = require('../../../models/mongo/User');
const widgetModel = require('../../../models/mongo/Widget');
const chatModel = require('../../../models/mongo/Chat');
const {updatePartnerFile, createIo, deleteIo} = require('../../../core/Io');
const {saveBuffer, deleteFile} = require('../../../helpers/fileHelper');

exports.get = async function(req, res){
    const [partners, partnersAdmins] = await Promise.all([partnerModel.getPartners(), userPartnerModel.getPartnersAdmins()]);
    partners.forEach(partner => {partner.userAdminsIds = partnersAdmins[partner._id] || []});

    return res.json({
        partners: partners
    });
};

exports.create = async function(req, res){
    if(!validationResult(req).isEmpty()) return res.status(422).json();

    const {name, file, userAdminsIds} = req.body;
    const key = name.replaceAll(' ', '-').replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '');

    if(await partnerModel.findOne({key: key}))
        return res.status(422).json('partner with this name exist');

    const partner = await partnerModel.create({name, file, key, request: 0, status: 0});
    const widget = await widgetModel.create({partnerId: partner._id});

    for(const userId of userAdminsIds){
        const {name} = await userModel.findOne({_id: userId});
        await userPartnerModel.create({userId, role: 1, status: 1, partnerId: partner._id, name});
    }

    createIo({
        _id: partner._id.toString(),
        file: partner.file,
        request: partner.request,
        name: name,
        activeChats: [],
        visitors: {incoming: [], assigned: [], served: []}
    }, {[widget._id.toString()]: widget});

    return res.json({
        partner: {_id: partner._id, status: partner.status, name, file, userAdminsIds}
    });
};


exports.status = async function(req, res){
    if(!validationResult(req).isEmpty()) return res.status(422).json();

    const _id = req.query._id;
    const status = req.body.status;
    await partnerModel.updateOne({_id}, {status});

    if(status){
        createIo(await partnerModel.getPartnerIoData(_id), await widgetModel.getPartnerWidgets(_id));
    }else{
        deleteIo(_id);
    }

    return res.json({_id: _id, status: status});
};

exports.update = async function(req, res){
    if(!validationResult(req).isEmpty()) return res.status(422).json();

    const {_id, name, file, userAdminsIds} = req.body;
    const key = name.replaceAll(' ', '-').replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '');

    if(await partnerModel.findOne({_id: {$ne: _id}, key: key}))
        return res.status(422).json('partner with this name exist');

    const userAdmins = await userPartnerModel.find({partnerId: _id, role: 1}).select('userId');
    userAdminsIds.forEach(async userAdminId => {
        const userAdmin = userAdmins.find(({userId}) => userId.toString() === userAdminId);
        if(!userAdmin){
            const {name} = await userModel.findOne({_id: userAdminId});
            await userPartnerModel.create({userId: userAdminId, role: 1, status: 2, partnerId: _id, name});
        }
    });

    await userPartnerModel.deleteMany({_id: {
        $in: userAdmins.filter(({userId}) => !userAdminsIds.includes(userId.toString())).map(({_id}) => _id)
    }});

    updatePartnerFile(_id, file);

    await partnerModel.updateOne({_id: _id}, {name, key, file});

    return res.json({
        partner: {_id, name, file, userAdminsIds}
    });
};

exports.delete = async function(req, res){
    if(!validationResult(req).isEmpty()) return res.status(422).json();
    const {_id} = req.query;

    await partnerModel.findOneAndDelete({_id: _id});
    await chatModel.deleteMany({partnerId: _id});
    await widgetModel.deleteMany({partnerId: _id});
    await userPartnerModel.deleteMany({partnerId: _id});

    deleteIo(_id);
//todo chatmessages@ jnjel
//todo meili search@ jnjel

    return res.json();
};

exports.updateDashboardImage = async function(req, res){
    const {partnerId} = req.userPartner;

    const file = req.files && req.files['dashboard-image'];
    if(!file || !['image/png', 'image/jpg', 'image/jpeg'].includes(file.mimetype))
        return res.status(422).json();

    //todo file error
    const dashboardImage = await saveBuffer([file.mimetype, req.files['dashboard-image'].data]);
    await partnerModel.updateOne({_id: partnerId}, {dashboardImage: dashboardImage});

    return res.json(dashboardImage);
};

exports.deleteDashboardImage = async function(req, res){
    const {partnerId} = req.userPartner;
    const partner = await partnerModel.findOne({_id: partnerId});

    await deleteFile("image", partner.dashboardImage);

    await partnerModel.updateOne({_id: partnerId}, {dashboardImage: ''});

    return res.json();
};