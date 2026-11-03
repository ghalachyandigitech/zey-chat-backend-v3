const router = require('express').Router();

const {userPartnerAdminAuth, userPartnerAuth, userPartnerTeamLeadAuth, userPartnerAgentAuth, userAuth, userSuperAuth} = require('../../../middlewares/api');

const userController = require('../../../controllers/api/v1/userController');
const chatController = require('../../../controllers/api/v1/chatController');
const widgetController = require('../../../controllers/api/v1/widgetController');
const userSuperController = require('../../../controllers/api/v1/userSuperController');
const shortcutController = require('../../../controllers/api/v1/shortcutController');
const partnerController = require('../../../controllers/api/v1/partnerController');
const userPartnerController = require('../../../controllers/api/v1/userPartnerController');

const widgetValidation = require('../../../models/validations/widget');
const chatValidation = require('../../../models/validations/chat');
const shortcutValidation = require('../../../models/validations/shortcut');
const userPartnerValidation = require('../../../models/validations/userPartner');
const userValidation = require('../../../models/validations/user');
const partnersValidation = require('../../../models/validations/partners');

//user-super
router.post('/user-super/login', userSuperController.login);
router.get('/user-super/sign-in', [userSuperAuth], userSuperController.signIn);
router.get('/user-super/home', [userSuperAuth], userSuperController.home);
router.get('/user-super/partners', [userSuperAuth], partnerController.get);
router.post('/user-super/partners', [userSuperAuth, partnersValidation.create], partnerController.create);
router.delete('/user-super/partners', [userSuperAuth, partnersValidation.delete], partnerController.delete);
router.put('/user-super/partners', [userSuperAuth, partnersValidation.update], partnerController.update);
router.put('/user-super/partners/status', [userSuperAuth, partnersValidation.status], partnerController.status);
router.get('/user-super/user-admins', [userSuperAuth], userController.getUserAdmins);
router.post('/user-super/user-admins', [userSuperAuth, userPartnerValidation.createAdmin], userController.createUserAdmin);
router.delete('/user-super/user-admins', [userSuperAuth, userPartnerValidation.deleteAdmin], userController.deleteUserAdmin);
router.put('/user-super/user-admins', [userSuperAuth, userPartnerValidation.updateAdmin], userController.updateUserAdmin);
router.put('/user-super/user-admins/reset-password', [userSuperAuth], userController.resetPasswordUserAdmin);

//user
router.post('/users/login', [userValidation.login], userController.login);
router.post('/users/logout',[userAuth], userController.logout);
router.post('/users/create-password', [userValidation.createPassword], userController.createPassword);
router.post('/users/forgot-password', [userValidation.forgotPassword], userController.forgotPassword);
router.get('/users/sign-in', [userAuth], userController.signIn);
router.get('/users/user-partners', [userAuth], userPartnerController.get);
router.post('/users/user-partner-login', [userAuth, userPartnerValidation.loginStatus], userController.userPartnerLogin);

//user-partner
router.get('/user-partners/sign-in', [userPartnerAuth], userPartnerController.signIn);

router.get('/user-partners/agents', [userPartnerAuth], userPartnerController.getAgents);
router.post('/user-partners/agents', [userPartnerAuth, userPartnerAdminAuth, userPartnerValidation.createAgent, userValidation.create], userPartnerController.createAgents);
router.put('/user-partners/agents/team-leads', [userPartnerAuth, userPartnerTeamLeadAuth, userPartnerValidation.teamLeadsUpdateAgent], userPartnerController.teamLeadsUpdateAgents);
router.put('/user-partners/agents/admins', [userPartnerAuth, userPartnerAdminAuth, userPartnerValidation.adminsUpdateAgent, userValidation.update], userPartnerController.adminsUpdateAgents);
router.delete('/user-partners/agents', [userPartnerAuth, userPartnerAdminAuth, userPartnerValidation.deleteAgent], userPartnerController.deleteAgents);

router.get('/user-partners/shortcuts', [userPartnerAuth, userPartnerTeamLeadAuth], shortcutController.get);
router.post('/user-partners/shortcuts', [userPartnerAuth, userPartnerTeamLeadAuth, shortcutValidation.create], shortcutController.create);
router.put('/user-partners/shortcuts', [userPartnerAuth, userPartnerTeamLeadAuth, shortcutValidation.update], shortcutController.update);
router.delete('/user-partners/shortcuts', [userPartnerAuth, userPartnerTeamLeadAuth, shortcutValidation.delete], shortcutController.delete);

router.put('/partners/dashboard-image', [userPartnerAuth, userPartnerAdminAuth], partnerController.updateDashboardImage);
router.delete('/partners/dashboard-image', [userPartnerAuth, userPartnerAdminAuth], partnerController.deleteDashboardImage);

router.get('/widgets', [userPartnerAuth, userPartnerAdminAuth], widgetController.get);
router.get('/widgets/subscribe', [userPartnerAuth, userPartnerAdminAuth, widgetValidation.subscribe], widgetController.getSubscribe);
router.delete('/widgets', [userPartnerAuth, userPartnerAdminAuth, widgetValidation.delete], widgetController.delete);
router.post('/widgets', [userPartnerAuth, userPartnerAdminAuth, widgetValidation.create], widgetController.create);
router.put('/widgets/settings', [userPartnerAuth, userPartnerAdminAuth, widgetValidation.updateSettings], widgetController.updateSettings);
router.put('/widgets/forms', [userPartnerAuth, userPartnerAdminAuth, widgetValidation.updateForms], widgetController.updateForms);
router.put('/widgets/styles', [userPartnerAuth, userPartnerAdminAuth, widgetValidation.updateStyles], widgetController.updateStyles);

router.post('/user-partners/chats', [userPartnerAuth, chatValidation.get], chatController.get);
router.get('/chats/transcript', [userPartnerAuth], chatController.transcript);

router.get('/user-partners/visitors', [userPartnerAuth], userPartnerController.getVisitor);
router.get('/user-partners/visitors/banned', [userPartnerAuth, userPartnerTeamLeadAuth], userPartnerController.getVisitorsBanned);

router.put('/user-partners', [userPartnerAuth, userPartnerTeamLeadAuth, userPartnerValidation.updateProfile, userValidation.update], userPartnerController.update);
router.put('/user-partners/note', [userPartnerAuth, userPartnerValidation.updateNote], userPartnerController.updateNote);
router.put('/user-partners/notifications', [userPartnerAuth, userPartnerAgentAuth, userPartnerValidation.updateNotifications], userPartnerController.updateNotifications);
router.put('/user-partners/profile-image', [userPartnerAuth], userPartnerController.updateProfileImage);
router.delete('/user-partners/profile-image', [userPartnerAuth], userPartnerController.deleteProfileImage);

module.exports = router;