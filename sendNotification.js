// const params = new URLSearchParams({ 
//     receiverUserId: data.to,
//     notificationTitle: "",
//     notificationContent: 'You received ' + (floatAmount == 1 ? "1 Seed" : amount + " Seeds") + " from " + data.from,
//     apiKey: CLOUD_API_KEY,
// })

const admin = require("firebase-admin");

// Initialize Firebase Admin SDK (ensure your service account key is properly set up)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require("./cert/seeds-77371-firebase-adminsdk-ogyf6-e941b207db.json")),
  });
}

/**
 * Sends a push notification to all devices for a given user.
 * @param {string} userID - The user ID whose devices will receive the notification.
 * @param {Object} payload - The notification payload to send.
 * @returns {Promise<void>} - Resolves when the notifications are sent.
 */
async function sendNotification(userID, payload) {
  try {
    // Fetch the user's Firebase message tokens from the Firestore database
    const userDoc = await admin.firestore().collection("users").doc(userID).get();

    if (!userDoc.exists) {
      throw new Error(`User with ID ${userID} not found.`);
    }

    const userData = userDoc.data();
    const firebaseMessageTokens = userData.firebaseMessageTokens || [];

    if (firebaseMessageTokens.length === 0) {
      console.warn(`No Firebase message tokens found for user ID: ${userID}`);
      return;
    }

    // Create a MulticastMessage
    const message = {
      tokens: firebaseMessageTokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {}, // Optional additional data
    };

    // Send notifications using sendEachForMulticast
    const responses = await admin.messaging().sendEachForMulticast(message);

    // Log response for debugging
    console.log(`Notifications sent. Success: ${responses.successCount}, Failure: ${responses.failureCount}`);

    // Handle invalid tokens
    if (responses.failureCount > 0) {
        const invalidTokens = [];
        responses.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error.errorInfo.code;
            if (errorCode === 'messaging/registration-token-not-registered') {
              invalidTokens.push(firebaseMessageTokens[idx]);
            }
            console.error(`Error for token ${firebaseMessageTokens[idx]}:`, resp.error);
          }
        });
  
      if (invalidTokens.length > 0) {
        console.warn(`Removing invalid tokens for user ${userID}:`, invalidTokens);

        // Update Firestore to remove invalid tokens
        await admin.firestore().collection("users").doc(userID).update({
          firebaseMessageTokens: firebaseMessageTokens.filter(token => !invalidTokens.includes(token)),
        });
      }
    }
  } catch (error) {
    console.error(`Error sending notification to user ${userID}:`, error);
  }
}

module.exports = sendNotification;