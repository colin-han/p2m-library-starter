/**
 * Universal Router (https://www.kriasoft.com/universal-router/)
 *
 * Copyright © 2015-2016 Konstantin Tarkus, Kriasoft LLC. All rights reserved.
 *
 * This source code is licensed under the Apache 2.0 license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

'use strict';

const fs = require('fs');
const del = require('del');
const babel = require('babel-core');
const pkg = require('../package.json');

const ENV = process.env.BABEL_ENV || process.env.NODE_ENV || 'development';
const DEBUG = (ENV === 'development');

let promise = Promise.resolve();

// Clean up the output directory
promise = promise.then(() => fs.mkdirSync('dist'));
promise = promise.then(() => del(['dist/*']));

// Build browser version.
promise.then(() => fs.mkdirSync('dist/browser'));
promise.then(() => Promise.all(pkg._entries.map(
    (file) => new Promise((accept, reject) => babel.transformFile('src/' + file + '.js', {
      babelrc: false,
      "presets": [
        ["p2m-library", {
          "browser": true,
          "minified": false,
          "moduleId": pkg._moduleName.replace(/\./g, '/'),
          "globals": pkg._globals || {}
        }]
      ]
    }, (err, result) => {
      if (err) {
        reject(err);
        return
      }
      fs.writeFileSync(`./dist/browser/${file}.js`, result.code);
      fs.writeFileSync(`./dist/browser/${file}.js.map`, result.map);
      accept();
    }))
)));

if (!DEBUG) {
  promise.then(() => Promise.all(pkg._entries.map(
      (file) => new Promise((accept, reject) => babel.transformFile('src/' + file + '.js', {
        babelrc: false,
        "presets": [
          ["p2m-library", {
            "browser": true,
            "minified": true,
            "moduleId": pkg._moduleName.replace(/\./g, '/'),
            "globals": pkg._globals || {}
          }]
        ]
      }, (err, result) => {
        if (err) {
          reject(err);
          return
        }
        fs.writeFileSync(`./dist/browser/${file}.min.js`, result.code);
        fs.writeFileSync(`./dist/browser/${file}.min.js.map`, result.map);
        accept();
      }))
  )));
}

// build node.js version.
promise.then(() => fs.mkdirSync('dist/main'));
promise.then(() => Promise.all(pkg._entries.map(
    (file) => new Promise((accept, reject) => babel.transformFile('src/' + file + '.js', {
      babelrc: false,
      "presets": [
        "p2m-library"
      ]
    }, (err, result) => {
      if (err) {
        reject(err);
        return
      }
      fs.writeFileSync(`./dist/main/${file}.js`, result.code);
      fs.writeFileSync(`./dist/main/${file}.js.map`, result.map);
      accept();
    }))
)));

// Copy package.json and LICENSE.txt
promise = promise.then(() => {
  delete pkg.private;
  delete pkg.devDependencies;
  delete pkg.scripts;
  delete pkg.eslintConfig;
  delete pkg.babel;
  Object.keys(pkg)
      .filter(n => n.match(/^_.*$/))
      .map(n => {
        delete pkg[n]
      });
  fs.writeFileSync('dist/package.json', JSON.stringify(pkg, null, '  '), 'utf-8');
});

promise.catch(err => console.error(err.stack)); // eslint-disable-line no-console