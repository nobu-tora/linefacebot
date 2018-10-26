const https = require('https');
const url = require('url');

const FACE_API = 'https://australiaeast.api.cognitive.microsoft.com/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false&returnFaceAttributes=age,gender,smile';

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
    postLineMessage(context, event, '画像をおくってね♡');
    // postCognitiveUrl(context, event);
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
    postLineMessage(context, event, 'このスタンプいいと思うよ！！（画像くれ)');
  } else {
    postLineMessage(context, event, '私分かりません（画像くれ)');
  }
}

/**
 *  Send URL to Face API
 * @param {*} context
 * @param {*} event
function postCognitiveUrl(context, event) {
  var postData = JSON.stringify({
    'url': event.message.text,
  });
  var parseUrl = url.parse(FACE_API);
  var postOptions = {
      host: parseUrl.host,
      path: parseUrl.path,
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': process.env.COGNITIVE_KEY,
      },
  };

  var bodyString = null;

  var req = https.request(postOptions, (res) => {
    context.log('Request Done!!' + postData);
    // context.log(res);
    context.log('STATUS: ' + res.statusCode);
    context.log('HEADERS: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
        context.log(res);
    res.on('data', (chunk) => {
      context.log('BODY: ' + chunk);
      bodyString = chunk;
    });
    res.on('end', function() {
      if (res.statusCode !== 200) {
        bodyString = '私わかりません(画像くれ)';
      }
      // context.log('bodyString => ' + bodyString);
      postLineMessage(context, event, bodyString);
    });
  });
  req.write(postData);
  req.end();
  context.log('Post Cognitive !');
}
*/

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
        postLineMessage(context, event, 'ほんとに顔写ってる画像？');
      } else {
        var result = JSON.parse(bodyString);
        context.log(result[0]);
        var age = result[0].faceAttributes.age;
        var gender = '不明';
        
        if (result[0].faceAttributes.gender === 'male') {
            gender = '男性';
        } else if(result[0].faceAttributes.gender === 'female') {
            gender = '女性';
        } else {
            gender = '人間';
        }
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

  var parseUrl = url.parse('https://api.line.me/v2/bot/message/reply');
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
}

/**
 * Retrieve image data from LINE
 * @param {*} context
 * @param {*} event
 */
function getImageData(context, event) {
    return new Promise((resolve, reject) => {
        var messageId = event.message.id;
        context.log('メッセージID：' + messageId);
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
}