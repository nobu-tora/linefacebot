const https = require('https');
const url = require('url');
const Client = require('@line/bot-sdk').Client;

/* message */
const MSG_400_1 = '画像をおくってね。顔年齢を診断できるよ！';
const MSG_400_2 = 'このスタンプいいと思うよ！！（画像くれ)';
const MSG_400_3 = '私分かりません（画像くれ)';
const MSG_400_4 = 'ほんとに顔写ってる画像？';

/* ENUM */
const ENUM_GENDER = {
  male : '男',
  female : '女',
};

const MESSAGE_TYPE = {
  text : 'text',
  image : 'image',
  sticker : 'sticker',
}

/* url */
const FACE_API = 'https://australiaeast.api.cognitive.microsoft.com/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false&returnFaceAttributes=age,gender,smile';

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
  context.log(myQueueItem);
  myQueueItem.events.forEach((event) => postMessage(context, event));
  context.done();
};

/**
 * Determining the message type.
 *
 * @param {*} context
 * @param {*} event
 */
function postMessage(context, event) {
  var messageType = event.message.type;
  context.log(messageType);
  if (messageType === MESSAGE_TYPE.text) {
    JudgmentTextMessage(context, event);
  } else if (messageType === MESSAGE_TYPE.image) {
    getImageData(context, event)
    .then((postData) =>{
        postCognitiveImage(context, event, postData);
    })
    .catch((err) => {
      client.replyMessage(event.replyToken, {
        type: MESSAGE_TYPE.text,
        text: err.message,
      });
    });
  } else if (messageType === MESSAGE_TYPE.sticker) {
    client.replyMessage(event.replyToken, {
      type: MESSAGE_TYPE.text,
      text: MSG_400_2,
    });
  } else {
    client.replyMessage(event.replyToken, {
      type: MESSAGE_TYPE.text,
      text: MSG_400_3,
    });
  }
};

/**
 * JudgmentTextMessage
 * @param {*} context
 * @param {*} event
 */
function JudgmentTextMessage(context, event) {
  if(event.message.text.indexOf('天気') > -1){
    client.replyMessage(event.replyToken, {
      type: MESSAGE_TYPE.text,
      text: '天気予報実装予定だよ',
    });
  } else {
    client.replyMessage(event.replyToken, {
      type: MESSAGE_TYPE.text,
      text: MSG_400_1,
    });
  };
}

/**
 *  Send image data to Face API
 * @param {*} context
 * @param {*} event
 * @param {*} postData
 */
function postCognitiveImage(context, event, postData) {
  var parseUrl = url.parse(FACE_API);
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
     context.log('STATUS: ' + res.statusCode);
    res.setEncoding('utf8');
    res.on('data', function(chunk) {
      bodyString = chunk;
    }).on('end', function() {
      if (res.statusCode !== 200 || bodyString === '[]') {
        client.replyMessage(event.replyToken, {
          type: MESSAGE_TYPE.text,
          text: MSG_400_4,
        });
      } else {
        var result = JSON.parse(bodyString);
        context.log(result[0]);
        var age = result[0].faceAttributes.age;
        var gender = '人間';

        if (result[0].faceAttributes.gender === 'male') {
            gender = ENUM_GENDER.male;
        } else if(result[0].faceAttributes.gender === 'female') {
            gender = ENUM_GENDER.female;
        };
        client.replyMessage(event.replyToken, {
          type: MESSAGE_TYPE.text,
          text: 'う～ん、、、\n' + age + '歳の' + gender + 'かな？',
        });
      }
    });
  });
  req.write(postData);
  req.end();
}

/**
 * Retrieve image data from LINE
 * @param {*} context
 * @param {*} event
 */
function getImageData(context, event) {
    return new Promise((resolve, reject) => {
        var messageId = event.message.id;
        var data = [];
        client.getMessageContent(messageId)      
        .then((stream) => {
          stream.on('data', (chunk) => {
            data.push(new Buffer(chunk));
          })
          stream.on('error', (err) => {
            context.log(err);
            reject(err);
          })
          stream.on('end', () => {
          var postData = Buffer.concat(data);
          resolve(postData);
          });
        });
    });
};