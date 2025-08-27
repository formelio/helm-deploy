FROM alpine:3.13

ENV HELM_DOWNLOAD_URL="https://get.helm.sh/helm-v3.18.6-linux-amd64.tar.gz"
ENV SOPS_DOWNLOAD_URL="https://github.com/getsops/sops/releases/download/v3.10.2/sops-v3.10.2.linux.amd64"

RUN apk add --no-cache ca-certificates \
    --repository http://dl-cdn.alpinelinux.org/alpine/edge/community/ \
    jq curl bash nodejs yarn git && \
    \
    curl -sL -o /usr/local/bin/sops ${SOPS_DOWNLOAD_URL} && \
    chmod +x /usr/local/bin/sops && \
    \
    curl -L ${HELM_DOWNLOAD_URL} | tar xvz && \
    mv linux-amd64/helm /usr/bin/helm && \
    chmod +x /usr/bin/helm && \
    rm -rf linux-amd64 && \
    helm plugin install https://github.com/jkroepke/helm-secrets

COPY . /usr/src

RUN ["yarn", "--cwd", "/usr/src", "install"]

ENTRYPOINT ["node", "--experimental-modules", "/usr/src/index.js"]
