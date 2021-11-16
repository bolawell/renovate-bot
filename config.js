module.exports = {
  platform: "github",
  gitAuthor: "Renovate Bot <renovate-bot@eana.ro>",
  token: process.env.GITHUB_COM_TOKEN,
  gitPrivateKey: process.env.GPG_KEY,

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
