var https = require("https");
var url = require("url");

/**
 * JavaScript queue trigger function processed work item
 * @param {*} context 
 * @param {*} myQueueItem 
 */
module.exports = function (context, myQueueItem) {
  context.log('JavaScript queue trigger function processed work item', myQueueItem);
  myQueueItem.events.forEach(event => post_message(context, event));
  context.done();
};

/**
 * Determining the message type
 * @param {*} context 
 * @param {*} event 
 */
function post_message(context, event) {
  var messageType = event.message.type;
  // context.log(messageType);
  if (messageType == 'text') {
    post_cognitive_url(context, event);
  } else if (messageType == 'image') {
    context.log('メッセージID' + message_id);
    post_line_message(context, event, message_id);
    get_message_content(context, event);
  } else if (messageType == 'sticker') {
    post_line_message(context, event, 'いや・・このスタンプいいと思う。\n（画像のurlくれ)');
  } else {
    post_line_message(context, event, 'これなんですか？私分かりません');
  }
}

/* Face API config */
var parse_url = url.parse("https://australiaeast.api.cognitive.microsoft.com/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false&returnFaceAttributes=age,gender,smile");
var post_options = {
    host: parse_url.host,
    path: parse_url.path,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': process.env.COGNITIVE_KEY
    }
};

/**
 *  Send URL to Face API
 * @param {*} context 
 * @param {*} event 
 */
function post_cognitive_url(context, event) {
  var post_data = JSON.stringify({
    "url": event.message.text
  });

  var body_string = null;

  var post_req = https.request(post_options, (res) => {
    // context.log('Request Done!!' + post_data);
    // context.log('STATUS: ' + res.statusCode);
    // context.log('HEADERS: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      // context.log('BODY: ' + chunk);
      body_string = chunk;
    });
    res.on('end', function(){
      if (res.statusCode != 200) {
        body_string = '解析に失敗したわ。\nほんとに画像のURLか、それ？'
      }
      // context.log('body_string => ' + body_string);
      post_line_message(context, event, body_string);
    });
  });
  post_req.write(post_data);
  post_req.end();
  context.log('Post Cognitive !');
}

/**
 * Send image data to Face API
 * @param {*} context 
 * @param {*} event 
 */
function post_cognitive_image(context, event) {
}

/**
 * Send message to LINE
 * @param {*} context 
 * @param {*} event 
 * @param {*} msg 
 */
function post_line_message(context, event, msg) {
  var jObj = {};
  jObj.type = "text";
  jObj.id = event.message.id;
  jObj.text = msg;

  var post_data = JSON.stringify({
    "replyToken": event.replyToken,
    "messages": [jObj]
  });

  context.log('LINE Post Data =>' + post_data);
  var parse_url = url.parse("https://api.line.me/v2/bot/message/reply");
  var post_options = {
    host: parse_url.host,
    path: parse_url.path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer {' + process.env.LINE_CHANNEL_ACCESS_TOKEN + '}',
      'Content-Length': Buffer.byteLength(post_data)
    }
  };

  var post_req = https.request(post_options);
  post_req.write(post_data);
  post_req.end();
  context.log('Post LINE Message !');
}

/**
 * Retrieve image data from LINE
 * @param {*} context 
 * @param {*} event 
 */
function get_message_content(context, event){
  var message_id = event.message.id;
  context.log('メッセージID' + message_id);
  var parse_url = url.parse('https://api.line.me/v2/bot/message/' + message_id + '/content');
  var post_options = {
    host: parse_url.host,
    path: parse_url.path,
    method: 'GET',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Authorization': 'Bearer {' + LINE_CHANNEL_ACCESS_TOKEN + '}'
      }
  };
// APIリクエスト
var req = https.request(post_options, function(res){
  var data = [];
  res.on('data', function(chunk){
      //image data dividing it in to multiple request
      data.push(new Buffer(chunk));
  }).on('error', function(err){
      context.log(err);
      post_line_message(context, event, err);
  }).on('end', function(){
      body_string = data;
      context.log('body_string => ' + body_string);
      //callback(data);
      post_line_message(context, event, `取得できた`);
  });
  });
  req.end();
}