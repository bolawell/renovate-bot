# renovate-bot

<!-- vim-markdown-toc GFM -->

* [Overview](#overview)
* [Renovate](#renovate)
* [Token](#token)
* [Renovate bot configuration](#renovate-bot-configuration)
* [Preset config](#preset-config)
* [Signed commits](#signed-commits)
    * [Generating a GPG key](#generating-a-gpg-key)
    * [Add the public GPG to GitHub`](#add-the-public-gpg-to-github)
    * [Add the private GPG key to `eana-bot`](#add-the-private-gpg-key-to-eana-bot)
* [Using CircleCI](#using-circleci)
* [Final words](#final-words)

<!-- vim-markdown-toc -->

## Overview

A lot of developers either spend a lot of time on dependency management or
spend no time on it at all. Often the developers don't even know that a new
version of a dependency has been released.

Especially in large projects it frequently happens to skip 2-4 Major Versions
before updating the dependencies again, simply because no one spends time to
regularly check for updates. Bots like
[renovate](https://github.com/renovatebot/renovate) or
[dependabot](https://dependabot.com/) try to solve this by creating a new MR as
soon as a new version of a dependency has been released. Unfortunately, these
bots are not that well known yet and could be tricky to configure.

This repository tries to mitigate this very problem.

## Renovate

Renovate is an open source project that you can be self-hosted. The hosted
service works fine if your project is on [GitHub](https://github.com) or
[GitLab](https://about.gitlab.com), but I've decided to run the service myself.
This sounds a lot more complicated than it actually is, but it is not and the
rest of this document will show you how to do it.

Renovate will use my [user](https://github.com/eana) to open merge requests. It
will also have a dedicated [repository](https://github.com/eana/renovate-bot)
for the main configuration. The CircleCI config on this repository will take
care of regularly running the Renovate bot.

## Token

Note: If you plan to use the Renovate bot in a GitHub organization it's highly
recommended to have a dedicated user for this, because using personal users is
not a good practice and the Renovate bot will stop working when the user will
be deleted.

[Generate a personal access token](https://github.com/settings/tokens), with
the `repo:public_repo` scope for only public repositories or the `repo` scope
for public and private repositories, and add write it down for later use.

## Renovate bot configuration

Renovate expects this to be called [`config.js`](./config.js). Inside of it we
will configure how Renovate will behave by default. Please note that most of
this can be overridden on a per-repository basis.

The `config.js` file may change in the future, but at the time of writing this
document the file should look like this:

```js
module.exports = {
  platform: "github",
  gitAuthor: "Eana Bot <eana-bot@eana.ro>",
  token: process.env.GITHUB_COM_TOKEN,
  gitPrivateKey: process.env.GPG_KEY,

  repositories: ["acme/test1", "acme/test2", "acme/test3", "acme/test4"],

  requireConfig: true,
  onboarding: true,

  onboardingConfig: {
    $schema: "https://docs.renovatebot.com/renovate-schema.json",
    extends: ["github>bolawell/renovate-config"],
  },
};
```

The first section of the file above tells our Renovate bot how to talk to
GitHub. Afterwards on which repositories it should run and what the
`renovate.json` config file should look like that it will add to each
repository in the first merge request.

## Preset config

We want to manage multiple repositories using Renovate and want the same custom
config across all or most of them, hence we have a preset config so that we can
"extend" it in every applicable repository. This way when we want to change the
Renovate configuration we can make the change in one location rather than
having to copy/paste it to every repository individually. The preset config is
configured in the [renovate-config](https://github.com/eana/renovate-config)
repository.

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

If you don't already have the GPG keys this
[document](https://docs.github.com/en/github/authenticating-to-github/managing-commit-signature-verification/generating-a-new-gpg-key)
will help you get started. Use `Eana bot` for `Real name` and
`eana-bot@eana.ro` for `Email address`. Also the key should not expire.

A very **important** note is that you need set an empty passphrase.

### Add the public GPG to GitHub`

After generating the GPG keys, the public key must be added to GitHub and this
[guide](https://docs.github.com/en/github/authenticating-to-github/managing-commit-signature-verification/adding-a-new-gpg-key-to-your-github-account)
could be followed to add it.

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

Create a [CircleCI
context](https://circleci.com/docs/2.0/contexts/#creating-and-using-a-context)
called `renovate-bot` and add three environment variables as follows:

| Environment variable | Value                                                    |
| -------------------- | -------------------------------------------------------- |
| `GITHUB_COM_TOKEN`   | The generated token                                      |
| `GPG_KEY_BASE64`     | The base64 encoded private key you have in the clipboard |
| `LOG_LEVEL`          | `debug`                                                  |

This token is only used by Renovate, see the [token
configuration](https://docs.renovatebot.com/self-hosted-configuration/#token),
and gives it access to the repositories.

The environment variable `GITHUB_COM_TOKEN` is used when fetching release notes
for repositories in order to increase the hourly API limit.

When using Renovate in a project where dependencies are loaded from
`github.com` (such as Go modules hosted on GitHub) it is highly recommended to
add a token as the rate limit from the github.com API will be reached, which
will lead to Renovate closing and reopening PRs because it could not get
reliable info on updated dependencies.

The [pipeline](.circleci/config.yml) is very simple and it is configured to run
[Monday to Friday, at 9:00, 12:00, 15:00](.circleci/config.yml#L65-L66). Also,
the pipeline is triggered when a change is [pushed/merged to
master](.circleci/config.yml#L59-L61).

## Final words

The next hour CircleCI should trigger the run job, that will run our Renovate
bot, and that will create merge requests on your configured repositories.

Aaaand that's it!
