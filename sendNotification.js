import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs'; // Import the fs module
dotenv.config();

import admin from'firebase-admin';
const serviceAccountPath = './cert/seeds-service-account.json';

// Check if the service account file exists
if (!fs.existsSync(serviceAccountPath)) {
    console.error("Service account file not found:", serviceAccountPath);
    process.exit(1); // Exit the process if the file is not found
}

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
      });
      
} catch(error) {
    console.log("app init error " + error)
}

/// How to get these values
/// Use firebase cli to access firebase, set to seeds project

// CLOUD_API_KEY = api.key on firebase, get it like this:
// firebase functions:config:get

// CLOUD_URL = url of "paymentReceivedNotification" function
// firebase functions:config:get
// 
// fill in region and project ID from 
// firebase projects:list


const { CLOUD_API_KEY, CLOUD_URL } = process.env
const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
    symbol: "",
})

const sendNotification = async ({ from, to, quantity }) => {
    try {

        const symbol = quantity.split(' ')[1];
        if (symbol != 'SEEDS') {
            return;
        }
        const floatAmount = parseFloat(quantity);
        const amount = formatter.format(floatAmount);

        const message = 'You received ' + (floatAmount === 1 ? "1 Seed" : amount + " Seeds") + " from " + from;

        const params = new URLSearchParams({
            receiverUserId: to,
            notificationTitle: "",
            notificationContent: message,
            apiKey: CLOUD_API_KEY,
        });

        const notiication = {
            // token: 'ccvXtid8KE5rjbgPGFpZVy:APA91bFVbctlDKWUdilfzvbT8OiYO6xAahBzFJzdPAY8PhgzQWoyA_DONJQ4UlUK6fkBIS135dWu0GwtdaytqKOEwgnGUif0Tn9PUodU8S75UPlLB-L6ogtef5fbcXBTeSimpzQ83HUb',
            token: 'e2Jv4kjwLk6Yvgbvt57s2n:APA91bEJLp5s-XLrmYmVdDuSWmYu_wSyedkEqUMG4CwcDKuGGXP0hbHFBgXtjQj0TJjaKNDsXo1jxGVB6tRly-yR_nOQweTMvaSTqBOwiiKLIJ4Fl9qfp2Lb0-_Ps3sZ5fx1jTw1jDgP',
            notification: {
              title: 'Hello from Firebase!',
              body: 'This is a test message.',
            },
          };
        
        
          admin.messaging().send(notiication)
            .then((response) => {
              console.log('Successfully sent message:', response);
            })
            .catch((error) => {
              console.error('Error sending message:', error);
            });
          
        // const url = `${CLOUD_URL}?${params}`;

        // const res = await fetch(url);

        // if (res.status !== 200) {
        //     console.error("error sending notification: " + JSON.stringify({ from, to, quantity }, null, 2));
        //     console.error("error response: " + JSON.stringify(res.status, null, 2));
        //     console.error("error response: " + JSON.stringify(res.statusText, null, 2));
        //     console.error("error response: " + JSON.stringify(res.url, null, 2));
        //     console.error("error response: " + JSON.stringify(res.type, null, 2));
        // } else {
        //     console.log("message send success " + url)
        //     const resJson = await res.json();
        //     console.log("result " + JSON.stringify(resJson, null, 2))

        // }
    } catch (error) {
        console.error("error sending push notification: " + error);
    }
};

// Export the function using CommonJS module.exports
// module.exports = sendNotification;
export default sendNotification;

// Call the function for testing
// sendNotification({ from: "illumination", to: "testingseeds", quantity: "0.0001 SEEDS" });
sendNotification({ from: "testingseeds", to: "illumination", quantity: "0.0002 SEEDS" });
