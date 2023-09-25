FROM alpine:3.13

ENV BASE_URL="https://get.helm.sh"

ENV HELM_FILE="helm-v3.10.0-linux-amd64.tar.gz"

ENV SOPS_URL="https://github.com/getsops/sops/releases/download/v3.8.0/sops-v3.8.0.linux.amd64"

RUN apk add --no-cache ca-certificates \
    --repository http://dl-cdn.alpinelinux.org/alpine/edge/community/ \
    jq curl bash nodejs yarn git && \
    \
    curl -sL -o /usr/local/bin/sops ${SOPS_URL} && \
    chmod +x /usr/local/bin/sops && \
    \
    curl -L ${BASE_URL}/${HELM_FILE} | tar xvz && \
    mv linux-amd64/helm /usr/bin/helm && \
    chmod +x /usr/bin/helm && \
    rm -rf linux-amd64 && \
    helm plugin install https://github.com/jkroepke/helm-secrets --version v3.5.0

COPY . /usr/src

RUN ["yarn", "--cwd", "/usr/src", "install"]

ENTRYPOINT ["node", "--experimental-modules", "/usr/src/index.js"]
