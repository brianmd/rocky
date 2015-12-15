// Export modules to global scope as necessary (only for testing)
'use strict'

global.chai = require('chai')
global.my = require('my-node-utils');

var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);


if (typeof process !== 'undefined' && process.title === 'node') {
  // We are in node. Require modules.
  console.log('sadf');
  global.expect = chai.expect;
  global.should = chai.should;
  global.sinon = require('sinon');
  num = require('..');
  global.isBrowser = false;
} else {
  // We are in the browser. Set up variables like above using served js files.
  global.expect = chai.expect;
  // num and sinon already exported globally in the browser.
  global.isBrowser = true;
}
