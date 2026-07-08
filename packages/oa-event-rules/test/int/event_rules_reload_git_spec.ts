//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Integration — EventRules on-disk behaviour.
//
// Ported from the old test/func/event_rules_spec.ts:
//
//   * save_yaml_async disk round-trip (write to file, re-load, compare YAML)
//   * identifier produced by running an event through the reloaded rules
//   * file-watcher reload on disk change (with real fs + real fs.watch
//     timing — sleeps 1.5s for the watcher queue to settle)
//   * git commit via save_yaml_git_async (real `gift` / git binary)
//   * git commit + push to a local bare remote
//
// None of these need a network service or live server — they touch real
// file system and the local git binary only.

const debug = require('debug')('oa:test:int:rules:reload_git');

const { expect, fs, copyFileAsync, mkdir_if_missing_Async, Promise, escape_shell } = require('../mocha_helpers');

const path = require('path');
const git = Promise.promisifyAll(require('gift'));

const { EventRules } = require('../../lib/event_rules');

describe('EventRules (integration)', function () {
  const yaml_file = 'event_rules_spec.yml';
  const path_test_fixture = path.join(__dirname, 'fixture');
  let yaml_load_path = path.join(path_test_fixture, `${yaml_file}.load`);
  let yaml_test_path = path.join(path_test_fixture, `${yaml_file}.saved`);
  const yaml_src_path = path.join(path_test_fixture, `_original_${yaml_file}`);
  let rules_yml_ori: any = undefined;

  let rules: any = null;

  afterEach(function () {
    if (rules && typeof rules.stop_rules_watch === 'function') rules.stop_rules_watch();
  });

  describe('save_yaml_async disk round-trip', function () {
    // Seed .load and .saved with the canonical fixture before these tests,
    // so the first `it` loads from .load and writes to .saved, and the
    // second `it` reads that .saved back.
    before(function () {
      return copyFileAsync(yaml_src_path, yaml_test_path).then(() => copyFileAsync(yaml_src_path, yaml_load_path));
    });

    it('save_yaml_async writes a file whose re-load matches the original YAML', function () {
      rules = new EventRules({ path: yaml_load_path });
      rules_yml_ori = rules.to_yaml_obj();

      return rules.save_yaml_async(yaml_test_path).then(() => {
        rules = new EventRules({ path: yaml_test_path });
        expect(rules.agent.to_yaml_obj()).to.eql(rules_yml_ori.agent);
        expect(rules.groups.to_yaml_obj()).to.eql(rules_yml_ori.groups);
        expect(rules.globals.to_yaml_obj()).to.eql(rules_yml_ori.globals.rules);
      });
    });

    it('running an event through the reloaded rules produces the expected identifier', function () {
      rules = new EventRules({ path: yaml_test_path });
      const obj: any = {};
      const input = { node: 'node', severity: 4, summary: 'true test', test: true };
      rules.rules(obj, input);
      expect(obj.identifier).to.eql('13085782457136753027');
    });
  });

  describe('file-watcher picks up a rule change on disk', function () {
    // Seed both `.load` and `.saved` copies of the fixture before tests so
    // the watcher target exists. (Previous describe's save_yaml_async may
    // have written derived content here; re-seed from source to start clean.)
    before(function () {
      return copyFileAsync(yaml_src_path, yaml_test_path).then(() => copyFileAsync(yaml_src_path, yaml_load_path));
    });

    let rules_change: any = null;

    before(function () {
      // Construct the EventRules which installs a file-watcher on
      // yaml_test_path. Then overwrite that file with the _changes_ fixture
      // and wait 1.5s for the watcher's debounced reload to fire.
      rules = new EventRules({ path: yaml_test_path });
      rules_yml_ori = rules.to_yaml_obj();

      rules_change = new EventRules({ path: yaml_test_path });

      const yaml_changes_path = path.join(path_test_fixture, `_changes_${yaml_file}`);
      return copyFileAsync(yaml_changes_path, yaml_test_path).delay(1500);
    });

    describe('agent section after reload', function () {
      let agent_yaml: any = null;

      before(function () {
        agent_yaml = rules_change.agent.to_yaml_obj();
      });

      it('differs from the original agent section', function () {
        expect(agent_yaml).to.not.eql(rules_yml_ori.agent);
      });

      it('has an empty rules array', function () {
        expect(agent_yaml.rules).to.exist;
        expect(agent_yaml.rules).to.eql([]);
      });

      it('has severity_map["7"] === 5', function () {
        expect(agent_yaml.severity_map).to.exist;
        expect(agent_yaml.severity_map['7']).to.eql(5);
      });
    });

    describe('groups section after reload', function () {
      let groups_yaml: any = null;

      before(function () {
        groups_yaml = rules_change.groups.to_yaml_obj();
      });

      it('differs from the original groups section', function () {
        expect(groups_yaml).to.not.eql(rules_yml_ori.groups);
      });

      it('no longer has the selec_c group', function () {
        expect(groups_yaml.selec_c).to.not.exist;
      });

      it('has a new group_a rule whose match.summary is the change sentinel', function () {
        expect(groups_yaml.group_a).to.exist;
        const ga = groups_yaml.group_a;
        expect(ga.rules).to.exist;
        expect(ga.rules[0]).to.exist;
        expect(ga.rules[0].match).to.exist;
        expect(ga.rules[0].match.summary).to.eql('blarg new changes summary');
      });
    });

    describe('globals section after reload', function () {
      let globals_yaml: any = null;

      before(function () {
        globals_yaml = rules_change.globals.to_yaml_obj();
      });

      it('differs from the original globals section', function () {
        expect(globals_yaml).to.not.eql(rules_yml_ori.globals);
      });
    });
  });

  describe('git commit', function () {
    const path_yaml_repo = path.join(path_test_fixture, 're po');
    let repo: any = null;

    before(function () {
      yaml_load_path = path.join(path_yaml_repo, `${yaml_file}.load`);
      yaml_test_path = path.join(path_yaml_repo, `${yaml_file}.saved`);
      repo = null;

      return mkdir_if_missing_Async(path_yaml_repo)
        .then(() => git.initAsync(path_yaml_repo))
        .then(() => {
          repo = Promise.promisifyAll(git(path_yaml_repo));
        })
        .then(() => copyFileAsync(yaml_src_path, yaml_test_path))
        .then(() => copyFileAsync(yaml_src_path, yaml_load_path))
        .then(() => repo.addAsync('.'))
        .then(() => repo.commitAsync('initial integration-test setup'));
    });

    it('save_yaml_git_async preserves content and commits it', function () {
      rules = new EventRules({ path: yaml_load_path });
      rules_yml_ori = rules.to_yaml_obj();

      return rules
        .save_yaml_git_async(yaml_test_path, {
          user_name: 'test_user',
          user_email: 'support+panthertest@openanswers.co.uk',
        })
        .then(() => {
          rules = new EventRules({ path: yaml_test_path });
          expect(rules.agent.to_yaml_obj()).to.eql(rules_yml_ori.agent);
          expect(rules.groups.to_yaml_obj()).to.eql(rules_yml_ori.groups);
          expect(rules.globals.to_yaml_obj()).to.eql(rules_yml_ori.globals.rules);
        });
    });
  });

  describe('git commit and push', function () {
    const path_yaml_repo_remote = path.join(path_test_fixture, 'repo_remote');
    let repo: any = null;

    before(function () {
      yaml_load_path = path.join(path_yaml_repo_remote, `${yaml_file}.load`);
      yaml_test_path = path.join(path_yaml_repo_remote, `${yaml_file}.saved`);

      // Create a bare remote to push to, a local repo, wire it up, commit
      // an initial state.
      return mkdir_if_missing_Async(`${path_yaml_repo_remote}_push`)
        .then(() => git.initAsync(`${path_yaml_repo_remote}_push`, true))
        .then(() => mkdir_if_missing_Async(path_yaml_repo_remote))
        .then((res: any) => {
          if (res === 'exists') {
            const err: any = new Error('finish');
            err.finish = true;
            throw err;
          }
          return git.initAsync(path_yaml_repo_remote);
        })
        .then(() => {
          repo = Promise.promisifyAll(git(path_yaml_repo_remote));
          return repo.remote_addAsync('origin', '../repo_remote_push');
        })
        .then(() => copyFileAsync(yaml_src_path, yaml_test_path))
        .then(() => copyFileAsync(yaml_src_path, yaml_load_path))
        .then(() => repo.addAsync('.'))
        .then(() => repo.commitAsync('initial integration-test setup'))
        .catch((err: any) => {
          if (err && err.finish) return;
          throw err;
        });
    });

    it('save_yaml_git_async with git_push pushes to origin and preserves content', function () {
      rules = new EventRules({ path: yaml_load_path });
      rules_yml_ori = rules.to_yaml_obj();

      return rules
        .save_yaml_git_async(yaml_test_path, {
          user_name: 'test_user_push',
          user_email: 'support+panthertest@openanswers.co.uk',
          git_push: true,
        })
        .then(() => {
          rules = new EventRules({ path: yaml_test_path });
          expect(rules.agent.to_yaml_obj()).to.eql(rules_yml_ori.agent);
          expect(rules.groups.to_yaml_obj()).to.eql(rules_yml_ori.groups);
          expect(rules.globals.to_yaml_obj()).to.eql(rules_yml_ori.globals.rules);
        });
    });
  });
});
