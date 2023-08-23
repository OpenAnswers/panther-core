/*
 * Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

// Logging
var logging = require('oa-logging')('oa:event:server:controllers:view_layout');
var logger = logging.logger;
var debug = logging.debug;

ViewLayouts = require(__dirname + '/../models/layout');
var util = require('util');
var inspect = util.inspect;

module.exports = {
  secure: true,

  /*
   * NOTE:
   * client side the layout is refrenced via a cells: [ ...]
   * and server side is stored as columns: [ ... ]
   */

  /*
   * this controller needs some attention.
   * 1) the interface to it from client side REST must be consistent
   * 2) the json objects returned need to be consistent
   * 3) there needs to be support for a fallback / system view
   * 4) the user must not be able to delete this fallback view
   * 5) fallback view should be an "all" view, built from AlertDefinitions
   */

  index: function (req, res) {
    logger.debug('view_layouts#index ' + inspect(req.params));

    /*
     * view layouts fetch query:
     * 1) not owned by any user and named __fallback__
     * 2) owned by the user
     */

    /*
     * NOTE: OR queries only came into mongodb in versions 1.5.3
     */
    var viewquery = { $or: [{ user: null, name: 'fallback', system: true }, { user: req.session.user }] };
    debug('view layout index query', viewquery);

    /*
     * massage the view layout
     */
    ViewLayouts.find(viewquery, function (err, docs) {
      if (docs.length <= 0) {
        logger.error("Couldn't find any view layouts, not even the __fallback__ one");
        debug('index returned docs', docs);
        res.send({ error: 'ENOENT', message: 'Missing all layouts' });
        return;
      }

      var view_names = docs.map(function (v) {
        return v.name;
      });
      logger.debug('User has ' + docs.length + ' views: ' + view_names.join(', '));

      /*
       * tack onto the end of the users view a standard "all" layout
       */

      AlertDefinitions.getDefaultLayout(function (a) {
        logger.debug('appending the default layout');

        docs.push({ _id: '__all__', user: '__internal__', name: 'all', columns: a });
        debug('sending layouts', docs);
        res.send(docs);
      });
    });
  },

  show: function (req, res, next) {
    logger.debug('view_layouts#show ' + inspect(req.params));

    if (req.params.id) {
      logger.debug('Showing alert layout for: ' + req.params.id);
      /*
       * special case, where this view is not owned by any user
       * its calculated from all "columns" that are available
       */
      if (req.params.id == 'all') {
        AlertDefinitions.find({}, { column: 1, width: 1 }, function (err, allcols) {
          if (err || allcols.length < 1) {
            logger.error('Failed to find all column definitions: ' + err);
            res.send(404);
          } else {
            var r = {};
            var cols2 = allcols.map(function (col) {
              var obj = {
                field: col.column,
                name: oafserver.definitions[col.column].label,
                width: col.width,
              };

              if (col.column == 'external_id') obj['editable'] = true;
              if (col.column == 'external_class') obj['editable'] = true;

              if (oafserver.definitions[col.column].display_type == 'Date') obj['formatter'] = 'formatDate';
              return obj;
            });

            var cols = [{ field: 'flags', name: 'Flags', width: '90px', formatter: 'formatFlags' }];

            r.cells = cols.concat(cols2);
            debug('giving default __all__ view_layouts: ', r);
            res.send(r);
          }
        });
      } else {
        /*
         * main place for constructing a view layout for the client
         */
        var q = { name: 'fallback' };

        if (req.params.id != 'fallback') {
          /*
           * if user has provided a view name then override the query object with it here
           */
          q['name'] = req.params.id;
          q['user'] = req.session.user;
        }

        var all_columns = {};

        for (var k in oafserver.definitions) {
          all_columns[k] = 1;
        }
        debug('All Columns starts of as: ', all_columns);
        logger.info('ViewLayout query: ' + inspect(q));
        ViewLayouts.findOne(q, function (err, l) {
          if (l) {
            //debug( "View layout query found: ", l )
            debug('View layout query found: ', l.columns);

            var list2 = l.columns.map(function (col) {
              debug('COL', col);
              var obj = {
                field: col.field,
                width: col.width != undefined ? col.width : '100px',
                name: oafserver.definitions[col.field].label,
              };
              // special cases
              if (col.field == 'acknowledged') obj['formatter'] = 'format_acknowledged';
              if (oafserver.definitions[col.field].display_type == 'Date') obj['formatter'] = 'formatDate';
              if (col.field == 'external_class') obj['editable'] = true;
              if (col.field == 'external_id') obj['editable'] = true;

              /*
               * remove this column from the list of all available ones
               * which will leave the ones that exist but are not configured for this view
               */
              delete all_columns[col.field];

              return obj;
            });
            debug('LIST2 = ', list2);

            debug('all columns now has: ', all_columns);
            /*
             * all_columns will now be whats *not* in the view/layout
             * add those columns back into the view but mark them as hidden
             */

            for (hidden_column in all_columns) {
              var obj = {
                hidden: 'true',
                field: hidden_column,
                width: oafserver.definitions[hidden_column].width || '90px',
                name: oafserver.definitions[hidden_column].label,
              };
              if (hidden_column == 'acknowledged') obj['formatter'] = 'format_acknowledged';
              if (oafserver.definitions[hidden_column].display_type == 'Date') obj['formatter'] = 'formatDate';

              list2.push(obj);
            }

            debug('LIST22 = ', list2);

            var r = {};

            var flags_array_elem = [
              {
                field: 'flags',
                width: '90px',
                name: 'Flags',
                draggable: false,
                formatter: 'formatFlags',
              },
            ];

            r.cells = flags_array_elem.concat(list2);
            debug('showing view layout: ', r);
            res.send(r);
          } else {
            logger.info('No view found called: ' + req.params.id);
            res.contentType('application/json');
            res.send(404);
          }
        });
      }
    } else {
      logger.warn('No view found to layouts:show');
      res.send({ error: 'ENOENT', message: 'Missing a view name' });
    }
  },

  edit: function (req, res, next) {
    get(req.params.id, function (err, user) {
      if (err) return next(err);
      res.render(user);
    });
  },

  create: function (req, res, next) {
    logger.debug('view_layouts#create ', req.params);
    logger.debug('creating a new view');

    /*
     * ensure that we are not trying to create a viewname thats already been used
     */
    ViewLayouts.findOne({ user: req.session.user, name: req.body.name }, function (err, vrow) {
      if (vrow != undefined) {
        logger.info('view named: ' + req.body.name + ' already exists');
        res.send({ error: 'EPERM', message: 'viewname already exists, can not create another by the same name' });
        return;
      }
    });

    AlertDefinitions.getDefaultLayout(function (a) {
      var v = new ViewLayouts();
      v.user = req.session.user;
      v.name = req.body.name;
      v.columns = a;

      debug('creating new view: ', v, true, 2);
      v.save(function () {
        res.send({ error: 'OK', items: [v.name] });
      });
    });
  },

  // PUT /layouts/:id
  update: function (req, res, next) {
    logger.debug('view_layouts#update ', req.params);
    var id = req.params.id;

    /*
     * dis allow saving of the "all" view
     */

    if (id == 'all' || id == '__all__') {
      res.send({ error: 'ENOPERM', message: 'Can not save the All view' });
      return;
    }

    var viewname = req.body.name;
    if (id != viewname) logger.warn('viewname mismatch between: ' + id + ' and ' + viewname);

    var viewquery = { user: req.session.user, name: req.params.id };

    logger.debug('updating view named: ', viewquery);
    ViewLayouts.findOne(viewquery, function (err, vrow) {
      debug('saving view: ', vrow);
      if (err) {
        logger.error('Failed to find', err, '');
        throw err;
        return;
      }

      if (!vrow) {
        logger.error('Failed to find the view', viewquery, '');
      }

      var cols = req.body.cells.map(function (col) {
        if (oafserver.definitions[col.field]) {
          return { field: col.field, width: col.width };
        } else {
          logger.warn('Attempt to save view with invalid field named: ' + col.field);
          return undefined;
        }
      });
      debug('COLS to save: ', cols);

      // remove any undefined entries from the array
      vrow.columns = cols.filter(function (elem) {
        return elem != undefined;
      });
      debug('saving view2: ', vrow);

      vrow.save(function (err) {
        logger.debug('Saving view: ' + viewquery.name);
        if (err) {
          logger.error('failed to save view: ', err, '');
        }
        res.send({ error: 'OK', name: viewquery.name });
      });
    });
  },

  destroy: function (req, res, next) {
    logger.debug('view_layouts#destroy ' + inspect(req.params));
    var viewname = req.params.id;
    logger.info('removing view named: ' + viewname);

    /*
     * check to make sure we aren't trying to delete a default view
     */

    if (viewname == '__all__' || viewname == 'default') {
      res.send({ error: 'ENOPERM', message: 'Can not delete internal views' });
      return;
    }

    ViewLayouts.findOne({ name: viewname, user: req.session.user }, function (err, row) {
      if (row == undefined) {
        res.send({ error: 'ENOENT' });
      } else {
        row.remove(function () {
          res.send({ error: 'OK', user: req.session.user, name: viewname });
        });
      }
    });
  },
};
