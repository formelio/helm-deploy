# Helm Deploy Github action

Github action that performs a [Helm](https://helm.sh/) deployment with support for [Helm Secrets](https://github.com/jkroepke/helm-secrets). Largely based on [deliverybot/helm](https://github.com/deliverybot/helm). Only supports Helm 3.

## Limitations
- No Helm 2 support
- Only supports the SOPS secret driver with GCP KMS (and possibly PGP)

## Parameters

### Inputs

- `release`: Helm release name. (required)
- `namespace`: Kubernetes namespace name. (required)
- `chart`: Helm chart path. (required)
- `chart_version`: Helm chart version.
- `repository`: Helm repository to get the chart from.
- `values`: Helm chart values, expected to be a YAML or JSON string.
- `value-files`: Additional value files to apply to the helm chart. Expects JSON encoded array or a string.
- `secrets-files`: Helm Secrets files to apply to the helm chart as values. Expects JSON
  encoded array or a string.
- `task`: Task name. If the task is "remove" it will remove the configured helm release.
- `dry-run`: Helm dry-run option.
- `atomic`: If true, upgrade process rolls back changes made in case of failed upgrade. Defaults to true.
- `timeout`: specify a timeout for helm deployment
- `image`: Image to deploy. Overrides the image.name value.
- `imageFields`: Fields to insert the image name in. Expects JSON encoded array or a string. Defaults to "image.name".
- `tag`: Image tag to deploy, usually commit sha or Git tag. Overrides the image.tag value.
- `tagFields`: Fields to insert the image tags in. Expects JSON encoded array or a string. Defaults to "image.tag".

### Environment

- `KUBECONFIG_FILE`: Kubeconfig file for Kubernetes cluster access.
- `GCP_KMS_KEY_FILE`: Key file for a [GCP service account](https://cloud.google.com/docs/authentication/production) with access to the KMS keys. Required if secrets files are (partially) encrypted with GCP KMS.

## Example usage

```yaml
name: Deploy with Helm

on:
  push:
    branches: [master]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v2

      - name: Deploy
        uses: ivido/helm-deploy@v1
        with:
          release: my-release
          namespace: my-namespace
          chart: ./chart
          value-files: "./chart/values.yaml"
          secrets-files: "./chart/secrets.yaml"
          tag: ${{ github.sha }}
        env:
          KUBECONFIG_FILE: ${{ secrets.KUBECONFIG }}
          GCP_KMS_KEY_FILE: ${{ secrets.GCP_KMS_KEY }}
```
