	
module.exports = function (context, req) {
  context.bindings.outputQueueItem = req.body;
  context.done();
};