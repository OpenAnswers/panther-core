/*
 * Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

Views = require(__dirname + '/../models/layout');
var inspect = require('util').inspect;

module.exports = {
  secure: true,

  index: function (req, res) {
    logger.debug('incoming filter index request');
    var u = req.session.user;
    Views.find({ user: u }, { name: 1, columns: 1 }, function (err, views) {
      if (err) return res.send({ success: false });

      if (views.length <= 0) {
        logger.warn('No views found for user: ' + u + ' not even a fallback one');
        res.send({ success: false });
        return;
      }

      var retviews = [];

      views.forEach(function (view) {
        logger.debug('Found view._id: ' + view._id);

        var ext_columns = [];
        var done_columns = {};
        view.columns.forEach(function (column) {
          var width_matches = column.width.match(/^([0-9]+(?:px|%)?)/);
          done_columns[column.field] = true;

          if (oafserver.alerts.columns[column.field] == undefined) {
            logger.warn('Missing alert column definition [' + column.field + '] for view [' + view.name + ']');
          } else {
            ext_columns.push({
              dataIndex: column.field,
              text: oafserver.alerts.columns[column.field].getLabel(),
              width: '' + width_matches[1],
            });
          }
        });

        oafserver.alerts.getAllColumns().forEach(function (column) {
          if (done_columns[column] == undefined) {
            ext_columns.push({
              dataIndex: column,
              text: oafserver.alerts.columns[column].getLabel(),
              hidden: true,
            });
          }
        });

        retviews.push({
          text: view.name,
          id: view._id,
          iconCls: 'view_icon',
          chk: false,
          hidden: false,
          handler_name: 'view_' + view.name,
          columns: ext_columns,
        });
      });

      var retobj = new Object();
      res.header('Content-Type', 'text/plain');
      res.send({ success: true, views: retviews || [] });
    });
  },
};
