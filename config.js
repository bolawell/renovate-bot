module.exports = {
  platform: "github",
  gitAuthor: "renovate-bot <renovate-bot@eana.ro>",
  dryRun: true,
  token: process.env.RENOVATE_TOKEN,

  repositories: ["eana/renovate-bot"],

  requireConfig: true,
  onboarding: true,

  onboardingConfig: {
    $schema: "https://docs.renovatebot.com/renovate-schema.json",
    extends: ["github>eana/renovate-config"],
  },
};
