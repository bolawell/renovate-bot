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

  repositories: [
    "bolawell/blog.eana.ro",
    "bolawell/ccc",
    "bolawell/eana-nas",
    "bolawell/renovate-bot",
    "bolawell/test-repo",
  ],

  requireConfig: true,
  onboarding: true,

  onboardingConfig: {
    $schema: "https://docs.renovatebot.com/renovate-schema.json",
    extends: ["github>bolawell/renovate-config"],
  },
};
