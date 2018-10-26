	
module.exports = function (context, req) {
  context.bindings.outputQueueItem = req.body;
  res = { body : "" };
  context.done();
};