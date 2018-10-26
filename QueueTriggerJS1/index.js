const https = require('https');
const url = require('url');

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

/* url */
const FACE_API = 'https://australiaeast.api.cognitive.microsoft.com/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false&returnFaceAttributes=age,gender,smile';
const LINE_REPLY = 'https://api.line.me/v2/bot/message/reply';

/**
 * JavaScript queue trigger function processed work item
 * @param {*} context
 * @param {*} myQueueItem
 */
module.exports = function(context, myQueueItem) {
  context.log(myQueueItem);
  myQueueItem.events.forEach((event) => postMessage(context, event));
  context.done();
};

/**
 * Determining the message type
 * @param {*} context
 * @param {*} event
 */
function postMessage(context, event) {
  // checkToken(context, event)
  var messageType = event.message.type;
  context.log(messageType);
  if (messageType === 'text') {
    JudgmentTextMessage(context, event);
  } else if (messageType === 'image') {
    getImageData(context, event)
    .then((postData) =>{
        postCognitiveImage(context, event, postData);
    })
    .catch((err) => {
      context.log(err);
      postCognitiveImage(context, event, err);
    });
  } else if (messageType === 'sticker') {
    postLineMessage(context, event, MSG_400_2);
  } else {
    postLineMessage(context, event, MSG_400_3);
  }
};


function JudgmentTextMessage(context, event) {
  if(event.message.indexOf('天気') > -1){
    postLineMessage(context, event, event.message);
  } else {
    postLineMessage(context, event, MSG_400_1);
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
        postLineMessage(context, event, MSG_400_4);
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
        postLineMessage(context, event, 'う～ん、、、\n' + age + '歳の' + gender + 'かな？');
      }
    });
  });
  req.write(postData);
  req.end();
}

/**
 * Send message to LINE
 * @param {*} context
 * @param {*} event
 * @param {*} msg
 */
function postLineMessage(context, event, msg) {
  var jObj = {};
  jObj.type = 'text';
  jObj.id = event.message.id;
  jObj.text = msg;

  var postData = JSON.stringify({
    'replyToken': event.replyToken,
    'messages': [jObj],
  });

  var parseUrl = url.parse(LINE_REPLY);
  var postOptions = {
    host: parseUrl.host,
    path: parseUrl.path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer {' + process.env.LINE_CHANNEL_ACCESS_TOKEN + '}',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  var req = https.request(postOptions);
  req.write(postData);
  req.end();
  context.log('Post LINE Message !');
};

/**
 * Retrieve image data from LINE
 * @param {*} context
 * @param {*} event
 */
function getImageData(context, event) {
    return new Promise((resolve, reject) => {
        var messageId = event.message.id;
        var parseUrl = url.parse('https://api.line.me/v2/bot/message/' + messageId + '/content');
        var postOptions = {
        host: parseUrl.host,
        path: parseUrl.path,
        method: 'GET',
            headers: {
                'Content-type': 'application/json',
                'Authorization': 'Bearer {' + process.env.LINE_CHANNEL_ACCESS_TOKEN + '}',
            },
        };
        var req = https.request(postOptions, function(res) {
            var data = [];
            res.on('data', function(chunk) {
                data.push(new Buffer(chunk));
            }).on('error', function(err) {
                context.log(err);
                postLineMessage(context, event, err);
                reject(err);
            }).on('end', function() {
                var postData = Buffer.concat(data);
                resolve(postData);
            });
            });
        req.end();
    });
};