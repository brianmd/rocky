'use-strict'

// xpath cannot be strict, so require it prior to require('use-strict')
const xpath = require('xpath');

require('use-strict');

const raw = require('raw-body');

const fs = require('fs');
const app = require('koa')();
const router = require('koa-router')();

var views = require('co-views');

const parse = require('co-body');

const debug = require('debug');
const log = debug('server-log');

const PunchoutRequest = require('./app/classes/punchout-request');
const My = require('my-node-utils');

const xmlstrPromise = new Promise((resolve, reject) => {
  fs.readFile(__dirname + '/test/punchout-request.xml', 'utf8', function(err, str) {
    if (err) { reject(My.logit(err)) }
    return resolve(str);
  });
});

var render = views(__dirname + '/views', {
  ext: 'ejs'
});

// app.use(errorHandler());

// logger

// * this.method
// * this.query
// * this.host

app
  .use(function *getRawbody(next) {
    var len = this.request.headers['content-length'];
    console.error('content length: ', len, this.request.type)
    this.request.type = 'application/text'
    var body = yield parse.text(this.request.req);
    this.request.rawbody = body;
    yield next;
    })
  .use(router.routes())
	.use(router.allowedMethods())
  ;


router.post('/punchout', function *(next) {
  var punchout = new PunchoutRequest();
  var body;

  My.logit('punchout rawtext', this.request.rawbody)
  body = yield punchout.processRequest(this.request.rawbody);
  My.logit('done')

  this.response.type = 'text/xml';
  this.body = body;
})


// json version for debugging
router.post('/punchout/:id', function *(next) {
  var punchout = new PunchoutRequest();
  var body;

  My.logit('punchout rawtext', this.request.rawbody)
  body = yield punchout.processRequest(this.request.rawbody);
  My.logit('done')

  this.response.type = 'application/json';
  this.body = body;
})




///////////////    DEMO Pages

router.get('/axiall', function *() {
  this.body = yield render('axiall');
})


router.post('/coupa-request', function *() {
  // data = { cxml-response, redis-one-time }
  this.body = yield render('coupa-request');
})

router.post('/summit-returns-redirect', function *() {
  // data = redirect-url
  this.body = yield render('summit-returns-redirect');
})


router.post('/redirect', function *() {
  // data = redirect-url
  this.body = yield render('redirect');
})




router.get('/', function *(next) {
  this.body = 'please move on -- nothing here to see';
});

function errorHandler() {
  return function* (next) {
    // try catch all downstream errors here
    console.log('got an error');

    this.status = 404;
  };
}

app.listen(3009);


var exec = require('child_process').exec;

var cmd;
// cmd = "curl -v -H 'Content-Type: text/xml' -X POST -d '<?xml version="1.0" encoding="UTF-8"?> <!DOCTYPE cXML SYSTEM "http://xml.cxml.org/schemas/cXML/1.2.014/cXML.dtd"> <cXML payloadID="1211221788.71299@XML>' http://localhost:3009/punchout";

cmd = "curl -v -H 'Content-Type: text/xml' -X POST -d '<xml><test>sasdfafduisafduiofsaiuofsdaiuosdauiosdfuiodfsa afsd fadsuiofsaduioadsf dfsadfsa</test></xml>' http://localhost:3009/punchout";


// cmd = "curl -v -H 'Content-Type: text/xml' -X POST -d '<?xml version="1.0" encoding="UTF-8"?> <!DOCTYPE cXML SYSTEM "http://xml.cxml.org/schemas/cXML/1.2.014/cXML.dtd"> <cXML payloadID="1211221788.71299@ip-10-251-122-83" timestamp="Mon May 19 18:29:48 +0000 2008" xml:lang="en-US"> <Header> <From> <Credential domain="DUNS"> <Identity>coupa-t</Identity> </Credential> </From> <To> <Credential domain="DUNS"> <Identity>coupa-t</Identity> </Credential> </To> <Sender> <Credential domain="DUNS"> <Identity>myidentity</Identity> <SharedSecret>mysecret</SharedSecret> </Credential> <UserAgent>myagent</UserAgent> </Sender> </Header> <Request> <PunchOutSetupRequest operation="create"> <BuyerCookie>c64af92dc27e68172e030d3dfd1bc944</BuyerCookie> <Extrinsic name="FirstName">myfirstname</Extrinsic> <Extrinsic name="LastName">mylastname</Extrinsic> <Extrinsic name="UniqueName">myuniquename</Extrinsic> <Extrinsic name="UserEmail">myemail</Extrinsic> <Extrinsic name="User">myuser</Extrinsic> <Extrinsic name="BusinessUnit">mybusinessunit</Extrinsic> <BrowserFormPost> <URL>https://qa.coupahost.com/punchout/checkout/4</URL> </BrowserFormPost> <Contact role="myrole"> <Name xml:lang="en-US">jim</Name> <Email>noah+jim@coupa.com</Email> </Contact> </PunchOutSetupRequest> </Request> </cXML>' http://localhost:3009/punchout";

// cmd = "curl -v -H 'Content-Type: application/text' -X POST -d '<xml><test>safduisafduiofsaiuofsdaiuosdauiosdfuiodfsa afsd fadsuiofsaduioadsf dfsadfsa</test></xml>' http://localhost:3009/punchout";

// cmd = "curl -v -X POST -d '<xml><test>safduisafduiofsaiuofsdaiuosdauiosdfuiodfsa afsd fadsuiofsaduioadsf dfsadfsa</test></xml>' http://localhost:3009/punchout";

// My.log();
// My.log('expect request body to have something');
// My.logit(cmd);

// exec(cmd, function(error, stdout, stderr) {
	// // command output is in stdout
// });


