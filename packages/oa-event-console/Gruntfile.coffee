#
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#


module.exports = (grunt) ->
  
  grunt.initConfig

    copy:
      dev:
        files: [
          expand: true
          src: ['package.json', 'config.yml', 'public/**/*', 'private/**/*']
          dest: 'dist'
        ]
      docker:
        src: 'docker.files/entrypoint.sh'
        dest: 'dist/entrypoint.sh'
      config_dist: 
        src: 'config.yml.dist'
        dest: 'dist/config.yml'
      swagger_dist:
        src: 'swagger.production.json'
        dest: 'dist/swagger.json'
      assets:
        files: [
          expand: true
          cwd: 'app'
          src: [ 'assets/js/*.js', 'assets/bower/*', 'assets/css/*', 'assets/oa_less/*', 'assets/bootstrap_less/**/*', 'assets/w2ui_less/**/*','assets/vendor/*','emails/*', 'view/**/*' ]
          dest: 'dist/app'
        ]
      rules:
        files: [
          expand: true,
          cwd: 'rules',
          src: [ '*.rules.default.yml' ],
          dest: 'dist/rules/',
          rename: (dest, matchedSrc)->
            console.log "renaming ", dest, matchedSrc
            return dest + matchedSrc.replace(/\.default/,'')
        ] 

      bins:
        files: [
          expand: true,
          cwd: 'bin'
          src: [ '*.js', '*.sh' ]
          dest: 'dist/bin'
        ]
        


    coffee:

      assets:
        options:
          sourceMap: false
        expand: true,
        flatten: false
        cwd: 'app/assets/js',
        src: [ '*.coffee', 'admin/*.coffee', 'console/*.coffee', 'rules-management/*.coffee'],
        dest: 'dist/app/assets/js',
        ext: '.js'

        
      glob_to_multiple:
        options:
          sourceMap: true
        expand: true,
        flatten: false,
        cwd: 'app',
        src: ['controller/*.coffee', 'events/*.coffee', '*.coffee', 'model/*.coffee', 'route/*.coffee', 'route/**/*.coffee', 'socketio/*.coffee', 'validations/*.coffee'],
        dest: 'dist/app',
        ext: '.js'
      libs:
        options:
          sourceMap: true
        expand: true
        flatten: false
        cwd: 'lib'
        src: '*.coffee'
        dest: 'dist/lib'
        ext: '.js'
      bins:
        options:
          sourceMap: false
        expand: true
        cwd: 'bin'
        src: [ '*.coffee' ]
        dest: 'dist/bin'
        ext: '.js'

    coffeelint:
      app: [ 'app/**/*.coffee', 'lib/*.coffee' ]


    exec:
      bower_install: 'bower install --allow-root'
      remove_extra_fonts: 'rm public/font/'
      pull_git_modules: 'git submodule init && git submodule update --remote'
      w2ui_less: 'mkdir -p app/assets/w2ui_less && cp -R w2ui/src/less/ app/assets/w2ui_less/'
      w2ui_build: 'cd w2ui && npm install && grunt'
      w2ui_copy_js: 'cp w2ui/dist/w2ui.js app/assets/js/w2ui.js'
      oa_errors: 'cp node_modules/oa-errors/lib/errors.js app/assets/js/oa-errors.js'
      socketio_js: 'cp node_modules/socket.io-client/dist/socket.io.js app/assets/vendor/socket.io-1.7.4.js'
      build_assets: 'connect-assets -i app/assets -c js/* css/* bower/* vendor/* -o dist/builtAssets -s /assets/bld'


    mochaTest:

      # Run all the tests
      test:
        options:
          reporter: 'spec'
          captureFile: 'results.txt'
          quiet: false
          clearRequireCache: false
          require: [
            'coffee-script/register'
            'chai'
          ]
        src: ['test/**/*_spec.coffee']

    # Automatically runs things on file changes
    watch:
      test:
        files: ['test/**/*_spec.*']
        tasks: ['mochaTest']
 
      assets:
        files: ['app/assets/**/*']
        tasks: ['build-assets']

      fordist:
        files: ['app/**/*', 'lib/**/*']
        tasks: ['build-dev']


    # Takes the useful bits of bower_components and puts it into
    # the connect-assets layout
    bowercopy:

      assets:
        options:
          destPrefix: 'app/assets/bower'
        files:
          'bluebird.js' : 'bluebird/js/browser/bluebird.js'
          'bootstrap.js':   'bootstrap/dist/js/bootstrap.js'
          'bootstrap-contextmenu.js': 'bootstrap-contextmenu/bootstrap-contextmenu.js'
          'bootstrap-validator.js' : 'bootstrap-validator/js/validator.js'
          'bootstrap3-typeahead.js': 'bootstrap3-typeahead/bootstrap3-typeahead.js'
          'chai.js': 'chai/chai.js'
          'clipboard.js': 'clipboard/dist/clipboard.min.js'
          'd3.js': 'd3/d3.js'
          'debug.js':       'visionmedia-debug/dist/debug.js'
          'FileSaver.js': 'FileSaver/FileSaver.js'
          'highlightRegex.js' : 'jquery-highlightRegex/highlightRegex.js'
          'jquery.js':      'jquery/dist/jquery.js'
          'jquery-ui.js' : 'jquery-ui/jquery-ui.js'
          'jquery-timeago.js': 'jquery-timeago/jquery.timeago.js'
          'lodash.js':      'lodash/lodash.js'
          'metrics-graphics.js': 'metrics-graphics/dist/metricsgraphics.js'
          'mocha.js': 'mocha/mocha.js'
          'mocha.css': 'mocha/mocha.css'
          'mustache.js': 'mustache/mustache.js'
          'outdatedbrowser.js': 'outdated-browser/outdatedbrowser/outdatedbrowser.js'
          'outdatedbrowser.css': 'outdated-browser/outdatedbrowser/outdatedbrowser.css'
          'sinon.js': 'sinon/lib/sinon.js'
          'URI.min.js':     'uri.js/src/URI.min.js'
      vendor:
        options:
          destPrefix: 'app/assets/vendor'
        files:
          'socket.io-client.js': 'socket.io-client/dist/socket.io.js'

      fonts:
        files:
          'public/font/': 'bootstrap/dist/fonts/'

      bootstrap_bits:
        files:
          'app/assets/bootstrap_less': 'bootstrap/less'

    # Unzip a file form a localdir
    unzip:
      font_source_sans:
        router: (path) ->
          # We only want a couple of files, the license and the regular font
          return path if path.match /License|Regular/
          return null

        dest: 'public/font'
        src: ['distributed/source-sans-pro.zip']

      font_roboto:
        router: (path) ->
          # We only want a couple of files, the license and the regular font
          return path if path.match /License|Regular/
          return null

        dest: 'public/font'
        src: ['distributed/roboto.zip']

      font_lato:
        router: (path) ->
          # We only want a couple of files, the license and the regular font
          return null unless path.match /^Lato2OFLWeb/
          if m = path.match /(OFL.txt|Lato-Light\..*|Lato-Black\..*)/
            return m[1]
          return null

        dest: 'public/font'
        src: ['distributed/lato2.zip']


  # Load all the tasks that we use
  # These will need to be in package.json as well
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-copy'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-exec'
  grunt.loadNpmTasks 'grunt-coffeelint'
  grunt.loadNpmTasks 'grunt-mocha-test'
  grunt.loadNpmTasks 'grunt-bowercopy'
  grunt.loadNpmTasks 'grunt-zip'


  # Define your own tasks
  # This is needed when something you define includes
  # more than one plugin
  grunt.registerTask 'bower',   [
    'exec:bower_install'
    'bowercopy:assets'
    'bowercopy:bootstrap_bits'
  ]
  grunt.registerTask 'font',    [ 'unzip:font_roboto', 'unzip:font_source_sans', 'unzip:font_lato' ]
  grunt.registerTask 'w2ui',    [ 'exec:pull_git_modules', 'exec:w2ui_less', 'exec:w2ui_build', 'exec:w2ui_copy_js' ]
  grunt.registerTask 'w2ui-dev',    [ 'exec:w2ui_less', 'exec:w2ui_build', 'exec:w2ui_copy_js' ]
  # Pull in all the dependencies
  grunt.registerTask 'deps',    [ 'w2ui', 'font', 'bower', 'exec:oa_errors', 'exec:socketio_js' ]

  # Tests for rules
  grunt.registerTask 'default', [ 'mochaTest' ]

  grunt.registerTask 'build-dev', [ 'coffee', 'copy']
  grunt.registerTask 'build-assets', [ 'copy:assets']

  grunt.registerTask 'install-deps', [ 'exec:bower_install', 'font']
  grunt.registerTask 'build-dist', [ 'coffee', 'bowercopy:fonts', 'bowercopy:assets', 'bowercopy:vendor', 'copy:dev', 'copy:config_dist', 'copy:swagger_dist', 'copy:assets', 'copy:bins', 'copy:docker', 'exec:build_assets']
  
