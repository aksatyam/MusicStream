# Build Invidious from source for ARM64 / Apple Silicon compatibility
FROM crystallang/crystal:1.14.1-alpine AS builder

RUN apk add --no-cache \
  yaml-dev yaml-static \
  libxml2-dev libxml2-static \
  openssl-dev openssl-libs-static \
  sqlite-dev sqlite-static \
  zlib-dev zlib-static \
  git make

WORKDIR /invidious
RUN git clone --depth 1 https://github.com/iv-org/invidious.git .

RUN shards install --production && \
    crystal build src/invidious.cr \
      --release \
      --static \
      --no-debug \
      -o /invidious/invidious

FROM alpine:3.20

RUN apk add --no-cache \
  ca-certificates \
  librsvg \
  wget \
  tini

WORKDIR /invidious
COPY --from=builder /invidious/invidious ./invidious
COPY --from=builder /invidious/locales ./locales
COPY --from=builder /invidious/config ./config
COPY --from=builder /invidious/assets ./assets

EXPOSE 3001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/invidious/invidious"]
