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
