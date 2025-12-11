import core from "@actions/core";
import exec from "@actions/exec";
import { parseCSV } from "@google-github-actions/actions-utils";
import { promises as fsp } from "fs";

const getValues = (input) => {
  const values = [];

  for (const line of input.split(/\r|\n/)) {
    const pieces = parseCSV(line);

    for (const piece of pieces) {
      const [key, value] = piece.trim().split('=', 2);

      values.push([key, value]);
    }
  }

  return values;
};

const parseJsonList = (json) => {
  let list;
  if (typeof json === "string") {
    try {
      list = JSON.parse(json);
    } catch (err) {
      // Assume it's a single string.
      list = [json];
    }
  } else {
    list = json;
  }
  if (!Array.isArray(list)) {
    return [];
  }
  return list.filter((f) => !!f);
};

const run = async () => {
  try {
    const release = core.getInput("release");
    const namespace = core.getInput("namespace");
    const chart = core.getInput("chart");
    const chartVersion = core.getInput("chart-version");
    const repository = core.getInput("repository");
    const values = getValues(core.getInput("values"));
    const valueFiles = parseJsonList(core.getInput("value-files"));
    const secretsFiles = parseJsonList(core.getInput("secrets-files"));
    const task = core.getInput("task");
    const timeout = core.getInput("timeout");
    const dryRun = core.getInput("dry-run");
    const atomic = core.getInput("atomic") || true;
    const image = core.getInput("image");
    let imageFields = parseJsonList(core.getInput("image-fields"));
    const tag = core.getInput("tag");
    let tagFields = parseJsonList(core.getInput("tag-fields"));

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
    core.debug(`param: imageFields = "${JSON.stringify(imageFields)}"`)
    core.debug(`param: tag = "${tag}"`);
    core.debug(`param: tagFields = "${JSON.stringify(tagFields)}"`)

    const args = [
      "upgrade",
      release,
      chart,
      "--install",
      "--wait",
      `--namespace=${namespace}`,
      "--dependency-update",
      "--create-namespace",
    ];

    // Per https://helm.sh/docs/faq/#xdg-base-directory-support
    process.env.XDG_DATA_HOME = "/root/.local/share";
    process.env.XDG_CACHE_HOME = "/root/.cache";
    process.env.XDG_CONFIG_HOME = "/root/.config";

    // Add all the value files
    valueFiles.forEach((f) => args.push(`--values=${f}`));

    // Add all the Helm Secrets files
    secretsFiles.forEach((f) => args.push(`--values=secrets://${f}`));


    // Set default image field to "image.name"
    if (imageFields.length === 0) imageFields = ["image.name"]

    // Set default tag field to "image.tag"
    if (tagFields.length === 0) tagFields = ["image.tag"]

    if (values) {
      for (const [key, value] of values) {
        args.push(`--set=${key}=${value}`);
      }
    }

    if (image) {
      for (const imageField of imageFields) {
        args.push(`--set=${imageField}=${image}`);
      }
    }

    if (tag) {
      for (const tagField of tagFields) {
        args.push(`--set=${tagField}=${tag}`);
      }
    }

    if (dryRun) args.push("--dry-run");
    if (chartVersion) args.push(`--version=${chartVersion}`);
    if (repository) args.push(`--repo=${repository}`);
    if (timeout) args.push(`--timeout=${timeout}`);
    if (atomic === true) args.push("--atomic");

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
