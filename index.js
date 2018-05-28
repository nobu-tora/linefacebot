var https = require('https');
var url = require('url');

/**
 * JavaScript queue trigger function processed work item
 * @param {*} context
 * @param {*} myQueueItem
 */
module.exports = function(context, myQueueItem) {
  context.log('JavaScript queue trigger function processed work item', myQueueItem);
  myQueueItem.events.forEach(event => postMessage(context, event));
  context.done();
};

/**
 * Determining the message type
 * @param {*} context
 * @param {*} event
 */
function postMessage(context, event) {
  var messageType = event.message.type;
  context.log(messageType);
  if (messageType === 'text') {
    postCognitiveUrl(context, event);
  } else if (messageType === 'image') {
    getImageData(context, event)
    .then((postData) =>{
        postCognitiveImage(context, event, postData);
    })
    .catch((err) => fail(err, callback));
    // context.log('メッセージID' + event.message.id);
    // postLineMessage(context, event, event.message.id);
  } else if (messageType === 'sticker') {
    postLineMessage(context, event, 'いや・・このスタンプいいと思う。\n（画像のurlくれ)');
  } else {
    postLineMessage(context, event, 'これなんですか？私分かりません');
  }
}

/**
 *  Send URL to Face API
 * @param {*} context
 * @param {*} event
 */
function postCognitiveUrl(context, event) {
  var postData = JSON.stringify({
    'url': event.message.text,
  });

    /* Face API config */
  var parseUrl = url.parse('https://australiaeast.api.cognitive.microsoft.com/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false&returnFaceAttributes=age,gender,smile');
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
        bodyString = '解析に失敗したわ。\nほんとに画像のURLか、それ？';
      }
      // context.log('bodyString => ' + bodyString);
      postLineMessage(context, event, bodyString);
    });
  });
  req.write(postData);
  req.end();
  context.log('Post Cognitive !');
}

/**
 *  Send image data to Face API
 * @param {*} context
 * @param {*} event
 * @param {*} postData
 */
function postCognitiveImage(context, event, postData) {
  // var postData1 = Buffer.concat(postData);
  context.log(postData);
  context.log(postData.length);
  var parseUrl = url.parse('https://australiaeast.api.cognitive.microsoft.com/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false&returnFaceAttributes=age,gender,smile');
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
     context.log('Request Done!!');
     // context.log(res);
     context.log(postOptions);
     context.log('STATUS: ' + res.statusCode);
    res.setEncoding('utf8');
    context.log(res);
    res.on('data', function(chunk) {
      context.log('BODY: ' + chunk);
      bodyString = chunk;
    }).on('end', function() {
      if (res.statusCode !== 200) {
          console.log('解析に失敗したわ。\nほんとに画像か、それ？');
      }
      // var result = JSON.parse(bodyString);
      // context.log(bodyString);
      context.log('result => ' + bodyString);
      var result = bodyString.toString('utf-8');
      postLineMessage(context, event, result);
    });
  });
  req.write(postData);
  req.end();
  context.log('Post Cognitive !');
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

  context.log('LINE Post Data =>' + postData);
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
        context.log('メッセージID' + messageId);
        var parseUrl = url.parse('https://api.line.me/v2/bot/message/7977289829836/content');
        var postOptions = {
        host: parseUrl.host,
        path: parseUrl.path,
        method: 'GET',
            headers: {
                'Content-type': 'application/json; charset=UTF-8',
                'Authorization': 'Bearer {' + process.env.LINE_CHANNEL_ACCESS_TOKEN + '}',
            },
        };
        // var bodyString = null;
        var req = https.request(postOptions, function(res) {
            context.log('start');
            var data = [];
            res.on('data', function(chunk) {
                // image data dividing it in to multiple request
                data.push(new Buffer(chunk));
            }).on('error', function(err) {
                context.log(err);
                postLineMessage(context, event, err);
                reject(err);
            }).on('end', function() {
                var postData = Buffer.concat(data);
                context.log(data);
                // context.log(postData);
                resolve(postData);
            });
            });
        req.end();
        context.log('GetImage Cognitive !');
    });
}
