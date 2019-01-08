const expect = require('expect');
const { Probot } = require('probot');
const prOpened = require('./payloads/events/pullRequests.opened');
const prExisting = require('./payloads/events/pullRequests.existing');
const prUnrelated = require('./payloads/events/pullRequests.unrelated');
const prOpenedFiles = require('./payloads/files/files.opened');
const prExistingFiles = require('./payloads/files/files.existing');
const prUnrelatedFiles = require('./payloads/files/files.unrelated');
const probotPlugin = require('..');

describe('Presolver', () => {
  let probot, github;

  beforeEach(() => {
    probot = new Probot({});
    // Load our app into probot
    let app = probot.load(probotPlugin);
    // This is an easy way to mock out the GitHub API
    // https://probot.github.io/docs/testing/
    github = {
      issues: {
        /* eslint-disable no-undef */
        createComment: jest.fn().mockReturnValue(Promise.resolve({})),
        addLabels: jest.fn(),
        getLabel: jest.fn().mockImplementation(() => Promise.resolve([])),
        createLabel: jest.fn()
        /* eslint-enable no-undef */
      },
      repos: {
        getContent: () =>
          Promise.resolve({
            data: Buffer.from(
              `
          issueOpened: Message  
          pullRequestOpened: Message
          `
            ).toString('base64')
          })
      },
      pullRequests: {
        /* eslint-disable no-undef */
        getFiles: jest.fn().mockImplementation((issue) => {
          const { number } = issue;
          let data;
          switch (number) {
            case 31525:
              data = prOpenedFiles;
              break;
            case 33363:
              data = prExistingFiles;
              break;
            case 34559:
              data = prUnrelatedFiles;
              break;
            default:
              data = prExistingFiles;
          }
          return { data };
        }),
        /* eslint-disable no-undef */
        getAll: jest
        /* eslint-enable no-undef */
          .fn()
          .mockImplementation(() => ({ data: [
            prExisting.pull_request,
            prOpened.pull_request,
            prUnrelated.pull_request
          ] }))
      }
    };
    app.auth = () => Promise.resolve(github);
    // just return a test token
    // app.app = () => 'test'
  });

  test(`adds a label if a PR has changes to files targeted by an 
    existing PR`, async () => {
    // Receive a webhook event
    await probot.receive({
      name: 'pull_request.opened',
      payload: prOpened
    });
    expect(github.issues.addLabels).toHaveBeenCalled();
  });

  test('does not add a label when files do not coincide', async () => {
    await probot.receive({
      name: 'pull_request.opened',
      payload: prUnrelated
    });
    expect(github.issues.addLabels).toHaveBeenCalled();
  });
});

// For more information about testing with Jest see:
// https://facebook.github.io/jest/

// For more information about testing with Nock see:
// https://github.com/nock/nock
