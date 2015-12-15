// const request = require('supertest').agent(app.listen());

const co = require('co');
const R  = require('ramda');
const fs = require('fs');

const My = require('my-node-utils');
const PunchoutRequest = require('../app/classes/punchout-request');



const xmlstrPromise = new Promise((resolve, reject) => {
  fs.readFile(__dirname + '/punchout-request.xml', 'utf8', function(err, str) {
    if (err) { reject(My.logit(err)) }
    return resolve(str);
  });
});

const punchoutCredentials = ({
  broker: { id: 'coupa-t' },
  company: {
    id:   'companyid',
    auth: 'companysecret' 
  },
  user: {
    id:        'myuniquename',
    firstName: 'myfirstname',
    lastName:  'mylastname',
    email:     'myemail',
    role:      'myrole'
  }
});



describe('PunchoutRequest', ()=>{
  'use strict'
  let punchout;
  let cred;
  
  beforeEach(()=>{
    punchout = new PunchoutRequest();
    // cred = JSON.parse(JSON.stringify(punchoutCredentials));
    cred = R.clone(punchoutCredentials);
  });

  context('uuid', ()=>{

    it('two uuids should not be the same', ()=>{
      var uuid1 = punchout.newUuid();
      var uuid2 = punchout.newUuid();
      expect(uuid1.length).to.be.equal(36);
      expect(uuid1).to.not.equal(uuid2);
    })

  });

  context('redis storage', ()=>{

    it('sets and gets', ()=>{
      var getter = punchout.setRedis('abc', 77, 20000)
        .then(val => {
          return (punchout.getRedis('abc'));
        });
      return expect(getter).to.eventually.equal(77);
    });

    it('gets', ()=>{
      var getter = punchout.getRedis('abc');
      return expect(getter).to.eventually.equal(77);
    })

    it('temp one time stoarge', ()=>{
      var getter = punchout.storeOneTime({username: 'bob'});
      return expect(getter).to.eventually.contain.all.keys(['username', 'uuid']);
    })

    it('one time stoarge', ()=>{
      var uuid;
      var customerInfo;
      var getter = punchout.storeOneTime({username: 'bob'})
        .then(val => { return punchout.getRedis('onetime-'+val.uuid); });
      return expect(getter).to.eventually.have.property('username','bob')
    })
  })

  context('validate', ()=>{

    it('passes good info', ()=>{
      expect(punchout.authenticate(cred)).to.equal(cred);
    })

    it('throws error when unauthorized', ()=>{
      cred.company.id = 'bad company';
      expect(()=>punchout.authenticate(cred)).to.throw('Unauthorized');
    })

    it('throws error when bad info', ()=>{
      cred = {};
      expect(()=>punchout.authenticate(cred)).to.throw('Cannot read property');
    })

  })

  context('extract parameters', ()=>{

    it('xml is read from file', ()=>{
      expect(My.isPromise(xmlstrPromise)).to.be.true;
      return expect(xmlstrPromise).to.eventually.match(/companyid/);
    });

    it('request', (done)=>{
      co(function *() {
        var xmlstr = yield xmlstrPromise;
        var custInfo = punchout.parseCxmlPunchoutRequest(xmlstr);
        expect(custInfo).to.deep.equal(cred);
        done();
      }).catch(done)
    })

  })

})

