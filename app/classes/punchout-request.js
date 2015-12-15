


//    TODO:   restrict by ip address????
//
//
'use strict'

const Uuid = require('node-uuid');
const Redis = require('redis');

const xpath = require('xpath');
const dom = require('xmldom').DOMParser;

const My = require('my-node-utils');

class PunchoutRequest {

  constructor () {
    this.baseUrl = process.env.BASE_URL;
    this.identity = process.env.COMPANY_IDENTITY;
    this.secret = process.env.COMPANY_SECRET;

    this.brokerId = process.env.BROKER_IDENTITY;
    this.companyId = process.env.COMPANY_IDENTITY;
    this.companySecret = process.env.COMPANY_SECRET;
  }

  processRequest(str) {
    const self = this;
    // return self.extractParameters(str)
    return Promise.resolve(this.parseCxmlPunchoutRequest(str))
      .then(val=>{return val})
      .then(val=>this.authenticate(val))
      .then(val=>this.storeOneTime(val))
      .then(val=>this.createResponse(val))
      .catch(console.log('major error'))
  }

  createResponseFromJson(json) {
    const self = this;
    return Promise.resolve(json)
      .then(val=>this.validate(val))
      .then(val=>this.storeOneTime(val))
      .then(val=>this.createResponse(val))
      .catch(console.log('major error'))
  }

  authenticate(customerInfo) {
    var broker  = customerInfo.broker;
    var company = customerInfo.company;

    var brokerIsOkay  = broker.id===this.brokerId;
    var companyIsOkay = company.id===this.companyId &&
                        company.auth===this.companySecret;

    if (brokerIsOkay && companyIsOkay) {
      return customerInfo;
    } else {
      My.logit('error b',brokerIsOkay,customerInfo)
      My.logit('error c',companyIsOkay)
      throw new Error('Unauthorized');
    }
  }

  validate(customerInfo) {
    var creds = customerInfo.credentials;
    if (creds.identity!==this.identity || creds.secret!==this.secret)
      throw new Error('Bad credentials');
    return customerInfo;
  }

  storeOneTime(customerInfo) {
    let uuid = this.newUuid();
    let key  = 'onetime-'+uuid;
    customerInfo.uuid = uuid;

    return this.setRedis(key, customerInfo, 30)
      .then(val=>{ return Promise.resolve(customerInfo) });
  }

  parseCxmlPunchoutRequest(xmlstr) {
    function val(path) {
      return xpath.select(path+'/text()', doc).toString()
    }
    let doc = new dom().parseFromString(xmlstr);
    let nodes = xpath.select('//Request/PunchOutSetupRequest/Extrinsic', doc);
    let hash = {}
    for (let n=0; n<nodes.length; n++) {
      hash[nodes[n].attributes[0].value] = nodes[n].childNodes[0].data;
    }
    let cred =  {
      broker: { id: val('//Header/From/Credential/Identity') },
      company: {
        id: val('//Header/Sender/Credential/Identity'),
        auth: val('//Header/Sender/Credential/SharedSecret')
      },
      user: {
        email: val('//Request/PunchOutSetupRequest/Contact/Email'),
        role: xpath.select1('//Request/PunchOutSetupRequest/Contact/@role', doc).value,
        firstName: hash['FirstName'],
        lastName: hash['LastName'],
        id: hash['UniqueName'],
      }
    }
    return cred;
  }

  newUuid() {
    return Uuid.v1();
  }

  getRedis(key) {
    return new Promise((resolve, reject) => {
      this.redis().get(key, (err, val) => {
        if (err) reject(err);
        resolve(JSON.parse(val));
      });
    });
  }

  setRedis(key, val, ttl) {
    return new Promise((resolve, reject) => {
      this.redis().set(key, JSON.stringify(val), (err, didWork) => {
        if (err || !didWork) return reject(err);

        if (!ttl) return resolve(true);
        this.redis().expire(key, ttl, (err, didWork) => {
          if (err || !didWork) return reject(err);
          resolve(true);
        });
      });
    });
  }

  redis() {
    if (!this._redis) {
      this._redis = Redis.createClient();
    }
    return this._redis
  }


  createResponse(customerInfo) {
    const url = this.createUrl(customerInfo.uuid);
    console.error('url: ',url)
    return this.responseTemplate().replace('$url', url);
  }

  createUrl(uuid) {
    return this.baseUrl + uuid;
  }

  responseTemplate() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE cXML SYSTEM "http://xml.cxml.org/schemas/cXML/1.1.010/cXML.dtd">
<cXML version="1.1.007" xml:lang="en-US" payloadID="200303450803006749@b2b.euro.com" timestamp="2003-01-12T08:03:00">
  <Response>
    <Status code="200" text="OK" />
    <PunchOutSetupResponse>
      <StartPage>
        <URL>$url</URL>
      </StartPage>
    </PunchOutSetupResponse>
  </Response>
</cXML>`
  }
}


module.exports = PunchoutRequest;

