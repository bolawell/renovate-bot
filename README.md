# renovatebot

<!-- vim-markdown-toc GFM -->

* [Overview](#overview)
* [Renovate](#renovate)
* [GitLab User Account](#gitlab-user-account)
* [Renovate bot configuration](#renovate-bot-configuration)
* [Preset config](#preset-config)
* [Using GitLab CI](#using-gitlab-ci)
* [GitHub.com token for release notes](#githubcom-token-for-release-notes)
* [Final words](#final-words)

<!-- vim-markdown-toc -->

## Overview

Currently, we do no have any automated way to check the dependencies and it is
very likely that some of our projects to have outdated dependencies.

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
[GitLab](https://about.gitlab.com), but since we're using a self-hosted
internal GitLab server we will have to run the service yourself. This sounds a
lot more complicated than it actually is, but it is not and the rest of this
document will show you how to do it.

Renovate will use a dedicated user account (well, since this is just a POC it
will use my user to open merge requests. It will also has a dedicated
[repository](https://github.com/eana/renovate-bot) for the main configuration.
GitLab CI on this repository will take care of regularly running the Renovate
bot.

## GitLab User Account

It's highly recommended to have a dedicated GitLab user for this, because using
personal users is not a good practice and the Renovate bot will stop working
when the user will be deleted.

Once that account exists, create a 'Personal Access Token' for the account, so
that the Renovate bot can use it without us having to give it the password
directly. This is important, because when you give away the password the
account can be hijacked, but when you only give away a token you have control
over the actions that can be performed with that token.

[Generate a personal access token](https://github.com/settings/tokens), with
the `repo:public_repo` scope for only public repositories or the `repo` scope
for public and private repositories, and add it to _Secrets_ (repository
settings) as `RENOVATE_TOKEN`. You can also create a token without a specific
scope, which gives read-only access to public repositories, for testing. This
token is only used by Renovate, see the [token
configuration](https://docs.renovatebot.com/self-hosted-configuration/#token),
and gives it access to the repositories. The name of the secret can be anything
as long as it matches the argument given to the `token` option.

Note that the
[`GITHUB_TOKEN`](https://help.github.com/en/actions/configuring-and-managing-workflows/authenticating-with-the-github_token#permissions-for-the-github_token)
secret can't be used for authenticating Renovate.

## Renovate bot configuration

Renovate expects this to be called [`config.js`](./config.js). Inside of it we
will configure how Renovate will behave by default. Please note that most of
this can be overridden on a per-repository basis.

The `config.js` file may change in the future, but at the time of writing this
document the file should look like this:

```js
module.exports = {
  platform: "gitlab",
  endpoint: "https://gitlab.example.org/api/v4/",
  token: process.env.RENOVATE_TOKEN,

  repositories: ["acme/test1", "acme/test2"],

  requireConfig: true,
  onboarding: true,

  onboardingConfig: {
    $schema: "https://docs.renovatebot.com/renovate-schema.json",
    extends: ["local>eana/renovate-config"],
  },
};
```

The first section of the file above tells our Renovate bot how to talk to our
self-hosted GitLab instance. Afterwards on which repositories it should run,
how much log output we want to see and what the `renovate.json` config file
should look like that it will add to each repository in the first merge
request.

## Preset config

We want to manage multiple repositories using Renovate and want the same custom
config across all or most of them, hence we have a preset config so that we can
"extend" it in every applicable repository. This way when we want to change the
Renovate configuration we can make the change in one location rather than
having to copy/paste it to every repository individually. The preset config is
configured in the [renovate-config](https://github.com/eana/renovate-config)
repository.

## Using GitLab CI

The first thing we need to do is to add `RENOVATE_TOKEN` environment variable.
We can do so on the 'Settings > CI / CD' page of our project in GitLab. In the
'Variables' section enter `RENOVATE_TOKEN` as the 'variable key' and the
generated token as the 'variable value'. Finally, make sure that the
'Protected' switch is turned on and then press the 'Save variables' button.

The [pipeline](./gitlab-ci.yml) is very simple:

```yaml
image: node:15

stages:
  - run_renovate

.cache: &cache
  cache:
    key:
      files:
        - package-lock.json
    paths:
      - node_modules

run-renovate:
  stage: run_renovate
  <<: *cache
  script:
    - npm install
    - npm run renovate
  only:
    - master
    - schedules
```

In the 'CI / CD' menu of the project on GitLab you should find a menu entry
called 'Schedules'. Clicking on that will take you to a page with a 'New
schedule' button, which we will immediately click too. The 'Schedule a new
pipeline' form should now show up in your browser and we will fill it like
this:

```
Description: 'Monday to Friday, every hour between 9-16'
Interval Pattern: Custom (0 9-16 * * 1-5)
Target Branch: master
Active: Yes, please!
```

Now, click the 'Save pipeline schedule' button and GitLab will take you back to
the 'Schedules' page showing our newly created schedule.

## GitHub.com token for release notes

It's important to also configure the environment variable `GITHUB_COM_TOKEN`
containing a personal access token for github.com. This account can actually be
any account on GitHub, and needs only read-only access. It's used when fetching
release notes for repositories in order to increase the hourly API limit.

When using Renovate in a project where dependencies are loaded from github.com
(such as Go modules hosted on GitHub) it is highly recommended to add a token
as the rate limit from the github.com API will be reached, which will lead to
Renovate closing and reopening PRs because it could not get reliable info on
updated dependencies.

## Final words

The next hour GitLab CI should trigger the run job, that will run our Renovate
bot, and that will create merge requests on your configured repositories.

Aaaand that's it!
