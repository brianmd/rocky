'use-strict'

require('use-strict');

const raw = require('raw-body');

const fs = require('fs');
const app = require('koa')();
const router = require('koa-router')();

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

var views = require('co-views');

var render = views(__dirname + '/views', {
  ext: 'ejs'
});

// app.use(errorHandler());

// logger

// * this.method
// * this.query
// * this.host

const xmlchecker = function *(next) {
  My.logit('xmlchecker', this.request);
  yield next;
}

function readRaw(req, len) {
  return new Promise(function(resolve, reject) {
    var opts = {};
    if (len) opts.length = ~~len;
    opts.encoding = opts.encoding || 'utf8';
    opts.limit = opts.limit || '1mb';
	  raw(req, opts,
      function rawer(err, str) {
        if (err) {
          console.error('-------- error in readRaw: ', err);
          reject(err);
        }
        console.error('---------str'+str)
        // My.logit(req.length)
        resolve(str);
      });
  })
};


const options = {
	// normalize: true,
  // firstCharLowerCase: true,
  // explicitArray: false,
  // ignoreAttrs: true
}

app
  .use(function *(next) {
    var len = this.request.headers['content-length'];
    var promise = readRaw(this.req, this.request.headers['content-length']);
    return yield promise
      .then(val => {
        this.rawtext = My.logit('promise.then:', val)
        return this;
      })
      .catch(val => { My.logit('error in promise') })
    })
  .use(router.routes())
	.use(router.allowedMethods())
  ;


router.get('/', function *(next) {
  this.body = 'please move on -- nothing here to see';
});

router.get(/^\/(.*)(?:_Metro)\/(.*)(?:_City)$/, function *(){
    var metro = this.params[0];
    var city = this.params[1];
    this.body = metro + ' ' + city;
});


router.get('punchout', '/punchout/:id', function *() {
  this.body = 'hey ' + this.params.id;
})



router.post('/punchout', function *(next) {
  var punchout = new PunchoutRequest();
  var body;

  My.logit('punchout rawtext', this.rawtext)
  // My.logit('starting', this.params)
  // My.logit('request', this.request)
  // My.logit('request body', this.request.body)
  // My.logit()
  // My.logit('headers', this.headers)
  // My.logit()
  body = yield new Promise(function(resolve, reject) {
    b = punchout.responseTemplate();
    resolve(My.logit('body', b));
  })
  My.logit('done')

  this.response.type = 'text/xml';
  this.body = body;
})



router.get('/axiall', function *() {
})


router.get('/axiall2', function *() {
  this.body = yield render('axiall');
  My.logit()
  My.logit('response:', this.body)
})

router.post('/send-to-summit', function *() {
  My.logit('params:', this.params)
  My.logit();
  My.logit('body:', this.request);
  My.logit();
  My.logit('post headers:', this.request.headers['post'])
  My.logit('request body:', this.request.body);
  this.body = this.body
})


function errorHandler() {
  return function* (next) {
    // try catch all downstream errors here
    console.log('got an error');

    this.status = 404;
  };
}

// app.use(function *() {
	// // the parsed body will store in this.request.body
	// // if nothing was parsed, body will be an empty object {}
	// this.body = this.request.body;
// });


// router.post('/users', koaBody,
	// function *(next) {
		// console.log(this.request.body);
		// // => POST body
		// this.body = JSON.stringify(this.request.body);
	// }
// );


app.listen(3009);


var exec = require('child_process').exec;

var cmd;
cmd = "curl -v -H 'Content-Type: text/xml' -X POST -d '<xml><test>safduisafduiofsaiuofsdaiuosdauiosdfuiodfsa afsd fadsuiofsaduioadsf dfsadfsa</test></xml>' http://localhost:3009/punchout";
cmd = "curl -v -H 'Content-Type: application/text' -X POST -d '<xml><test>safduisafduiofsaiuofsdaiuosdauiosdfuiodfsa afsd fadsuiofsaduioadsf dfsadfsa</test></xml>' http://localhost:3009/punchout";
cmd = "curl -v -X POST -d '<xml><test>safduisafduiofsaiuofsdaiuosdauiosdfuiodfsa afsd fadsuiofsaduioadsf dfsadfsa</test></xml>' http://localhost:3009/punchout";

My.log();
My.log('expect request body to have something');
My.logit(cmd);

exec(cmd, function(error, stdout, stderr) {
	// command output is in stdout
});

// console.log('curl -i http://localhost:3009/users -d "name=test"');
// console.log('curl -i http://localhost:3009/users -H "Content-Type: text/xml" -d "name=test"');

