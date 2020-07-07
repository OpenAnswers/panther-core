# use a build image
# final image can specify 
FROM hlcit006.openans.co.uk:9443/panther/builder:latest as builder
WORKDIR $BUILD_DIR

COPY package.json $BUILD_DIR/package.json
ENV CXXFLAGS="-march=nocona -mno-aes -mno-f16c -mno-avx -mno-avx2 -mno-bmi2"
RUN env
RUN cat /proc/cpuinfo
RUN npm install --only=production && rm -f .npmrc 

USER root
COPY automations $BUILD_DIR/automations
COPY bin $BUILD_DIR/bin
COPY controllers $BUILD_DIR/controllers
COPY etc/alertdef.js $BUILD_DIR/etc/
COPY external_commands $BUILD_DIR/external_commands
COPY lib $BUILD_DIR/lib
COPY models $BUILD_DIR/models

# create a slimlined final image
FROM hlcit006.openans.co.uk:9443/oa/node-app
LABEL component="panther/server"
WORKDIR ${APPDIR}
COPY --from=builder /build ${APPDIR}

RUN find ${APPDIR}/ -type f -exec chmod ugo+r '{}' \; && \
  find ${APPDIR}/ -type d -exec chmod ugo+rx '{}' \; && \
  chmod ugo+x ${APPDIR}/bin/* ${APPDIR}/lib/server.js && \
  find -L ${APPDIR}/bin -type f -exec chmod +x '{}' \; 

USER app

# might need --max-old-space-size=170 to increase memory
CMD ["node", "lib/server.js", "--configfile", "etc/server.ini"]
