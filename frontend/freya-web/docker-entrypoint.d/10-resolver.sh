#!/bin/sh
set -e
RESOLVER=$(awk '/^nameserver / { print $2; exit }' /etc/resolv.conf)
if [ -z "$RESOLVER" ]; then
  RESOLVER=127.0.0.11
fi
sed "s/__NGINX_RESOLVER__/${RESOLVER}/g" /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
