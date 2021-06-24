module.exports = {
  platform: "github",
  gitAuthor: "renovate-bot <renovate-bot@eana.ro>",
  dryRun: true,
  token: process.env.RENOVATE_TOKEN,

  repositories: [
    "eana/aws-infra-tf",
    "eana/aws-sso",
    "eana/bind-exporter",
    "eana/bitwarden_rs-docker-compose",
    "eana/blog.eana.ro",
    "eana/ccc",
    "eana/docker-proftpd",
    "eana/docker-samba-server",
    "eana/eana.ro",
    "eana/helm_charts",
    "eana/kubernetes-config",
    "eana/kubernetes-monitoring",
    "eana/memcached-exporter",
    "eana/pihole-easylist",
    "eana/renovate-bot",
    "eana/renovate-config",
    "eana/rotate-gitlab-project-tokens",
    "eana/svtplay-dl",
    "eana/sysadmin.compxtreme.ro",
    "eana/sysadmin.compxtreme.ro",
    "eana/tf-modules",
    "eana/wordpress-snuffleupagus",
  ],

  requireConfig: true,
  onboarding: true,

  onboardingConfig: {
    $schema: "https://docs.renovatebot.com/renovate-schema.json",
    extends: ["github>eana/renovate-config"],
  },
};
