# renovate-bot

<!-- vim-markdown-toc GFM -->

- [Overview](#overview)
- [Renovate](#renovate)
- [Token](#token)
- [Renovate bot configuration](#renovate-bot-configuration)
- [Scan new repositories](#scan-new-repositories)
- [Preset config](#preset-config)
- [Signed commits](#signed-commits)
  - [Generating a GPG key](#generating-a-gpg-key)
  - [Add the public GPG to GitHub](#add-the-public-gpg-to-github)
  - [Add the private GPG key to `eana-bot`](#add-the-private-gpg-key-to-eana-bot)
- [Using CircleCI](#using-circleci)
  - [The pipeline](#the-pipeline)
  - [Scheduled triggers](#scheduled-triggers)
- [Final words](#final-words)

<!-- vim-markdown-toc -->

## Overview

A lot of developers either spend a lot of time on dependency management or
spend no time on it at all. Often the developers don't even know that a new
version of a dependency has been released.

Especially in large projects it frequently happens to skip 2-4 Major Versions
before updating the dependencies again, simply because no one spends time to
regularly check for updates. Bots like [renovate] or [dependabot] try to solve
this by creating a new MR as soon as a new version of a dependency has been
released. Unfortunately, these bots are not that well known yet and could be
tricky to configure.

This repository tries to mitigate this very problem.

[renovate]: https://github.com/renovatebot/renovate
[dependabot]: https://dependabot.com/

## Renovate

Renovate is an open source project that you can be self-hosted. The hosted
service works fine if your project is on [GitHub] or [GitLab], but I've decided
to run the service myself. This sounds a lot more complicated than it actually
is, but it is not and the rest of this document will show you how to do it.

Renovate will use the [eana-bot] user to open merge requests. It will also have
a dedicated [repository] for the main configuration. The CircleCI config on
this repository will take care of regularly running the Renovate bot.

Renovate is a JavaScript-based project, but it supports updating dependencies
of a lot of other languages too. Because it is based on JavaScript we will use
`npm` (or `yarn` if you prefer) to install it and for that the first file we
will create is the `package.json` file.

```json
{
  "name": "renovate-bot",
  "private": true,
  "scripts": {
    "renovate": "renovate"
  },
  "dependencies": {
    "npm": "9.1.2",
    "renovate": "34.29.2"
  }
}
```

Afterwards, run `npm install` in the repository to install the renovate package
into the `node_modules` folder. This step should also create a
`package-lock.json` file which needs to be committed to the repository together
with the new `package.json` file.

```bash
$ docker run -it --rm -v $(pwd):/data cimg/node:19.1.0 bash
$ cd /data
$ npm install --verbose
$ exit
```

Note: The `node_modules` should not be checked in the git repository and hence
should be added to `.gitignore`.

[github]: https://github.com
[gitlab]: https://about.gitlab.com
[eana-bot]: https://github.com/eana-bot
[repository]: https://github.com/bolawell/renovate-bot

## Token

Note: If you plan to use the Renovate bot in a GitHub organization it's highly
recommended to have a dedicated user for this, because using personal users is
not a good practice and the Renovate bot will stop working when the user will
be deleted.

[Generate a personal access token] with the `repo:public_repo` scope for only
public repositories or the `repo` scope for public and private repositories,
and add write it down for later use.

[generate a personal access token]: https://github.com/settings/tokens

## Renovate bot configuration

By default, renovate expects this to be called `config.js`. Inside this file we
will configure how Renovate will behave by default. Please note that most of
this can be overridden on a per-repository basis.

```js
module.exports = {
  platform: "github",
  gitAuthor: "Eana Bot <eana-bot@eana.ro>",
  token: process.env.GITHUB_COM_TOKEN,
  gitPrivateKey: process.env.GPG_KEY,

  hostRules: [
    {
      hostType: "ecr",
      matchHost: "/d+.dkr.ecr.[-a-z0-9]+.amazonaws.com/",
      awsAccessKeyID: process.env.AWS_ACCESS_KEY_ID,
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  ],

  requireConfig: true,
  onboarding: true,

  onboardingConfig: {
    $schema: "https://docs.renovatebot.com/renovate-schema.json",
    extends: ["github>bolawell/renovate-config"],
  },
};

const fs = require("fs");
if (fs.existsSync("renovate-repos.json")) {
  if (
    !"CIRCLE_NODE_INDEX" in process.env ||
    !"CIRCLE_NODE_TOTAL" in process.env
  ) {
    console.log(
      "renovate-repos.json exists, but CIRCLE_NODE_INDEX and CIRCLE_NODE_TOTAL are not set. See https://circleci.com/docs/parallelism-faster-jobs"
    );
    process.exit(1);
  }

  segmentNumber = Number(process.env.CIRCLE_NODE_INDEX); // CIRCLE_NODE_INDEX is 1 indexed
  segmentTotal = Number(process.env.CIRCLE_NODE_TOTAL);
  allRepositories = JSON.parse(fs.readFileSync("renovate-repos.json"));
  allSize = allRepositories.length;
  chunkSize = parseInt(allSize / segmentTotal);
  chunkStartIndex = chunkSize * (segmentNumber - 1);
  chunkEndIndex = chunkSize * segmentNumber;

  if (chunkEndIndex > allSize) {
    chunkEndIndex = allSize;
  }

  segmentNumber = Number(process.env.CIRCLE_NODE_INDEX); // CIRCLE_NODE_INDEX is 1 indexed
  segmentTotal = Number(process.env.CIRCLE_NODE_TOTAL);
  allRepositories = JSON.parse(fs.readFileSync("renovate-repos.json"));
  repositories = allRepositories.filter(
    (_, i) => segmentNumber - 1 === i % segmentTotal
  );
  module.exports.repositories = repositories;
  module.exports.autodiscover = false;
  console.log(
    `renovate-repos.json contains ${allRepositories.length} repositories. This is chunk number ${segmentNumber} of ${segmentTotal} total chunks. Processing ${repositories.length} repositories.`
  );

  console.log(`Repositories to be scanned:`);
  console.log(repositories);
}
```

The first section of the file above tells our Renovate bot how to talk to our
self-hosted GitLab instance and the private key to use to sign the git commits.
Afterwards on which repositories it should run and what the `renovate.json`
config file should look like that it will add to each repository in the first
merge request.

To optimize the pipeline and reduce the running time, we need to scan multiple
repositories in parallel. We do this by defining `parallelism: x` in
[config.yml]. In the second part of the renovate config
file, we split the [renovate-repos.json] file in `x`
chunks. When the pipeline is triggered `x` jobs will be created, each job
scanning their particular chunk of repositories.

_Please note that at the moment of writing this document `x = 3`._

[config.yml](./.circleci/config.yml)
[renovate-repos.json](./renovate-repos.json)

## Scan new repositories

To scan new repositories with renovate we need to add the desired repositories
to the [renovate-repos.json](./renovate-repos.json) file. There should be
only one repository (including the full path) per line, between double-quotes
and the line should end with a comma.

```
[
  "acme/repo1",
  "acme/group/repo",
  "acme/another-group/another-repo"
]
```

Make sure the repositories are sorted alphabetically (this is how you sort the
lines in [IntelliJ](https://www.jetbrains.com/webstorm/guide/tips/sort-lines/),
[vscode](https://thechrisgreen.com/2021/08/vs-code-sort-lines-of-code-in-ascending-or-descending-order/),
[vim]()) and there are no duplicates (this is how you remove duplicates in
[IntelliJ](https://www.jetbrains.com/help/idea/find-and-replace-code-duplicates.html),
[vscode](https://stackoverflow.com/a/45829605),
[vim](https://stackoverflow.com/a/351182)).

## Preset config

We want to manage multiple repositories using Renovate and want the same custom
config across all or most of them, hence we have a preset config so that we can
"extend" it in every applicable repository. This way when we want to change the
Renovate configuration we can make the change in one location rather than
having to copy/paste it to every repository individually. The preset config is
configured in the [renovate-config] repository.

[renovate-config]: https://github.com/bolawell/renovate-config

## Signed commits

Why sign git commits? As useful as signing packages and ISOs is, an even more
important use of GPG signing is in signing Git commits. When you sign a Git
commit, you can prove that the code you submitted came from you and wasn't
altered while you were transferring it. You also can prove that you submitted
the code and not someone else.

For a commit to be verified by GitHub the following things are required:

- The committer must have a GPG public/private key pair.
- The committer's public key must have been uploaded to their GitHub account.
- One of the emails in the GPG key must match a **verified** email address used
  by the committer in GitHub.
- The committer's email address must match the verified email address from the
  GPG key.

### Generating a GPG key

If you don't already have the GPG keys this [document] will help you get
started. Use `Eana bot` for `Real name` and `eana-bot@eana.ro` for `Email address`. Also the key should not expire.

A very **important** note is that you need set an empty passphrase.

[document]: https://docs.github.com/en/github/authenticating-to-github/managing-commit-signature-verification/generating-a-new-gpg-key

### Add the public GPG to GitHub

After generating the GPG keys, the public key must be added to GitHub and this
[guide] could be followed to add it.

[guide]: https://docs.github.com/en/github/authenticating-to-github/managing-commit-signature-verification/adding-a-new-gpg-key-to-your-github-account

### Add the private GPG key to `eana-bot`

We need to export, `base64` encode the key and add it as an environment
variable.

On Linux:

```bash
gpg --armor --export-secret-key eana-bot@eana.ro | base64 | sed ':a;N;$!ba;s/\n//g' | xclip -sel clip
```

On Mac:

```bash
gpg --armor --export-secret-key eana-bot@eana.ro | base64 | sed ':a;N;$!ba;s/\n//g' | pbcopy
```

## Using CircleCI

Create a [CircleCI context] called `renovate-bot` and add three environment
variables as follows:

| Environment variable | Value                                                    |
| -------------------- | -------------------------------------------------------- |
| `GITHUB_COM_TOKEN`   | The generated token                                      |
| `GPG_KEY_BASE64`     | The base64 encoded private key you have in the clipboard |
| `LOG_LEVEL`          | `debug`                                                  |

This token is only used by Renovate, see the [token configuration], and gives
it access to the repositories.

The environment variable `GITHUB_COM_TOKEN` is used when fetching release notes
for repositories in order to increase the hourly API limit.

When using Renovate in a project where dependencies are loaded from
`github.com` (such as Go modules hosted on GitHub) it is highly recommended to
add a token as the rate limit from the github.com API will be reached, which
will lead to Renovate closing and reopening PRs because it could not get
reliable info on updated dependencies.

[circleci context]: https://circleci.com/docs/2.0/contexts/#creating-and-using-a-context
[token configuration]: https://docs.renovatebot.com/self-hosted-configuration/#token

### The pipeline

The pipeline is triggered when a change is [pushed/merged to master]. Having
the pipeline triggered only on pushing or merging pull requests to master is
not enough, we want the renovate bot to run regularly. This pipeline uses
restricted contexts ([aws_svc_renovate] and [renovate-bot]), hence scheduled
workflows can not be used because they can't access these contexts. To make
this work we will use [scheduled pipelines].

[pushed/merged to master]: .circleci/config.yml#L25-L27
[aws_svc_renovate]: https://app.circleci.com/settings/organization/github/bolawell/contexts/f932ee0e-8361-4e37-bf1b-ebb14c5ad115
[renovate-bot]: https://app.circleci.com/settings/organization/github/bolawell/contexts/324bdfb6-36a8-436e-8e11-6e99edc6c08a
[scheduled pipelines]: https://discuss.circleci.com/t/scheduled-pipelines-are-here/41684

### Scheduled triggers

The pipeline can be scheduled by using `scheduled triggers`. At the moment of
writing this document there are two ways to create the triggers.

- the scheduled triggers can now also be managed [via the UI, in the project settings under the "Triggers" section]
- using the [CircleCI API]

To create a new scheduled trigger using the API a [API token] is required.

```bash
curl --location --request POST 'https://circleci.com/api/v2/project/gh/bolawell/renovate-bot/schedule' \
    --header 'circle-token: <your_API_token>' \
    --header 'Content-Type: application/json' \
    --data-raw '{
        "name": "run-renovate-on-schedule",
        "description": "Monday to Friday, at 9:00, 12:00, 15:00",
        "attribution-actor": "current",
        "parameters": {
            "branch": "master"
        },
        "timetable": {
            "per-hour": 1,
            "hours-of-day": [9, 12, 15],
            "days-of-week": ["MON", "TUE", "WED", "THU", "FRI"]
        }
    }'
```

The API call above create a scheduled trigger named `run-renovate-on-schedule`,
owned by the current user (`eana`), against the `master` branch on `Monday to Friday, at 9:00, 12:00, 15:00`

[via the ui, in the project settings under the "triggers" section]: https://app.circleci.com/settings/project/github/bolawell/renovate-bot/triggers
[circleci api]: https://github.com/CircleCI-Public/api-preview-docs
[api token]: https://circleci.com/docs/2.0/managing-api-tokens

## Final words

The next hour CircleCI should trigger the run job, that will run our Renovate
bot, and that will create merge requests on your configured repositories.

Aaaand that's it!
