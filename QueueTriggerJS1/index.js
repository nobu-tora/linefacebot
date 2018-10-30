const https = require('https');
const url = require('url');
const Client = require('@line/bot-sdk').Client;

/* message */
const MSG_400_1 = '画像をおくってね。\n顔年齢を診断できるよ！';
const MSG_400_2 = 'このスタンプいいと思うよ！！';
const MSG_400_3 = 'おやすみなさい';
const MSG_400_4 = 'ほんとに顔写ってる画像？';
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

/* url */
const COGNITIVE_SERVICE = 'https://australiaeast.api.cognitive.microsoft.com/';

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
  myQueueItem.events.forEach((event) => postMessage(context, event));
  context.log('done');
  context.done();
};

/**
 * Determining the message type.
 *
 * @param {*} context
 * @param {*} event
 */
function postMessage(context, event) {
  try {
    context.log(event);
    const type = event.message.type;
    if (type === MESSAGE_TYPE.text) {
      return judgmentTextMessage(context, event);
    } else if (type === MESSAGE_TYPE.image) {
      return getImageData(context, event)
          .then((postData) => postCognitiveImage(context, event, postData));
    } else if (type === MESSAGE_TYPE.sticker) {
      return client.replyMessage(event.replyToken, {
        type: MESSAGE_TYPE.text,
        text: MSG_400_2,
      });
    } else {
      return client.replyMessage(event.replyToken, {
        type: MESSAGE_TYPE.text,
        text: MSG_400_3,
      });
    }
  } catch (err) {
    context.log(err);
    return client.replyMessage(event.replyToken, {
      type: MESSAGE_TYPE.text,
      text: MSG_500,
    });
  };
};

/**
 * JudgmentTextMessage.
 *
 * @param {*} context
 * @param {*} event
 */
function judgmentTextMessage(context, event) {
  if (event.message.text.indexOf('天気') > -1) {
    return client.replyMessage(event.replyToken, {
      type: MESSAGE_TYPE.text,
      text: '天気予報実装予定だよ',
    });
  } else {
    return client.replyMessage(event.replyToken, {
      type: MESSAGE_TYPE.text,
      text: MSG_400_1,
    });
  };
};

/**
 * Retrieve image data from LINE.
 *
 * @param {*} context
 * @param {*} event
 */
function getImageData(context, event) {
  return new Promise((resolve, reject) => {
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
            context.log('get image');
            resolve(Buffer.concat(data));
          });
        })
        .catch((err) => reject(err));
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
        return client.replyMessage(event.replyToken, {
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
        } else if (result[0].faceAttributes.gender === 'female') {
          gender = ENUM_GENDER.female;
        };
        context.log('success post line');
        return client.replyMessage(event.replyToken, {
          type: MESSAGE_TYPE.text,
          text: 'う～ん、、、\n' + age + '歳の' + gender + 'かな？',
        });
      }
    });
  });
  req.write(postData);
  req.end();
};
