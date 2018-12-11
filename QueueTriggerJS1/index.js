const https = require('https');
const url = require('url');
const Client = require('@line/bot-sdk').Client;

/* message */
const MSG_400_1 = '画像をおくってね。\n顔年齢を診断できるよ！';
const MSG_400_4 = 'ほんとに顔写ってる画像ですか？';
const MSG_500 = '・・・エラーが発生しました。';

/* ENUM */
const ENUM_GENDER = {
  male: '男',
  female: '女',
};

const MESSAGE_TYPE = {
  text: 'text',
  image: 'image',
  sticker: 'sticker',
};

// Cognitive Service Region
const COGNITIVE_SERVICE_REGION = process.env.COGNITIVE_SERVICE_REGION;

/* url */
const COGNITIVE_SERVICE = 'https://' + COGNITIVE_SERVICE_REGION + '.api.cognitive.microsoft.com/';

/* LINE setting */
const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

/**
 * JavaScript queue trigger function processed work item.
 *
 * @param {*} context
 * @param {*} myQueueItem
 */
module.exports = function(context, myQueueItem) {
  var promises = [];
  myQueueItem.events.forEach((event) => {
    promises.push(postMessage(context, event));
  });
  Promise.all(promises)
    .then(() => {
      context.log('done');
      context.done();
    });
};

/**
 * Determining the message type.
 *
 * @param {*} context
 * @param {*} event
 */
function postMessage(context, event) {
  return new Promise((resolve, reject) => {
    try {
      context.log(event);
      const type = event.message.type;
      if (type === MESSAGE_TYPE.image) {
        getImageData(context, event)
            .then((postData) => postCognitiveImage(context, event, postData))
            .then((faceData) => {
              var isExistFace = faceData.length !== 0 ? true : false;
              if (isExistFace) {
                successReplyMessage(context, event, faceData);
              } else {
                client.replyMessage(event.replyToken, {
                  type: MESSAGE_TYPE.text,
                  text: MSG_400_4,
                });
              };
            })
            .then(()=> resolve());
      } else {
        context.log('[log] No image');
        client.replyMessage(event.replyToken, {
          type: MESSAGE_TYPE.text,
          text: MSG_400_1,
        })
        .then(()=> resolve());
      };
    } catch (err) {
      context.log(err);
      client.replyMessage(event.replyToken, {
        type: MESSAGE_TYPE.text,
        text: MSG_500,
      })
      .then(()=> resolve());
    };
  });
};

/**
 * Retrieve image data from LINE.
 *
 * @param {*} context
 * @param {*} event
 */
function getImageData(context, event) {
  return new Promise((resolve, reject) => {
    context.log('[log] Start getImageData');
    var data = [];
    client.getMessageContent(event.message.id)
        .then((stream) => {
          stream.on('data', (chunk) => {
            data.push(new Buffer(chunk));
          });
          stream.on('error', (err) => {
            context.log(err);
            reject(err);
          });
          stream.on('end', () => {
            context.log('[log] Success getImageData');
            resolve(Buffer.concat(data));
          });
        })
        .catch((err) => {
          context.log('[err] postCognitiveImage');
          reject(err);
        });
  });
};

/**
 *  Send image data to Face API.
 *
 * @param {*} context
 * @param {*} event
 * @param {*} postData
 */
function postCognitiveImage(context, event, postData) {
  return new Promise((resolve, reject) => {
    try {
      context.log('[log] Start postCognitiveImage');
      var parseUrl = url.parse(COGNITIVE_SERVICE + 'face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false&returnFaceAttributes=age,gender,smile');
      var postOptions = {
        host: parseUrl.host,
        path: parseUrl.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': postData.length,
          'Ocp-Apim-Subscription-Key': process.env.COGNITIVE_KEY,
        },
      };

      var bodyString = null;
      var req = https.request(postOptions, function(res) {
        res.setEncoding('utf8');
        res.on('data', function(chunk) {
          bodyString = chunk;
        });
        res.on('end', function() {
          if (res.statusCode !== 200 || bodyString === '[]') {
            context.log('[log] No face');
            resolve([]);
          } else {
            context.log('[log] Success postCognitiveImage');
            resolve(bodyString);
          };
        });
      });
      req.write(postData);
      req.end();
    } catch (err) {
      context.log('[err] postCognitiveImage');
      reject(err);
    };
  });
};

/**
 * success
 *
 * @param {*} context
 * @param {*} event
 * @param {*} faceData
 */
function successReplyMessage(context, event, faceData) {
  return new Promise((resolve, reject) => {
    try {
      var face = JSON.parse(faceData)[0];
      var age = face.faceAttributes.age;
      var gender = '人間';

      if (face.faceAttributes.gender === 'male') {
        gender = ENUM_GENDER.male;
      } else if (face.faceAttributes.gender === 'female') {
        gender = ENUM_GENDER.female;
      };

      client.replyMessage(event.replyToken, {
        type: MESSAGE_TYPE.text,
        text: 'う～ん、、、\n' + age + '歳の' + gender + 'かな？',
      })
      .then(() => resolve());
    } catch (err) {
      context.log('[err] successReplyMessage');
      reject(err);
    };
  });
};
