const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();

// Setup Nodemailer (You would need to configure this with your service)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your-email@gmail.com',
        pass: 'your-app-password'
    }
});

/**
 * Scheduled function to check for visitors nearing expiry.
 * Runs every 5 minutes.
 */
exports.checkVisitorExpiry = functions.pubsub.schedule('every 5 minutes').onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const fifteenMinsFromNow = admin.firestore.Timestamp.fromMillis(now.toMillis() + 15 * 60 * 1000);

    const snapshot = await db.collection('visitors')
        .where('status', '==', 'Active')
        .where('expiryTime', '<=', fifteenMinsFromNow)
        .where('notificationSent', '==', false)
        .get();

    if (snapshot.empty) return null;

    const promises = [];

    snapshot.forEach(doc => {
        const visitor = doc.data();
        const visitorId = doc.id;

        // 1. Notify Visitor
        const visitorMailOptions = {
            from: 'SecurePass <no-reply@securepass.com>',
            to: visitor.email,
            subject: 'Visitor Stay Update - SecurePass',
            text: `Hi ${visitor.name}, your visitor duration is almost exhausted. Please check with your host if you need an extension.`
        };

        // 2. Notify Tenant (Host)
        const hostMailOptions = {
            from: 'SecurePass <no-reply@securepass.com>',
            to: visitor.hostEmail,
            subject: 'Action Required: Visitor Nearing Time Limit',
            text: `Your visitor ${visitor.name} is nearing their time limit. Would you like to extend their stay in the SecurePass dashboard?`
        };

        promises.push(transporter.sendMail(visitorMailOptions));
        promises.push(transporter.sendMail(hostMailOptions));
        promises.push(db.collection('visitors').doc(visitorId).update({ notificationSent: true }));
    });

    return Promise.all(promises);
});

/**
 * Triggered when a stay is extended.
 */
exports.onStayExtended = functions.firestore
    .document('visitors/{visitorId}')
    .onUpdate(async (change, context) => {
        const newValue = change.after.data();
        const previousValue = change.before.data();

        // Check if expiryTime was updated (Extended)
        if (newValue.expiryTime.toMillis() > previousValue.expiryTime.toMillis()) {
            const visitorMailOptions = {
                from: 'SecurePass <no-reply@securepass.com>',
                to: newValue.email,
                subject: 'Stay Extended - SecurePass',
                text: `Your host ${newValue.hostName} has extended your visit.`
            };

            return transporter.sendMail(visitorMailOptions);
        }

        return null;
    });
