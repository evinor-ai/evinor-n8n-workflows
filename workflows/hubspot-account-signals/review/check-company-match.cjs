'use strict';

// Six synthetic matching cases. Executes the current workflow's source;
// HubSpot search is a local OR/EQ/limit fixture, with no network or writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const workflow = JSON.parse(fs.readFileSync(path.join(__dirname, '../workflow.json'), 'utf8'));
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures.json'), 'utf8')).cases;
const source = name => {
  const node = workflow.nodes.find(node => node.name === name);
  assert.ok(node, `Missing workflow node: ${name}`);
  return node.parameters;
};
const normalizeCode = source('Normalize event').jsCode;
const searchExpression = source('Find HubSpot company').jsonBody;
const resolveCode = source('Resolve CRM match').jsCode;
assert.ok(searchExpression.startsWith('={{') && searchExpression.endsWith('}}'), 'Expected n8n search expression');

function normalize(input) {
  return vm.runInNewContext(`(function(){\n${normalizeCode}\n})()`, {
    $input: {all: () => [{json: input}]},
    $getWorkflowStaticData: () => ({}),
  })[0].json;
}

function search(event, companies) {
  const body = JSON.parse(vm.runInNewContext(searchExpression.slice(3, -2).trim(), {$json: event}));
  const matched = companies.filter(company => (body.filterGroups ?? []).some(group =>
    (group.filters ?? []).every(filter => {
      assert.equal(filter.operator, 'EQ', 'Fixture search supports the workflow EQ filters');
      return String(company.properties?.[filter.propertyName] ?? '') === String(filter.value);
    })
  ));
  const results = matched.slice(0, body.limit ?? 10).map(company => ({
    id: company.id,
    properties: Object.fromEntries((body.properties ?? Object.keys(company.properties))
      .map(key => [key, company.properties[key] ?? null])),
  }));
  return {body, response: {total: matched.length, results}};
}

function resolve(event, response) {
  return vm.runInNewContext(`(function(){\n${resolveCode}\n})()`, {
    $json: response,
    $: name => {
      assert.equal(name, 'Normalize event', 'Resolve reads the Normalize event item');
      return {item: {json: event}};
    },
  }).json;
}

let passed = 0;
for (const fixture of fixtures) {
  let actual;
  try {
    const event = normalize(fixture.input);
    assert.equal(event.autoRoute, true, 'These six fixtures pass the HIGH/company gate');
    const lookup = search(event, fixture.hubspotResponse.results);
    const result = resolve(event, lookup.response);
    actual = {
      route: result.route,
      companyId: result.hubspotCompanyId,
      ownerId: result.ownerId,
      matchedBy: result.matchedBy,
    };
    const checked = Object.fromEntries(Object.keys(fixture.expected).map(key => [key, actual[key]]));
    assert.deepEqual(checked, fixture.expected);
    passed++;
    console.log(`PASS ${fixture.name}`);
  } catch (error) {
    console.error(`FAIL ${fixture.name}`);
    console.error(JSON.stringify({expected: fixture.expected, actual, error: error.message}, null, 2));
  }
}
console.log(`${passed}/${fixtures.length} matching cases passed`);
process.exitCode = passed === fixtures.length ? 0 : 1;
