import test from 'ava';
import assert from 'yeoman-assert';
import helpers from 'yeoman-test';
import { join } from 'path';
import { spawn } from 'child_process';

if (process.env.NODE_ENV !== 'test') {
  process.env.NODE_ENV = 'test';
}

const REGISTRY = 'http://localhost:4873';

const project = (prompts) => helpers
  .run(require.resolve(join(__dirname, '../commands/init')))
  .inTmpDir(function(dir) {
    this.withOptions({
      directory: dir,
      name: 'testable',
      stdio: 'ignore',
      registry: REGISTRY,
    });
  })
  .withPrompts(prompts)
  .toPromise();
const usable = (dir, files) => assert.file(files.map(f => join(dir, f)));
const spawnP = (cmd, args, options) => new Promise((resolve, reject) => {
  const child = spawn(cmd, args, options);
  let output = '';

  child.stdout.on('data', data => output += data.toString());
  child.stderr.on('data', data => output += data.toString());
  child.on('close', (code) => {
    code === 0 ? resolve(code) : reject(output);
  });
});
const buildable = async (t, dir) => {
  try {
    await spawnP('yarn', ['build'], { cwd: dir, stdio: 'pipe' });
    t.pass();
  } catch (output) {
    t.fail(`Failed to build project:\n\n${output}`);
  }
};
const testable = async (t, dir) => {
  try {
    await spawnP('yarn', ['test'], { cwd: dir, stdio: 'pipe' });
    t.pass();
  } catch (output) {
    t.fail(`Failed to test project:\n\n${output}`);
  }
};
const lintable = async (t, dir) => {
  try {
    await spawnP('yarn', ['lint'], { cwd: dir, stdio: 'pipe' });
    t.pass();
  } catch (output) {
    t.fail(`Failed to lint project:\n\n${output}`);
  }
};

if (process.env.PROJECT) {
  let dir;

  test.before(async () => {
    if (process.env.LINTER) {
      dir = await project({
        projectType: 'application',
        project: process.env.PROJECT,
        testRunner: false,
        linter: process.env.LINTER
      });
    } else if (process.env.TEST_RUNNER) {
      dir = await project({
        projectType: 'application',
        project: process.env.PROJET,
        testRunner: process.env.TEST_RUNNER,
        linter: false
      });
    } else {
      dir = project({
        projectType: 'application',
        project: process.env.PROJECT,
        testRunner: false,
        linter: false
      });
    }
  });

  if (process.env.LINTER) {
    test(`${process.env.PROJECT} + ${process.env.LINTER}`, async t => {
      usable(dir, [
        'package.json',
        '.neutrinorc.js',
        '.eslintrc.js'
      ]);

      await Promise.all([
        buildable(t, dir),
        lintable(t, dir)
      ]);
    });
  } else if (process.env.TEST_RUNNER) {
    test(`${process.env.PROJECT} + ${process.env.TEST_RUNNER}`, async t => {
      usable(dir, [
        'package.json',
        '.neutrinorc.js',
        'test/simple_test.js'
      ]);

      await Promise.all([
        buildable(t, dir),
        testable(t, dir)
      ]);
    });
  } else {
    test(process.env.PROJECT, async t => {
      usable(dir, [
        'package.json',
        '.neutrinorc.js'
      ]);

      await buildable(t, dir);
    });
  }
} else {
  throw new Error('create-project test missing PROJECT environment variable');
}
