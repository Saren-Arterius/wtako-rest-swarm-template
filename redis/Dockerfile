FROM redis:5-alpine

RUN apk add socat python3
ADD entrypoint.sh /
ADD sentinel-proxy.py /

USER redis

CMD ["sh", "/entrypoint.sh"]