import core from "@actions/core";
import exec from "@actions/exec";
import { promises as fsp } from "fs";

const getValues = (values) => {
  if (!values) {
    return JSON.stringify({});
  }
  if (typeof values === "object") {
    return JSON.stringify(values);
  }
  return values;
};

const getValueFiles = (files) => {
  let fileList;
  if (typeof files === "string") {
    try {
      fileList = JSON.parse(files);
    } catch (err) {
      // Assume it's a single string.
      fileList = [files];
    }
  } else {
    fileList = files;
  }
  if (!Array.isArray(fileList)) {
    return [];
  }
  return fileList.filter((f) => !!f);
};

const run = async () => {
  try {
    const release = core.getInput("release");
    const namespace = core.getInput("namespace");
    const chart = core.getInput("chart");
    const chartVersion = core.getInput("chart-version");
    const repository = core.getInput("repository");
    const values = getValues(core.getInput("values"));
    const valueFiles = getValueFiles(core.getInput("value-files"));
    const secretsFiles = getValueFiles(core.getInput("secrets-files"));
    const task = core.getInput("task");
    const timeout = core.getInput("timeout");
    const dryRun = core.getInput("dry-run");
    const atomic = core.getInput("atomic") || true;
    const image = core.getInput("image");
    const tag = core.getInput("tag");

    core.debug(`param: release = "${release}"`);
    core.debug(`param: namespace = "${namespace}"`);
    core.debug(`param: chart = "${chart}"`);
    core.debug(`param: chartVersion = "${chartVersion}"`);
    core.debug(`param: repository = "${repository}"`);
    core.debug(`param: values = "${values}"`);
    core.debug(`param: valueFiles = "${JSON.stringify(valueFiles)}"`);
    core.debug(`param: secretsFiles = "${JSON.stringify(secretsFiles)}"`);
    core.debug(`param: task = "${task}"`);
    core.debug(`param: timeout = ${timeout}`);
    core.debug(`param: dryRun = "${dryRun}"`);
    core.debug(`param: atomic = "${atomic}"`);
    core.debug(`param: image = "${image}"`);
    core.debug(`param: tag = "${tag}"`);

    const args = [
      "upgrade",
      release,
      chart,
      "--install",
      "--wait",
      `--namespace=${namespace}`,
    ];

    // Per https://helm.sh/docs/faq/#xdg-base-directory-support
    process.env.XDG_DATA_HOME = "/root/.local/share";
    process.env.XDG_CACHE_HOME = "/root/.cache";
    process.env.XDG_CONFIG_HOME = "/root/.config";

    if (dryRun) args.push("--dry-run");
    if (image) args.push(`--set=image.name=${image}`);
    if (tag) args.push(`--set=image.tag=${tag}`);
    if (chartVersion) args.push(`--version=${chartVersion}`);
    if (repository) args.push(`--repo=${repository}`);
    if (timeout) args.push(`--timeout=${timeout}`);
    if (atomic === true) args.push("--atomic");

    // Add all the value files
    valueFiles.forEach((f) => args.push(`--values=${f}`));

    // Add all the Helm Secrets files
    secretsFiles.forEach((f) => args.push(`--values=secrets://${f}`));

    // Add the individually added values
    await fsp.writeFile("/values.yml", values);
    args.push("--values=/values.yml");

    // Setup the Kubeconfig file
    if (process.env.KUBECONFIG_FILE) {
      process.env.KUBECONFIG = "/kubeconfig.yml";
      await fsp.writeFile(process.env.KUBECONFIG, process.env.KUBECONFIG_FILE);
    }

    // Setup the GCP credentials, if specified
    if (process.env.GCP_KMS_KEY_FILE) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = "/gcp_kms_key.json";
      await fsp.writeFile(
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
        process.env.GCP_KMS_KEY_FILE
      );
    }

    if (task === "remove") {
      // Delete the deployment
      await exec.exec("helm", ["delete", "-n", namespace, release], {
        ignoreReturnCode: true,
      });
    } else {
      // Execute the deployment
      await exec.exec("helm", args);
    }
  } catch (err) {
    core.error(err);
    core.setFailed(err.message);
  }
};

run();
