const glob = require('glob');
const path = require('path');
const express = require('express');
const portfinder = require('portfinder');
const beautify = require('js-beautify').html;
const fs = require('fs');
const _ = require('lodash');

const config = require('../../bedrock.config');
const colors = require('../discovery/colors');
const pages = require('../discovery/pages');
const components = require('../discovery/components');
const docs = require('../discovery/docs');
const paths = require('../paths');
const locals = require('../templates/locals');
const errors = require('../util/errors');

const app = express();

app.use(express.static(paths.compiled.path));
app.set('view engine', 'jade');
app.set('views', [
  path.join(process.cwd(), './content/templates'),
  path.join(process.cwd(), './core/templates')
]);

function renderView(req, res, viewName, customLocals) {
  const viewLocals = Object.assign({}, locals.getDefaultLocals(), {docs: docs.discover()}, customLocals);
  viewLocals.locals = Object.assign({}, locals.getDefaultLocals(), {docs: docs.discover()}, customLocals);
  const appErrors = errors.getErrors();

  if (Object.keys(appErrors).length > 0) {
    res.render('error', Object.assign({}, { errors: appErrors }));
  } else {
    app.render(viewName, viewLocals, function (err, html) {
      if (err) {
        if (err.message.includes('Failed to lookup view')) {
          res.render('404', viewLocals);
        } else {
          res.send(`<pre>${err}</pre>`);
        }
      } else {
        html = beautify(html, config.prettify);

        res.send(html);
      }
    });
  }
}

module.exports = function (done) {
  app.get('/styleguide', function (req, res) {
    renderView(req, res, 'styleguide/index', {
      pathname: 'styleguide/index'
    });
  });

  app.get('/styleguide/colors.html', function (req, res) {
    renderView(req, res, 'styleguide/colors', {
      pathname: 'styleguide/colors'
    });
  });

  app.get('/styleguide/docs/:doc', function (req, res) {
    const docFilename = req.params.doc.replace('.html', '');
    const doc = _.find(docs.discover().allDocs, doc => doc.attributes.filename === docFilename);

    renderView(req, res, 'styleguide/doc', {
      pathname: path.join('styleguide/docs/', docFilename),
      doc
    });
  });

  app.get('/styleguide/:group', function (req, res) {
    const componentGroups = components.discover();
    const componentGroup = req.params.group.replace('.html', '');

    renderView(req, res, 'styleguide/component-group', {
      pathname: req.path.replace('/', '').replace('.html', ''),
      componentGroup: componentGroups.byGroup[componentGroup]
    });
  });

  app.get('*', function (req, res) {
    const viewName = req.path.replace('/', '').replace('.html', '');
    renderView(req, res, viewName, {
      pathname: viewName
    });
  });

  portfinder.getPort((err, port) => {
    app.listen(port, function () {
      global.expressPort = port;
      console.log(`Express server listening on port ${port}`);
      done();
    });
  });
};
