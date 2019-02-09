# Reporting a Bug/Feature/Enhancement
In order to help out with bug reports please make sure you include the following:
- Backbone Relational Version
- Backbone Version
- Underscore Version

It is very important to provide a meaningful description with your bug reports/feature requests. A good format for these descriptions will include the following:

1. The problem you are facing (in as much detail as is necessary to describe the problem to someone who doesn't know anything about the system you're building)
    - It is *extremely* helpful to make a failing test case or JSFiddle example that covers your use case. Below you can find a template JSFiddle with the Jasmine test suite and Backbone relational `0.10.0` setup (feel free to fork this!):
        - http://jsfiddle.net/4223kp5e/1/
2. A summary of the proposed solution
3. A description of how this solution solves the problem, in more detail than item #2
4. Any additional discussion on possible problems this might introduce, questions that you have related to the changes, etc.

# Submitting a Pull Request
Before you submit your Pull Request ensure the following things are true for your branch:
1. Your additions match the same coding style defined in our linter rules and EditorConfig rules
    - How to setup [EditorConfig](http://editorconfig.org/#download)
    - How to setup [ESLint](http://eslint.org/docs/user-guide/integrations)
2. Your changes are branched off of `master`
3. You have added a test case for your changes or updated an existing test case
4. All test cases are passing, both with Underscore and Lodash

# Running Unit Tests
You can run tests using PhantomJS (headless) or a web browser (Chrome)
- To run headless tests:
    1. Run `npm test`
- To run headless tests using Lodash instead of Underscore
    1. Run `npm test -- --lodash`
- To run tests in a browser:
    1. Run `karma start --single-run`
        - _To test using Lodash add the `--lodash` flag_
    2. Open your browser and visit the url output by Karma
