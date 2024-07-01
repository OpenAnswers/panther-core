/*
 * Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.  
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

pipeline {
  environment {
    DOCKER_IMG_BASE = 'oa-panther-event-'
    PKG_VERSION = 'latest'
  }
  options {
    disableConcurrentBuilds()
    buildDiscarder(logRotator(artifactDaysToKeepStr: '', artifactNumToKeepStr: '', daysToKeepStr: '7', numToKeepStr: '5'))
  }
  parameters {
    string(defaultValue: '', description: 'Docker Registry URL', name: 'REGISTRY_URL', trim: true)
    string(defaultValue: 'XXXX-XXXX', description: 'Docker Registry credentials', name: 'REGISTRY_CREDS', trim: true)

    string(defaultValue: 'oa-panther-event-server', description: 'Panther event server image name', name: 'DOCKER_IMG_EVENT_SERVER', trim: true)
    string(defaultValue: 'oa-panther-event-console', description: 'Panther event console image name', name: 'DOCKER_IMG_EVENT_CONSOLE', trim: true)
    string(defaultValue: 'oa-panther-event-monitors', description: 'Panther event monitors image name', name: 'DOCKER_IMG_EVENT_MONITORS', trim: true)

    gitParameter(
      name: 'GIT_BRANCH',
      description: 'Git branch to build from',
      branch: '',
      branchFilter: 'origin/(.*)',
      defaultValue: 'development',
      quickFilterEnabled: true,
      selectedValue: 'DEFAULT',
      sortMode: 'NONE',
      tagFilter: '*',
      type: 'PT_BRANCH_TAG'
    )
    booleanParam(defaultValue: true, description: 'Build panther-server', name: 'BUILD_PANTHER_SERVER')
    booleanParam(defaultValue: true, description: 'Build panther-console', name: 'BUILD_PANTHER_CONSOLE')
    booleanParam(defaultValue: true, description: 'Build panther-monitors', name: 'BUILD_PANTHER_MONITORS')
    booleanParam(defaultValue: true, description: 'bump prepatch version', name: 'NPM_BUMP_PREPATCH')

    booleanParam(defaultValue: true, description: 'Publish to nexus', name: 'PUBLISH_TO_NEXUS')
    booleanParam(defaultValue: true, description: 'Perform Grype scan', name: 'GRYPE_SCAN')
    extendedChoice(
      name: 'BUILDTIME_ENV',
      description: 'Build time $NODE_ENV',
      multiSelectDelimiter: ',',
      type: 'PT_SINGLE_SELECT',
      value: 'production,development',
      defaultValue: 'production',
      visibleItemCount: 5
    )
    extendedChoice(
      name: 'RUNTIME_ENV',
      description: 'Run time $NODE_ENV',
      multiSelectDelimiter: ',',
      type: 'PT_SINGLE_SELECT',
      value: 'production,development',
      defaultValue: 'production',
      visibleItemCount: 5
    )
    string(defaultValue: '', description: '', name: 'VERSION', trim: true)
    extendedChoice(
      name: 'AGENT',
      description: 'Agent to perform build on',
      multiSelectDelimiter: ',',
      type: 'PT_SINGLE_SELECT',
      value: 'docker && aws,docker && !aws',
      defaultValue: 'docker && aws',
      visibleItemCount: 5
    )
  }
  agent {
    node {
      label params.AGENT
    }
  }
  stages {
    stage('Setup'){
      steps {
        script {
          sh 'env'
          PKG_VERSION = sh(
            script: '''node -p -e "require('./lerna.json').version"''',
            returnStdout: true
          ).trim()
          println "NODE PKG VERSION = ${PKG_VERSION}"
        }
      }
    }
    stage('Pre Build'){
      parallel {
        stage('panther-builder'){
          steps {
            script {
              docker.build("panther-builder:hydrogen-alpine3.18", " -f Dockerfiles/Dockerfile-builder .")
            }
          }
        }
        stage('panther-runtime'){
          steps {
            script {
              docker.build("panther-runtime:hydrogen-alpine3.18", " -f Dockerfiles/Dockerfile-runtime .")
            }
          }
        }
      }
    }
    stage('Grype Code'){
      when {
        expression { params.GRYPE_SCAN == true }
      }
      steps {
        grypeScan scanDest: "dir:.", repName: "grype-code.txt", autoInstall: true
      }
    }
    stage('Build') {
        parallel {
            stage('event-server') {
                steps {
                    script {
                        if(params.BUILD_PANTHER_SERVER){
                            docker.withRegistry(params.REGISTRY_URL, params.REGISTRY_CREDS) {
                                dockerImageServer = docker.build(params.DOCKER_IMG_EVENT_SERVER, " --build-arg RUNTIME_VERSION=${params.VERSION} --build-arg BUILDTIME_ENV=${params.BUILDTIME_ENV} --build-arg RUNTIME_ENV=${params.RUNTIME_ENV} --label git.hash=${GIT_COMMIT} --label git.branch=${params.GIT_BRANCH} -f Dockerfiles/Dockerfile-event-server .")

                                println "versioning with ${PKG_VERSION}"
                                if(params.PUBLISH_TO_NEXUS) {
                                    dockerImageServer.push("latest");
                                    dockerImageServer.push(params.GIT_BRANCH)
                                    dockerImageServer.push( "${PKG_VERSION}-version")

                                    if(params.VERSION != params.GIT_BRANCH && params.VERSION != "latest") {
                                        dockerImageServer.push(params.VERSION)

                                        def version_split = []
                                        version_split = params.VERSION.split(/[\.]/)
                                        if(version_split.size() == 3 ){
                                          // major.minor.patch
                                          println "major: " + version_split[0] 
                                          println "minor: " + version_split[1] 
                                          println "patch: " + version_split[2] 
                                          dockerImageServer.push(version_split[0] + "." + version_split[1] + "." + version_split[2])
                                          dockerImageServer.push(version_split[0] + "." + version_split[1] )
                                          dockerImageServer.push(version_split[0] )

                                        }

                                    }
                                } else {
                                    println "Skipping publish to nexus"
                                }
                            }
                        } else {
                            println "Skipping server build"
                        }
                    }
                }
            }
            stage('event-console') {
                steps {
                    script {
                        if(params.BUILD_PANTHER_CONSOLE){
                            docker.withRegistry(params.REGISTRY_URL, params.REGISTRY_CREDS) {
                                dockerImageConsole = docker.build(params.DOCKER_IMG_EVENT_CONSOLE, 
                                  " --build-arg BUILD_PANTHER_VERSION=${params.VERSION} --build-arg RUNTIME_VERSION=${params.VERSION} --build-arg BUILDTIME_ENV=${params.BUILDTIME_ENV} --build-arg RUNTIME_ENV=${params.RUNTIME_ENV} --label git.hash=${GIT_COMMIT} --label git.branch=${params.GIT_BRANCH} -f Dockerfiles/Dockerfile-event-console .")

                                if(params.PUBLISH_TO_NEXUS) {
                                    dockerImageConsole.push("latest");
                                    dockerImageConsole.push(params.GIT_BRANCH)
                                    dockerImageConsole.push( "${PKG_VERSION}-version")

                                    if(params.VERSION != params.GIT_BRANCH && params.VERSION != "latest") {
                                        dockerImageConsole.push(params.VERSION)

                                        def version_split = []
                                        version_split = params.VERSION.split(/[\.]/)
                                        if(version_split.size() == 3 ){
                                          // major.minor.patch
                                          println "major: " + version_split[0] 
                                          println "minor: " + version_split[1] 
                                          println "patch: " + version_split[2] 
                                          dockerImageConsole.push(version_split[0] + "." + version_split[1] + "." + version_split[2])
                                          dockerImageConsole.push(version_split[0] + "." + version_split[1] )
                                          dockerImageConsole.push(version_split[0] )

                                        }

                                    }
                                } else {
                                    println "Skipping publish to nexus"
                                }
                            }
                        } else {
                            println "Skipping console build"
                        }
                    }
                }
            }

            stage('event-monitors') {
                steps {
                    script {
                        def monitors = ['http', 'syslogd']
                        if(params.BUILD_PANTHER_MONITORS){
                            docker.withRegistry(params.REGISTRY_URL, params.REGISTRY_CREDS) {
                                dockerImageMonitors = docker.build(params.DOCKER_IMG_EVENT_MONITORS, " --build-arg RUNTIME_VERSION=${params.VERSION} --build-arg BUILDTIME_ENV=${params.BUILDTIME_ENV} --build-arg RUNTIME_ENV=${params.RUNTIME_ENV} --label git.hash=${GIT_COMMIT} --label git.branch=${params.GIT_BRANCH} -f Dockerfiles/Dockerfile-event-monitors .")

                                if(params.PUBLISH_TO_NEXUS) {
                                    dockerImageMonitors.push("latest");
                                    dockerImageMonitors.push(params.GIT_BRANCH)
                                    dockerImageMonitors.push( "${PKG_VERSION}-version")

                                    if(params.VERSION != params.GIT_BRANCH && params.VERSION != "latest") {
                                        dockerImageMonitors.push(params.VERSION)

                                        def version_split = []
                                        version_split = params.VERSION.split(/[\.]/)
                                        if(version_split.size() == 3 ){
                                          // major.minor.patch
                                          println "major: " + version_split[0] 
                                          println "minor: " + version_split[1] 
                                          println "patch: " + version_split[2] 
                                          dockerImageMonitors.push(version_split[0] + "." + version_split[1] + "." + version_split[2])
                                          dockerImageMonitors.push(version_split[0] + "." + version_split[1] )
                                          dockerImageMonitors.push(version_split[0] )

                                        }

                                    }
                                } else {
                                    println "Skipping publish to nexus"
                                }
                            }

                            for(int i = 0; i< monitors.size(); i++){
                              println "monitor = ${monitors[i]}"
                              docker.withRegistry(params.REGISTRY_URL, params.REGISTRY_CREDS) {
                                  dockerImage = docker.build(params.DOCKER_IMG_EVENT_MONITORS + "-${monitors[i]}", " --build-arg BUILD_AGENT_NAME=${monitors[i]} --build-arg RUNTIME_VERSION=${params.VERSION} --build-arg BUILDTIME_ENV=${params.BUILDTIME_ENV} --build-arg RUNTIME_ENV=${params.RUNTIME_ENV} --label git.hash=${GIT_COMMIT} --label git.branch=${params.GIT_BRANCH} -f Dockerfiles/Dockerfile-event-monitors .")

                                  if(params.PUBLISH_TO_NEXUS) {
                                      dockerImage.push("latest");
                                      dockerImage.push(params.GIT_BRANCH)
                                      dockerImage.push( "${PKG_VERSION}-version")

                                      if(params.VERSION != params.GIT_BRANCH && params.VERSION != "latest") {
                                          dockerImage.push(params.VERSION)

                                          def version_split = []
                                          version_split = params.VERSION.split(/[\.]/)
                                          if(version_split.size() == 3 ){
                                            // major.minor.patch
                                            println "major: " + version_split[0] 
                                            println "minor: " + version_split[1] 
                                            println "patch: " + version_split[2] 
                                            dockerImage.push(version_split[0] + "." + version_split[1] + "." + version_split[2])
                                            dockerImage.push(version_split[0] + "." + version_split[1] )
                                            dockerImage.push(version_split[0] )

                                          }

                                      }
                                  } else {
                                      println "Skipping publish to nexus"
                                  }
                              }



                            }
                        } else {
                            println "Skipping monitors build"
                        }
                    }
                }
            }

        }
    }
    stage('Grype Image'){
      when {
        expression { params.GRYPE_SCAN == true }
      }
      steps {
        grypeScan scanDest: "docker:${env.DOCKER_IMG_EVENT_SERVER}", repName: "grype-image-server.txt", autoInstall: true
        grypeScan scanDest: "docker:${env.DOCKER_IMG_EVENT_CONSOLE}", repName: "grype-image-console.txt", autoInstall: true
        grypeScan scanDest: "docker:${env.DOCKER_IMG_EVENT_MONITORS}", repName: "grype-image-monitors.txt", autoInstall: true
      }
    }
  }
}
