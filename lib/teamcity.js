/**
 * Module dependencies.
 */

var Base, log

if (typeof window === 'undefined') {
  // running in Node
  Base = require('mocha').reporters.Base
  log = console.log
} else if(window.Mocha && window.Mocha.reporters && window.Mocha.reporters.Base) {
  // running in browser (possibly phantomjs) but without require
  Base = window.Mocha.reporters.Base
  log = console.log
} else {
  // running in mocha-phantomjs
  Base = require('./base')
  log = function(msg) { process.stdout.write(msg + '\n') }
}

/**
 * Expose `Teamcity`.
 */

if (typeof window !== 'undefined' && window.Mocha && window.Mocha.reporters) {
  window.Mocha.reporters.teamcity = Teamcity
}else{
  exports = module.exports = Teamcity
}

/**
 * Initialize a new `Teamcity` reporter.
 *
 * @param {Runner} runner
 * @api public
 */

var suites = {};

function getParent(suite)
{
    let parent = suite;
    while(parent.fullTitle() === suite.fullTitle() && parent.parent)
    {
        parent = parent.parent;
    }

    return parent.fullTitle() && parent.fullTitle() !== suite.fullTitle() ? parent : undefined;
}

function isRoot(suite)
{
    return !getParent(suite);
}

function beginSuite(suite, msg)
{
    if(!suite.fullTitle())
    {
        return;
    }

    suites[suite.fullTitle()] =
    {
        begin: msg,
        startDate: new Date(),
        end: undefined,
        tests: [],
        children: []
    };

    if(!isRoot(suite))
    {
        suites[getParent(suite).fullTitle()].children.push(suites[suite.fullTitle()]);
    }
}

function endSuite(suite, msg)
{
    if(!suite.fullTitle())
    {
        return;
    }

    let duration = new Date() - suites[suite.fullTitle()].startDate;
    suites[suite.fullTitle()].end = msg.replace(/DURATION/, duration);

    if(isRoot(suite))
    {
        logResults(suites[suite.fullTitle()]);
    }
}

function logResults(results)
{
    log(results.begin);
    results.tests.forEach(function(msg)
    {
        log(msg);
    });
    results.children.forEach(logResults);
    log(results.end);
}

function logTest(suite, msg)
{
    suites[suite.fullTitle()].tests.push(msg);
}

function Teamcity(runner) {
  Base.call(this, runner)
  var stats = this.stats

  runner.on('suite', function(suite) {
    if (suite.root) return
    beginSuite(suite, '##teamcity[testSuiteStarted name=\'' + escape(suite.title) + '\']')
  })

  runner.on('test', function(test) {
    logTest(test.parent, '##teamcity[testStarted name=\'' + escape(test.title) + '\' captureStandardOutput=\'true\']')
  })

  runner.on('fail', function(test, err) {
    logTest(test.parent, '##teamcity[testFailed name=\'' + escape(test.title) + '\' message=\'' + escape(err.message) + '\' captureStandardOutput=\'true\' details=\'' + escape(err.stack) + '\']')
  })

  runner.on('pending', function(test) {
    logTest(test.parent, '##teamcity[testIgnored name=\'' + escape(test.title) + '\' message=\'pending\']')
  })

  runner.on('test end', function(test) {
    logTest(test.parent, '##teamcity[testFinished name=\'' + escape(test.title) + '\' duration=\'' + test.duration + '\']')
  })

  runner.on('suite end', function(suite) {
    if (suite.root) return
    endSuite(suite, '##teamcity[testSuiteFinished name=\'' + escape(suite.title) + '\' duration=\'DURATION\']')
  })

  runner.on('end', function() {
    log('##teamcity[testSuiteFinished name=\'mocha.suite\' duration=\'' + stats.duration + '\']')
  })
}

/**
 * Escape the given `str`.
 */

function escape(str) {
  if (!str) return ''
  return str
    .toString()
    .replace(/\x1B.*?m/g, '')
    .replace(/\|/g, '||')
    .replace(/\n/g, '|n')
    .replace(/\r/g, '|r')
    .replace(/\[/g, '|[')
    .replace(/\]/g, '|]')
    .replace(/\u0085/g, '|x')
    .replace(/\u2028/g, '|l')
    .replace(/\u2029/g, '|p')
    .replace(/'/g, '|\'')
}
