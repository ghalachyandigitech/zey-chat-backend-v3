const {body, query} = require("express-validator");
const widgetModel = require("../mongo/Widget");

const email = query('email').isEmail().normalizeEmail().notEmpty();

const _id = query('_id').isString().notEmpty().custom(async (value, {req}) => {
    if(!await widgetModel.findOne({_id: value, partnerId: req.userPartner.partnerId}))
        throw new Error('widget not found');
});
const name = body('name').isString().isLength({min: 3, max: 32}).not().equals('default').notEmpty();
const language = body('language').isString().isLength({min: 2, max: 2}).notEmpty();
const notificationSound = body('notificationSound').isBoolean().notEmpty();
const isRatingEnabled = body('isRatingEnabled').isBoolean().notEmpty();
const offlineGreeting = body('offlineGreeting').isBoolean().notEmpty();
const greetingMessage = body('greetingMessage').isString().optional();
const styles = [
    body('styles.chatBadgeBackgroundColor').isHexColor().notEmpty(),
    body('styles.headerLeftColor').isHexColor().notEmpty(),
    body('styles.headerRightColor').isHexColor().notEmpty(),
    body('styles.headerTextColor').isString().optional(), //todo petq chi esi
    body('styles.messagesBackgroundColors.client').isHexColor().notEmpty(),
    body('styles.messagesBackgroundColors.our').isHexColor().notEmpty(),
    body('styles.title').isString().optional(),
    body('styles.botTextColor').isHexColor().notEmpty(),
    body('styles.widgetType').isIn(['bar', 'circular']).notEmpty(),
    body('styles.headerDegree').isInt({min: 0, max: 360}).notEmpty(),
    body('styles.widgetDegree').isInt({min: 0, max: 360}).notEmpty(),
    body('styles.visitorTextColor').isHexColor().notEmpty(),
    body('styles.widgetLeftColor').isHexColor().notEmpty(),
    body('styles.widgetRightColor').isHexColor().notEmpty(),
    body('styles.widgetIconColor').isHexColor().notEmpty(),
    body('styles.agentTextColor').isHexColor().notEmpty(),
    body('styles.widgetGradientType').isIn(['linear-gradient', 'radial-gradient', 'conic-gradient', 'midline-gradient']).notEmpty(),
    body('styles.windowSize').isIn(['overlay', 'popup']).notEmpty(),
    body('styles.windowSizeMobile').isIn(['overlay', 'popup']).notEmpty(),
    body('styles.widgetPosition').isIn(['bottom-right', 'bottom-left']).notEmpty(),
    body('styles.widgetPositionMobile').isIn(['bottom-right', 'bottom-left']).notEmpty(),
    body('styles.spacingSide').isInt({min: 0, max: 1000}).notEmpty(),
    body('styles.spacingSideMobile').isInt({min: 0, max: 1000}).notEmpty(),
    body('styles.spacingBottom').isInt({min: 0, max: 1000}).notEmpty(),
    body('styles.spacingBottomMobile').isInt({min: 0, max: 1000}).notEmpty(),
    body('styles.zIndex').isInt({min: 0, max: 999999}).notEmpty(),
    body('styles.zIndexMobile').isInt({min: 0, max: 999999}).notEmpty(),
    body('styles.notificationColor').isHexColor().notEmpty()
];

module.exports = {
    create: [name],
    delete: [_id],
    updateSettings: [language, notificationSound, isRatingEnabled],
    updateForms: [offlineGreeting, greetingMessage],
    subscribe: [_id, email],
    updateStyles: styles
};