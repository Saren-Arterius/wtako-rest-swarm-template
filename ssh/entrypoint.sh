#!/bin/sh
if [[ -n "${ROOT_PASSWORD}" ]]; then
  echo "root:${ROOT_PASSWORD}" | chpasswd
else
  sed -ri 's/#PasswordAuthentication yes/PasswordAuthentication no/g' /etc/ssh/sshd_config
fi

/usr/sbin/sshd -D