#!/bin/sh
if [ -f ~/.nvm/nvm.sh ]
then
  source ~/.nvm/nvm.sh
  nvm run $*
else
  node $*
fi
