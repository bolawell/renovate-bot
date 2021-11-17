module.exports = {
  platform: "github",
  gitAuthor: "Eana Bot <eana-bot@eana.ro>",
  token: process.env.GITHUB_COM_TOKEN,
  gitPrivateKey: process.env.GPG_KEY,

  repositories: [
    "bolawell/renovate-bot",
    "bolawell/test-repo"
  ],

  requireConfig: true,
  onboarding: true,

  onboardingConfig: {
    $schema: "https://docs.renovatebot.com/renovate-schema.json",
    extends: ["github>bolawell/renovate-config"],
  },
};
