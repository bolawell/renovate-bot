module.exports = {
  platform: "github",
  gitAuthor: "Renovate Bot <renovate-bot@eana.ro>",
  token: process.env.RENOVATE_TOKEN,

  repositories: [
    "bolawell/test-repo",
  ],

  requireConfig: true,
  onboarding: true,

  onboardingConfig: {
    $schema: "https://docs.renovatebot.com/renovate-schema.json",
    extends: ["github>bolawell/renovate-config"],
  },
};
