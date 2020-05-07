FROM alpine:3

RUN apk --update add --no-cache openssh bash \
  && sed -i s/#PermitRootLogin.*/PermitRootLogin\ yes/ /etc/ssh/sshd_config \
  && rm -rf /var/cache/apk/*
RUN sed -ri 's/AllowTcpForwarding no/AllowTcpForwarding yes/g' /etc/ssh/sshd_config
RUN sed -ri 's/GatewayPorts no/GatewayPorts yes/g' /etc/ssh/sshd_config
RUN sed -ir 's/#HostKey \/etc\/ssh\/ssh_host_rsa_key/HostKey \/etc\/ssh\/ssh_host_rsa_key/g' /etc/ssh/sshd_config
RUN sed -ir 's/#HostKey \/etc\/ssh\/ssh_host_dsa_key/HostKey \/etc\/ssh\/ssh_host_dsa_key/g' /etc/ssh/sshd_config
RUN sed -ir 's/#HostKey \/etc\/ssh\/ssh_host_ecdsa_key/HostKey \/etc\/ssh\/ssh_host_ecdsa_key/g' /etc/ssh/sshd_config
RUN sed -ir 's/#HostKey \/etc\/ssh\/ssh_host_ed25519_key/HostKey \/etc\/ssh\/ssh_host_ed25519_key/g' /etc/ssh/sshd_config

RUN /usr/bin/ssh-keygen -A
RUN ssh-keygen -t rsa -b 4096 -f /etc/ssh/ssh_host_key

ADD entrypoint.sh /entrypoint.sh
CMD ["sh", "/entrypoint.sh"]