var https = require("https");
var url = require("url");

var parse_url = url.parse("https://australiaeast.api.cognitive.microsoft.com/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false&returnFaceAttributes=age,gender,headPose,smile,facialHair,glasses");
var post_options = {
    host: parse_url.host,
    path: parse_url.path,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': process.env.COGNITIVE_KEY
    }
};

function post_cognitive_url(context, event) {
  var post_data = JSON.stringify({
    "url": event.message.text
  });

  var body_string = null;

  var post_req = https.request(post_options, (res) => {
    context.log('Request Done!!' + post_data);
    context.log('STATUS: ' + res.statusCode);
    context.log('HEADERS: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      context.log('BODY: ' + chunk);
      body_string = chunk;
    });
    res.on('end', function(){
      if (res.statusCode != 200) {
        body_string = '解析に失敗しました。'
      }
      context.log('body_string => ' + body_string);
      post_line_message(context, event, '結果だよ=>\n' + body_string);
    });
  });
  post_req.write(post_data);
  post_req.end();
  context.log('Post Cognitive !');
}      

// 画像が送られてきた際の処理
function post_cognitive_image(context, event) {

  var decode = new Buffer(event.message.image,'base64');
  context.log(event.message.image);
  var post_data = decode;

  var body_string = null;

  var post_req = https.request(post_options, (res) => {
    context.log('Request Done!!');
    context.log('STATUS: ' + res.statusCode);
    context.log('HEADERS: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      context.log('BODY: ' + chunk);
      body_string = chunk;
    });
    res.on('end', function(){
      if (res.statusCode != 200) {
        body_string = '解析に失敗しました。'
      }
      context.log('body_string => ' + body_string);
      post_line_message(context, event, '画像が投稿されました。\n結果だよ=>\n' + body_string);
    });
  });
  post_req.write(post_data);
  post_req.end();
  context.log('Post Cognitive !');
}     

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

function post_message(context, event) {
  context.log(event);
  var messageType = event.message.type;

  context.log(messageType);
  if (messageType == 'text') {
    post_cognitive_url(context, event);
  } else if (messageType == 'image') {
    get_message_content(context, event);
  } else if (messageType == 'sticker') {
    post_line_message(context, event, 'スタンプが投稿されました。画像のURLを投稿してください。');
  } else {
    post_line_message(context, event, '分類できません。画像のURLを投稿してください。');
  }
}

module.exports = function (context, myQueueItem) {
  context.log('JavaScript queue trigger function processed work item', myQueueItem);
  myQueueItem.events.forEach(event => post_message(context, event));
  context.done();
};

function get_message_content(context, event){
    var message_id = event.message.id;

    var parse_url = url.parse('https://api.line.me/v2/bot/message/'+ message_id +'/content');
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
}