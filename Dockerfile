FROM alpine:3.13

ENV BASE_URL="https://get.helm.sh"

ENV HELM_FILE="helm-v3.5.3-linux-amd64.tar.gz"

RUN apk add --no-cache ca-certificates \
    --repository http://dl-3.alpinelinux.org/alpine/edge/community/ \
    jq curl bash nodejs yarn && \
    \
    curl -L ${BASE_URL}/${HELM_FILE} | tar xvz && \
    mv linux-amd64/helm /usr/bin/helm && \
    chmod +x /usr/bin/helm && \
    rm -rf linux-amd64 && \


COPY . /usr/src

RUN ["yarn", "--cwd", "/usr/src", "install"]

ENTRYPOINT ["node", "--experimental-modules", "/usr/src/index.js"]
